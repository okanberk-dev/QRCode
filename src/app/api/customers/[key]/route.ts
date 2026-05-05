import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { deriveCustomerFields } from '@/lib/customers';

// Phase 8d — Customer detail (CLAUDE.md §23.7 Phase 12).
// Phase 8c (CLAUDE.md §38.16) extends response with segment + ltv + sentiment
// derived via lib/customers.ts saf helper'ları (drawer 4-tile + chip için).
//
// Owner-scoped single customer endpoint. URL key = "restaurantId|contactKey"
// (contactKey = lower(email) || phone). Drawer fetcher kullanır.
//
// IDOR: getScopedRestaurantIds + restaurant_id whitelist. ContactKey email
// veya phone — Prisma OR clause ile match (insensitive email + exact phone).
// Anonim feedback (email + phone null) zaten LIST endpoint'te filtrelenmiş
// olduğundan key'de yer almaz; bu endpoint ekstra check'e gerek bırakmaz.

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
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  // Owner-only — superadmin (null scope) admin endpoint kullanır.
  const scopedIds = await getScopedRestaurantIds(actor);
  if (scopedIds === null) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const { key } = await context.params;
  const decoded = decodeURIComponent(key);
  // Format: "restaurantId|contactKey". Pipe contact_key içinde olamaz çünkü
  // email ve phone karakterlerinde '|' bulunmaz; ilk pipe split yeterli.
  const pipeIdx = decoded.indexOf('|');
  if (pipeIdx === -1) {
    return NextResponse.json({ error: 'Geçersiz anahtar' }, { status: 400 });
  }
  const restaurantId = decoded.slice(0, pipeIdx);
  const contactKey = decoded.slice(pipeIdx + 1).trim();
  if (!restaurantId || !contactKey || !scopedIds.includes(restaurantId)) {
    return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
  }

  // Match contact key — email lower-case (insensitive) veya phone exact.
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
          // §38.47 — son feedback'in aspect rating'leri (lastTopic için).
          foodRating: true,
          serviceRating: true,
          atmosphereRating: true,
        },
      }),
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { name: true },
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

    // Latest non-null name/email/phone (tek müşteri kayıtları zamanla isim
    // güncellenmiş olabilir; en yeni dolu olanı kullan).
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

    // Derive Phase 8c segment + LTV + sentiment for drawer chips/tile.
    // §38.47 — last feedback's platform + aspect ratings forwarded for the
    // drawer's metadata grid (UI derives lastTopic + lastChannel via helper
    // with locale at render time — same DRY pattern as list endpoint).
    const visits = agg._count._all;
    const avgRating = agg._avg.rating;
    const derived = deriveCustomerFields({
      visits,
      avgRating,
      lastAt: agg._max.createdAt,
    });

    const lastFeedback = feedbacks[0]; // sorted DESC, ilk = en yeni
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
          // §38.47 — drawer metadata grid'i için raw alanlar.
          lastPlatform,
          lastFoodRating,
          lastServiceRating,
          lastAtmosphereRating,
          lastRating: lastFeedback?.rating ?? null,
        },
        feedbacks: items,
      },
      {
        // Owner-scoped read; cache short window — drawer açılırken stale OK.
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
        },
      },
    );
  } catch (error) {
    console.error('[OWNER_CUSTOMER_DETAIL_GET]', { restaurantId, error });
    return NextResponse.json({ error: 'Müşteri detayı getirilemedi' }, { status: 500 });
  }
}
