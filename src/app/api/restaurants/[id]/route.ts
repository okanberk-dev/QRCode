import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant, canDeleteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { isValidEmail, isValidHexColor } from '@/lib/validations';
import { checkProviderUrl, type IntegrationProvider } from '@/lib/integration-domains';
import { isExternalPlatformField, isExternalReviewProvider } from '@/lib/restaurant-features';
import { normalizeGoogleReviewInput } from '@/lib/restaurant-google-input';
import { writePanelAuditLog } from '@/lib/audit-log';
import { revalidatePublicMenu } from '@/lib/restaurant-revalidate';
import { withServerTiming } from '@/lib/server-timing';

// Field → provider mapping shared with /api/restaurants POST. Keeps the
// hard-error gate (invalid_url / wrong_protocol / wrong_domain) consistent
// across create and update so an owner can't smuggle a `javascript:` /
// off-domain URL into a row that later flows into `window.location.href`
// on the public review surface.
const URL_PROVIDER_MAP: Record<string, IntegrationProvider> = {
  googleReviewUrl: 'google',
  yemekSepetiUrl: 'yemeksepeti',
  getirYemekUrl: 'getir',
  trendyolYemekUrl: 'trendyol_go',
  tripAdvisorUrl: 'tripadvisor',
  airbnbUrl: 'airbnb',
  bookingUrl: 'booking',
  yandexUrl: 'yandex',
  // §38.52 — Yelp + Foursquare
  yelpUrl: 'yelp',
  foursquareUrl: 'foursquare',
};

// Platform / social URL columns: trim + 500-char cap + non-string → null,
// identical to the social-field treatment below. A non-string body value
// (e.g. `googleReviewUrl: 123`) used to skip the URL_PROVIDER_MAP validator
// (`typeof !== 'string'` → continue) and then blow up inside Prisma as a 500.
function normalizeUrlInput(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

// Hard cap on inline-base64 menu logos — mirrors validations.ts imageUrl
// limit (300 KB ≈ 220 KB binary). Without it an owner could blow up the
// row size by pasting a multi-megabyte data URL straight into PUT body.
const MENU_LOGO_MAX_LEN = 300_000;

// GET /api/restaurants/[id]
async function handleGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  if (!(await canAccessRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    // Tek round-trip: restaurant + non-QR counts. QrGeneration tablosu history
    // (her regen = +1 row) — distinct (tableNumber, platform, type) combo'larını
    // ayrıca count'luyoruz; aksi halde owner panelde "1 QR var ama 2 yazıyor"
    // false-positive'i çıkıyor.
    // CLAUDE.md §40.1 — Supabase pooler `connection_limit=1` altında same-request
    // paralel Prisma read'leri `prisma.$transaction([...])` ile tek connection
    // üstünden sıralı çalışmalı (Promise.all timeout riskini eler).
    //
    // The ≤520K-char cover data URL is only read by the owner Menu Studio,
    // which asks for it with `?withCover=1`; every other caller skips it.
    const withCover = req.nextUrl.searchParams.get('withCover') === '1';
    const [restaurant, qrDistinctRows] = await prisma.$transaction([
      prisma.restaurant.findUnique({
        where: { id },
        omit: { menuCoverUrl: !withCover },
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
              adminUsers: true,
            },
          },
        },
      }),
      prisma.qrGeneration.findMany({
        where: { restaurantId: id },
        select: { tableNumber: true, platform: true, type: true },
        distinct: ['tableNumber', 'platform', 'type'],
      }),
    ]);

    if (!restaurant) {
      return ApiErrors.notFound('İşletme bulunamadı');
    }

    return NextResponse.json({
      ...restaurant,
      _count: {
        ...restaurant._count,
        qrGenerations: qrDistinctRows.length,
      },
    });
  } catch (error) {
    // CLAUDE.md §37.7 + §40.1.PII — raw error log'lama: Prisma error.meta
    // PII (email/phone) içerebilir, Vercel logs'a + Sentry extra'ya gider.
    // Sadece error type + truncated message log'la.
    console.error('[restaurants:get] failed', {
      restaurantId: id,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message.slice(0, 200) : 'non-error',
    });
    return ApiErrors.internalError('İşletme çekilemedi');
  }
}

// PUT /api/restaurants/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  // Write op — viewer rolü restoran ayarlarını değiştiremez.
  if (!(await canWriteRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    // Malformed / non-object JSON used to throw inside destructuring and
    // surface as a 500; it is a client error.
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return ApiErrors.badRequest('Geçersiz istek gövdesi', 'INVALID_JSON');
    }
    const {
      name,
      slug,
      category,
      address,
      city,
      kvkkText,
      description,
      website,
      phone,
      googlePlaceId,
      googleReviewUrl,
      googleReviewManagementEnabled,
      pulseAiEnabled,
      aiAnalyticsEnabled,
      externalPlatformsEnabled,
      notificationEmail,
      primaryColor,
      isActive,
      getirYemekUrl,
      yemekSepetiUrl,
      trendyolYemekUrl,
      menuLogoUrl,
      userId,
      defaultRedirectPlatform,
      redirectMinRating,
      // Per-platform enable flags (Pulse 2026-04 owner panel toggles)
      googleEnabled,
      yemekSepetiEnabled,
      getirEnabled,
      trendyolEnabled,
      // Konaklama segmenti (Step 11)
      tripAdvisorUrl,
      airbnbUrl,
      tripAdvisorEnabled,
      airbnbEnabled,
      // Konaklama / TR-pazarı ek platformlar (yeni — booking + yandex)
      bookingUrl,
      yandexUrl,
      bookingEnabled,
      yandexEnabled,
      // §38.52 — Yelp + Foursquare yorum platformları (hibrit taksonomi)
      yelpUrl,
      foursquareUrl,
      yelpEnabled,
      foursquareEnabled,
      // Faz 2 — Sosyal medya entegrasyonları
      instagramUrl,
      facebookUrl,
      whatsappUrl,
      // Stage 97 — opt-in WhatsApp channel for the public review surface.
      // Validated below (boolean + 500-char text + cross-field guard).
      whatsappReviewEnabled,
      whatsappReviewMessage,
      reservationUrl,
      // "Diğer" custom platform (CLAUDE.md §X — owner free-form review URL)
      otherPlatformUrl,
      otherPlatformLabel,
      otherPlatformEnabled,
      // Faz 3 — Operasyonel ayarlar
      workingHours,
      temporarilyClosed,
      closedReason,
      // Phase 8c+ §38.26 — Owner-tanımlı hedef puan (Analytics 14-week trend
      // chart için). Null = unset, 1.0–5.0 arası float. UI client'ta validate
      // edilir; server'da defansif aralık kontrolü (mass assignment guard).
      targetRating,
    } = body;

    // Basic shape checks for free-text identity fields. They used to reach
    // Prisma untyped (a number → 500) and without length caps (POST caps
    // kvkkText at 5000; PUT accepted anything).
    const TEXT_LIMITS: Array<[string, unknown, number, boolean]> = [
      // [label, value, maxLen, required-non-empty-when-present]
      ['name', name, 120, true],
      ['category', category, 80, true],
      ['address', address, 500, false],
      ['phone', phone, 40, false],
      ['kvkkText', kvkkText, 5000, false],
      ['city', city, 80, false],
      ['description', description, 2000, false],
      ['googlePlaceId', googlePlaceId, 2000, false],
    ];
    for (const [label, value, max, required] of TEXT_LIMITS) {
      if (value === undefined || value === null) continue;
      if (typeof value !== 'string') {
        return ApiErrors.badRequest(`${label} metin olmalı`, 'INVALID_FIELD_TYPE');
      }
      if (value.length > max) {
        return ApiErrors.badRequest(`${label} en fazla ${max} karakter olabilir`, 'FIELD_TOO_LONG');
      }
      if (required && !value.trim()) {
        return ApiErrors.badRequest(`${label} boş olamaz`, 'FIELD_REQUIRED');
      }
    }
    // `slug: ""` used to slip past the regex check (`if (slug)`) and be
    // written as an empty string; null would 500 on the non-null column.
    if (slug !== undefined && (typeof slug !== 'string' || !slug.trim() || slug.length > 80)) {
      return ApiErrors.badRequest('Geçersiz slug', 'INVALID_SLUG');
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return ApiErrors.badRequest('isActive bir boolean olmalı', 'INVALID_IS_ACTIVE');
    }

    // Google input. The admin restaurant form (and Places-linked owners)
    // store a raw Place ID like "ChIJ…" in `googlePlaceId` and mirror it into
    // `googleReviewUrl`; that raw ID failed the URL validator below with
    // INVALID_PLATFORM_URL, so the admin could not save ANYTHING (name, owner
    // reassignment, notification email) on those restaurants. POST already
    // normalises via normalizeGoogleReviewInput — PUT now does the same when
    // the review URL is absent or just echoes the place id.
    let resolvedGoogleReviewUrl: unknown = googleReviewUrl;
    if (
      typeof googlePlaceId === 'string' &&
      googlePlaceId.trim() &&
      (googleReviewUrl === undefined ||
        (typeof googleReviewUrl === 'string' && googleReviewUrl.trim() === googlePlaceId.trim()))
    ) {
      resolvedGoogleReviewUrl = normalizeGoogleReviewInput(googlePlaceId).googleReviewUrl;
    }

    // Phase 12.6 — defaultRedirectPlatform whitelist. NULL or '' = clear
    // (back to legacy Google fallback). Anything else must be one of the
    // supported keys; mirrors Feedback.platform values + /r/[slug]
    // platformUrls map. Konaklama / catch-all sectors can default to
    // tripadvisor/airbnb when those URLs are filled in.
    const ALLOWED_DEFAULT_PLATFORMS = new Set([
      'google', 'yemeksepeti', 'getir', 'trendyol_go',
      'tripadvisor', 'airbnb', 'booking', 'yandex', 'yelp', 'foursquare',
    ]);
    if (defaultRedirectPlatform !== undefined && defaultRedirectPlatform !== null && defaultRedirectPlatform !== '') {
      if (typeof defaultRedirectPlatform !== 'string' || !ALLOWED_DEFAULT_PLATFORMS.has(defaultRedirectPlatform)) {
        return ApiErrors.badRequest('Geçersiz varsayılan platform', 'INVALID_DEFAULT_PLATFORM');
      }
    }

    // Public review flow threshold. Only 4 or 5 are meaningful: 5 (default)
    // hands the public platform link to 5-star customers only, 4 keeps the
    // legacy 4+ behaviour. Anything else is rejected rather than silently
    // coerced so an owner never thinks they saved a value that was dropped.
    if (redirectMinRating !== undefined && redirectMinRating !== null) {
      if (redirectMinRating !== 4 && redirectMinRating !== 5) {
        return ApiErrors.badRequest(
          'Yönlendirme eşiği yalnızca 4 veya 5 olabilir',
          'INVALID_REDIRECT_MIN_RATING',
        );
      }
    }

    // Section 1 — website URL validation (Faz 1). Empty string clears it.
    if (website !== undefined && website !== null && website !== '' && typeof website === 'string') {
      try {
        const u = new URL(website);
        if (!/^https?:$/.test(u.protocol)) {
          return ApiErrors.badRequest('Web sitesi http(s):// ile başlamalı', 'INVALID_WEBSITE');
        }
      } catch {
        return ApiErrors.badRequest('Geçersiz web sitesi adresi', 'INVALID_WEBSITE');
      }
    }

    // Section 7 — Çalışma saatleri format kontrolü (Faz 3). Tek string,
    // "08:00-22:00" pattern. Boş veya tek "-" → null. Gün-bazlı V2.
    if (workingHours !== undefined && workingHours !== null && workingHours !== '' && typeof workingHours === 'string') {
      const trimmed = workingHours.trim();
      if (trimmed && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(trimmed)) {
        return ApiErrors.badRequest('Çalışma saati formatı: 08:00-22:00', 'INVALID_WORKING_HOURS');
      }
    }

    if (closedReason !== undefined && typeof closedReason === 'string' && closedReason.length > 500) {
      return ApiErrors.badRequest('Sebep en fazla 500 karakter', 'INVALID_CLOSED_REASON');
    }

    // Phase 8c+ §38.26 — targetRating defansif validation (mass assignment +
    // range guard). Null kabul (unset). 1.0–5.0 arası float; aksi halde 400.
    if (
      targetRating !== undefined &&
      targetRating !== null &&
      (typeof targetRating !== 'number' || !Number.isFinite(targetRating) || targetRating < 1 || targetRating > 5)
    ) {
      return ApiErrors.badRequest('Hedef puan 1.0 – 5.0 arasında bir sayı olmalı', 'INVALID_TARGET_RATING');
    }

    // Section 3 — sosyal medya URL validation (Faz 2). Boş = clear.
    // "Diğer" platform aynı protokol kontrolünden geçer; domain whitelist YOK
    // (free-form, integration-domains.ts 'other' provider).
    const SOCIAL_FIELDS: Array<[string, unknown]> = [
      ['instagramUrl', instagramUrl],
      ['facebookUrl', facebookUrl],
      ['whatsappUrl', whatsappUrl],
      ['reservationUrl', reservationUrl],
      ['otherPlatformUrl', otherPlatformUrl],
    ];
    for (const [name, value] of SOCIAL_FIELDS) {
      if (value === undefined || value === null || value === '' || typeof value !== 'string') continue;
      try {
        const u = new URL(value);
        if (!/^https?:$/.test(u.protocol)) {
          return ApiErrors.badRequest(`${name} http(s):// ile başlamalı`, 'INVALID_SOCIAL_URL');
        }
      } catch {
        return ApiErrors.badRequest(`Geçersiz ${name} adresi`, 'INVALID_SOCIAL_URL');
      }
    }

    // Stage 97 — WhatsApp review opt-in (CLAUDE.md §19.1). Two
    // dependent fields validated together so a malformed PATCH can't
    // leave the review surface in an inconsistent state.
    if (whatsappReviewEnabled !== undefined && typeof whatsappReviewEnabled !== 'boolean') {
      return ApiErrors.badRequest(
        'whatsappReviewEnabled bir boolean olmalı',
        'INVALID_WHATSAPP_REVIEW_ENABLED',
      );
    }
    if (
      whatsappReviewMessage !== undefined &&
      whatsappReviewMessage !== null &&
      typeof whatsappReviewMessage !== 'string'
    ) {
      return ApiErrors.badRequest(
        'whatsappReviewMessage bir metin olmalı',
        'INVALID_WHATSAPP_REVIEW_MESSAGE',
      );
    }
    if (whatsappReviewEnabled === true) {
      // Cross-field guard: the toggle can only flip ON if a usable
      // WhatsApp URL is present in the same payload OR already on the
      // existing row. We re-fetch defensively (cheap select) instead of
      // trusting the client.
      const candidate =
        typeof whatsappUrl === 'string' && whatsappUrl.trim()
          ? whatsappUrl.trim()
          : null;
      let existingUrl: string | null = null;
      if (!candidate) {
        const existing = await prisma.restaurant.findUnique({
          where: { id },
          select: { whatsappUrl: true },
        });
        existingUrl = existing?.whatsappUrl ?? null;
      }
      const effective = candidate ?? existingUrl;
      if (!effective || !checkProviderUrl('whatsapp', effective).ok) {
        return ApiErrors.badRequest(
          'WhatsApp linki olmadan bu özellik açılamaz.',
          'INVALID_WHATSAPP_TOGGLE',
        );
      }
    }

    // Validate slug if provided
    if (slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return ApiErrors.badRequest('Slug sadece küçük harf, rakam ve tire içerebilir', 'INVALID_SLUG');
      }

      // Check duplicate slug (excluding current restaurant)
      const existing = await prisma.restaurant.findFirst({
        where: { slug, id: { not: id } }
      });
      if (existing) {
        return ApiErrors.conflict('Bu slug zaten kullanılıyor');
      }
    }

    // primaryColor — must be a hex color. The previous PUT accepted any
    // string, which let an owner stash CSS-injection / XSS-shaped values
    // that get echoed into the public surface's inline styles.
    if (primaryColor !== undefined && primaryColor !== null && primaryColor !== '') {
      if (!isValidHexColor(primaryColor)) {
        return ApiErrors.badRequest('Geçersiz renk kodu (#RGB veya #RRGGBB)', 'INVALID_PRIMARY_COLOR');
      }
    }

    // notificationEmail — when set must be a real e-mail. Without this an
    // owner could plant arbitrary text into the recipient field that ops
    // mail routes pull back on retry / error notifications.
    if (notificationEmail !== undefined && notificationEmail !== null && notificationEmail !== '') {
      if (typeof notificationEmail !== 'string' || !isValidEmail(notificationEmail) || notificationEmail.length > 256) {
        return ApiErrors.badRequest('Geçerli bir bildirim e-postası girin', 'INVALID_NOTIFICATION_EMAIL');
      }
    }

    const featureEntitlementFields = {
      pulseAiEnabled,
      aiAnalyticsEnabled,
      externalPlatformsEnabled,
    };
    if (
      Object.values(featureEntitlementFields).some((value) => value !== undefined) &&
      actor.role !== 'superadmin'
    ) {
      return ApiErrors.forbidden(
        'Paket özelliklerini sadece süperadmin değiştirebilir.',
        'FEATURE_ENTITLEMENTS_ADMIN_ONLY',
      );
    }

    // Integration platform URLs — same hard-error gate as the POST path.
    // Warning severities (homepage / not_review_link) still pass; only
    // invalid_url / wrong_protocol / wrong_domain are rejected.
    for (const [field, provider] of Object.entries(URL_PROVIDER_MAP)) {
      const value =
        field === 'googleReviewUrl'
          ? resolvedGoogleReviewUrl
          : (body as Record<string, unknown>)[field];
      if (typeof value !== 'string' || !value.trim()) continue;
      const result = checkProviderUrl(provider, value);
      if (!result.ok && result.severity === 'error') {
        return ApiErrors.badRequest(
          `${field} geçersiz: ${result.reason}`,
          'INVALID_PLATFORM_URL',
        );
      }
    }

    // menuLogoUrl — base64 data URL or http(s) link. Cap inline size so an
    // owner can't bloat the row with multi-MB payloads straight into PUT.
    //
    // Wave 2 PR-4 audit fix (A3 SVG sanitize loose): eski `data:image/`
    // prefix guard `data:image/svg+xml;base64,...` payload'ı kabul ediyordu
    // → SVG `<script>` taşıyabilir + public menu surface'ında `<img src>`
    // ile render edildiğinde stored XSS. Yeni whitelist: sadece raster
    // formatlar (jpeg/png/webp/gif/avif). SVG ileride desteklenirse
    // `sharp.rasterize()` veya `DOMPurify` sanitize ile ayrı pipeline.
    if (menuLogoUrl !== undefined && menuLogoUrl !== null && typeof menuLogoUrl === 'string' && menuLogoUrl !== '') {
      if (menuLogoUrl.length > MENU_LOGO_MAX_LEN) {
        return ApiErrors.badRequest(
          'Menü logosu çok büyük (max 300 KB)',
          'MENU_LOGO_TOO_LARGE',
        );
      }
      // Data URL whitelist — raster MIME types only. SVG ve diğer formatlar
      // (text/html, application/*) kabul edilmez.
      const DATA_URL_RASTER_RE = /^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,/i;
      const isDataUrl = menuLogoUrl.startsWith('data:');
      if (isDataUrl) {
        if (!DATA_URL_RASTER_RE.test(menuLogoUrl)) {
          return ApiErrors.badRequest(
            'Menü logosu yalnız JPEG/PNG/WebP/GIF/AVIF olabilir (SVG desteklenmiyor)',
            'INVALID_MENU_LOGO_MIME',
          );
        }
      } else {
        // Non-data URLs must be http(s) — same protocol check we apply to
        // the integration URL set, so a `javascript:` href can't slip in
        // here either.
        try {
          const u = new URL(menuLogoUrl);
          if (!/^https?:$/.test(u.protocol)) {
            return ApiErrors.badRequest('Menü logosu http(s):// olmalı', 'INVALID_MENU_LOGO');
          }
        } catch {
          return ApiErrors.badRequest('Geçersiz menü logosu adresi', 'INVALID_MENU_LOGO');
        }
      }
    }

    const currentRest = await prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        userId: true,
        isActive: true,
        suspendedByAdmin: true,
        googleReviewManagementEnabled: true,
        defaultRedirectPlatform: true,
        externalPlatformsEnabled: true,
      },
    });
    if (!currentRest) {
      return ApiErrors.notFound('İşletme bulunamadı');
    }

    // Paid entitlement — only a superadmin may CHANGE it (parity with the
    // canonical feature-access endpoint). Comparing with the stored value
    // keeps forms that always echo the field (admin detail form saved by a
    // restaurant-scoped manager) working, while a restaurant-scoped manager
    // or owner can no longer flip it through this generic PUT.
    if (
      googleReviewManagementEnabled !== undefined &&
      actor.role !== 'superadmin' &&
      Boolean(googleReviewManagementEnabled) !== currentRest.googleReviewManagementEnabled
    ) {
      return ApiErrors.forbidden(
        'Google yorum yönetimini sadece süperadmin değiştirebilir.',
        'GOOGLE_REVIEW_MANAGEMENT_ADMIN_ONLY',
      );
    }

    // Admin pause must stick. Before `suspendedByAdmin`, a superadmin
    // "Duraklat" (detail form or bulk) lasted only until the owner flipped
    // Settings → Durum back on. Only a superadmin can lift it.
    const isSuperadmin = actor.role === 'superadmin';
    if (isActive === true && currentRest.suspendedByAdmin && !isSuperadmin) {
      return ApiErrors.forbidden(
        'Bu işletme Buaze yönetimi tarafından duraklatıldı. Yeniden etkinleştirmek için destek ekibiyle iletişime geçin.',
        'SUSPENDED_BY_ADMIN',
      );
    }
    let suspendedByAdminUpdate: boolean | undefined;
    if (isSuperadmin && isActive === true) {
      suspendedByAdminUpdate = false;
    } else if (isSuperadmin && isActive === false && currentRest.isActive) {
      // Only an actual active→paused transition by the superadmin marks the
      // suspension; the admin form always sends isActive, so re-saving an
      // owner-paused restaurant must not turn it into an admin suspension.
      suspendedByAdminUpdate = true;
    }

    if (actor.source !== 'admin' && currentRest.externalPlatformsEnabled === false) {
      const touchesExternalPlatform = Object.keys(body as Record<string, unknown>).some(isExternalPlatformField);
      if (touchesExternalPlatform) {
        return ApiErrors.forbidden(
          'Google dışındaki platformlar bu işletme için kapalı.',
          'EXTERNAL_PLATFORMS_DISABLED',
        );
      }
      if (typeof defaultRedirectPlatform === 'string' && isExternalReviewProvider(defaultRedirectPlatform)) {
        return ApiErrors.forbidden(
          'Google dışındaki platformlar bu işletme için kapalı.',
          'EXTERNAL_PLATFORMS_DISABLED',
        );
      }
    }

    // Orphan-default cleanup (CLAUDE.md §19.2). If this PUT clears the URL
    // backing the stored defaultRedirectPlatform — and the caller didn't
    // already set defaultRedirectPlatform explicitly — drop the default so
    // /r/[slug] doesn't silently fall back to Google with the owner none
    // the wiser. Owner explicit value always wins over derived cleanup.
    const platformUrlInBody: Record<string, unknown> = {
      google: resolvedGoogleReviewUrl,
      yemeksepeti: yemekSepetiUrl,
      getir: getirYemekUrl,
      trendyol_go: trendyolYemekUrl,
      tripadvisor: tripAdvisorUrl,
      airbnb: airbnbUrl,
      booking: bookingUrl,
      yandex: yandexUrl,
      // §38.52 — Yelp + Foursquare orphan default cleanup
      yelp: yelpUrl,
      foursquare: foursquareUrl,
    };
    const orphanedDefault =
      defaultRedirectPlatform === undefined &&
      !!currentRest.defaultRedirectPlatform &&
      platformUrlInBody[currentRest.defaultRedirectPlatform] !== undefined &&
      !platformUrlInBody[currentRest.defaultRedirectPlatform];

    let ownerUserId: string | null | undefined = undefined;
    if (userId !== undefined) {
      if (actor.role !== 'superadmin') {
        return ApiErrors.forbidden('İşletme sahibi atamak için yetkiniz yok');
      }
      if (userId === null || userId === '') {
        ownerUserId = null;
      } else if (typeof userId === 'string') {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
          return ApiErrors.badRequest('Belirtilen işletme sahibi bulunamadı', 'INVALID_USER_ID');
        }
        ownerUserId = userId;
      } else {
        return ApiErrors.badRequest('Geçersiz işletme sahibi', 'INVALID_USER_ID');
      }
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      // Do not echo the cover blob (up to ~0.5 MB) after a settings save; the
      // Studio reads it from GET only (menu design spec §8.6).
      omit: { menuCoverUrl: true },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(category !== undefined && { category }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && {
          city: typeof city === 'string' && city.trim() ? city.trim() : null,
        }),
        ...(kvkkText !== undefined && {
          kvkkText: typeof kvkkText === 'string' && kvkkText.trim() ? kvkkText : null,
        }),
        // Section 1 — Genel Bilgiler. description ≤280 char, website new URL().
        ...(description !== undefined && {
          description:
            typeof description === 'string' && description.trim()
              ? description.trim().slice(0, 280)
              : null,
        }),
        ...(website !== undefined && {
          website:
            typeof website === 'string' && website.trim()
              ? website.trim().slice(0, 500)
              : null,
        }),
        // Faz 2 — sosyal medya alanları (Section 3)
        ...(instagramUrl !== undefined && {
          instagramUrl: typeof instagramUrl === 'string' && instagramUrl.trim() ? instagramUrl.trim().slice(0, 500) : null,
        }),
        ...(facebookUrl !== undefined && {
          facebookUrl: typeof facebookUrl === 'string' && facebookUrl.trim() ? facebookUrl.trim().slice(0, 500) : null,
        }),
        ...(whatsappUrl !== undefined && {
          whatsappUrl: typeof whatsappUrl === 'string' && whatsappUrl.trim() ? whatsappUrl.trim().slice(0, 500) : null,
        }),
        // Stage 97 — WhatsApp review opt-in fields (validated above).
        ...(whatsappReviewEnabled !== undefined && { whatsappReviewEnabled }),
        ...(whatsappReviewMessage !== undefined && {
          whatsappReviewMessage:
            typeof whatsappReviewMessage === 'string' && whatsappReviewMessage.trim()
              ? whatsappReviewMessage.trim().slice(0, 500)
              : null,
        }),
        ...(reservationUrl !== undefined && {
          reservationUrl: typeof reservationUrl === 'string' && reservationUrl.trim() ? reservationUrl.trim().slice(0, 500) : null,
        }),
        // "Diğer" custom platform (CLAUDE.md §X — owner free-form review URL).
        // Label max 60 char (UI giriş limiti); URL max 1000 (website pattern).
        ...(otherPlatformUrl !== undefined && {
          otherPlatformUrl: typeof otherPlatformUrl === 'string' && otherPlatformUrl.trim() ? otherPlatformUrl.trim().slice(0, 1000) : null,
        }),
        ...(otherPlatformLabel !== undefined && {
          otherPlatformLabel: typeof otherPlatformLabel === 'string' && otherPlatformLabel.trim() ? otherPlatformLabel.trim().slice(0, 60) : null,
        }),
        ...(otherPlatformEnabled !== undefined && {
          otherPlatformEnabled: Boolean(otherPlatformEnabled),
        }),
        // Faz 3 — Operasyonel
        ...(workingHours !== undefined && {
          workingHours: typeof workingHours === 'string' && workingHours.trim() ? workingHours.trim() : null,
        }),
        ...(temporarilyClosed !== undefined && {
          temporarilyClosed: Boolean(temporarilyClosed),
        }),
        ...(closedReason !== undefined && {
          closedReason: typeof closedReason === 'string' && closedReason.trim() ? closedReason.trim().slice(0, 500) : null,
        }),
        ...(targetRating !== undefined && {
          targetRating: typeof targetRating === 'number' ? targetRating : null,
        }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(googlePlaceId !== undefined && {
          googlePlaceId: typeof googlePlaceId === 'string' && googlePlaceId.trim() ? googlePlaceId.trim() : null,
        }),
        ...(resolvedGoogleReviewUrl !== undefined && {
          googleReviewUrl: normalizeUrlInput(resolvedGoogleReviewUrl),
        }),
        ...(googleReviewManagementEnabled !== undefined && {
          googleReviewManagementEnabled: Boolean(googleReviewManagementEnabled),
        }),
        ...(pulseAiEnabled !== undefined && { pulseAiEnabled: Boolean(pulseAiEnabled) }),
        ...(aiAnalyticsEnabled !== undefined && { aiAnalyticsEnabled: Boolean(aiAnalyticsEnabled) }),
        ...(externalPlatformsEnabled !== undefined && {
          externalPlatformsEnabled: Boolean(externalPlatformsEnabled),
        }),
        ...(notificationEmail !== undefined && { notificationEmail: notificationEmail || null }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(isActive !== undefined && { isActive }),
        ...(suspendedByAdminUpdate !== undefined && { suspendedByAdmin: suspendedByAdminUpdate }),
        ...(getirYemekUrl !== undefined && { getirYemekUrl: normalizeUrlInput(getirYemekUrl) }),
        ...(yemekSepetiUrl !== undefined && { yemekSepetiUrl: normalizeUrlInput(yemekSepetiUrl) }),
        ...(trendyolYemekUrl !== undefined && { trendyolYemekUrl: normalizeUrlInput(trendyolYemekUrl) }),
        ...(googleEnabled !== undefined && { googleEnabled: Boolean(googleEnabled) }),
        ...(yemekSepetiEnabled !== undefined && { yemekSepetiEnabled: Boolean(yemekSepetiEnabled) }),
        ...(getirEnabled !== undefined && { getirEnabled: Boolean(getirEnabled) }),
        ...(trendyolEnabled !== undefined && { trendyolEnabled: Boolean(trendyolEnabled) }),
        ...(tripAdvisorUrl !== undefined && { tripAdvisorUrl: normalizeUrlInput(tripAdvisorUrl) }),
        ...(airbnbUrl !== undefined && { airbnbUrl: normalizeUrlInput(airbnbUrl) }),
        ...(tripAdvisorEnabled !== undefined && { tripAdvisorEnabled: Boolean(tripAdvisorEnabled) }),
        ...(airbnbEnabled !== undefined && { airbnbEnabled: Boolean(airbnbEnabled) }),
        ...(bookingUrl !== undefined && { bookingUrl: normalizeUrlInput(bookingUrl) }),
        ...(yandexUrl !== undefined && { yandexUrl: normalizeUrlInput(yandexUrl) }),
        ...(bookingEnabled !== undefined && { bookingEnabled: Boolean(bookingEnabled) }),
        ...(yandexEnabled !== undefined && { yandexEnabled: Boolean(yandexEnabled) }),
        // §38.52 — Yelp + Foursquare yorum platformları PUT body
        ...(yelpUrl !== undefined && { yelpUrl: normalizeUrlInput(yelpUrl) }),
        ...(foursquareUrl !== undefined && { foursquareUrl: normalizeUrlInput(foursquareUrl) }),
        ...(yelpEnabled !== undefined && { yelpEnabled: Boolean(yelpEnabled) }),
        ...(foursquareEnabled !== undefined && { foursquareEnabled: Boolean(foursquareEnabled) }),
        ...(menuLogoUrl !== undefined && { menuLogoUrl: menuLogoUrl || null }),
        // `null` clears the override (validated above); the old spread dropped
        // it silently and returned 200 with the previous value intact.
        ...(redirectMinRating !== undefined && { redirectMinRating }),
        ...(defaultRedirectPlatform !== undefined && {
          defaultRedirectPlatform: defaultRedirectPlatform || null,
        }),
        ...(orphanedDefault && { defaultRedirectPlatform: null }),
        ...(ownerUserId !== undefined && { userId: ownerUserId }),
      },
    });

    // Public menu is ISR-cached for 1h: refresh it when visibility or the
    // URL changed (pause/resume, slug rename — old slug must 404 promptly).
    if (isActive !== undefined && isActive !== currentRest.isActive) {
      revalidatePublicMenu(restaurant.slug);
    }
    if (slug !== undefined && slug !== currentRest.slug) {
      revalidatePublicMenu(currentRest.slug);
      revalidatePublicMenu(restaurant.slug);
    }

    // The owner Brand tab reads BrandSettings first; keep its colour in step
    // so an admin change is neither hidden nor reverted by the next owner
    // save (one source of truth for the brand colour).
    if (primaryColor !== undefined && primaryColor) {
      await prisma.brandSettings
        .updateMany({ where: { restaurantId: id }, data: { primaryColor } })
        .catch(() => undefined);
    }

    // Audit trail (owner + admin + impersonated edits). Field NAMES only —
    // values can carry PII (phone, notification email, addresses).
    const changedFields = Object.keys(body as Record<string, unknown>).slice(0, 80);
    await writePanelAuditLog(
      actor,
      actor.source === 'admin' ? 'admin.restaurants.update' : 'owner.restaurant.update',
      currentRest.userId ?? id,
      {
        restaurantId: id,
        fields: changedFields,
        ...(isActive !== undefined && isActive !== currentRest.isActive ? { isActive } : {}),
        ...(suspendedByAdminUpdate !== undefined ? { suspendedByAdmin: suspendedByAdminUpdate } : {}),
      },
    );

    // CLAUDE.md §40.6 — mutation endpoint defansif `no-store` (A5 audit
    // fix). Auth boundary zaten korur ama explicit yazmak CDN/proxy
    // katmanlarında kaza eseri PUT response cache'lemeyi engeller.
    return NextResponse.json(restaurant, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    // CLAUDE.md §37.7 — PII-safe error logging.
    console.error('[restaurants:update] failed', {
      restaurantId: id,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message.slice(0, 200) : 'non-error',
    });
    return ApiErrors.internalError('İşletme güncellenemedi');
  }
}

// DELETE /api/restaurants/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  // Restoran silme yıkıcı + cascade (feedback / menu / analytics).
  // canDeleteRestaurant gate'i (CLAUDE.md §37.3 deferred #4 closure):
  // sadece superadmin / admin-source manager / restaurant_owner siler.
  // team_member rolü (workspace içindeki manager/staff/viewer) HİÇBİR
  // koşulda silemez — workspace sahipliği devredilmez.
  if (!(await canDeleteRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    // Snapshot for audit log + payload context before cascade wipe.
    // `select` minimal — KVKK data minimization (no PII beyond what's needed
    // to identify the deleted row in post-mortem).
    const currentRest = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, category: true, userId: true },
    });
    if (!currentRest) {
      return ApiErrors.notFound('İşletme bulunamadı');
    }

    // Cascade counts captured pre-transaction for the audit payload — gives
    // operator triage context ("delete wiped 1.2K feedbacks") without
    // re-querying after the row vanishes.
    // §40.1 — single pooled connection: batch reads in a transaction.
    const [feedbackCount, qrCount, menuItemCount] = await prisma.$transaction([
      prisma.feedback.count({ where: { restaurantId: id } }),
      prisma.qrGeneration.count({ where: { restaurantId: id } }),
      prisma.menuItem.count({ where: { restaurantId: id } }),
    ]);

    // Hard delete: delete related records first to avoid foreign key constraints.
    // Restaurant has several cascading relations, but menu categories are
    // protected by MenuItem.category Restrict, so clear items before categories.
    await prisma.$transaction([
      prisma.feedback.deleteMany({ where: { restaurantId: id } }),
      prisma.qrGeneration.deleteMany({ where: { restaurantId: id } }),
      prisma.adminUser.deleteMany({ where: { restaurantId: id } }),
      prisma.menuAnalyticsEvent.deleteMany({ where: { restaurantId: id } }),
      prisma.brandSettings.deleteMany({ where: { restaurantId: id } }),
      prisma.menuItem.deleteMany({ where: { restaurantId: id } }),
      prisma.menuCategory.deleteMany({ where: { restaurantId: id } }),
      prisma.restaurant.delete({ where: { id } })
    ]);

    // The public menu page is ISR-cached for an hour; drop it now so a
    // deleted business stops being served.
    revalidatePublicMenu(currentRest.slug);

    // Append-only audit log (CLAUDE.md §37.2 C — destructive action audit
    // zorunluluğu). Try/catch ile sarılı: AdminAuditLog tablosu drift /
    // table missing durumunda DELETE mantığı çökmesin. `actorSource` JWT
    // payload'tan ('admin' | 'user'); `targetId` silinen restoran id'si.
    try {
      await prisma.adminAuditLog.create({
        data: {
          actorId: actor.id,
          actorSource: actor.source,
          action: 'restaurant.delete',
          targetId: id,
          payload: {
            name: currentRest.name,
            slug: currentRest.slug,
            category: currentRest.category,
            ownerUserId: currentRest.userId,
            cascade: {
              feedback: feedbackCount,
              qrGeneration: qrCount,
              menuItem: menuItemCount,
            },
          },
        },
      });
    } catch (auditErr) {
      console.warn('[audit] restaurant.delete write failed (non-fatal)', (auditErr as Error).message);
    }

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    // CLAUDE.md §37.7 — PII-safe error logging.
    console.error('[restaurants:delete] failed', {
      restaurantId: id,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message.slice(0, 200) : 'non-error',
    });
    return ApiErrors.internalError('İşletme silinemedi');
  }
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
