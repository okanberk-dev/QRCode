import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Superadmin embed usage report — tüm işletme + parentDomain kombinasyonu,
 * son N gün içinde widget yükleyen siteler. Manager / owner reddedilir.
 *
 * Response:
 *   { rows: [{restaurantId, restaurantName, slug, parentDomain, count,
 *             firstSeen, lastSeen}], page, total, totalRestaurants,
 *     totalDomains, totalViews }
 */
export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (actor.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { days, page, limit } = parsed.data;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const skip = (page - 1) * limit;

  // groupBy(restaurantId, parentDomain) — distinct kombinasyonları,
  // tek query'den.
  const grouped = await prisma.embedView.groupBy({
    by: ['restaurantId', 'parentDomain'],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
    orderBy: { _count: { restaurantId: 'desc' } },
  });

  // Restaurant isim/slug bilgisi için ek lookup (in-memory join)
  const restaurantIds = Array.from(new Set(grouped.map((g) => g.restaurantId)));
  const restaurants = restaurantIds.length
    ? await prisma.restaurant.findMany({
        where: { id: { in: restaurantIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const restaurantMap = new Map(restaurants.map((r) => [r.id, r]));

  const allRows = grouped.map((g) => {
    const r = restaurantMap.get(g.restaurantId);
    return {
      restaurantId: g.restaurantId,
      restaurantName: r?.name ?? '—',
      slug: r?.slug ?? '',
      parentDomain: g.parentDomain ?? 'bilinmeyen',
      count: g._count._all,
      firstSeen: g._min.createdAt?.toISOString() ?? null,
      lastSeen: g._max.createdAt?.toISOString() ?? null,
    };
  });

  // Pagination — in-memory slice (groupBy zaten array döner)
  const rows = allRows.slice(skip, skip + limit);
  const totalViews = allRows.reduce((a, r) => a + r.count, 0);
  const totalRestaurants = restaurantIds.length;
  const totalDomains = new Set(allRows.map((r) => r.parentDomain)).size;

  return NextResponse.json({
    rows,
    page,
    limit,
    total: allRows.length,
    totalViews,
    totalRestaurants,
    totalDomains,
    days,
  });
}
