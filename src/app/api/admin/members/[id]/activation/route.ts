import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { computeActivation } from '@/lib/activation';

// GET /api/admin/members/[id]/activation — admin gets per-restaurant activation
// state for an owner (CLAUDE.md §19.5 + §38.93 Stage A1). Reuses computeActivation
// helper so admin and owner panel render the same checklist semantics.
//
// Per restaurant: Promise.all aggregate of (state, qrGenerationCount,
// feedbackCount). Owner panel shows ActivationChecklistCard per-restaurant;
// admin overview surface shows aggregate (% complete) + drill-down.
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Fetch up to 25 restaurants — admin detail surface is not paginated; an
  // owner with >25 restaurants is enterprise-tier and would need a separate
  // surface. Slice keeps response lean.
  const restaurants = await prisma.restaurant.findMany({
    where: { userId: id },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      googleReviewUrl: true,
      googleEnabled: true,
      isActive: true,
    },
    take: 25,
    orderBy: { createdAt: 'desc' },
  });

  if (restaurants.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const restaurantIds = restaurants.map((r) => r.id);

  // Aggregate per-restaurant state + QR + feedback counts in single batch.
  // Promise.all bounded fan-out (max 25 × 3 queries = 75) — connection_limit=1
  // pooler tolerates this; future scale would need cursor pagination.
  const [states, qrCounts, feedbackCounts] = await Promise.all([
    prisma.restaurantActivationState.findMany({
      where: { restaurantId: { in: restaurantIds } },
      select: {
        restaurantId: true,
        qrPrintedSharedAt: true,
        dismissedAt: true,
      },
    }),
    prisma.qrGeneration.groupBy({
      by: ['restaurantId'],
      where: { restaurantId: { in: restaurantIds } },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({
      by: ['restaurantId'],
      where: { restaurantId: { in: restaurantIds } },
      _count: { _all: true },
    }),
  ]);

  const stateMap = new Map(states.map((s) => [s.restaurantId, s]));
  const qrMap = new Map(qrCounts.map((q) => [q.restaurantId, q._count._all]));
  const feedbackMap = new Map(feedbackCounts.map((f) => [f.restaurantId, f._count._all]));

  const data = restaurants.map((r) => {
    const result = computeActivation({
      restaurant: {
        name: r.name,
        category: r.category,
        googleReviewUrl: r.googleReviewUrl,
        googleEnabled: r.googleEnabled,
      },
      state: stateMap.get(r.id) ?? null,
      qrGenerationCount: qrMap.get(r.id) ?? 0,
      feedbackCount: feedbackMap.get(r.id) ?? 0,
    });
    return {
      restaurantId: r.id,
      restaurantName: r.name,
      slug: r.slug,
      isActive: r.isActive,
      ...result,
    };
  });

  return NextResponse.json(
    { data },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
