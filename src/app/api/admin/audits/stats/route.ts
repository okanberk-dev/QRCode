// CLAUDE.md §42 — Admin Denetim Merkezi stats endpoint (superadmin).
//
// 4 aggregate paralel (Promise.all):
//   1. Sistem KPI: total/published/draft templates, total responses,
//      avgScore (completed responses across system)
//   2. Sektör başına: groupBy sector → template count + response count +
//      avgScore (sektör başına agregat)
//   3. Top 5 templates: responseCount DESC + avgScore + sector + title
//   4. Per-restaurant: restaurantId → name + responseCount + avgScore +
//      latestResponseAt (top 10)
//
// `responseCount` ve `avgScore` sadece `completedAt IS NOT NULL` yanıtlar.
// Partial / abandoned response'lar admin gözlemini bulanıklaştırmasın.

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { AUDIT_SECTORS, type AuditSector } from '@/lib/audits/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// AuditResponse.scorePercentage 0-10000 (basis points) saklanir; panel 0-100
// ve tek ondalik gosterir.
function basisPointsToPercent(value: number | null | undefined): number | null {
  return value == null ? null : Math.round(value / 10) / 10;
}

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return { ok: false as const, res: ApiErrors.unauthorized() };
  if (admin.role !== 'superadmin') return { ok: false as const, res: ApiErrors.forbidden() };
  return { ok: true as const, admin };
}

interface SectorRow {
  sector: AuditSector;
  templates: number;
  responses: number;
  avgScore: number | null;
}

interface TopTemplateRow {
  id: string;
  title: string;
  sector: AuditSector;
  responseCount: number;
  avgScore: number | null;
  isPublished: boolean;
}

interface RestaurantRow {
  restaurantId: string;
  name: string;
  responseCount: number;
  avgScore: number | null;
  latestResponseAt: string | null;
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  try {
    // 1) Sistem KPI + 2) sektör breakdown + 3) top templates + 4) per-restaurant
    //    — 4 paralel query. Prisma `$transaction([read1, read2, ...])` connection
    //    pooler altında tek connection üstünden sıralı çalıştırır
    //    (CLAUDE.md §14.1 + §40.1). 4 query hepsi read-only.
    const [
      totalTemplates,
      publishedTemplates,
      completedResponses,
      avgScoreRow,
      bySectorTemplates,
      bySectorResponsesRaw,
      topTemplatesRaw,
      perRestaurantRaw,
    ] = await prisma.$transaction([
      prisma.auditTemplate.count(),
      prisma.auditTemplate.count({ where: { isPublished: true } }),
      prisma.auditResponse.count({ where: { completedAt: { not: null } } }),
      prisma.auditResponse.aggregate({
        where: { completedAt: { not: null }, scorePercentage: { not: null } },
        _avg: { scorePercentage: true },
      }),
      prisma.auditTemplate.groupBy({
        by: ['sector'],
        _count: { _all: true },
      }),
      // groupBy across join — sector is on template; use raw groupBy on
      // template + then aggregate via separate response query keyed by
      // templateId. Daha basit yol: Prisma `auditResponse.groupBy({ by:
      // ['templateId'] })` + sonra template'i join — ama scale küçük (max
      // 50-200 template), client-side reduce yeter.
      prisma.auditResponse.groupBy({
        by: ['templateId'],
        where: { completedAt: { not: null } },
        _count: { _all: true },
        _avg: { scorePercentage: true },
      }),
      // Top 5 templates: response count desc. groupBy zaten sıralı listeyi
      // çıkarmamıza yarar; aşağıda template metadata ile join'leyeceğiz.
      prisma.auditResponse.groupBy({
        by: ['templateId'],
        where: { completedAt: { not: null } },
        _count: { _all: true },
        _avg: { scorePercentage: true },
        orderBy: { _count: { templateId: 'desc' } },
        take: 5,
      }),
      // Per-restaurant top 10
      prisma.auditResponse.groupBy({
        by: ['restaurantId'],
        where: { completedAt: { not: null } },
        _count: { _all: true },
        _avg: { scorePercentage: true },
        _max: { completedAt: true },
        orderBy: { _count: { restaurantId: 'desc' } },
        take: 10,
      }),
    ]);

    // Sektör response/avg lookup — bySectorResponsesRaw template başına;
    // template → sector mapping bulmak için ek bir query.
    const templateIds = bySectorResponsesRaw
      .map((r) => r.templateId)
      .filter((id): id is string => Boolean(id));
    const templates = templateIds.length
      ? await prisma.auditTemplate.findMany({
          where: { id: { in: templateIds } },
          select: { id: true, sector: true, title: true, isPublished: true },
        })
      : [];
    const templateLookup = new Map(templates.map((t) => [t.id, t]));

    const sectorResponsesAcc: Record<AuditSector, { count: number; sumScore: number; n: number }> = {
      food: { count: 0, sumScore: 0, n: 0 },
      hotel: { count: 0, sumScore: 0, n: 0 },
      retail: { count: 0, sumScore: 0, n: 0 },
      health: { count: 0, sumScore: 0, n: 0 },
      beauty: { count: 0, sumScore: 0, n: 0 },
      other: { count: 0, sumScore: 0, n: 0 },
    };
    for (const row of bySectorResponsesRaw) {
      const tpl = templateLookup.get(row.templateId);
      if (!tpl) continue;
      const sec = tpl.sector as AuditSector;
      sectorResponsesAcc[sec].count += row._count._all;
      const avg = row._avg.scorePercentage;
      if (avg != null) {
        sectorResponsesAcc[sec].sumScore += avg * row._count._all;
        sectorResponsesAcc[sec].n += row._count._all;
      }
    }

    const bySectorTemplateCount: Record<AuditSector, number> = {
      food: 0, hotel: 0, retail: 0, health: 0, beauty: 0, other: 0,
    };
    for (const row of bySectorTemplates) {
      bySectorTemplateCount[row.sector as AuditSector] = row._count._all;
    }

    const sectorBreakdown: SectorRow[] = AUDIT_SECTORS.map((sec) => ({
      sector: sec,
      templates: bySectorTemplateCount[sec],
      responses: sectorResponsesAcc[sec].count,
      avgScore:
        sectorResponsesAcc[sec].n > 0
          ? basisPointsToPercent(sectorResponsesAcc[sec].sumScore / sectorResponsesAcc[sec].n)
          : null,
    }));

    // Top templates — template metadata ile join (already loaded for sector
    // breakdown). Eksik metadata varsa ek findMany.
    const topTemplateIds = topTemplatesRaw.map((r) => r.templateId).filter((id): id is string => Boolean(id));
    const missingTopIds = topTemplateIds.filter((id) => !templateLookup.has(id));
    if (missingTopIds.length > 0) {
      const extra = await prisma.auditTemplate.findMany({
        where: { id: { in: missingTopIds } },
        select: { id: true, sector: true, title: true, isPublished: true },
      });
      for (const t of extra) templateLookup.set(t.id, t);
    }
    const topTemplates: TopTemplateRow[] = topTemplatesRaw
      .map((r) => {
        const tpl = templateLookup.get(r.templateId);
        if (!tpl) return null;
        return {
          id: tpl.id,
          title: tpl.title,
          sector: tpl.sector as AuditSector,
          responseCount: r._count._all,
          avgScore: basisPointsToPercent(r._avg.scorePercentage),
          isPublished: tpl.isPublished,
        };
      })
      .filter((r): r is TopTemplateRow => r !== null);

    // Per-restaurant — restaurant metadata join
    const restaurantIds = perRestaurantRaw
      .map((r) => r.restaurantId)
      .filter((id): id is string => Boolean(id));
    const restaurants = restaurantIds.length
      ? await prisma.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true },
        })
      : [];
    const restaurantLookup = new Map(restaurants.map((r) => [r.id, r.name]));

    const perRestaurant: RestaurantRow[] = perRestaurantRaw
      .map((r) => {
        if (!r.restaurantId) return null;
        return {
          restaurantId: r.restaurantId,
          name: restaurantLookup.get(r.restaurantId) || '—',
          responseCount: r._count._all,
          avgScore: basisPointsToPercent(r._avg.scorePercentage),
          latestResponseAt: r._max.completedAt ? r._max.completedAt.toISOString() : null,
        };
      })
      .filter((r): r is RestaurantRow => r !== null);

    return NextResponse.json({
      data: {
        totals: {
          totalTemplates,
          publishedTemplates,
          draftTemplates: totalTemplates - publishedTemplates,
          completedResponses,
          avgScore: basisPointsToPercent(avgScoreRow._avg.scorePercentage),
        },
        sectorBreakdown,
        topTemplates,
        perRestaurant,
      },
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'admin.audits.stats' } });
    return ApiErrors.internalError('İstatistikler yüklenemedi');
  }
}
