import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { checkProviderUrl, type IntegrationProvider } from '@/lib/integration-domains';
import { isExternalReviewProvider } from '@/lib/restaurant-features';
import { isValidEmail, isValidHexColor } from '@/lib/validations';
import { normalizeGoogleReviewInput } from '@/lib/restaurant-google-input';
import { normalizeRestaurantParam } from '@/lib/active-business';

// Stage 28 §38.104 Fix A2 — admin restaurants list cross-tab refresh edge cache.
// Restaurant mutation rare (admin POST/PATCH/DELETE always-fresh, no cache
// directive). 30s fresh + 2min SWR window cross-tab admin tab'ları + page
// reload'larda CDN edge'den döner. `private` directive admin token-isolated
// (CLAUDE.md §38.102 Stage 26 `/api/admin/me` paterni reuse).
const ADMIN_LIST_CACHE_HEADER = 'private, s-maxage=30, stale-while-revalidate=120';

// Field → provider mapping for the eight platform URLs accepted by POST.
// Lets us run the same `checkProviderUrl` hard-error gate the integration
// settings UI uses (CLAUDE.md §19.4) on the create path too — a malicious
// or sloppy owner can't seed the public review surface with a `javascript:`
// or off-domain URL that later flows into `window.location.href`.
const URL_PROVIDER_MAP: Record<string, IntegrationProvider> = {
  googleReviewUrl: 'google',
  yemekSepetiUrl: 'yemeksepeti',
  getirYemekUrl: 'getir',
  trendyolYemekUrl: 'trendyol_go',
  tripAdvisorUrl: 'tripadvisor',
  airbnbUrl: 'airbnb',
  bookingUrl: 'booking',
  yandexUrl: 'yandex',
};

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
          // Stage 10 — Yelp + Foursquare resolver chain (CLAUDE.md §38.80).
          yelpUrl: true,
          foursquareUrl: true,
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
          yelpEnabled: true,
          foursquareEnabled: true,
          externalPlatformsEnabled: true,
          primaryColor: true,
          isActive: true,
          // `defaultRedirectPlatform` powers the public review surface's
          // auto-redirect behaviour for high ratings — public-safe.
          defaultRedirectPlatform: true,
          // Stage 57 §38.138 — public review surface "Menüye geri dön" CTA
          // (thanks screen bottom action grid). `menuEnabled` admin master
          // flag + `menuPublished` owner publish toggle (CLAUDE.md §3 + §12).
          // Yalnızca her ikisi true ise public `/menu/[slug]` 404 dönmez;
          // UI conditional render ile button gizler (ölü link önleme).
          menuEnabled: true,
          menuPublished: true,
          // Stage 97 — WhatsApp opt-in channel for low-rating customers
          // on the thanks step (CLAUDE.md §19.1). Three explicit fields,
          // no transitive PII; defensive select pattern (§14.1). Public
          // surface re-validates `whatsappUrl` via `normalizeWhatsAppUrl`
          // and silently hides the button when the URL is missing or
          // invalid even if the toggle is on.
          whatsappUrl: true,
          whatsappReviewEnabled: true,
          whatsappReviewMessage: true,
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
      const publicRestaurant = restaurant.externalPlatformsEnabled
        ? restaurant
        : {
            ...restaurant,
            yemekSepetiUrl: null,
            getirYemekUrl: null,
            trendyolYemekUrl: null,
            tripAdvisorUrl: null,
            airbnbUrl: null,
            bookingUrl: null,
            yandexUrl: null,
            yelpUrl: null,
            foursquareUrl: null,
            yemekSepetiEnabled: false,
            getirEnabled: false,
            trendyolEnabled: false,
            tripAdvisorEnabled: false,
            airbnbEnabled: false,
            bookingEnabled: false,
            yandexEnabled: false,
            yelpEnabled: false,
            foursquareEnabled: false,
            defaultRedirectPlatform: isExternalReviewProvider(restaurant.defaultRedirectPlatform)
              ? null
              : restaurant.defaultRedirectPlatform,
          };

      return NextResponse.json(
        { ...publicRestaurant, latestChecks },
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
    // - quota_full           → trial restaurants whose feedback count ≥ TRIAL_QUOTA × 0.9
    // - unverified_platform  → googleReviewUrl IS NOT NULL AND googlePlaceId IS NULL
    // Forces status=all so passive accounts surface too (deactivated trials etc.)
    const attention = adminParams.get('attention') || '';
    const requestedRestaurantId = normalizeRestaurantParam(
      adminParams.get('restaurantId') ?? adminParams.get('restaurant'),
    );
    const ATTENTION_VALUES = new Set(['quota_full', 'unverified_platform']);
    const attentionActive = ATTENTION_VALUES.has(attention);
    const skip = (page - 1) * limit;

    const where: Prisma.RestaurantWhereInput = {};
    const scopedIds = await getScopedRestaurantIds(actor);

    if (scopedIds !== null) {
      where.id = { in: scopedIds };
    }

    if (attentionActive) {
      // attention deeplink overrides status — full superset visible
      if (attention === 'unverified_platform') {
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

    if (requestedRestaurantId) {
      const allowedByScope = scopedIds === null || scopedIds.includes(requestedRestaurantId);
      if (!allowedByScope) {
        where.id = { in: [] };
      } else {
        const currentIdFilter = where.id;
        if (
          currentIdFilter &&
          typeof currentIdFilter === 'object' &&
          'in' in currentIdFilter &&
          Array.isArray(currentIdFilter.in)
        ) {
          where.id = currentIdFilter.in.includes(requestedRestaurantId)
            ? requestedRestaurantId
            : { in: [] };
        } else {
          where.id = requestedRestaurantId;
        }
      }
    }

    // Server-render read batch — Supabase pgbouncer connection_limit=1 disipline
    // gereği `Promise.all` yerine `prisma.$transaction([...])` (CLAUDE.md §14.1
    // + §38.99 Phase B). Tek connection üzerinden sıralı çalışır; pool queue
    // riski olmadan iki query batch'lenir. Read-only → batch mode.
    const [restaurants, total] = await prisma.$transaction([
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

    return NextResponse.json(
      {
        data: enriched,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
      { headers: { 'Cache-Control': ADMIN_LIST_CACHE_HEADER } },
    );
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
    const normalizedGoogle = normalizeGoogleReviewInput(
      typeof googlePlaceId === 'string' && googlePlaceId.trim()
        ? googlePlaceId
        : googleReviewUrl,
    );
    const platformUrlBody = {
      ...body,
      googleReviewUrl: normalizedGoogle.googleReviewUrl,
    };

    if (!name || !slug) {
      return ApiErrors.badRequest('Ad ve slug zorunludur', 'MISSING_FIELDS');
    }

    // Validate slug format (lowercase alphanumeric + hyphens only)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return ApiErrors.badRequest('Slug sadece küçük harf, rakam ve tire içerebilir', 'INVALID_SLUG');
    }

    // Validate every platform URL on hard-error severity. Warnings (homepage
    // / not_review_link) pass through the same way the IntegrationCard UI
    // allows them — we only want to block clearly malicious or wrong-domain
    // values here (`wrong_protocol`, `wrong_domain`, `invalid_url`).
    for (const [field, provider] of Object.entries(URL_PROVIDER_MAP)) {
      const value = platformUrlBody[field as keyof typeof platformUrlBody];
      if (typeof value !== 'string' || !value.trim()) continue;
      const result = checkProviderUrl(provider, value);
      if (!result.ok && result.severity === 'error') {
        return ApiErrors.badRequest(
          `${field} geçersiz: ${result.reason}`,
          'INVALID_PLATFORM_URL',
        );
      }
    }

    // primaryColor — must be a hex color. Without this gate an admin could
    // create a restaurant whose primaryColor is an XSS / CSS-injection-shaped
    // value that the public surface echoes into inline styles. PUT had this
    // gate (CLAUDE.md §37.2 E); POST was missing it — drift fix.
    if (primaryColor !== undefined && primaryColor !== null && primaryColor !== '') {
      if (!isValidHexColor(primaryColor)) {
        return ApiErrors.badRequest('Geçersiz renk kodu (#RGB veya #RRGGBB)', 'INVALID_PRIMARY_COLOR');
      }
    }

    // notificationEmail — when set must be a real e-mail capped at 256 chars.
    // Mirrors PUT validation. Without this gate ops/error notification
    // recipients could be arbitrary text injected at create time.
    if (notificationEmail !== undefined && notificationEmail !== null && notificationEmail !== '') {
      if (typeof notificationEmail !== 'string' || !isValidEmail(notificationEmail) || notificationEmail.length > 256) {
        return ApiErrors.badRequest('Geçerli bir bildirim e-postası girin', 'INVALID_NOTIFICATION_EMAIL');
      }
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
        googlePlaceId: normalizedGoogle.googlePlaceId,
        googleReviewUrl: normalizedGoogle.googleReviewUrl,
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
