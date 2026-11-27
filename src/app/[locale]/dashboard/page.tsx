import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readAll } from '@/lib/db-batch';
import { resolveUserPayloadIdentity } from '@/lib/panel-access';
import { getPanelRestaurants, getPanelUser } from './_lib/panel-data';
import { mapHomeFeedbackStats, type HomeFeedbackStatsRow } from './_lib/home-feedback-stats';
import { extractThemes, getCachedThemes } from '@/lib/analytics-themes';
// §38.32 — deriveCustomerFields + CustomerSegment + SegmentChip artık
// dashboard'da kullanılmıyor (BUGÜN BEKLEYEN feedback-detail render kaldırıldı).
// Customers list/drawer'da hâlâ aktif (§38.17 paterni).
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  ExternalLink,
  Inbox,
  MessageSquareReply,
  Plus,
  Crown,
  Printer,
  QrCode,
  Sparkles,
  Star,
} from 'lucide-react';
import PanoHeroCard from '@/components/dashboard/PanoHeroCard';
import { PanoTile } from '@/components/panel/pano/PanoStack';
import OnboardingNudge, { type OnboardingStep } from '@/components/dashboard/OnboardingNudge';
import ActivationChecklistCard from '@/components/dashboard/ActivationChecklistCard';
import { computeActivation } from '@/lib/activation';
import AIInsightBanner from '@/components/dashboard/AIInsightBanner';
import VolumeChart from '@/components/charts/VolumeChart';
import ChannelDistribution from '@/components/dashboard/ChannelDistribution';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import ScopeDropdown from '@/components/dashboard/ScopeDropdown';
import { buildActivityFeed } from '@/lib/activity-feed';
import { buildVolumeSeries } from '@/lib/volume-series';
import {
  TOPIC_MIN_MENTIONS,
  describeChange,
  describeRatingChange,
  metricInfo,
  metricLabel,
  topicSentimentText,
} from '@/lib/feedback-metrics';
import { PageHeader, StatCard } from '@/components/ui';
import PendingTasks from '@/components/dashboard/PendingTasks';
import { buildPendingTasks } from '@/lib/dashboard-tasks';
import { resolveDisplayTimeZone } from '@/lib/timezone';

// TrendsChart taşır 'use client' direktifini — server-side pre-render
// minimal HTML, browser'da Recharts hydrate. `dynamic({ ssr: false })`
// Next.js 15 Server Component'te yasak (CLAUDE.md §27).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Panel' : 'Dashboard',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS_TR: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
  yelp: 'Yelp',
  foursquare: 'Foursquare',
};

function isExpectedNavigationError(error: unknown) {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_');
}

export default async function DashboardPage(props: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    return await renderDashboardPage(props);
  } catch (error) {
    if (!isExpectedNavigationError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error('[DashboardPage] Server render failed', { message, stack });
    }
    throw error;
  }
}

async function renderDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';

  // Phase 8c+ §38.31 — Header date-range dropdown (URL searchParam scope).
  // Default '7d'; KPI window'ları + prev window delta için kullanılır.
  // YTD: prev_year_YTD karmaşık (1 yıl önce data); delta gizlenir (null).
  const sp = searchParams ? await searchParams : {};
  const scopeRaw = typeof sp.scope === 'string' ? sp.scope : '7d';
  const scope: 'tw7d' | 'tw30d' | 'tw90d' | 'ytd' =
    scopeRaw === '30d'
      ? 'tw30d'
      : scopeRaw === '90d'
        ? 'tw90d'
        : scopeRaw === 'ytd'
          ? 'ytd'
          : 'tw7d';
  const scopeUrlValue: '7d' | '30d' | '90d' | 'ytd' =
    scope === 'tw30d' ? '30d' : scope === 'tw90d' ? '90d' : scope === 'ytd' ? 'ytd' : '7d';

  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);

  const payload = await verifyJwt(token);
  if (!payload) redirect(`/${locale}/auth/login`);

  // User + the businesses this account can see. Same scope + order as the
  // dashboard layout (getScopedRestaurantIds, createdAt asc), so team members
  // get their assigned businesses instead of an empty dashboard (§38.240).
  // Both reads are request-memoised (React cache): on a hard load the layout
  // has already run them, so the page reuses the result.
  const identity = resolveUserPayloadIdentity({
    userId: payload.userId as string,
    role: payload.role,
    email: payload.email,
  });
  const userRow = await getPanelUser(identity.userId);
  if (!userRow) redirect(`/${locale}/auth/login`);
  // Includes `aiAnalyticsEnabled` (§5.2 — admin master flag; AI tema
  // çıkarımı bu flag kapalıyken çalışmamalı) and the activation fields.
  const scopedRestaurants = await getPanelRestaurants(
    identity.userId,
    identity.role,
    identity.email,
  );
  const user = { ...userRow, restaurants: scopedRestaurants };

  // The panel always works on one business. Without a valid ?restaurantId
  // this is the first active business — the one the shell selects (and labels)
  // by default — not "every business", which showed totals for all of them
  // under the first business's name until the shell rewrote the URL.
  const ownedRestaurantIds = user.restaurants.map((r) => r.id);
  const selectedRestaurantId =
    typeof sp.restaurantId === 'string' && ownedRestaurantIds.includes(sp.restaurantId)
      ? sp.restaurantId
      : user.restaurants.find((restaurant) => restaurant.isActive)?.id ?? null;
  const restIds = selectedRestaurantId ? [selectedRestaurantId] : ownedRestaurantIds;
  const selectedRestaurant = selectedRestaurantId
    ? user.restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null
    : null;
  const restIdIn = { in: restIds };

  // Time windows used by KPIs + trend.
  const now = Date.now();
  // Phase 8c+ §38.31 — scope-aware window computation. Scope dropdown
  // 7d/30d/90d/ytd değerini server'a URL searchParam ile geçirir; KPI
  // (Toplam yorum / Yanıt oranı / Yeni müşteri) ve delta hesabı bu
  // pencere üzerinden çalışır. YTD prev pencere = "geçen yıl aynı
  // dönem" (Jan 1 prev_year → today_minus_1_year). Yıllık karşılaştırma.
  const nowDateForScope = new Date(now);
  const ytdStartForScope = new Date(nowDateForScope.getFullYear(), 0, 1);
  const scopeDays =
    scope === 'tw7d'
      ? 7
      : scope === 'tw30d'
        ? 30
        : scope === 'tw90d'
          ? 90
          : Math.max(1, Math.ceil((now - ytdStartForScope.getTime()) / 86400000));
  const scopeStart = scope === 'ytd' ? ytdStartForScope : new Date(now - scopeDays * 86400000);
  // §38.32 — YTD leap year fix: prevScopeEnd = "geçen yılın bugünü" (calendar
  // day) — `now - 365d` yerine `nowDate.setFullYear(year - 1)`. Artık yıl
  // (Şubat 29) edge case'inde 1 gün drift'i kapatır.
  const prevScopeStart =
    scope === 'ytd'
      ? new Date(nowDateForScope.getFullYear() - 1, 0, 1)
      : new Date(now - 2 * scopeDays * 86400000);
  const prevScopeEnd = (() => {
    if (scope !== 'ytd') return scopeStart;
    const ytdPrevEnd = new Date(nowDateForScope);
    ytdPrevEnd.setFullYear(ytdPrevEnd.getFullYear() - 1);
    return ytdPrevEnd;
  })();
  // Phase 8c+ §38.30 — NABIZ chart 30G/90G/YTD chip toggle (tasarım
  // page-dashboard.jsx line 230-234). 90 gün > YTD (Ocak başı) ise 90 gün
  // taban; aksi halde YTD start (Ocak 1) en geriye uzanan window.
  const ninetyDaysAgo = new Date(now - 90 * 86400000);
  const ytdStart = new Date(new Date(now).getFullYear(), 0, 1);
  const trendOldestStart = ytdStart < ninetyDaysAgo ? ytdStart : ninetyDaysAgo;

  // ---- Bağımsız okumalar: sınırlı paralel (readAll, CLAUDE.md §14.1) ----
  // Self-host tek örnek + connection_limit=10: array $transaction okumaları
  // sırayla (+BEGIN/COMMIT) çalıştırıyordu; her gidiş-dönüş Supabase'e
  // yüzlerce ms. readAll en çok 5'er sorguyu birlikte çalıştırır.
  // Boş restIds için Prisma `in: []` zaten 0 satır döner; fallback path
  // gereksiz. (Postgres `WHERE id = ANY(ARRAY[]::text[])` syntactically OK.)
  // Activation checklist business (§40.10): the selected business, else the
  // first one. Both are in `restIds`, so its feedback total comes from the
  // per-business groupBy below and its profile fields from the business list.
  const activationTarget = selectedRestaurant ?? user.restaurants[0] ?? null;
  const restaurantNameById = new Map(user.restaurants.map((r) => [r.id, r.name]));
  // §38.32 — BUGÜN BEKLEYEN "platform" task window (last 24 h).
  const googleCheckSince = new Date(now - 24 * 3600 * 1000);

  // The low-rating counts, new / churned customers, the activation QR count
  // and the failing-Google-link check used to be seven separate statements.
  // One raw statement returns them all (COUNT(*) FILTER + scalar
  // sub-selects), each with the exact filter the Prisma query had:
  // `replies: { some }` ⇔ EXISTS a reply row (feedback_replies.feedback_id is
  // NOT NULL), `rating: { lte: 3 }` ⇔ `rating <= 3`, and the newest failing
  // check (`findFirst … orderBy checkedAt desc`) ⇔ MAX(checked_at), which is
  // NOT NULL, so "no row" ⇔ NULL. Mapping: ./_lib/home-feedback-stats.ts.
  // Date parameters that replaced Prisma filters are compared as UTC
  // wall-clock (`::timestamptz AT TIME ZONE 'UTC'`), exactly how Prisma binds
  // them against these `timestamp(3)` columns — whatever the session time
  // zone. The new-customer and churn sub-selects are the previous raw SQL,
  // copied unchanged.
  // restIds boşsa SQL `IN ()` syntax error olur — WHERE FALSE ile satır yok.
  const homeStatsQuery =
    restIds.length > 0
      ? prisma.$queryRaw<HomeFeedbackStatsRow[]>(Prisma.sql`
          SELECT
            low.low_rated_in_scope,
            low.low_rated_replied_in_scope,
            low.unreplied_count,
            low.oldest_unreplied_at,
            (
              SELECT COUNT(DISTINCT
                CONCAT(f.restaurant_id, '|',
                  COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), ''))
                )
              )::bigint
              FROM feedback f
              WHERE f.has_kvkk_consent = TRUE
                AND f.restaurant_id IN (${Prisma.join(restIds)})
                AND f.created_at >= ${scopeStart}
                AND COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), ''))
                    IS NOT NULL
            ) AS new_customers,
            (
              SELECT COUNT(*)::bigint FROM (
                SELECT
                  COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) AS contact_key,
                  MAX(f.created_at) AS last_at,
                  COUNT(*) AS visits
                FROM feedback f
                WHERE f.has_kvkk_consent = TRUE
                  AND f.restaurant_id IN (${Prisma.join(restIds)})
                  AND COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), ''))
                      IS NOT NULL
                GROUP BY 1
                HAVING MAX(f.created_at) < NOW() - INTERVAL '30 days'
                  AND COUNT(*) >= 2
              ) churned_customers
            ) AS churned_customers,
            (
              SELECT COUNT(*)::bigint
              FROM qr_generations q
              WHERE q.restaurant_id = ${activationTarget?.id ?? null}
            ) AS activation_qr_count,
            (
              SELECT MAX(p.checked_at)
              FROM platform_link_checks p
              WHERE p.restaurant_id IN (${Prisma.join(restIds)})
                AND p.provider = 'google'
                AND p.ok = FALSE
                AND p.checked_at >= (${googleCheckSince}::timestamptz AT TIME ZONE 'UTC')
            ) AS google_failing_check_at
          FROM (
            SELECT
              COUNT(*) FILTER (
                WHERE l.created_at >= (${scopeStart}::timestamptz AT TIME ZONE 'UTC')
              )::bigint AS low_rated_in_scope,
              COUNT(*) FILTER (
                WHERE l.created_at >= (${scopeStart}::timestamptz AT TIME ZONE 'UTC')
                  AND l.has_reply
              )::bigint AS low_rated_replied_in_scope,
              COUNT(*) FILTER (WHERE NOT l.has_reply)::bigint AS unreplied_count,
              MIN(l.created_at) FILTER (WHERE NOT l.has_reply) AS oldest_unreplied_at
            FROM (
              SELECT
                f.created_at,
                EXISTS (
                  SELECT 1 FROM feedback_replies r WHERE r.feedback_id = f.id
                ) AS has_reply
              FROM feedback f
              WHERE f.restaurant_id IN (${Prisma.join(restIds)})
                AND f.rating <= 3
                AND f.redirected = FALSE
            ) l
          ) low
        `)
      : prisma.$queryRaw<HomeFeedbackStatsRow[]>(Prisma.sql`
          SELECT
            0::bigint AS low_rated_in_scope,
            0::bigint AS low_rated_replied_in_scope,
            0::bigint AS unreplied_count,
            NULL::timestamp AS oldest_unreplied_at,
            0::bigint AS new_customers,
            0::bigint AS churned_customers,
            0::bigint AS activation_qr_count,
            NULL::timestamp AS google_failing_check_at
          WHERE FALSE
        `);

  // The activation state row runs beside the main reads; its failure stays
  // soft (handled where it is used below).
  const activationStatePromise = activationTarget
    ? prisma.restaurantActivationState
        .findUnique({
          where: { restaurantId: activationTarget.id },
          select: { qrPrintedSharedAt: true, dismissedAt: true },
        })
        .then(
          (row) => ({ ok: true as const, row }),
          (error: unknown) => ({ ok: false as const, error }),
        )
    : null;

  const [
    latestFeedbacks,
    restaurantRatings,
    platformGroups,
    last7Avg,
    prevScopeAggregate,
    homeStatsRows,
    themesFeedbacks,
    trendFeedbacksRange,
    prevPlatformGroups,
    recentReplies,
    recentAiDrafts,
    recentSystemEvents,
    scopeRedirects,
    prevScopeRedirects,
  ] = await readAll([
    // Son yorumlar listesi (CANLI AKIŞ timeline). Restaurant names come from
    // the business list above (every row is in restIds), so no join query.
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        rating: true,
        platform: true,
        createdAt: true,
        restaurantId: true,
        hasKvkkConsent: true,
        redirected: true,
      },
    }),
    // Per-restaurant avg + count (totalReviews + avgRating tek source; also
    // the activation checklist's feedback total).
    prisma.feedback.groupBy({
      by: ['restaurantId'],
      where: { restaurantId: restIdIn },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // Platform distribution (Yorum Görünümü section)
    prisma.feedback.groupBy({
      by: ['platform'],
      // Where redirected customers were sent (§58: redirects, not reviews).
      where: { restaurantId: restIdIn, platform: { not: null }, redirected: true },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    // §38.31 — Scope window total + avg (KPI Toplam yorum value + delta).
    prisma.feedback.aggregate({
      where: { restaurantId: restIdIn, createdAt: { gte: scopeStart } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // §38.31 — Önceki scope window count + ortalama puan (delta baseline).
    // YTD durumda prev_year YTD karşılaştırması. (Same filter for both, so
    // one aggregate instead of a count + an aggregate.)
    prisma.feedback.aggregate({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: prevScopeStart, lt: prevScopeEnd },
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // §38.31 / §38.32 — Yanıt oranı (scope), BUGÜN BEKLEYEN reply + churn +
    // platform tasks, Yeni müşteri KPI and the activation QR count (see
    // above). §38.32 "platform" task: sadece Google için (Yemeksepeti/Getir/
    // Trendyol public API yok, anlamlı sync check imkansız) — son 24 saat
    // içinde provider='google' PlatformLinkCheck.ok=false varsa task aktif
    // (CLAUDE.md §19.4 PlatformLinkCheck pattern).
    homeStatsQuery,
    // SIK BAHSEDİLEN KONULAR — son 30 gün yorum metinleri (extractThemes
    // helper'ı için ham veri). Min 8 yorum + OpenAI key gereği helper içinde
    // (yetersiz → empty fallback). Cache 1 saat (CLAUDE.md §34.9).
    prisma.feedback.findMany({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: new Date(now - 30 * 86400000) },
        comment: { not: null },
        redirected: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
      // restaurantId — AI tema girdisini aiAnalyticsEnabled restoranlarla sınırlamak için.
      select: { rating: true, comment: true, restaurantId: true },
    }),
    // Phase 8c+ §38.30 — NABIZ chart 30G/90G/YTD chip toggle için ham veri.
    // En geriye uzanan window (YTD veya 90 gün, hangisi daha eski). JS-side
    // 3 dataset'e bucketlanır (trend30 daily, trend90 daily, trendYtd weekly).
    // The 7-day rows (mobile hero sparkline) are a subset of this window and
    // are filtered from it below instead of being read again.
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn, createdAt: { gte: trendOldestStart } },
      select: { createdAt: true, rating: true, redirected: true },
    }),
    // §38.31 — KANAL DAĞILIMI delta için önceki scope window platform groupBy.
    // Mevcut platformGroups all-time aggregate; delta için aynı window'da
    // önceki dönem ortalaması karşılaştırılır.
    prisma.feedback.groupBy({
      by: ['platform'],
      where: {
        restaurantId: restIdIn,
        platform: { not: null },
        redirected: true,
        createdAt: { gte: prevScopeStart, lt: prevScopeEnd },
      },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    // §38.31 — CANLI AKIŞ "yanıt verdi" event'leri (manuel + AI). buildActivityFeed
    // helper'ı source='ai_copilot' / 'manual' ayırır.
    prisma.feedbackReply.findMany({
      where: { feedback: { restaurantId: restIdIn } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        source: true,
        authorUserId: true,
        feedback: {
          select: {
            id: true,
            name: true,
            rating: true,
            platform: true,
          },
        },
      },
    }),
    // §38.31 — CANLI AKIŞ "AI Asistan yanıt önerisi hazırladı" event'leri.
    // FeedbackAiDraft owner inbox'ında bekleyen (CLAUDE.md §15 / §21.8.1).
    prisma.feedbackAiDraft.findMany({
      where: { feedback: { restaurantId: restIdIn } },
      orderBy: { generatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        generatedAt: true,
        feedback: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    // §38.31 — CANLI AKIŞ "Sistem günlük rapor gönderildi" event'leri.
    // LifecycleEmailLog cron-driven log (CLAUDE.md §21.34). §38.32: type
    // ranking helper'da yapılır (priority list; weekly_report > trial_ending
    // > diğer); take: 10 daha geniş örneklem ki helper en kritik 5'ini seçsin.
    prisma.lifecycleEmailLog.findMany({
      where: { restaurantId: restIdIn },
      orderBy: { sentAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        sentAt: true,
      },
    }),
    // §58 — redirects in the scope / previous window (KPI split).
    prisma.feedback.count({
      where: { restaurantId: restIdIn, redirected: true, createdAt: { gte: scopeStart } },
    }),
    prisma.feedback.count({
      where: { restaurantId: restIdIn, redirected: true, createdAt: { gte: prevScopeStart, lt: prevScopeEnd } },
    }),
  ]);
  const homeStats = mapHomeFeedbackStats(homeStatsRows[0]);

  // ---- Derived metrics ----

  // §38.31 — Scope window total + avg, scope dropdown'a parametrik. last7Avg
  // değişken adı korundu (lint silence) ama scope='30d' iken "last7" değil
  // "last30" semantik; yorumda açıklandı.
  const last7Total = last7Avg._count._all;
  const last7AvgRating = last7Avg._avg.rating ?? 0;

  // Platform distribution — Top platforms (3 değil, hepsi göster ama sıralı).
  // PlatformDistribution component zaten sıralayıp pill + bar grid çiziyor.
  const platformDistData = platformGroups
    .filter((g) => g.platform)
    .map((g) => ({
      platform: g.platform!,
      label: PLATFORM_LABELS_TR[g.platform!] ?? g.platform!,
      count: g._count._all,
      avgRating: g._avg.rating ?? null,
    }));

  // Rating volume (shared with Analytics, §58): daily for 30/90 days,
  // weekly for the year. Days cut in the display time zone (§46).
  const displayTz = resolveDisplayTimeZone();
  const trendLocale = isTr ? 'tr' : 'en';
  const trendEnd = new Date(now);
  const ytdDays = Math.max(1, Math.ceil((now - ytdStart.getTime()) / 86400000) + 1);
  const volumeRows = trendFeedbacksRange.map((f) => ({
    createdAt: f.createdAt,
    rating: f.rating,
    redirected: f.redirected,
  }));
  const volumeOpts = { end: trendEnd, timeZone: displayTz, locale: trendLocale } as const;
  const volume30 = buildVolumeSeries(volumeRows, { ...volumeOpts, windowDays: 30 });
  const volume90 = buildVolumeSeries(volumeRows, { ...volumeOpts, windowDays: 90 });
  const volumeYtd = buildVolumeSeries(volumeRows, { ...volumeOpts, windowDays: ytdDays });

  // SIK BAHSEDİLEN KONULAR — son 30 gün yorumlarından AI ile tema çıkarımı.
  // extractThemes helper içinde min 4 yorum + OpenAI key kontrolü; yoksa
  // empty fallback (UI section gizli). Cache 1 saat (CLAUDE.md §34.9).
  //
  // Stage 25 §38.101 Phase C — cache-first non-blocking pattern:
  // - Cache hit → instant return (mevcut davranış intact)
  // - Cache miss → empty fallback bu request için + background fetch
  //   (fire-and-forget) sonraki request cache hit alır
  //
  // Trade-off: cache miss ilk request'te AIInsightBanner + SIK BAHSEDİLEN
  // section gizli kalır (synthesis/themes empty); 1-2s critical path
  // OpenAI latency'si page render'ını blok etmez. 1 saat sonra cache
  // expire olduğunda yine background populate. Owner ilk dashboard
  // ziyareti veya cold start sonrası AI section'ı 2. yenilemede görür.
  // §5.2 — admin `aiAnalyticsEnabled=false` restoranların yorumları AI'a
  // gönderilmez (analytics/page.tsx paterni). Kapsamda hiç açık restoran
  // yoksa çağrı tamamen atlanır ve AI kartları gizli kalır.
  const aiEnabledRestaurantIds = new Set(
    user.restaurants
      .filter((r) => r.aiAnalyticsEnabled && restIds.includes(r.id))
      .map((r) => r.id),
  );
  const aiAnalyticsAvailable = aiEnabledRestaurantIds.size > 0;
  const themeComments: Array<{ rating: number; comment: string }> = themesFeedbacks
    .filter(
      (f) => typeof f.restaurantId === 'string' && aiEnabledRestaurantIds.has(f.restaurantId),
    )
    .filter((f): f is typeof f & { comment: string } =>
      typeof f.comment === 'string' && f.comment.length > 0,
    )
    .map((f) => ({ rating: f.rating, comment: f.comment }));
  // Cache key AI-açık restoran kapsamını içerir — aksi halde kapsam/flag
  // değişince eski (başka restoranlardan üretilmiş) temalar gösterilirdi.
  const themeCacheKey = `dashboard-themes:v58:${user.id}:${[...aiEnabledRestaurantIds].sort().join(',')}:30d`;
  const cachedDashboardThemes = aiAnalyticsAvailable ? await getCachedThemes(themeCacheKey) : null;
  let dashboardThemes;
  if (!aiAnalyticsAvailable) {
    dashboardThemes = { themes: [], synthesis: '', source: 'fallback' as const };
  } else if (cachedDashboardThemes) {
    dashboardThemes = cachedDashboardThemes;
  } else {
    // Background populate (fire-and-forget). Promise reject olursa Sentry
    // helper içinde zaten yakalanır (CLAUDE.md §15.1 fail-safe pattern).
    void extractThemes(themeComments, locale, themeCacheKey, user.id).catch(() => {});
    // Empty fallback bu request için — UI section'ları null sentry geçer.
    dashboardThemes = { themes: [], synthesis: '', source: 'fallback' as const };
  }

  // §38.32 — BUGÜN BEKLEYEN refactor: eski 4-feedback inline detail render +
  // segment crossover (§38.17) kaldırıldı. Yeni 3-task summary (reply / platform
  // Google sync / reminder churn). Detail için owner /feedbacks deep-link'e
  // tıklar. Customer segment chip Customers page + drawer'da hâlâ mevcut.
  const pendingCount = homeStats.unrepliedCount;
  const oldestUnrepliedAt = homeStats.oldestUnrepliedAt;
  const churnedCount = homeStats.churnedCustomers;
  const dashboardTasks = buildPendingTasks({
    unrepliedFeedbacks: { count: pendingCount, oldestUnrepliedAt },
    googlePlatformCheck: {
      failing: homeStats.googleFailingCheckAt !== null,
      lastCheckedAt: homeStats.googleFailingCheckAt,
    },
    churnedCustomers: { count: churnedCount },
    limit: 4,
    isTr,
  });

  // ---- Welcome card (only while the account has no business) ----
  // QR codes, review links and feedback all belong to a business, so the
  // one useful step here is adding the first one. With a business the
  // per-business setup checklist (ActivationChecklistCard) takes over.
  // Team members cannot add businesses — they get a short note instead.
  const hasRestaurant = user.restaurants.length > 0;
  const isTeamMember = payload.role === 'team_member';
  const onboardingSteps: OnboardingStep[] = isTeamMember
    ? []
    : [
        {
          id: 1,
          label: isTr ? 'İlk işletmeni ekle' : 'Add your first business',
          done: false,
          href: `/${locale}/dashboard/restaurants/new`,
        },
      ];
  const onboardingDescription = isTeamMember
    ? isTr
      ? 'Sana henüz bir işletme atanmadı. Erişim için işletme sahibine başvur.'
      : 'No business has been assigned to you yet. Ask the business owner for access.'
    : isTr
      ? 'QR kodları, yorum linkleri ve geri bildirimler bir işletmeye bağlıdır. Başlamak için ilk işletmeni ekle.'
      : 'QR codes, review links and feedback all belong to a business. Add your first business to get started.';
  const scopedHref = (href: string) => {
    if (!selectedRestaurantId) return href;
    const [path, query = ''] = href.split('?');
    const params = new URLSearchParams(query);
    params.set('restaurantId', selectedRestaurantId);
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };

  // ---- KPI changes (lib/feedback-metrics.ts, §58) ----
  const ratingsChange = describeChange(last7Total, prevScopeAggregate._count._all, { isTr });
  const prevAvg = prevScopeAggregate._avg.rating ?? null;
  const ratingChange = describeRatingChange(last7AvgRating || null, prevAvg, isTr);
  const scopeFeedback = last7Total - scopeRedirects;
  const redirectChange = describeChange(scopeRedirects, prevScopeRedirects, { isTr });
  const toKind = (tone: 'good' | 'bad' | 'neutral') => (tone === 'good' ? 'up' : tone === 'bad' ? 'down' : 'neutral') as 'up' | 'down' | 'neutral';

  // ---- Google Rating Impact ----
  const impactStats = user.restaurants
    // Only the business(es) on screen — the Google card must not show another
    // business's rating change.
    .filter((r) => restIds.includes(r.id))
    .filter((r) => r.initialGoogleRating !== null && r.currentGoogleRating !== null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      initial: r.initialGoogleRating!,
      current: r.currentGoogleRating!,
      diff: Math.round((r.currentGoogleRating! - r.initialGoogleRating!) * 10) / 10,
    }))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3); // top 3

  // §38.31 — KANAL DAĞILIMI ChannelDistribution data: platformDistData
  // (current scope avgRating + count) + prevPlatformGroups (önceki scope avg)
  // → delta = current - prev. Top 4 platform.
  const prevPlatformAvg = new Map<string, number>();
  for (const g of prevPlatformGroups) {
    if (!g.platform || g._avg.rating === null) continue;
    prevPlatformAvg.set(g.platform, g._avg.rating);
  }
  const channelStats = platformDistData.slice(0, 4).map((p) => {
    const prev = prevPlatformAvg.get(p.platform);
    const delta =
      p.avgRating !== null && prev !== undefined
        ? Math.round((p.avgRating - prev) * 10) / 10
        : null;
    return {
      platform: p.platform,
      label: p.label,
      count: p.count,
      avgRating: p.avgRating ?? 0,
      delta,
    };
  });

  // §38.31 — Google card impact strip data (Önce X.X → Şimdi Y.Y · +Δ).
  // En yüksek positive diff'li restoranı al; null-safe (null → strip gizli).
  const googleImpact = impactStats.length > 0 ? impactStats[0] : null;

  // §38.31 — CANLI AKIŞ event union build. 4 source helper'a geçirilir,
  // helper sort + slice + sentiment derive yapar (saf fonksiyon, test edilebilir).
  // Who sent each reply (owner, team member or admin): the feed names the
  // person, AI only drafts (§54).
  const replyAuthorIds = [...new Set(recentReplies.map((r) => r.authorUserId))];
  const [replyUsers, replyAdmins] = replyAuthorIds.length
    ? await prisma.$transaction([
        prisma.user.findMany({ where: { id: { in: replyAuthorIds } }, select: { id: true, name: true } }),
        prisma.adminUser.findMany({ where: { id: { in: replyAuthorIds } }, select: { id: true, username: true } }),
      ])
    : [[], []];
  const replyAuthorName = new Map<string, string>();
  for (const u of replyUsers) if (u.name?.trim()) replyAuthorName.set(u.id, u.name.trim().split(/\s+/)[0]);
  for (const a of replyAdmins) replyAuthorName.set(a.id, 'Buaze');

  const activityEvents = buildActivityFeed({
    // §38.32 — slice(0,8) caller-side redundant (helper limit=6 zaten 5-6'ya
    // crop eder); explicit cap ile clarity. KVKK consent helper'a geçirilir,
    // false ise actor "Müşteri" fallback (anonim feedback).
    feedbacks: latestFeedbacks.slice(0, 8).map((f) => ({
      id: f.id,
      name: f.name,
      rating: f.rating,
      platform: f.platform,
      createdAt: f.createdAt,
      restaurantId: f.restaurantId,
      restaurant: f.restaurantId
        ? { name: restaurantNameById.get(f.restaurantId) ?? '' }
        : null,
      hasKvkkConsent: f.hasKvkkConsent,
    })),
    replies: recentReplies.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      source: r.source,
      authorName: replyAuthorName.get(r.authorUserId) ?? null,
      feedback: r.feedback,
    })),
    aiDrafts: recentAiDrafts.map((d) => ({
      id: d.id,
      generatedAt: d.generatedAt,
      feedback: d.feedback,
    })),
    systemEvents: recentSystemEvents.map((s) => ({
      id: s.id,
      type: s.type,
      sentAt: s.sentAt,
    })),
    limit: 6,
    isTr,
  });

  // Phase 8c+ §38.27 — Tasarım .design-owner-2026/page-dashboard.jsx 1:1 parity:
  // greeting (saat-aware) + actionable hook (pending count) + subtitle (restoran
  // · tarih · son güncelleme) + 3 action button (Rapor / Tarih / Yorum İste).
  const nowDate = new Date();
  // §46 — sunucu UTC'de çalışır; selamlama saati işletme saat diliminden.
  const hour =
    Number(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: displayTz,
      }).format(nowDate),
    ) % 24;
  const greeting = isTr
    ? hour >= 5 && hour < 12
      ? 'Günaydın'
      : hour >= 12 && hour < 18
        ? 'İyi öğleden sonralar'
        : 'İyi akşamlar'
    : hour >= 5 && hour < 12
      ? 'Good morning'
      : hour >= 12 && hour < 18
        ? 'Good afternoon'
        : 'Good evening';
  const userFirstName = user.name?.trim().split(/\s+/)[0] || (isTr ? 'Hoş geldin' : 'Welcome');
  // §38.32 — pendingCount yukarıda homeStats.unrepliedCount'tan
  // tanımlandı; greeting hook için reuse.
  // Every unreplied 1–3★ feedback counts, not only today's — so no
  // "Bugün" here (the pending card below shows how old the oldest one is).
  const pendingHook = isTr
    ? pendingCount > 0
      ? `${pendingCount} geri bildirim yanıt bekliyor`
      : 'Yanıt bekleyen geri bildirim yok.'
    : pendingCount > 0
      ? `${pendingCount} ${pendingCount === 1 ? 'piece of feedback is' : 'pieces of feedback are'} waiting for a reply`
      : 'No feedback is waiting for a reply.';
  const primaryRestaurantName = selectedRestaurant?.name ?? user.restaurants[0]?.name ?? '';

  // §40.10 anti-double-skeleton — server-compute activation here so the
  // ActivationChecklistCard hydrates with data and skips its own loading
  // skeleton flash (Next.js segment loading.tsx already covered the wait).
  // Profile fields come from the business list, the feedback total from the
  // per-business groupBy and the QR count from the stats query above; only
  // the activation state row is read here. A failure there stays soft: the
  // client refetches via its own GET /activation endpoint.
  let initialActivation: ReturnType<typeof computeActivation> | undefined;
  if (activationTarget) {
    try {
      const activationRead = await activationStatePromise;
      if (!activationRead || !activationRead.ok) throw activationRead?.error ?? new Error('activation state unavailable');
      const activationState = activationRead.row;
      initialActivation = computeActivation({
        restaurant: {
          name: activationTarget.name,
          category: activationTarget.category,
          googleReviewUrl: activationTarget.googleReviewUrl,
          googleEnabled: activationTarget.googleEnabled,
        },
        state: activationState,
        qrGenerationCount: homeStats.activationQrCount,
        feedbackCount:
          restaurantRatings.find((r) => r.restaurantId === activationTarget.id)?._count._all ?? 0,
      });
    } catch (activationError) {
      // Soft-fail: client will refetch via own GET /activation endpoint.
      console.error('[DashboardPage] activation hydration failed', activationError);
    }
  }

  const dateText = nowDate.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: displayTz,
  });

  // KPI delta'ları scope penceresinde hesaplanıyor (ScopeDropdown, default 7g);
  // etiketler bu pencereyi doğru söylemeli — sabit "son 7/30 gün" yanıltıyordu.
  const scopeLabel = isTr
    ? scope === 'tw7d'
      ? 'son 7 gün'
      : scope === 'tw30d'
        ? 'son 30 gün'
        : scope === 'tw90d'
          ? 'son 90 gün'
          : 'bu yıl'
    : scope === 'tw7d'
      ? 'last 7 days'
      : scope === 'tw30d'
        ? 'last 30 days'
        : scope === 'tw90d'
          ? 'last 90 days'
          : 'this year';
  const prevScopeLabel = isTr
    ? scope === 'tw7d'
      ? 'önceki 7 gün'
      : scope === 'tw30d'
        ? 'önceki 30 gün'
        : scope === 'tw90d'
          ? 'önceki 90 gün'
          : 'geçen yılın aynı dönemi'
    : scope === 'tw7d'
      ? 'prev 7 days'
      : scope === 'tw30d'
        ? 'prev 30 days'
        : scope === 'tw90d'
          ? 'prev 90 days'
          : 'same period last year';

  const lowRated30dCount = homeStats.lowRatedInScope;
  const lowRated30dRepliedCount = homeStats.lowRatedRepliedInScope;
  const responseRate =
    lowRated30dCount > 0 ? Math.round((lowRated30dRepliedCount / lowRated30dCount) * 100) : null;
  const pendingTaskItems = dashboardTasks.map((task) => ({ ...task, href: scopedHref(task.href) }));
  const pendingHref = scopedHref(`/${locale}/dashboard/feedbacks?tab=low&hasReply=pending`);
  const fmtNum = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const fmtRating = (n: number) => (isTr ? n.toFixed(1).replace('.', ',') : n.toFixed(1));
  const vsPrev = isTr ? `${prevScopeLabel} göre` : `vs ${prevScopeLabel}`;
  // One platform: the channel card would repeat the redirect KPI (§58).
  const showChannels = channelStats.length >= 2;
  const planBadge =
    user.plan === 'trial' ? (isTr ? 'Deneme' : 'Trial') : user.plan === 'free' ? (isTr ? 'Ücretsiz' : 'Free') : isTr ? 'Aktif' : 'Active';
  const homeTiles = [
    { href: scopedHref(`/${locale}/dashboard/qr`), icon: <Printer size={22} aria-hidden="true" />, label: isTr ? 'QR kartını yazdır' : 'Print your QR card' },
    { href: `/${locale}/dashboard/account?section=billing`, icon: <Crown size={22} aria-hidden="true" />, label: isTr ? 'Paket ve fatura' : 'Plan and billing', badge: planBadge },
    { href: scopedHref(`/${locale}/dashboard/feedbacks`), icon: <Sparkles size={22} aria-hidden="true" />, label: isTr ? 'Pulse AI yanıt taslakları' : 'Pulse AI reply drafts' },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        crumb={isTr ? 'Genel bakış' : 'Overview'}
        titleClassName="hidden sm:block"
        title={
          <>
            {greeting}, {userFirstName}.{' '}
            {pendingCount > 0 ? (
              <Link
                href={pendingHref}
                className="underline decoration-pn-accent decoration-2 underline-offset-4 hover:decoration-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent-hover rounded"
              >
                {pendingHook}
              </Link>
            ) : (
              pendingHook
            )}
          </>
        }
        subtitle={
          primaryRestaurantName
            ? `${primaryRestaurantName} · ${dateText}`
            : dateText
        }
        actions={
          <>
            {/* Date window for the KPI cards (?scope=). */}
            <ScopeDropdown current={scopeUrlValue} isTr={isTr} />
            {hasRestaurant && (
              <Link
                href={scopedHref(`/${locale}/dashboard/qr?new=1`)}
                className="bz-btn-primary inline-flex items-center gap-1.5 text-[12px]"
              >
                <Plus size={13} strokeWidth={2} aria-hidden="true" />
                {isTr ? 'Yorum iste' : 'Request review'}
              </Link>
            )}
          </>
        }
      />

      {/* Weekly AI summary: calm light strip (dismissible per ISO week). */}
      {dashboardThemes.synthesis && (
        <AIInsightBanner
          insight={dashboardThemes.synthesis}
          actionHref={scopedHref(`/${locale}/dashboard/analytics`)}
          isTr={isTr}
        />
      )}

      {!hasRestaurant && (
        <OnboardingNudge
          locale={locale}
          steps={onboardingSteps}
          description={onboardingDescription}
        />
      )}
      {activationTarget && (
        <ActivationChecklistCard
          key={activationTarget.id}
          restaurantId={activationTarget.id}
          locale={locale}
          initialResult={initialActivation}
        />
      )}

      {/* Lime shortcut tiles (reference "Referral / PRO / Cashback"): a
          swipeable row on phones and tablets, the right column on desktop. */}
      {hasRestaurant && (
        <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 no-scrollbar lg:hidden">
          {homeTiles.map((tile) => (
            <div key={tile.href} className="w-[46%] min-w-[150px] shrink-0 snap-start sm:w-[31%]">
              <PanoTile href={tile.href} icon={tile.icon} label={tile.label} badge={tile.badge} />
            </div>
          ))}
        </div>
      )}

      {/* Pano KPI block (docs/design/DASHBOARD_DESIGN.md §5.4): the average
          rating on the dark hero card with shortcuts and the low-rating reply
          rate as a hatched progress bar; the other KPIs on white cards
          (§58 definitions behind ⓘ). */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <PanoHeroCard
          className="sm:col-span-2 lg:col-span-1 lg:row-span-2"
          greeting={`${greeting}, ${userFirstName}`}
          rows={channelStats.slice(0, 2).map((c) => ({
            id: c.platform,
            href: scopedHref(`/${locale}/dashboard/platforms`),
            icon: c.platform === 'google' ? 'G' : c.label.slice(0, 2),
            value: fmtNum(c.count),
            label: isTr ? `${c.label} · yönlendirme` : `${c.label} · redirects`,
            change:
              c.delta !== null && Math.abs(c.delta) >= 0.05
                ? { text: `${c.delta > 0 ? '+' : ''}${fmtRating(c.delta)}★`, up: c.delta > 0 }
                : null,
          }))}
          label={`${metricLabel('avgRating', isTr)} · ${scopeLabel}`}
          info={metricInfo('avgRating', isTr)}
          value={last7AvgRating > 0 ? fmtRating(last7AvgRating) : '—'}
          change={ratingChange ? { text: ratingChange.text, tone: ratingChange.tone } : null}
          changeSuffix={ratingChange && ratingChange.arrow ? vsPrev : undefined}
          openHref={scopedHref(`/${locale}/dashboard/analytics`)}
          openLabel={isTr ? 'Analitiği aç' : 'Open analytics'}
          isTr={isTr}
          actions={[
            { href: scopedHref(`/${locale}/dashboard/qr?new=1`), label: isTr ? 'QR oluştur' : 'Create QR', icon: <QrCode size={20} aria-hidden="true" /> },
            { href: scopedHref(`/${locale}/dashboard/feedbacks`), label: isTr ? 'Yorumlar' : 'Reviews', icon: <Inbox size={20} aria-hidden="true" /> },
            { href: scopedHref(`/${locale}/dashboard/google-reviews`), label: isTr ? 'Google yorumları' : 'Google reviews', icon: <Star size={20} aria-hidden="true" /> },
            { href: scopedHref(`/${locale}/dashboard/analytics`), label: isTr ? 'Analitik' : 'Analytics', icon: <BarChart3 size={20} aria-hidden="true" /> },
          ]}
          progress={{
            label: metricLabel('lowReplyRate', isTr),
            percent: responseRate,
            caption:
              responseRate === null
                ? isTr
                  ? '1–3★ geri bildirim yok'
                  : 'No 1–3★ feedback'
                : isTr
                  ? `${lowRated30dRepliedCount}/${lowRated30dCount} düşük puana yanıt verildi · %${responseRate}`
                  : `${lowRated30dRepliedCount}/${lowRated30dCount} low ratings answered · ${responseRate}%`,
          }}
        />
        <StatCard
          label={metricLabel('ratings', isTr)}
          info={metricInfo('ratings', isTr)}
          isTr={isTr}
          value={fmtNum(last7Total)}
          delta={ratingsChange.text}
          deltaKind={toKind(ratingsChange.tone)}
          deltaSuffix={scopeLabel}
          icon={<Inbox size={17} />}
        />
        <StatCard
          label={metricLabel('redirects', isTr)}
          info={metricInfo('redirects', isTr)}
          isTr={isTr}
          value={fmtNum(scopeRedirects)}
          delta={redirectChange.text}
          deltaKind={toKind(redirectChange.tone)}
          deltaSuffix={redirectChange.arrow ? vsPrev : scopeLabel}
          icon={<ExternalLink size={17} />}
        />
        <StatCard
          label={isTr ? 'Geri bildirim' : 'Feedback'}
          isTr={isTr}
          value={fmtNum(scopeFeedback)}
          deltaSuffix={scopeLabel}
          icon={<MessageSquareReply size={17} />}
        />
        <StatCard
          label={isTr ? 'Yanıt bekleyen' : 'Awaiting reply'}
          isTr={isTr}
          value={fmtNum(pendingCount)}
          deltaSuffix={isTr ? '1–3★ geri bildirim' : '1–3★ feedback'}
          icon={<MessageSquareReply size={17} />}
        />
      </div>

      {/* lg: two independent columns; below lg the wrappers are
          `display: contents` and `order-*` keeps one column: chart,
          pending, channels, topics, activity. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <div className="hidden sm:block order-1 lg:order-none">
            <VolumeChart
              title={isTr ? 'Puan hacmi' : 'Rating volume'}
              subtitle={isTr ? 'Yönlendirme ve geri bildirim' : 'Redirects and feedback'}
              ranges={[
                { key: '30', label: isTr ? '30 gün' : '30 days', points: volume30 },
                { key: '90', label: isTr ? '90 gün' : '90 days', points: volume90 },
                { key: 'ytd', label: isTr ? 'Bu yıl' : 'This year', points: volumeYtd },
              ]}
              isTr={isTr}
              footer={
                <Link
                  href={scopedHref(`/${locale}/dashboard/analytics`)}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-full text-[13px] font-medium text-[#404040] hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent-hover"
                >
                  {isTr ? 'Analitik' : 'Analytics'}
                  <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
                </Link>
              }
            />
          </div>

          {showChannels && (
            <section className="order-3 lg:order-none" aria-label={isTr ? 'Platformlar' : 'Platforms'}>
              <ChannelDistribution
                title={isTr ? 'Yönlendirilen platformlar' : 'Platforms customers were sent to'}
                channels={channelStats}
                googleImpact={googleImpact}
                isTr={isTr}
              />
            </section>
          )}

          {dashboardThemes.themes.length > 0 && (
            <section className="bz-card p-5 sm:p-6 hidden sm:block order-4 lg:order-none">
              <header className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-medium text-pn-ink">
                  {isTr ? 'Sık bahsedilen konular' : 'Frequent topics'}
                </h2>
                <span className="shrink-0 text-[13px] text-[#737373]">{isTr ? 'Son 30 gün' : 'Last 30 days'}</span>
              </header>
              <ul className="space-y-4">
                {dashboardThemes.themes.slice(0, 5).map((t) => {
                  const hasSentiment = typeof t.sentimentPositivePct === 'number';
                  const pos = hasSentiment ? (t.sentimentPositivePct as number) : 0;
                  const neu = hasSentiment ? (t.sentimentNeutralPct ?? 0) : 0;
                  const neg = hasSentiment ? (t.sentimentNegativePct ?? Math.max(0, 100 - pos - neu)) : 0;
                  // 1–2 mentions: too little data to read a share from.
                  const thin = t.count < TOPIC_MIN_MENTIONS;
                  return (
                    <li key={t.theme} className={thin ? 'opacity-60' : undefined}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-[14px]">
                        <span className="truncate font-medium text-pn-ink">{t.theme}</span>
                        <span className="shrink-0 text-[13px] tabular-nums text-[#737373]">
                          {t.count} {isTr ? 'bahsedilme' : t.count === 1 ? 'mention' : 'mentions'}
                          {thin ? (isTr ? ' · az veri' : ' · little data') : ''}
                        </span>
                      </div>
                      {hasSentiment ? (
                        <>
                          <div
                            className="flex h-1.5 overflow-hidden rounded-full bg-[#F0F0F0]"
                            role="img"
                            aria-label={topicSentimentText(pos, neg, isTr)}
                          >
                            <div className="h-full" style={{ width: `${pos}%`, background: '#16A34A' }} />
                            <div className="h-full" style={{ width: `${neu}%`, background: '#D4D4D4' }} />
                            <div className="h-full" style={{ width: `${neg}%`, background: '#DC2626' }} />
                          </div>
                          <p className="mt-1 text-[12px] text-[#525252]">{topicSentimentText(pos, neg, isTr)}</p>
                        </>
                      ) : (
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#F0F0F0]">
                          <div
                            className="h-full rounded-full bg-pn-ink"
                            style={{ width: `${Math.max(8, (t.count / (dashboardThemes.themes[0]?.count ?? 1)) * 100)}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          {hasRestaurant && (
            <div className="hidden grid-cols-3 gap-2.5 lg:grid">
              {homeTiles.map((tile) => (
                <PanoTile key={tile.href} href={tile.href} icon={tile.icon} label={tile.label} badge={tile.badge} />
              ))}
            </div>
          )}
          <PendingTasks className="order-2 lg:order-none" tasks={pendingTaskItems} isTr={isTr} />
          <ActivityFeed
            key={restIds.join(',')}
            className="order-5 lg:order-none"
            events={activityEvents}
            restaurantIds={restIds}
            isTr={isTr}
            viewAllHref={scopedHref(`/${locale}/dashboard/feedbacks`)}
          />
        </div>
      </div>
    </div>
  );
}
