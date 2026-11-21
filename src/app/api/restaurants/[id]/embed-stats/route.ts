import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';

export const dynamic = 'force-dynamic';

// Zod query param validation — id cuid + opsiyonel range gün sayısı.
const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * Owner-scoped embed analytics. parentDomain bazında groupBy + son N gün
 * filter. IDOR `requireRestaurantAccess` ile (CLAUDE.md §4); başka işletmenin
 * id'siyle çağrı 403.
 *
 * Response:
 *   { totalViews, byDomain: [{ domain, count, firstSeen, lastSeen }] }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // IDOR + auth — read-only, viewer role kabul.
  const guard = await requireRestaurantAccess(req, id);
  if (!guard.ok) return guard.res;

  // Query param validation (Zod) — validateBody pattern URL search params'a
  // direkt uygun değil, manuel parse + parse.
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { days, limit } = parsed.data;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Two independent reads, run at once (was an array $transaction).
  const [totalViews, domainGroups] = await Promise.all([
    prisma.embedView.count({
      where: { restaurantId: id, createdAt: { gte: since } },
    }),
    prisma.embedView.groupBy({
      by: ['parentDomain'],
      where: { restaurantId: id, createdAt: { gte: since } },
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: { _count: { parentDomain: 'desc' } },
      take: limit,
    }),
  ]);

  const byDomain = domainGroups.map((g) => ({
    domain: g.parentDomain ?? 'bilinmeyen',
    count: g._count._all,
    firstSeen: g._min.createdAt?.toISOString() ?? null,
    lastSeen: g._max.createdAt?.toISOString() ?? null,
  }));

  return NextResponse.json(
    { totalViews, byDomain, days },
    {
      // Owner-scoped embed view counters — slow-moving aggregate, safe to
      // cache for 5min/15min SWR (CLAUDE.md §19.3 owner-cache pattern).
      headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=900' },
    },
  );
}
