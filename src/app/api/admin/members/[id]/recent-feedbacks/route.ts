import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// GET /api/admin/members/[id]/recent-feedbacks — last 10 feedbacks across
// all restaurants owned by this user (CLAUDE.md §38.93 Stage A1).
//
// Why aggregate at admin tier: admin needs cross-restaurant pulse for an
// owner — single restaurant feedback list is at /admin/restaurants/[id]
// (§38.76). This is the owner-pulse equivalent.
//
// IDOR: admin must be superadmin. Restaurant scope filtered by userId
// (owner). hasKvkkConsent + non-anonymous filter intentionally omitted —
// admin tier is allowed to see anonymous feedback for ops triage.
export const dynamic = 'force-dynamic';

const LIMIT = 10;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Admin-aggregate restaurants for owner — bound list size to keep query lean.
  const restaurants = await prisma.restaurant.findMany({
    where: { userId: id },
    select: { id: true, name: true },
    take: 50,
  });

  if (restaurants.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const restaurantIds = restaurants.map((r) => r.id);
  const restaurantMap = new Map(restaurants.map((r) => [r.id, r.name]));

  // Feedback.restaurantId schema'da nullable (orphan feedback / soft-delete
  // edge case). Where filter `in: [...]` zaten null'ı eler, ama TS narrow
  // edemediğinden response map'inde defensive `?? ''` fallback yapılır.
  const feedbacks = await prisma.feedback.findMany({
    where: { restaurantId: { in: restaurantIds } },
    orderBy: { createdAt: 'desc' },
    take: LIMIT,
    select: {
      id: true,
      rating: true,
      comment: true,
      platform: true,
      branch: true,
      restaurantId: true,
      name: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      data: feedbacks.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        platform: f.platform,
        branch: f.branch,
        restaurantId: f.restaurantId,
        restaurantName: f.restaurantId ? restaurantMap.get(f.restaurantId) ?? null : null,
        // Customer name — KVKK-safe (admin tier scoped, not exposed to owner UI).
        // Anonim feedback'lerde null kalır.
        customerName: f.name?.trim() || null,
        createdAt: f.createdAt.toISOString(),
      })),
    },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
      },
    },
  );
}
