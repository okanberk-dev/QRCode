import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Owner panel "Platform Yönlendirmeleri" / "Platform Redirects" section
// (CLAUDE.md §19.4.2 + §23.7 Phase 11.24).
//
// Query: ?range=7d|30d|all (default 7d). Response:
//   {
//     range, totals: { last7Days, last30Days },
//     byProvider: [{ provider, count }, ...] sorted desc,
//     topProvider, windowStart, windowEnd
//   }
//
// IDOR: requireRestaurantAccess. No public cache — owner-scoped data, stale
// snapshot risk + IDOR + KVKK kombinasyonu CDN-cache uygun değil.

interface ProviderCount {
  provider: string;
  count: number;
}

const RANGE_DAYS: Record<string, number | null> = {
  '7d': 7,
  '30d': 30,
  all: null,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const url = new URL(req.url);
  const rangeParam = url.searchParams.get('range') ?? '7d';
  const range = rangeParam in RANGE_DAYS ? rangeParam : '7d';
  const days = RANGE_DAYS[range];

  const now = new Date();
  const windowStart = days
    ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    : null;

  // 7d + 30d totals her zaman döner (UI top-stat kartları için), groupBy
  // ise seçili range'e göre. Promise.all tek round-trip.
  const groupByWhere: { restaurantId: string; createdAt?: { gte: Date } } = {
    restaurantId: id,
  };
  if (windowStart) groupByWhere.createdAt = { gte: windowStart };

  const [last7Days, last30Days, byProviderRaw] = await Promise.all([
    prisma.platformRedirectEvent.count({
      where: {
        restaurantId: id,
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.platformRedirectEvent.count({
      where: {
        restaurantId: id,
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.platformRedirectEvent.groupBy({
      by: ['provider'],
      where: groupByWhere,
      _count: { _all: true },
    }),
  ]);

  const byProvider: ProviderCount[] = byProviderRaw
    .map((g) => ({ provider: g.provider, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
  const topProvider = byProvider[0]?.provider ?? null;

  return NextResponse.json({
    range,
    totals: { last7Days, last30Days },
    byProvider,
    topProvider,
    windowStart: windowStart?.toISOString() ?? null,
    windowEnd: now.toISOString(),
  });
}
