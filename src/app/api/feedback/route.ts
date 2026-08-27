import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendFeedbackNotification, sendFirstFeedbackCelebrationEmail } from '@/lib/email';
import { alreadySent, recordSent } from '@/lib/email/lifecycle';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { isValidRating, isValidEmail, isValidPhone, sanitizeText } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { hasOpenAIKey } from '@/lib/openai';
import { coerceTone, generateAiDraftBackground } from '@/lib/ai-draft';
import { getNotificationPrefsForRestaurant } from '@/lib/notification-preferences';
import { recordConsentBatch } from '@/lib/legal/consent';
import { isSupportedLegalLocale, type LegalLocale } from '@/lib/legal/keys';
import { isExternalReviewProvider } from '@/lib/restaurant-features';

function parseAspectRating(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n);
}

// §38.130 Stage 49 — public review surface tag chip picker whitelist.
// Locale-agnostic ENUM key'leri (frontend label'ları locale'e göre map eder).
// Whitelist server-side enforced; bilinmeyen key'ler silent drop edilir
// (analytics garbage row önleme paterni — CLAUDE.md §13.5 paralel).
const VALID_ASPECT_TAGS = new Set([
  'food_taste',
  'service_speed',
  'temperature',
  'portion',
  'price',
  'cleanliness',
  'atmosphere',
  'staff',
  'music',
  'wait_time',
] as const);

function sanitizeAspectTags(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const filtered = value
    .filter((tag): tag is string => typeof tag === 'string' && VALID_ASPECT_TAGS.has(tag as never))
    .slice(0, 10);
  return filtered.length > 0 ? Array.from(new Set(filtered)) : null;
}

export async function POST(req: NextRequest) {
  try {
    // `getClientIp` parses X-Forwarded-For correctly (first segment, trimmed).
    // The previous inline read used the raw header value which let an attacker
    // pivot the rate-limit / DB-count key by stuffing extra hops into XFF.
    const ip = getClientIp(req.headers);

    // Layered defense:
    // 1) Upstash rate limit (fast, distributed) — short-circuits abuse
    //    before we hit Postgres. 5 submissions / IP / minute.
    const fastLimit = await rateLimit(`feedback:ip:${ip}`, 5, 60 * 1000);
    if (!fastLimit.allowed) {
      return ApiErrors.tooManyRequests(
        'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
        'RATE_LIMIT_EXCEEDED',
        fastLimit.retryAfterSeconds || 60,
      );
    }

    // 2) DB rate limit (final hard cap, persistent across instances even
    //    when Upstash is misconfigured). 3 submissions / IP / 10 minutes.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentSubmissions = await prisma.feedback.count({
      where: {
        ipAddress: ip,
        createdAt: { gte: tenMinutesAgo }
      }
    });

    if (recentSubmissions >= 3) {
      return ApiErrors.tooManyRequests('Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.', 'RATE_LIMIT_EXCEEDED', 600);
    }

    // Malformed JSON → 400, not 500 (audit §38.B). Dedicated catch so a bad
    // body doesn't fall through to the outer try's internalError handler.
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return ApiErrors.badRequest('Geçersiz istek gövdesi', 'INVALID_BODY');
    }
    const { rating, name, email, phone, comment, source, branch, tableNumber, restaurantSlug, aspects, aspectTags, platform, website } = body;

    // §38.130 Stage 49 — sanitize once, reuse below.
    const sanitizedAspectTags = sanitizeAspectTags(aspectTags);

    // Honeypot check
    if (website) {
      return NextResponse.json({ success: true, message: 'Feedback received' }, { status: 201 });
    }

    const captcha = await verifyRecaptchaToken(req, body.recaptchaToken, 'feedback_submit');
    if (!captcha.ok) {
      return ApiErrors.badRequest(captcha.error, 'RECAPTCHA_FAILED');
    }

    // Validate platform value if provided. Falsy / unknown → null so the
    // feedback isn't misattributed to Google when the customer never picked
    // a platform via QR. Mirror /api/restaurants/[id]/qr `validPlatforms`
    // and /r/[slug] `platformUrls` keys.
    const validPlatforms = [
      'google', 'yemeksepeti', 'getir', 'trendyol_go',
      'tripadvisor', 'airbnb', 'booking', 'yandex',
      'yelp', 'foursquare',
    ];
    const sanitizedPlatform = platform && validPlatforms.includes(platform) ? platform : null;

    // Validation
    if (!isValidRating(rating)) {
      return ApiErrors.badRequest('Geçersiz puan', 'INVALID_RATING');
    }
    if (!isValidEmail(email)) {
      return ApiErrors.badRequest('Geçersiz e-posta', 'INVALID_EMAIL');
    }
    if (!isValidPhone(phone)) {
      return ApiErrors.badRequest('Geçersiz telefon', 'INVALID_PHONE');
    }

    // Find restaurant by slug. Explicit `select` is mandatory (CLAUDE.md §14.1)
    // — drift-immune against schema-vs-DB lag in preview deploys.
    let restaurantId: string | null = null;
    let notificationEmail: string | null = null;
    let restaurantName: string = 'Restoran';
    let aiDraftEnabled = false;
    let aiDraftTone: string = 'warm';
    let feedbackPlatform = sanitizedPlatform;

    if (restaurantSlug) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug: restaurantSlug },
        select: {
          id: true,
          name: true,
          notificationEmail: true,
          pulseAiEnabled: true,
          enableAiDraft: true,
          aiDraftTone: true,
          externalPlatformsEnabled: true,
        },
      });
      if (restaurant) {
        restaurantId = restaurant.id;
        notificationEmail = restaurant.notificationEmail;
        restaurantName = restaurant.name;
        aiDraftEnabled = restaurant.pulseAiEnabled && restaurant.enableAiDraft;
        aiDraftTone = restaurant.aiDraftTone;
        if (!restaurant.externalPlatformsEnabled && isExternalReviewProvider(feedbackPlatform)) {
          feedbackPlatform = null;
        }
      }
    }

    // Save to DB
    const feedback = await prisma.feedback.create({
      data: {
        rating: Number(rating),
        name: sanitizeText(name, 100),
        email: sanitizeText(email, 100),
        phone: sanitizeText(phone, 20),
        comment: sanitizeText(comment, 2000),
        source: sanitizeText(source, 50),
        branch: sanitizeText(branch, 50),
        tableNumber: sanitizeText(tableNumber, 20),
        ipAddress: ip,
        userAgent: req.headers.get('user-agent'),
        hasKvkkConsent: body.hasKvkkConsent ?? true,
        hasMarketingConsent: body.hasMarketingConsent ?? false,
        restaurantId,
        platform: feedbackPlatform,
        // Rich Feedback Additions — coerce safely; non-1..5 inputs become null.
        foodRating: parseAspectRating(aspects?.food),
        serviceRating: parseAspectRating(aspects?.service),
        atmosphereRating: parseAspectRating(aspects?.atmosphere),
        // §38.130 Stage 49 — public review surface tag chip picker.
        // Whitelist-filtered ENUM key array. null dönerse field hiç set
        // edilmez (default null kalır) — Prisma.DbNull / JsonNull ayrımı
        // gereksiz (kolon zaten nullable).
        ...(sanitizedAspectTags && {
          aspectsJson: sanitizedAspectTags as Prisma.InputJsonValue,
        }),
      },
    });

    // KVKK / marketing onay log — fire-and-forget. Hata feedback yazımını
    // bozmamalı (CLAUDE.md §32). Açıkça reddedilen marketing onay'ı da
    // granted=false ile yazılır → admin "kullanıcı reddetti" raporu çekebilir.
    {
      const ua = req.headers.get('user-agent');
      const localeRaw = typeof body.locale === 'string' ? body.locale.toLowerCase() : 'tr';
      const consentLocale: LegalLocale = isSupportedLegalLocale(localeRaw) ? localeRaw : 'tr';
      const items: Array<{ key: 'kvkk-aydinlatma' | 'acik-riza' | 'ticari-ileti'; granted?: boolean }> = [
        { key: 'kvkk-aydinlatma', granted: body.hasKvkkConsent ?? true },
        { key: 'acik-riza', granted: body.hasKvkkConsent ?? true },
        { key: 'ticari-ileti', granted: body.hasMarketingConsent ?? false },
      ];
      void recordConsentBatch(
        {
          locale: consentLocale,
          subjectType: 'feedback',
          subjectId: feedback.id,
          source: 'review_form',
          ipAddress: ip,
          userAgent: ua,
        },
        items,
      );
    }

    // Notification preferences (owner toggles in /dashboard/account?section=notifications).
    // Pulled once per request — used to gate the low-rating mail.
    const notifPrefs = await getNotificationPrefsForRestaurant(restaurantId);

    // Wave B5 (CLAUDE.md §38.B) — first-feedback celebration trigger.
    // Fire-and-forget; checks (count === 1 just-inserted) AND
    // (LifecycleEmailLog cooldown clear) to be safe against double-fire
    // races (concurrent feedback POST + manual seed at the same second).
    //
    // Doesn't depend on `lowRatingEmail` opt-out — this is an activation
    // moment, NOT a recurring alert. Owner gets at most one of these per
    // restaurant for the lifetime of the account.
    //
    // Narrow `restaurantId` (typed `string | null` at the top of the handler)
    // into a non-null local so the IIFE doesn't have to re-prove it. The
    // feedback row above was created with this value so it's never null
    // by the time we reach here, but TypeScript's flow analysis loses the
    // narrowing across the async boundary.
    const restaurantIdForCelebration: string = restaurantId!;
    (async () => {
      try {
        const totalCount = await prisma.feedback.count({
          where: { restaurantId: restaurantIdForCelebration },
        });
        if (totalCount !== 1) return;
        const restWithOwner = await prisma.restaurant.findUnique({
          where: { id: restaurantIdForCelebration },
          select: {
            name: true,
            notificationEmail: true,
            user: { select: { email: true, name: true, locale: true } },
          },
        });
        if (!restWithOwner) return;
        const recipient = restWithOwner.notificationEmail || restWithOwner.user?.email;
        if (!recipient) return;
        const already = await alreadySent({
          restaurantId: restaurantIdForCelebration,
          type: 'first_feedback_celebration',
        });
        if (already) return;
        const ownerLocale: 'tr' | 'en' = restWithOwner.user?.locale === 'en' ? 'en' : 'tr';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
        const ok = await sendFirstFeedbackCelebrationEmail({
          to: recipient,
          ownerName: restWithOwner.user?.name ?? null,
          restaurantName: restWithOwner.name,
          rating: Number(rating),
          comment: typeof comment === 'string' ? comment : null,
          feedbackUrl: `${appUrl}/${ownerLocale}/dashboard/feedbacks?id=${feedback.id}`,
          locale: ownerLocale,
        });
        if (ok) {
          await recordSent({
            restaurantId: restaurantIdForCelebration,
            type: 'first_feedback_celebration',
            metadata: { feedbackId: feedback.id, rating },
          });
        }
      } catch (err) {
        console.error('[FEEDBACK_POST] first-feedback celebration failed', {
          restaurantId: restaurantIdForCelebration,
          errName: err instanceof Error ? err.name : 'unknown',
        });
      }
    })().catch(() => {
      // IIFE already swallows; defence-in-depth
    });

    // Send email for 1, 2, 3 stars — but only when the owner has the
    // "low-rating alert" toggle enabled. When disabled the feedback is
    // still stored; the owner just doesn't get pinged.
    let emailSent: boolean | null = null;
    if (rating <= 3) {
      if (notifPrefs.lowRatingEmail) {
        emailSent = false;
        try {
          await sendFeedbackNotification({
            rating,
            name,
            email,
            phone,
            comment,
            branch,
            tableNumber,
            restaurantName,
            toEmail: notificationEmail,
            aspects,
            feedbackId: feedback.id,
            locale: body.locale === 'en' ? 'en' : 'tr',
          });
          emailSent = true;
        } catch (err) {
          // Log but don't fail the entire request - the feedback IS in the DB!
          console.error('Email notification failed but saving succeeded:', err);
        }
      }

      // Pulse AI auto-draft — fire-and-forget when owner has opted in and
      // the OpenAI key is set. Generation latency must not block the
      // customer's 201 response. Errors are swallowed; the inbox simply
      // shows no draft and the operator can manually trigger suggest-reply.
      if (aiDraftEnabled && hasOpenAIKey()) {
        void generateAiDraftBackground(
          feedback.id,
          coerceTone(aiDraftTone, 'warm'),
          body.locale === 'en' ? 'en' : 'tr',
        ).catch((err) => {
          console.error('Pulse AI auto-draft failed (non-fatal):', err);
        });
      }
    }

    return NextResponse.json({ success: true, id: feedback.id, emailSent }, { status: 201 });
  } catch (error) {
    console.error('Feedback submission error (Detailed):', error);
    return ApiErrors.internalError('Sunucu hatası veya veritabanı bağlantı sorunu. Lütfen tekrar deneyiniz.');
  }
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { searchParams } = new URL(req.url);
  // Clamp page + limit so malformed query strings (e.g. ?page=abc, fuzzing,
  // typos) do not silently corrupt pagination. parseInt('abc', 10) returns
  // NaN; (NaN-1)*limit is NaN; Prisma `skip: NaN` is silently treated as 0
  // and the user sees page 1 every time → duplicate rows / missed feedback.
  // Limit is also clamped to a safe range so the inbox cannot pull a 10K row
  // window in a single request.
  const pageRaw = parseInt(searchParams.get('page') || '1', 10);
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
  const ratingFilter = searchParams.get('rating'); // e.g. "low" or "1"
  const daysParam = searchParams.get('days');
  const restaurantId = searchParams.get('restaurantId');
  const platformFilter = searchParams.get('platform');
  const branchFilter = searchParams.get('branch');
  const kvkkFilter = searchParams.get('kvkk'); // 'true' or 'false'
  const searchParam = (searchParams.get('search') || '').trim();
  const sortOrderParam = searchParams.get('sortOrder');
  // PR3 — yorum gelen kutusu filter expansion. 3-tier resilience uyumlu:
  // join'ler tier 3'te düşerse bu filter'lar relation-based, otomatik no-op
  // sayılır (Prisma where açtığında bağlanan tablo yoksa Prisma şikayet eder
  // — bu yüzden joinsAvailable kontrolüne benzer şekilde defansif: try/catch
  // 3-tier pattern içinde zaten yakalıyor).
  const hasReplyParam = searchParams.get('hasReply'); // 'true' | 'false'
  const isFlaggedParam = searchParams.get('isFlagged'); // 'true'
  const isAssignedParam = searchParams.get('isAssigned'); // 'me'
  // Stage 79 §38.159 — Feedback.isRead filter (Stage 56 §38.137 migration).
  // NotificationBell + bottom nav badge'in gerçek backend isRead state'ini
  // poll'lamak için gerekli. Schema: Boolean NOT NULL @default(false) —
  // migration tüm eski rows false init eder. 'false' → okunmamış, 'true'
  // → okundu. Geçersiz değer ignore (filter yok). Frontend mark-as-read
  // PATCH /api/feedback/[id] (CLAUDE.md §38.83 Stage 13) ile sync.
  const isReadParam = searchParams.get('isRead'); // 'true' | 'false'
  const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;

  // PR15 — where build'i ikiye böl. baseWhere standart filter'ları içerir
  // (KVKK / restaurantId / rating / dateRange / platform / branch / search).
  // joinWhere PR3'te eklenen JOIN-based filter'ları (replies/flag/assignment)
  // ayrı tutar; schema sync olmamış preview env'inde tier 3 fallback bunları
  // drop edip listenin yine de render olmasını sağlar.
  const baseWhere: Prisma.FeedbackWhereInput = {};
  const joinWhere: Prisma.FeedbackWhereInput = {};

  // KVKK filter
  if (kvkkFilter === 'true') {
    baseWhere.hasKvkkConsent = true;
  } else if (kvkkFilter === 'false') {
    baseWhere.hasKvkkConsent = false;
  }

  // Stage 79 §38.159 — isRead filter (Feedback.isRead, Stage 56 §38.137).
  // Schema: Boolean NOT NULL @default(false) — migration tüm eski rows
  // false default ile init eder; null mümkün değil. 'false' (okunmamış)
  // → isRead === false; 'true' (okundu) → isRead === true.
  // NotificationBell `?rating=low&limit=5&isRead=false` query ile sadece
  // okunmamış low-rating'ları çeker; bottom nav badge gerçek read state'ten
  // derive edilir (CLAUDE.md §38.141 paterni intact, sadece source backend).
  if (isReadParam === 'false') {
    baseWhere.isRead = false;
  } else if (isReadParam === 'true') {
    baseWhere.isRead = true;
  }

  // Restaurant filter
  if (restaurantId && restaurantId !== 'all') {
    baseWhere.restaurantId = restaurantId;
  }

  // Security override: scope by role
  if (actor.role === 'superadmin') {
    // superadmin — keep any explicit restaurantId filter or show all
  } else if (actor.role === 'manager') {
    baseWhere.restaurantId = actor.restaurantId;
  // `team_member` (davet edilen ekip üyesi) owner ile aynı dalda scope'lanır:
  // getScopedRestaurantIds -> getTeamMemberScope zaten SADECE TeamMember.locations
  // listesini döner (owner pasifse boş). Scope genişlemesi yok; eksik olan sadece
  // bu dalın team_member'ı kapsamamasıydı -> davetli kullanici gelen kutusunda 403
  // aliyordu (/api/feedback/counts zaten generic helper'i kullaniyordu -> sayaclar
  // dolu, liste bos = kirik cekirdek akis).
  } else if (actor.role === 'restaurant_owner' || actor.role === 'team_member') {
    const userRestIds = await getScopedRestaurantIds(actor) || [];

    if (baseWhere.restaurantId) {
      if (!userRestIds.includes(baseWhere.restaurantId as string)) {
        return ApiErrors.forbidden();
      }
    } else {
      baseWhere.restaurantId = { in: userRestIds };
    }
  } else {
    return ApiErrors.forbidden();
  }

  // Rating filter
  if (ratingFilter === 'low') {
    baseWhere.rating = { lte: 3 };
  } else if (ratingFilter === 'positive') {
    baseWhere.rating = { gte: 4 };
  } else if (ratingFilter && ratingFilter !== 'all') {
    const r = parseInt(ratingFilter, 10);
    if (Number.isFinite(r)) baseWhere.rating = r;
  }

  // Date filter (supports today/1, month, numeric days, all)
  // UTC-based to stay consistent regardless of server timezone.
  const createdAtBase: Prisma.DateTimeFilter =
    baseWhere.createdAt && typeof baseWhere.createdAt === 'object' && !(baseWhere.createdAt instanceof Date)
      ? (baseWhere.createdAt as Prisma.DateTimeFilter)
      : {};
  if (daysParam === 'today' || daysParam === '1') {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    baseWhere.createdAt = { ...createdAtBase, gte: today };
  } else if (daysParam === 'month') {
    const now = new Date();
    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    baseWhere.createdAt = { ...createdAtBase, gte: firstOfMonth };
  } else if (daysParam && daysParam !== 'all') {
    const days = parseInt(daysParam);
    if (Number.isFinite(days) && days > 0) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - days);
      baseWhere.createdAt = { ...createdAtBase, gte: pastDate };
    }
  }

  // Platform filter
  // §38.35 — 'buaze_qr' UI runtime label: tasarım .design-owner-2026/
  // page-reviews.jsx "Buaze QR" pill filter. Backend mapping: platform = null
  // (CLAUDE.md §38.34 paterni — schema migration YOK, runtime label).
  if (platformFilter && platformFilter !== 'all') {
    if (platformFilter === 'buaze_qr') {
      baseWhere.platform = null;
    } else {
      baseWhere.platform = platformFilter;
    }
  }

  // Branch filter
  if (branchFilter && branchFilter !== 'all') {
    baseWhere.branch = branchFilter;
  }

  // Search filter (comment or name, case-insensitive)
  if (searchParam) {
    baseWhere.OR = [
      { comment: { contains: searchParam, mode: 'insensitive' } },
      { name: { contains: searchParam, mode: 'insensitive' } },
    ];
  }

  // PR3 — JOIN-based filter'lar joinWhere'da. Tier 3 fallback bunları drop
  // ederek liste'nin yine de gelmesini sağlar; UI degraded.joinFilters
  // banner'ı kullanıcıyı uyarır.
  if (hasReplyParam === 'true') {
    joinWhere.replies = { some: {} };
  } else if (hasReplyParam === 'false') {
    joinWhere.replies = { none: {} };
  }
  if (isFlaggedParam === 'true') {
    joinWhere.flag = { isNot: null };
  }
  if (isAssignedParam === 'me' && actor.id) {
    joinWhere.assignment = { assigneeId: actor.id };
  }

  try {
    // Primary query includes the Faz-2 flag/reply/assignment joins plus the
    // FeedbackTag join. When the database schema is ahead of push (e.g. a
    // preview env where schema migration hasn't run yet), any one of these
    // includes throws and would otherwise break every panel page that
    // renders a feedback list. We try three tiers of degradation so the
    // inbox keeps rendering even if just one of the new tables is missing.
    let feedbacks: Array<Record<string, unknown>>;
    let joinsAvailable = true;
    let tagsAvailable = true;
    // PR15 — tier 3 fallback joinWhere'i drop ettiğinde false; UI banner
    // kullanıcıyı "filter şu an pasif" şeklinde uyarır.
    let joinFiltersApplied = true;
    const fullWhere: Prisma.FeedbackWhereInput = { ...baseWhere, ...joinWhere };
    try {
      feedbacks = await prisma.feedback.findMany({
        where: fullWhere,
        orderBy: { createdAt: sortOrder },
        skip,
        take: limit,
        include: {
          restaurant: { select: { name: true, slug: true, pulseAiEnabled: true, enableAiDraft: true } },
          flag: { select: { id: true } },
          assignment: { select: { assigneeId: true } },
          tags: { select: { id: true, label: true, score: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
          _count: { select: { replies: true } },
        },
      });
    } catch (joinErr) {
      console.warn(
        '[feedback] tags+joins failed, retrying without tags — did schema migration run?',
        (joinErr as Error).message,
      );
      tagsAvailable = false;
      try {
        feedbacks = await prisma.feedback.findMany({
          where: fullWhere,
          orderBy: { createdAt: sortOrder },
          skip,
          take: limit,
          include: {
            restaurant: { select: { name: true, slug: true, pulseAiEnabled: true, enableAiDraft: true } },
            flag: { select: { id: true } },
            assignment: { select: { assigneeId: true } },
            _count: { select: { replies: true } },
          },
        });
      } catch (innerErr) {
        console.warn(
          '[feedback] flag/assignment/replies joins failed, falling back to no joins + dropping JOIN filters',
          (innerErr as Error).message,
        );
        joinsAvailable = false;
        joinFiltersApplied = false;
        feedbacks = await prisma.feedback.findMany({
          where: baseWhere,
          orderBy: { createdAt: sortOrder },
          skip,
          take: limit,
          include: { restaurant: { select: { name: true, slug: true, pulseAiEnabled: true, enableAiDraft: true } } },
        });
      }
    }

    // PR15 — count'ı tier sonucuyla aynı where ile yap. joinFiltersApplied
    // false ise baseWhere kullan (yoksa count fail eder, total=0 görünür).
    const total = await prisma.feedback.count({
      where: joinFiltersApplied ? fullWhere : baseWhere,
    });

    // Pulse AI draft lookup — separate from the main include chain so a
    // missing table (preview before schema migration) doesn't cascade into
    // the existing 3-tier resilience. Map by feedbackId for O(1) join.
    let aiDraftAvailable = true;
    const aiDraftMap = new Map<string, { tone: string; source: string }>();
    if (feedbacks.length > 0) {
      try {
        const ids = feedbacks.map((f) => f.id as string);
        const drafts = await prisma.feedbackAiDraft.findMany({
          where: { feedbackId: { in: ids } },
          select: { feedbackId: true, tone: true, source: true },
        });
        for (const d of drafts) {
          aiDraftMap.set(d.feedbackId, { tone: d.tone, source: d.source });
        }
      } catch (err) {
        console.warn(
          '[feedback] FeedbackAiDraft lookup failed — did schema migration run?',
          (err as Error).message,
        );
        aiDraftAvailable = false;
      }
    }

    const data = feedbacks.map((raw) => {
      const f = raw as Record<string, unknown> & {
        name?: string;
        email?: string;
        id?: string;
        _count?: { replies?: number };
        flag?: unknown;
        assignment?: { assigneeId?: string | null };
        tags?: unknown[];
        restaurant?: { name?: string; slug?: string | null; pulseAiEnabled?: boolean | null; enableAiDraft?: boolean | null } | null;
      };
      const draft = f.id ? aiDraftMap.get(f.id) : undefined;
      const aiAutoDraftEnabled = f.restaurant?.pulseAiEnabled === true && f.restaurant?.enableAiDraft === true;
      return {
        ...f,
        customerName: f.name,
        customerEmail: f.email,
        restaurant: f.restaurant
          ? { name: f.restaurant.name ?? '', slug: f.restaurant.slug ?? undefined }
          : null,
        isReplied: joinsAvailable ? (f._count?.replies ?? 0) > 0 : false,
        isFlagged: joinsAvailable ? Boolean(f.flag) : false,
        isAssigned: joinsAvailable ? Boolean(f.assignment) : false,
        assigneeId: joinsAvailable ? f.assignment?.assigneeId ?? null : null,
        tags: joinsAvailable && tagsAvailable ? (f.tags ?? []) : [],
        aiAutoDraftEnabled,
        hasPendingAiDraft: aiDraftAvailable && aiAutoDraftEnabled && Boolean(draft),
        aiDraftTone: draft?.tone ?? null,
      };
    });

    return NextResponse.json(
      {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          // UI uses these flags to surface "feature unavailable" notices when
          // schema sync hasn't happened yet (e.g. preview deploys, fresh DBs).
          // PR15 — joinFilters: tier 3 fallback joinWhere drop ettiyse true;
          // UI'da hasReply/isFlagged/isAssigned filter'lar pasif uyarısı.
          degraded:
            !joinsAvailable || !tagsAvailable || !aiDraftAvailable || !joinFiltersApplied
              ? {
                  joins: !joinsAvailable,
                  tags: !tagsAvailable,
                  aiDraft: !aiDraftAvailable,
                  joinFilters: !joinFiltersApplied,
                }
              : null,
        },
      },
      {
        headers: {
          // Edge cache (CLAUDE.md §38.100 Stage 24 — Görev F genişletmesi).
          // Owner-scoped inbox refresh frequency yüksek; 15s fresh + 60s SWR
          // dashboard pulse'a uygun. `private` directive Vercel CDN'de
          // user-isolated (cookie-based partition); IDOR scope intact.
          'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=60',
        },
      },
    );
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return ApiErrors.internalError('Veriler çekilemedi');
  }
}
