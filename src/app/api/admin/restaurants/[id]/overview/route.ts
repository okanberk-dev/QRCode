import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { parseGoogleLocationsCache, selectedGoogleLocation } from '@/lib/google-business';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/restaurants/[id]/overview — superadmin read-only summary of
 * everything the OWNER runs on this restaurant.
 *
 * Owner-side modules (surveys, audit center, team, Google
 * Business connection, platform link health, self-scheduled deletion) had no
 * admin visibility at all: an admin opening /admin/restaurants/[id] saw only
 * name/contact fields and could not tell whether a public survey collecting
 * customer emails was live, whether the owner's Google connection worked, or
 * that the account was 30 days from self-deletion. This endpoint feeds the
 * "Owner modülleri" card on that page.
 *
 * PII: counts, titles, statuses and ids only — no customer/team emails.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: admin ? 403 : 401 });
  }

  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true, userId: true, suspendedByAdmin: true, isActive: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 });
  }

  const ownerId = restaurant.userId;
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // §40.1 — single pooled connection: batch all reads in one transaction.
    const [
      surveys,
      surveyCount,
      auditTemplateCount,
      auditResponseAgg,
      failingLinkChecks,
      qrCount,
    ] = await prisma.$transaction([
      prisma.survey.findMany({
        where: { restaurantId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          slug: true,
          isActive: true,
          isPublished: true,
          createdAt: true,
          _count: { select: { responses: true } },
        },
      }),
      prisma.survey.count({ where: { restaurantId: id } }),
      prisma.auditTemplate.count({ where: { restaurantId: id } }),
      prisma.auditResponse.aggregate({
        where: { restaurantId: id, completedAt: { not: null } },
        _count: { _all: true },
        _avg: { scorePercentage: true },
      }),
      prisma.platformLinkCheck.findMany({
        where: { restaurantId: id, checkedAt: { gte: since24h }, ok: false },
        distinct: ['provider'],
        select: { provider: true },
        take: 20,
      }),
      prisma.qrGeneration.count({ where: { restaurantId: id } }),
    ]);

    const team = { active: 0, invited: 0 };
    let google: { connected: boolean; locationTitle: string | null; syncedAt: string | null } = {
      connected: false,
      locationTitle: null,
      syncedAt: null,
    };
    let owner: { scheduledDeletionAt: string | null; isActive: boolean | null } = {
      scheduledDeletionAt: null,
      isActive: null,
    };

    if (ownerId) {
      const [teamGroups, integration, ownerRow] = await prisma.$transaction([
        prisma.teamMember.groupBy({
          by: ['status'],
          where: { ownerId },
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }),
        prisma.googleIntegration.findUnique({
          where: { userId: ownerId },
          select: { locationsJson: true },
        }),
        prisma.user.findUnique({
          where: { id: ownerId },
          select: { scheduledDeletionAt: true, isActive: true },
        }),
      ]);
      for (const g of teamGroups) {
        const n = typeof g._count === 'object' && g._count ? g._count._all ?? 0 : 0;
        if (g.status === 'active') team.active = n;
        if (g.status === 'invited') team.invited = n;
      }
      if (integration) {
        const cache = parseGoogleLocationsCache(integration.locationsJson);
        const selected = selectedGoogleLocation(cache, id);
        google = {
          connected: true,
          locationTitle: selected?.title ?? null,
          syncedAt: cache.syncedAt ?? null,
        };
      }
      owner = {
        scheduledDeletionAt: ownerRow?.scheduledDeletionAt?.toISOString() ?? null,
        isActive: ownerRow?.isActive ?? null,
      };
    }

    return NextResponse.json(
      {
        restaurant: {
          id: restaurant.id,
          isActive: restaurant.isActive,
          suspendedByAdmin: restaurant.suspendedByAdmin,
        },
        surveys: {
          total: surveyCount,
          items: surveys.map((s) => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            isActive: s.isActive,
            isPublished: s.isPublished,
            createdAt: s.createdAt.toISOString(),
            responseCount: s._count.responses,
          })),
        },
        audits: {
          templates: auditTemplateCount,
          completedResponses: auditResponseAgg._count?._all ?? 0,
          // scorePercentage is stored 0–10000 (2-decimal precision).
          avgScorePercent:
            typeof auditResponseAgg._avg?.scorePercentage === 'number'
              ? Math.round(auditResponseAgg._avg.scorePercentage) / 100
              : null,
        },
        team,
        google,
        platformLinks: { failingProviders: failingLinkChecks.map((c) => c.provider) },
        qrCount,
        owner,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[admin restaurant overview] failed', {
      restaurantId: id,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message.slice(0, 200) : 'non-error',
    });
    return NextResponse.json({ error: 'Özet yüklenemedi' }, { status: 500 });
  }
}
