import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { deriveCustomerFields } from '@/lib/customers';

// GET /api/admin/customers/by-key/[key] — admin-tier cross-restaurant customer
// detail (CLAUDE.md §38.93 Stage A1 + §4.5 admin terminology).
//
// Mirrors owner endpoint /api/customers/[key]/route.ts (CLAUDE.md §38.16) with
// 2 differences:
//   1. Auth — superadmin only (cross-restaurant scope, no owner whitelist).
//   2. Path — by-key/[key] avoids name collision with the legacy
//      /api/admin/customers/[id] User PUT/DELETE handler.
//
// Key format: "restaurantId|contactKey" (contactKey = lower(email) || phone).
// Drawer fetcher uses this. Restaurant adı response'a embedded — admin
// cross-restaurant view'da işletme adı + admin link'i drawer'da görünür.
export const dynamic = 'force-dynamic';

const MAX_FEEDBACKS = 50;

interface FeedbackPayload {
  id: string;
  rating: number;
  comment: string | null;
  platform: string | null;
  branch: string | null;
  createdAt: string;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  // Stage A2 §38.94 — RBAC: customers:read.
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'customers', 'read'))) {
    return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
  }

  const { key } = await context.params;
  const decoded = decodeURIComponent(key);
  const pipeIdx = decoded.indexOf('|');
  if (pipeIdx === -1) {
    return NextResponse.json({ error: 'Geçersiz anahtar' }, { status: 400 });
  }
  const restaurantId = decoded.slice(0, pipeIdx);
  const contactKey = decoded.slice(pipeIdx + 1).trim();
  if (!restaurantId || !contactKey) {
    return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
  }

  // hasKvkkConsent zorunlu (LIST endpoint ile aynı disiplin, §13.5).
  const customerWhere = {
    restaurantId,
    hasKvkkConsent: true,
    OR: [
      { email: { equals: contactKey, mode: 'insensitive' as const } },
      { phone: contactKey },
    ],
  };

  try {
    const [feedbacks, restaurant, agg] = await Promise.all([
      prisma.feedback.findMany({
        where: customerWhere,
        orderBy: { createdAt: 'desc' },
        take: MAX_FEEDBACKS,
        select: {
          id: true,
          rating: true,
          comment: true,
          platform: true,
          branch: true,
          createdAt: true,
          name: true,
          email: true,
          phone: true,
          foodRating: true,
          serviceRating: true,
          atmosphereRating: true,
        },
      }),
      // Admin cross-restaurant — restaurant adı + admin link için userId de
      // çekilir (drawer'dan owner detail'e jump için).
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true, slug: true, userId: true },
      }),
      prisma.feedback.aggregate({
        where: customerWhere,
        _count: { _all: true },
        _avg: { rating: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
    ]);

    if (agg._count._all === 0 || feedbacks.length === 0) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    const latestName = feedbacks.find((f) => f.name && f.name.trim())?.name ?? null;
    const latestEmail = feedbacks.find((f) => f.email && f.email.trim())?.email ?? null;
    const latestPhone = feedbacks.find((f) => f.phone && f.phone.trim())?.phone ?? null;

    const items: FeedbackPayload[] = feedbacks.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      platform: f.platform,
      branch: f.branch,
      createdAt: f.createdAt.toISOString(),
    }));

    const visits = agg._count._all;
    const avgRating = agg._avg.rating;
    const derived = deriveCustomerFields({
      visits,
      avgRating,
      lastAt: agg._max.createdAt,
    });

    const lastFeedback = feedbacks[0];
    const lastPlatform = lastFeedback?.platform ?? null;
    const lastFoodRating = lastFeedback?.foodRating ?? null;
    const lastServiceRating = lastFeedback?.serviceRating ?? null;
    const lastAtmosphereRating = lastFeedback?.atmosphereRating ?? null;

    return NextResponse.json(
      {
        customer: {
          key: decoded,
          name: latestName,
          email: latestEmail,
          phone: latestPhone,
          restaurantId,
          restaurantName: restaurant?.name ?? null,
          // Admin-only: drill-down to owner detail
          restaurantOwnerUserId: restaurant?.userId ?? null,
          restaurantSlug: restaurant?.slug ?? null,
        },
        stats: {
          totalReviews: visits,
          avgRating,
          firstSeenAt: agg._min.createdAt?.toISOString() ?? null,
          lastSeenAt: agg._max.createdAt?.toISOString() ?? null,
          truncated: visits > MAX_FEEDBACKS,
          segment: derived.segment,
          ltv: derived.ltv,
          sentiment: derived.sentiment,
          daysSinceLastVisit: derived.daysSinceLastVisit,
          lastPlatform,
          lastFoodRating,
          lastServiceRating,
          lastAtmosphereRating,
          lastRating: lastFeedback?.rating ?? null,
        },
        feedbacks: items,
      },
      {
        headers: {
          // Owner-scoped + IDOR-gated read; short cache window.
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
        },
      },
    );
  } catch (error) {
    console.error('[ADMIN_CUSTOMER_DETAIL_GET]', { restaurantId, error });
    return NextResponse.json({ error: 'Müşteri detayı getirilemedi' }, { status: 500 });
  }
}
