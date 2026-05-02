import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';

// GET /api/restaurants - List all restaurants (admin) or get by slug (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  // Public lookup by slug (used by /r/[slug] feedback form).
  // Explicit `select` keeps the endpoint resilient to schema/DB drift on
  // unrelated columns (CLAUDE.md §14.1) — `findUnique` without `select`
  // pulls every Restaurant column, so any column listed in schema.prisma
  // that doesn't exist in the live DB throws `P2022 column does not exist`
  // and bubbles up as a 500.
  if (slug) {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          address: true,
          phone: true,
          googlePlaceId: true,
          getirYemekUrl: true,
          yemekSepetiUrl: true,
          trendyolYemekUrl: true,
          // Konaklama / non-delivery vertical platforms — public surface
          // needs them to honour `?platform=tripadvisor|airbnb|booking|yandex`
          // QR params.
          tripAdvisorUrl: true,
          airbnbUrl: true,
          bookingUrl: true,
          yandexUrl: true,
          // Per-platform enabled toggles — public review surface honours
          // them via `resolveBestRedirectPlatform` (CLAUDE.md §19.4.3).
          // Owner toggling a platform off in panel must take effect on
          // /r/[slug] without requiring URL removal.
          googleEnabled: true,
          yemekSepetiEnabled: true,
          getirEnabled: true,
          trendyolEnabled: true,
          tripAdvisorEnabled: true,
          airbnbEnabled: true,
          bookingEnabled: true,
          yandexEnabled: true,
          primaryColor: true,
          isActive: true,
          // `defaultRedirectPlatform` powers the public review surface's
          // auto-redirect behaviour for high ratings — public-safe.
          defaultRedirectPlatform: true,
        },
      });

      if (!restaurant || !restaurant.isActive) {
        return ApiErrors.notFound('İşletme bulunamadı');
      }

      // Wave 4 — broken-skip data downstream (CLAUDE.md §19.4.5 + §23.7
      // Phase 11.28). Cron (Wave 2) günde 1 kez aktif platformları test
      // ediyor; son 24 saat içinde fail olan provider'lar resolver'da
      // skip edilir (`/r/[slug]` resolveBestRedirectPlatform). Tek query
      // + JS reduce ile provider başına latest check.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const checks = await prisma.platformLinkCheck.findMany({
        where: { restaurantId: restaurant.id, checkedAt: { gte: since } },
        orderBy: { checkedAt: 'desc' },
        take: 100,
        select: { provider: true, ok: true, checkedAt: true },
      });
      const latestChecks: Record<string, { ok: boolean; checkedAt: string }> = {};
      for (const c of checks) {
        if (latestChecks[c.provider]) continue;
        latestChecks[c.provider] = {
          ok: c.ok,
          checkedAt: c.checkedAt.toISOString(),
        };
      }

      // Edge cache: restaurant data rarely changes (owner edits its
      // platform URLs / default platform a few times a month at most), but
      // every `/r/[slug]` page load fetches it. Cache 60s fresh + 5min
      // stale-while-revalidate at the Vercel CDN — read-heavy public
      // surface (~1000 review-flows/day) goes from 1000 Postgres hits to
      // ~24 (one per minute, edge-shared). Owner updates take up to ~6min
      // worst case to propagate; documented in CLAUDE.md §19.4.
      // Latest checks dahil cache'lenir — cron günde 1, 60s freshness yeterli.
      return NextResponse.json(
        { ...restaurant, latestChecks },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        },
      );
    } catch (error) {
      const err = error as { code?: string; message?: string };
      console.error('Restaurant lookup error:', {
        slug,
        code: err?.code,
        message: err?.message,
      });
      return ApiErrors.internalError('Sunucu hatası');
    }
  }

  // Admin: List all restaurants
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  try {
    const { searchParams: adminParams } = new URL(req.url);
    const page = Math.max(1, parseInt(adminParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(adminParams.get('limit') || '20')));
    const status = adminParams.get('status') || 'active';
    // Optional plan filter (Pulse 2026-04 design AdminBusinesses tab — pro |
    // growth | starter | trial | all). Joins through `user.plan` because
    // plan lives on the owner User row, not on Restaurant. 'all' = unfiltered.
    const planFilter = adminParams.get('plan') || 'all';
    // Admin "Needs attention" deeplink filter (CLAUDE.md §11.36).
    // - kvkk_missing         → Restaurant.kvkkText null/empty
    // - quota_full           → trial restaurants whose feedback count ≥ TRIAL_QUOTA × 0.9
    // - unverified_platform  → googleReviewUrl IS NOT NULL AND googlePlaceId IS NULL
    // Forces status=all so passive accounts surface too (deactivated trials etc.)
    const attention = adminParams.get('attention') || '';
    const ATTENTION_VALUES = new Set(['kvkk_missing', 'quota_full', 'unverified_platform']);
    const attentionActive = ATTENTION_VALUES.has(attention);
    const skip = (page - 1) * limit;

    const where: Prisma.RestaurantWhereInput = {};
    const scopedIds = await getScopedRestaurantIds(actor);

    if (scopedIds !== null) {
      where.id = { in: scopedIds };
    }

    if (attentionActive) {
      // attention deeplink overrides status — full superset visible
      if (attention === 'kvkk_missing') {
        where.OR = [{ kvkkText: null }, { kvkkText: '' }];
      } else if (attention === 'unverified_platform') {
        where.googleReviewUrl = { not: null };
        where.googlePlaceId = null;
      } else if (attention === 'quota_full') {
        // Quota-full needs row-level _count which Prisma can't filter in
        // `where` directly. Pre-resolve the matching ids, then narrow the
        // main query — keeps pagination + ordering intact.
        const TRIAL_QUOTA = 2000;
        const trialRestaurants = await prisma.restaurant.findMany({
          where: { user: { plan: 'trial' } },
          select: { id: true, _count: { select: { feedbacks: true } } },
        });
        const quotaIds = trialRestaurants
          .filter((r) => r._count.feedbacks >= TRIAL_QUOTA * 0.9)
          .map((r) => r.id);
        // Narrow scope-aware id filter: when scopedIds is null (superadmin)
        // accept the full quota set; otherwise intersect.
        if (scopedIds !== null) {
          const allowed = new Set(scopedIds);
          where.id = { in: quotaIds.filter((id) => allowed.has(id)) };
        } else {
          where.id = { in: quotaIds };
        }
      }
    } else if (status === 'active') {
      where.isActive = true;
    } else if (status === 'passive') {
      where.isActive = false;
    }
    // 'all' means no filter on isActive

    // Plan filter — join user.plan. Restaurants without a user (orphans) are
    // excluded from any specific plan filter; 'all' still includes them.
    if (planFilter !== 'all') {
      const ALLOWED_PLANS = new Set(['pro', 'growth', 'starter', 'trial', 'monthly', 'yearly', 'free']);
      if (ALLOWED_PLANS.has(planFilter)) {
        where.user = { plan: planFilter };
      }
    }

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              plan: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              feedbacks: true,
              menuItems: { where: { deletedAt: null } },
              qrGenerations: true,
              adminUsers: true,
            },
          },
        },
      }),
      prisma.restaurant.count({ where }),
    ]);

    // Compute avgRating per restaurant — single groupBy aggregate (no N+1).
    // AdminBusinesses table column "Puan" needs this; null means no feedbacks yet.
    const restaurantIds = restaurants.map((r) => r.id);
    const avgGroups = restaurantIds.length
      ? await prisma.feedback.groupBy({
          by: ['restaurantId'],
          where: { restaurantId: { in: restaurantIds } },
          _avg: { rating: true },
        })
      : [];
    const avgByRestaurant = new Map<string, number>(
      avgGroups
        .filter((g) => g._avg.rating !== null)
        .map((g) => [g.restaurantId, g._avg.rating as number] as [string, number]),
    );

    const enriched = restaurants.map((r) => ({
      ...r,
      avgRating: avgByRestaurant.get(r.id) ?? null,
    }));

    return NextResponse.json({
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Failed to fetch restaurants:', error);
    return ApiErrors.internalError('İşletmeler çekilemedi');
  }
}

// POST /api/restaurants - Create a new restaurant (admin only)
export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  if (actor.role === 'manager') {
    return ApiErrors.forbidden('Bu işlem için yetkiniz yok');
  }

  try {
    const body = await req.json();
    const { name, slug, category, address, city, kvkkText, phone, googlePlaceId, googleReviewUrl, notificationEmail, primaryColor, getirYemekUrl, yemekSepetiUrl, trendyolYemekUrl, tripAdvisorUrl, airbnbUrl, bookingUrl, yandexUrl, userId: bodyUserId } = body;

    if (!name || !slug) {
      return ApiErrors.badRequest('Ad ve slug zorunludur', 'MISSING_FIELDS');
    }

    // Validate slug format (lowercase alphanumeric + hyphens only)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return ApiErrors.badRequest('Slug sadece küçük harf, rakam ve tire içerebilir', 'INVALID_SLUG');
    }

    // Resolve owner. Owners assign to themselves. Superadmin may pass a
    // userId to attach the restaurant to a customer; omitting userId yields
    // an orphan (unassigned) restaurant — logged for audit.
    let ownerUserId: string | null = null;
    if (actor.role === 'restaurant_owner') {
      ownerUserId = actor.id;
    } else if (actor.role === 'superadmin') {
      if (bodyUserId === null || bodyUserId === undefined || bodyUserId === '') {
        ownerUserId = null;
        console.warn('[RESTAURANTS_POST] Creating orphan restaurant', { admin: actor.id, slug });
      } else {
        if (typeof bodyUserId !== 'string') {
          return ApiErrors.badRequest('Geçersiz userId', 'INVALID_USER_ID');
        }
        const user = await prisma.user.findUnique({ where: { id: bodyUserId }, select: { id: true } });
        if (!user) {
          return ApiErrors.badRequest('Belirtilen kullanıcı bulunamadı', 'INVALID_USER_ID');
        }
        ownerUserId = bodyUserId;
      }
    }

    // Check duplicate slug
    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (existing) {
      return ApiErrors.conflict('Bu slug zaten kullanılıyor');
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        category: category || 'Restoran',
        address: address || null,
        city: typeof city === 'string' && city.trim() ? city.trim() : null,
        kvkkText: typeof kvkkText === 'string' && kvkkText.trim() ? kvkkText : null,
        phone: phone || null,
        googlePlaceId: googlePlaceId || null,
        googleReviewUrl: googleReviewUrl || null,
        notificationEmail: notificationEmail || null,
        primaryColor: primaryColor || '#C6F24E',
        getirYemekUrl: getirYemekUrl || null,
        yemekSepetiUrl: yemekSepetiUrl || null,
        trendyolYemekUrl: trendyolYemekUrl || null,
        tripAdvisorUrl: tripAdvisorUrl || null,
        airbnbUrl: airbnbUrl || null,
        bookingUrl: bookingUrl || null,
        yandexUrl: yandexUrl || null,
        userId: ownerUserId,
      },
    });

    return NextResponse.json(restaurant, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return ApiErrors.conflict('Bu slug zaten kullanılıyor');
    }
    console.error('Failed to create restaurant:', error);
    return ApiErrors.internalError('İşletme oluşturulamadı');
  }
}
