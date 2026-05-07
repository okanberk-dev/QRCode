// Stage 29 §38.105 — admin campaign detail endpoint.
//
// IDOR: superadmin OR `campaigns:read`. Cross-workspace; admin tüm
// restoranların kampanyalarını görür. Detail = full body + recipient
// preview + log stats + audit history (audit history endpoint ayrı —
// /api/admin/audit-logs?targetId=campaignId reuse, bu endpoint sadece
// campaign metadata).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { aggregateLogStats } from '@/lib/customer-campaign-stats';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_DETAIL_CACHE_HEADER = 'private, s-maxage=30, stale-while-revalidate=120';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'campaigns', 'read'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      subject: true,
      body: true,
      status: true,
      recipientCount: true,
      sentCount: true,
      failedCount: true,
      submittedAt: true,
      approvedById: true,
      approvedAt: true,
      rejectedById: true,
      rejectedAt: true,
      reviewerNote: true,
      sentAt: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      restaurant: {
        select: { id: true, name: true, userId: true, slug: true },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Owner + reviewer info bulk fetch
  const userIds = Array.from(
    new Set(
      [campaign.createdById, campaign.restaurant?.userId].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );
  const adminIds = Array.from(
    new Set(
      [campaign.approvedById, campaign.rejectedById].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );

  const [users, admins] = await prisma.$transaction([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : prisma.user.findMany({ where: { id: '__none__' }, select: { id: true, name: true, email: true } }),
    adminIds.length
      ? prisma.adminUser.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, username: true },
        })
      : prisma.adminUser.findMany({ where: { id: '__none__' }, select: { id: true, username: true } }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const adminMap = new Map(admins.map((a) => [a.id, a]));

  const owner = campaign.restaurant?.userId ? userMap.get(campaign.restaurant.userId) : null;
  const creator = campaign.createdById ? userMap.get(campaign.createdById) : null;
  const approver = campaign.approvedById ? adminMap.get(campaign.approvedById) : null;
  const rejecter = campaign.rejectedById ? adminMap.get(campaign.rejectedById) : null;

  // Log stats aggregate (small footprint).
  const logs = await prisma.customerEmailLog.findMany({
    where: { campaignId: id },
    select: { status: true },
  });
  const stats = aggregateLogStats(logs, campaign.recipientCount);

  return NextResponse.json(
    {
      campaign: {
        id: campaign.id,
        restaurantId: campaign.restaurantId,
        restaurantName: campaign.restaurant?.name ?? null,
        restaurantSlug: campaign.restaurant?.slug ?? null,
        subject: campaign.subject,
        body: campaign.body,
        status: campaign.status,
        recipientCount: campaign.recipientCount,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        submittedAt: campaign.submittedAt?.toISOString() ?? null,
        approvedAt: campaign.approvedAt?.toISOString() ?? null,
        rejectedAt: campaign.rejectedAt?.toISOString() ?? null,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        reviewerNote: campaign.reviewerNote,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      },
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email }
        : null,
      creator: creator
        ? { id: creator.id, name: creator.name, email: creator.email }
        : null,
      approver: approver ? { id: approver.id, username: approver.username } : null,
      rejecter: rejecter ? { id: rejecter.id, username: rejecter.username } : null,
      stats,
    },
    {
      headers: { 'Cache-Control': ADMIN_DETAIL_CACHE_HEADER },
    },
  );
}
