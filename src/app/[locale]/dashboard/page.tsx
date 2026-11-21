import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scopedRestaurantWhereForUserPayload } from '@/lib/panel-access';
import { parallelReads } from '@/lib/db-parallel';
import { extractThemes, getCachedThemes } from '@/lib/analytics-themes';
// §38.32 — deriveCustomerFields + CustomerSegment + SegmentChip artık
// dashboard'da kullanılmıyor (BUGÜN BEKLEYEN feedback-detail render kaldırıldı).
// Customers list/drawer'da hâlâ aktif (§38.17 paterni).
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';
import {
  ArrowRight,
  Inbox,
  MessageSquareReply,
  Plus,
  Star,
  UserPlus,
} from 'lucide-react';
import OnboardingNudge, { type OnboardingStep } from '@/components/dashboard/OnboardingNudge';
import ActivationChecklistCard from '@/components/dashboard/ActivationChecklistCard';
import { computeActivation } from '@/lib/activation';
import AIInsightBanner from '@/components/dashboard/AIInsightBanner';
import PulseRangeToggle from '@/components/dashboard/PulseRangeToggle';
import ChannelDistribution from '@/components/dashboard/ChannelDistribution';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import ScopeDropdown from '@/components/dashboard/ScopeDropdown';
import { buildActivityFeed } from '@/lib/activity-feed';
import { buildPlatformDailyTrend, type PlatformDailyPoint } from '@/lib/analytics-platform-trend';
import { Eyebrow, PageHeader, Sparkline, StatCard } from '@/components/ui';
import PendingTasks from '@/components/dashboard/PendingTasks';
import { buildPendingTasks } from '@/lib/dashboard-tasks';
import { isSameDayInTimeZone, resolveDisplayTimeZone } from '@/lib/timezone';

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
  // Both run at once; an owner's scope is `userId = id`, so owners skip the
  // separate id-list query (team members still resolve it first).
  const [userRow, scopedRestaurants] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, name: true },
    }),
    (async () =>
      prisma.restaurant.findMany({
        where: await scopedRestaurantWhereForUserPayload({
          userId: payload.userId as string,
          role: payload.role,
          email: payload.email,
        }),
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          isActive: true,
          initialGoogleRating: true,
          currentGoogleRating: true,
          // §5.2 — admin master flag; AI tema çıkarımı bu flag kapalıyken çalışmamalı.
          aiAnalyticsEnabled: true,
          _count: { select: { feedbacks: true } },
        },
      }))(),
  ]);
  if (!userRow) redirect(`/${locale}/auth/login`);
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
  const sevenDaysAgo = new Date(now - 7 * 86400000);
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

  // §40.10 anti-double-skeleton — the activation checklist is computed here
  // so ActivationChecklistCard hydrates with data. Its 4 reads join the batch
  // below; a failure there stays soft (logged, card refetches on its own).
  const activationTarget = selectedRestaurant ?? user.restaurants[0] ?? null;
  const activationErrors: unknown[] = [];
  const activationRead = <T,>(query: PromiseLike<T>) => () =>
    Promise.resolve(query).catch((error: unknown) => {
      activationErrors.push(error);
      return null;
    });
  const activationTargetId = activationTarget?.id ?? '';

  // ---- Tek toplu okuma bloğu ----
  // Independent reads, at most 8 at a time (parallelReads). This used to be
  // one array `$transaction`, which ran every query back to back plus
  // BEGIN/COMMIT (~30 round trips) — needed only while the pool had
  // connection_limit=1. Boş restIds için Prisma `in: []` zaten 0 satır
  // döner; fallback path gereksiz.
  const [
    latestFeedbacks,
    trendFeedbacks,
    restaurantRatings,
    starGroups,
    platformGroups,
    qrPerfRows,
    qrScanGroups,
    last7Avg,
    prev7Count,
    prev7Avg,
    lowRated30dCount,
    lowRated30dRepliedCount,
    newCustomers30dRows,
    unrepliedAggregate,
    themesFeedbacks,
    trendFeedbacksRange,
    prevPlatformGroups,
    recentReplies,
    recentAiDrafts,
    recentSystemEvents,
    googleSyncCheck,
    churnedCustomerRows,
    activationRestaurant,
    activationState,
    activationQrCount,
    activationFeedbackCount,
  ] = await parallelReads([
    // Son yorumlar listesi (4 görünür "Son yorumlar" kartı için + 4 ek
    // CANLI AKIŞ timeline için — aynı veri reuse).
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { restaurant: { select: { name: true } } },
    }),
    // Trend (son 7 gün) — daily bucket için ham veri
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, rating: true, restaurantId: true },
    }),
    // Per-restaurant avg + count (totalReviews + avgRating tek source)
    prisma.feedback.groupBy({
      by: ['restaurantId'],
      where: { restaurantId: restIdIn },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // Star distribution (5-bar chart)
    prisma.feedback.groupBy({
      by: ['rating'],
      where: { restaurantId: restIdIn },
      _count: { _all: true },
    }),
    // Platform distribution (Yorum Görünümü section)
    prisma.feedback.groupBy({
      by: ['platform'],
      where: { restaurantId: restIdIn, platform: { not: null } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    // QR generations (top 5 için meta)
    prisma.qrGeneration.findMany({
      where: { restaurantId: restIdIn, type: 'feedback' },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        tableNumber: true,
        platform: true,
        createdAt: true,
        restaurant: { select: { name: true, id: true } },
      },
    }),
    // QR scan counts — gerçek scan event tracking (CLAUDE.md §34.x).
    // Eski versiyon feedback proxy idi; artık QrScan tablosundan groupBy.
    prisma.qrScan.groupBy({
      by: ['restaurantId', 'tableNumber', 'platform'],
      where: { restaurantId: restIdIn },
      _count: { _all: true },
    }),
    // §38.31 — Scope window total + avg (KPI Toplam yorum value + delta).
    prisma.feedback.aggregate({
      where: { restaurantId: restIdIn, createdAt: { gte: scopeStart } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // §38.31 — Önceki scope window count (delta baseline). YTD durumda
    // prev_year YTD karşılaştırması.
    prisma.feedback.count({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: prevScopeStart, lt: prevScopeEnd },
      },
    }),
    // §38.31 — Önceki scope window ortalama puan (delta baseline).
    prisma.feedback.aggregate({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: prevScopeStart, lt: prevScopeEnd },
      },
      _avg: { rating: true },
    }),
    // §38.31 — Yanıt oranı KPI: scope window içinde rating ≤3 toplam +
    // hangileri yanıtlanmış (some replies). Ratio = replied / total × 100.
    // §38.27'de fixed 30d idi; §38.31 ile scope dropdown'a bağlandı.
    prisma.feedback.count({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: scopeStart },
        rating: { lte: 3 },
      },
    }),
    prisma.feedback.count({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: scopeStart },
        rating: { lte: 3 },
        replies: { some: {} },
      },
    }),
    // §38.31 — Yeni müşteri KPI: scope window'da yorum bırakan ve
    // contact_key (email|phone) NOT NULL olan tekil müşteri sayısı.
    // §38.27'de fixed 30d idi; §38.31 ile scope dropdown'a bağlandı.
    // restIds boşsa SQL `IN ()` syntax error olur — WHERE FALSE ile 0 döner.
    restIds.length > 0
      ? prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
          SELECT COUNT(DISTINCT
            CONCAT(f.restaurant_id, '|',
              COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), ''))
            )
          )::bigint AS count
          FROM feedback f
          WHERE f.has_kvkk_consent = TRUE
            AND f.restaurant_id IN (${Prisma.join(restIds)})
            AND f.created_at >= ${scopeStart}
            AND COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), ''))
                IS NOT NULL
        `)
      : prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT 0::bigint AS count WHERE FALSE`),
    // §38.32 — BUGÜN BEKLEYEN "reply" task: yanıtsız low-rating yorum
    // toplam sayısı + en eskisinin tarihi (relative time için). Eski 4-feedback
    // detail list (§38.17 segment crossover) kaldırıldı — UI duplikasyon
    // (kullanıcı kararı: "anasayfada 2 defa tekrarlayan bilgiler"); yeni
    // PendingTasks summary 3-task generic. Owner click → /feedbacks detayına.
    prisma.feedback.aggregate({
      where: { restaurantId: restIdIn, rating: { lte: 3 }, replies: { none: {} } },
      _count: { _all: true },
      _min: { createdAt: true },
    }),
    // SIK BAHSEDİLEN KONULAR — son 30 gün yorum metinleri (extractThemes
    // helper'ı için ham veri). Min 8 yorum + OpenAI key gereği helper içinde
    // (yetersiz → empty fallback). Cache 1 saat (CLAUDE.md §34.9).
    prisma.feedback.findMany({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: new Date(now - 30 * 86400000) },
        comment: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
      // restaurantId — AI tema girdisini aiAnalyticsEnabled restoranlarla sınırlamak için.
      select: { rating: true, comment: true, restaurantId: true },
    }),
    // Phase 8c+ §38.30 — NABIZ chart 30G/90G/YTD chip toggle için ham veri.
    // En geriye uzanan window (YTD veya 90 gün, hangisi daha eski). JS-side
    // 3 dataset'e bucketlanır (trend30 daily, trend90 daily, trendYtd weekly).
    // Mevcut 7-day trendFeedbacks (mobile hero sparkline) etkilenmez.
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn, createdAt: { gte: trendOldestStart } },
      select: { createdAt: true, rating: true, platform: true },
    }),
    // §38.31 — KANAL DAĞILIMI delta için önceki scope window platform groupBy.
    // Mevcut platformGroups all-time aggregate; delta için aynı window'da
    // önceki dönem ortalaması karşılaştırılır.
    prisma.feedback.groupBy({
      by: ['platform'],
      where: {
        restaurantId: restIdIn,
        platform: { not: null },
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
    // §38.32 — BUGÜN BEKLEYEN "platform" task: sadece Google için (Yemeksepeti/
    // Getir/Trendyol public API yok, anlamlı sync check imkansız). Son 24 saat
    // içinde provider='google' PlatformLinkCheck.ok=false varsa task aktif.
    // CLAUDE.md §19.4 PlatformLinkCheck pattern.
    prisma.platformLinkCheck.findFirst({
      where: {
        restaurantId: restIdIn,
        provider: 'google',
        ok: false,
        checkedAt: { gte: new Date(now - 24 * 3600 * 1000) },
      },
      orderBy: { checkedAt: 'desc' },
      select: { id: true, checkedAt: true },
    }),
    // §38.32 — BUGÜN BEKLEYEN "reminder" task: 30+ gündür dönüş yapmamış ≥2
    // visit'li müşteri sayısı (kayıp müşteri / churn signal). Phase 8c segment
    // helper'da `churned` yok (CLAUDE.md §38.16 4 segment + new); bu task için
    // ayrı raw SQL aggregate. KVKK consent + non-anonim filter (§38.17 paterni).
    restIds.length > 0
      ? prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
          SELECT COUNT(*)::bigint AS count FROM (
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
        `)
      : prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT 0::bigint AS count WHERE FALSE`),
    // Activation checklist (soft-fail, only when there is a business).
    activationTarget
      ? activationRead(
          prisma.restaurant.findUnique({
            where: { id: activationTargetId },
            select: {
              name: true,
              category: true,
              googleReviewUrl: true,
              googleEnabled: true,
            },
          }),
        )
      : () => Promise.resolve(null),
    activationTarget
      ? activationRead(
          prisma.restaurantActivationState.findUnique({
            where: { restaurantId: activationTargetId },
            select: { qrPrintedSharedAt: true, dismissedAt: true },
          }),
        )
      : () => Promise.resolve(null),
    activationTarget
      ? activationRead(prisma.qrGeneration.count({ where: { restaurantId: activationTargetId } }))
      : () => Promise.resolve(null),
    activationTarget
      ? activationRead(prisma.feedback.count({ where: { restaurantId: activationTargetId } }))
      : () => Promise.resolve(null),
  ]);

  // ---- Derived metrics ----
  const totalReviews = restaurantRatings.reduce((a, r) => a + r._count._all, 0);
  const totalRatedCount = totalReviews;
  const avgRating =
    totalRatedCount === 0
      ? 0
      : restaurantRatings.reduce(
          (a, r) => a + (r._avg.rating ?? 0) * r._count._all,
          0,
        ) / totalRatedCount;

  // §38.31 — Scope window total + avg, scope dropdown'a parametrik. last7Avg
  // değişken adı korundu (lint silence) ama scope='30d' iken "last7" değil
  // "last30" semantik; yorumda açıklandı.
  const last7Total = last7Avg._count._all;
  const last7AvgRating = last7Avg._avg.rating ?? 0;

  // Star distribution
  const starCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of starGroups) {
    if (g.rating >= 1 && g.rating <= 5) starCounts[g.rating as 1 | 2 | 3 | 4 | 5] = g._count._all;
  }

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

  // 7-day trend buckets (TrendsChart Recharts için)
  const dayLabelsTr = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const dayLabelsEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayLabels = isTr ? dayLabelsTr : dayLabelsEn;
  // §46 — gün sınırları işletme saat diliminde; sunucu UTC'de `setHours(0)`
  // gece yarısına yakın yorumları bir önceki/sonraki güne kaydırıyordu.
  const displayTz = resolveDisplayTimeZone();
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: displayTz });
  const weekdayIdx: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  const trendsChartData: { date: string; count: number; avgRating: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayRef = new Date(now - (6 - i) * 86400000);
    const labelIdx = weekdayIdx[weekdayFmt.format(dayRef)] ?? 0;
    const dayFbs = trendFeedbacks.filter((f) =>
      isSameDayInTimeZone(f.createdAt, dayRef, displayTz),
    );
    const count = dayFbs.length;
    const ratingSum = dayFbs.reduce((sum, f) => sum + (f.rating || 0), 0);
    const ratingAvg = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 0;
    trendsChartData.push({ date: dayLabels[labelIdx], count, avgRating: ratingAvg });
  }

  // Phase 8c+ §38.30 — NABIZ chart artık analytics ana grafiğiyle aynı
  // platform kırılımlı stacked area gövdesini kullanır. 30G/90G/YTD toggle
  // korunur; datasetler analytics helper'ından üretildiği için tooltip ve
  // platform bucket mantığı tek kaynakta kalır.
  const trendLocale = isTr ? 'tr' : 'en';
  const trendNow = new Date(now);
  const ytdDays = Math.max(1, Math.ceil((now - ytdStart.getTime()) / 86400000) + 1);
  const trendRows = trendFeedbacksRange.map((f) => ({
    rating: f.rating,
    platform: f.platform,
    createdAt: f.createdAt,
  }));
  const trend30 = buildPlatformDailyTrend(trendRows, {
    windowDays: 30,
    locale: trendLocale,
    now: trendNow,
  });
  const trend90 = buildPlatformDailyTrend(trendRows, {
    windowDays: 90,
    locale: trendLocale,
    now: trendNow,
  });
  const trendYtd = buildPlatformDailyTrend(trendRows, {
    windowDays: ytdDays,
    locale: trendLocale,
    now: trendNow,
  });

  function findPeak(
    buckets: PlatformDailyPoint[],
  ): { dateText: string; count: number } | null {
    const peak = buckets.reduce<PlatformDailyPoint | null>(
      (current, bucket) => (bucket.total > (current?.total ?? 0) ? bucket : current),
      null,
    );
    if (!peak || peak.total === 0) return null;
    return {
      dateText: new Date(`${peak.isoDate}T00:00:00`).toLocaleDateString(
        isTr ? 'tr-TR' : 'en-US',
        { day: 'numeric', month: 'long' },
      ),
      count: peak.total,
    };
  }

  const peak30 = findPeak(trend30);
  const peak90 = findPeak(trend90);
  const peakYtd = findPeak(trendYtd);
  // §38.27'deki 7-gün peak hesabı §38.30'da PulseRangeToggle içine taşındı;
  // dashboard'da ayrıca kullanılmıyor.

  // Per-restaurant 7-day sparkline (QR Performansı için).
  const sparklineByRestaurant = new Map<string, number[]>();
  for (const r of restIds) sparklineByRestaurant.set(r, Array(7).fill(0));
  for (const f of trendFeedbacks) {
    if (!f.restaurantId) continue;
    const dayIdx = Math.floor((Date.now() - f.createdAt.getTime()) / 86400000);
    if (dayIdx >= 0 && dayIdx < 7) {
      const arr = sparklineByRestaurant.get(f.restaurantId);
      if (arr) arr[6 - dayIdx] = (arr[6 - dayIdx] || 0) + 1;
    }
  }

  // QR scan count map — QrScan tablosundan groupBy(restaurantId, tableNumber, platform)
  const qrScanCounts = new Map<string, number>();
  for (const g of qrScanGroups) {
    if (!g.restaurantId) continue;
    const key = `${g.restaurantId}::${g.tableNumber || ''}::${g.platform || ''}`;
    qrScanCounts.set(key, g._count._all);
  }

  // QR Performansı top 5 — dedup (restaurant, table, platform) tuple'ı
  const seenKeys = new Set<string>();
  const qrPerfTop: Array<{
    id: string;
    name: string;
    platform: string | null;
    sparkline: number[];
    restaurantId: string;
    scans: number;
  }> = [];
  for (const q of qrPerfRows) {
    const key = `${q.restaurant.id}::${q.tableNumber || ''}::${q.platform || ''}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const restName = q.restaurant.name;
    const label = q.tableNumber
      ? `${restName} · ${isTr ? 'Masa' : 'Table'} ${q.tableNumber}`
      : q.platform
        ? `${restName} · ${q.platform}`
        : restName;
    qrPerfTop.push({
      id: q.id,
      name: label,
      platform: q.platform,
      sparkline: sparklineByRestaurant.get(q.restaurant.id) || Array(7).fill(0),
      restaurantId: q.restaurant.id,
      scans: qrScanCounts.get(key) ?? 0,
    });
    if (qrPerfTop.length >= 5) break;
  }

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
  const themeCacheKey = `dashboard-themes:${user.id}:${[...aiEnabledRestaurantIds].sort().join(',')}:30d`;
  const cachedDashboardThemes = aiAnalyticsAvailable ? getCachedThemes(themeCacheKey) : null;
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
  const pendingCount = unrepliedAggregate._count._all;
  const oldestUnrepliedAt = unrepliedAggregate._min.createdAt ?? null;
  const churnedCount = Number(churnedCustomerRows[0]?.count ?? 0);
  const dashboardTasks = buildPendingTasks({
    unrepliedFeedbacks: { count: pendingCount, oldestUnrepliedAt },
    googlePlatformCheck: {
      failing: googleSyncCheck !== null,
      lastCheckedAt: googleSyncCheck?.checkedAt ?? null,
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

  // ---- KPI delta hesaplamaları (tek pencere: 7d vs prev 7d) ----
  const pctDelta = (curr: number, prev: number): { value: string; kind: 'up' | 'down' | 'neutral' } => {
    if (prev === 0) {
      if (curr === 0) return { value: '0%', kind: 'neutral' };
      return { value: isTr ? 'Yeni' : 'New', kind: 'up' };
    }
    const pct = Math.round(((curr - prev) / prev) * 1000) / 10;
    return {
      value: `${pct >= 0 ? '+' : ''}${pct}%`,
      kind: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
    };
  };

  const totalReviewsDelta = pctDelta(last7Total, prev7Count);

  const prevAvg = prev7Avg._avg.rating ?? 0;
  const ratingDeltaNum =
    last7AvgRating > 0 && prevAvg > 0
      ? Math.round((last7AvgRating - prevAvg) * 10) / 10
      : null;
  const ratingDelta: { value: string; kind: 'up' | 'down' | 'neutral' } =
    ratingDeltaNum === null
      ? { value: '—', kind: 'neutral' }
      : ratingDeltaNum === 0
        ? { value: '0', kind: 'neutral' }
        : {
            value: `${ratingDeltaNum > 0 ? '+' : ''}${ratingDeltaNum.toFixed(1)}`,
            kind: ratingDeltaNum > 0 ? 'up' : 'down',
          };

  // ratingDelta değerleri '—' / '0' / '+0.3'; eski `!== '0%'` kontrolü hiç
  // eşleşmiyor ve veri yokken "↑ —" basıyordu.
  const showRatingDelta = ratingDeltaNum !== null && ratingDeltaNum !== 0;

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
      restaurant: f.restaurant,
      hasKvkkConsent: f.hasKvkkConsent,
    })),
    replies: recentReplies.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      source: r.source,
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
  // §38.32 — pendingCount line 729'da unrepliedAggregate._count._all'dan
  // tanımlandı; greeting hook için reuse.
  // Every unreplied low-rated review counts, not only today's — so no
  // "Bugün" here (the pending card below shows how old the oldest one is).
  const pendingHook = isTr
    ? pendingCount > 0
      ? `${pendingCount} yorum yanıt bekliyor.`
      : 'Yanıt bekleyen yorum yok.'
    : pendingCount > 0
      ? `${pendingCount} ${pendingCount === 1 ? 'review is' : 'reviews are'} waiting for a reply.`
      : 'No reviews are waiting for a reply.';
  const primaryRestaurantName = selectedRestaurant?.name ?? user.restaurants[0]?.name ?? '';

  // §40.10 anti-double-skeleton — server-compute activation here so the
  // ActivationChecklistCard hydrates with data and skips its own loading
  // skeleton flash (Next.js segment loading.tsx already covered the wait).
  // The reads ran in the batch above.
  let initialActivation: ReturnType<typeof computeActivation> | undefined;
  if (activationTarget) {
    try {
      if (activationErrors.length > 0) throw activationErrors[0];
      if (activationRestaurant) {
        initialActivation = computeActivation({
          restaurant: activationRestaurant,
          state: activationState,
          qrGenerationCount: activationQrCount ?? 0,
          feedbackCount: activationFeedbackCount ?? 0,
        });
      }
    } catch (activationFailure) {
      // Soft-fail: client will refetch via own GET /activation endpoint.
      console.error('[DashboardPage] activation hydration failed', activationFailure);
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

  // Mobile hero card (below sm) replaces the "Genel puan" + "Toplam yorum"
  // KPI cards, so it also carries the scope-window review count + change.
  const showMobileHero = avgRating > 0;
  const reviewDeltaText =
    totalReviewsDelta.value === '0%' || totalReviewsDelta.value === (isTr ? 'Yeni' : 'New')
      ? ''
      : ` (${totalReviewsDelta.value})`;
  const responseRate =
    lowRated30dCount > 0 ? Math.round((lowRated30dRepliedCount / lowRated30dCount) * 100) : null;
  const pendingTaskItems = dashboardTasks.map((task) => ({ ...task, href: scopedHref(task.href) }));

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        title={`${greeting}, ${userFirstName}. ${pendingHook}`}
        subtitle={
          primaryRestaurantName
            ? `${primaryRestaurantName} · ${dateText}`
            : dateText
        }
        actions={
          <>
            {/* Date window for the KPI cards (?scope=). The chart below has
                its own 30G / 90G / YTD switch. */}
            <ScopeDropdown current={scopeUrlValue} isTr={isTr} />
            {/* "Yorum iste" = create a QR customers scan to leave a review.
                Hidden until there is a business: a QR needs one, and the
                welcome card's "İlk işletmeni ekle" is then the one action. */}
            {hasRestaurant && (
              <Link
                href={scopedHref(`/${locale}/dashboard/qr?new=1`)}
                className="bz-btn-primary inline-flex items-center gap-1.5 text-[12px]"
              >
                <Plus size={13} strokeWidth={2} aria-hidden="true" />
                {isTr ? 'Yorum İste' : 'Request review'}
              </Link>
            )}
          </>
        }
      />

      {/* Mobile-only summary (graphite + lime, 7-day sparkline). Below sm it
          stands in for the "Genel puan" and "Toplam yorum" KPI cards. */}
      {showMobileHero && (
        <section
          className="sm:hidden rounded-[18px] bg-[#0A0A0A] text-white p-[18px] relative overflow-hidden"
          aria-label={isTr ? 'Puan özeti' : 'Rating summary'}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="pulse-eyebrow text-white/60 text-[9.5px]">
              {isTr ? 'GENEL PUAN' : 'AVG RATING'}
            </span>
            <Link
              href={scopedHref(`/${locale}/dashboard/analytics`)}
              className="-my-3 -mr-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-white/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
            >
              {isTr ? 'Analitik' : 'Analytics'}
              <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-2 mb-3">
            <div className="flex items-baseline gap-1.5">
              <span
                className="bz-h-tight"
                style={{
                  fontSize: 44,
                  lineHeight: 0.9,
                  letterSpacing: '-0.04em',
                  color: '#C6F24E',
                }}
              >
                {avgRating.toFixed(2)}
              </span>
              <span className="flex gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={13}
                    className={s <= Math.round(avgRating) ? 'text-[#C6F24E]' : 'text-white/20'}
                    fill={s <= Math.round(avgRating) ? '#C6F24E' : 'transparent'}
                  />
                ))}
              </span>
            </div>
            <div className="bz-mono text-[11px] text-white/70 mt-1.5 space-y-0.5">
              <p>
                {totalReviews.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
                {isTr ? 'toplam yorum' : 'total reviews'}
              </p>
              <p>
                {scopeLabel}: {last7Total.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
                {isTr ? 'yorum' : last7Total === 1 ? 'review' : 'reviews'}
                {reviewDeltaText}
                {showRatingDelta && (
                  <span className="text-[#C6F24E] font-semibold">
                    {' · '}
                    {isTr ? 'puan' : 'rating'} {ratingDelta.kind === 'down' ? '↓' : '↑'}{' '}
                    {ratingDelta.value.replace(/^[+-]/, '')}
                  </span>
                )}
              </p>
            </div>
          </div>
          {trendsChartData.length >= 2 && (
            <div className="h-[50px] -mx-[18px] -mb-[18px] px-[18px] pb-[18px]">
              <Sparkline
                values={trendsChartData.map((d) => d.count)}
                w={320}
                h={50}
                color="#C6F24E"
                className="w-full"
              />
            </div>
          )}
        </section>
      )}

      {/* Weekly AI insight (dismissible per ISO week). */}
      {dashboardThemes.synthesis && (
        <AIInsightBanner
          insight={dashboardThemes.synthesis}
          actionHref={scopedHref(`/${locale}/dashboard/analytics`)}
          isTr={isTr}
        />
      )}

      {/* One setup card at a time: the account-level checklist only while
          there is no business yet; afterwards the per-business checklist
          (same steps, plus manual "printed/shared" mark and dismiss). */}
      {!hasRestaurant && (
        <OnboardingNudge
          locale={locale}
          steps={onboardingSteps}
          description={onboardingDescription}
        />
      )}
      {activationTarget && (
        <ActivationChecklistCard
          // Seeded once from initialResult — remount per business so a
          // switch does not keep the previous business's checklist.
          key={activationTarget.id}
          restaurantId={activationTarget.id}
          locale={locale}
          initialResult={initialActivation}
        />
      )}

      {/* KPI cards. Below sm the first two live in the summary card above. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          className={showMobileHero ? 'hidden sm:block' : ''}
          label={isTr ? 'Genel puan' : 'Avg rating'}
          value={avgRating > 0 ? `${avgRating.toFixed(1)}` : '—'}
          // Value = all-time average; delta = scope window vs previous window.
          delta={ratingDeltaNum !== null ? ratingDelta.value : undefined}
          deltaKind={ratingDelta.kind}
          deltaSuffix={`${scopeLabel} vs. ${prevScopeLabel}`}
          icon={<Star size={14} strokeWidth={2} fill="#C6F24E" stroke="#C6F24E" />}
          accent="#C6F24E"
        />
        <StatCard
          className={showMobileHero ? 'hidden sm:block' : ''}
          label={isTr ? 'Toplam yorum' : 'Total reviews'}
          value={totalReviews.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={totalReviewsDelta.value}
          deltaKind={totalReviewsDelta.kind}
          deltaSuffix={`${scopeLabel} vs. ${prevScopeLabel}`}
          icon={<Inbox size={14} strokeWidth={2} />}
        />
        <StatCard
          label={isTr ? 'Yanıt oranı' : 'Response rate'}
          value={
            responseRate === null ? '—' : isTr ? `%${responseRate}` : `${responseRate}%`
          }
          // StatCard shows the suffix only next to a delta, so the "x/y"
          // count goes in the (neutral) delta slot.
          delta={
            responseRate === null
              ? isTr
                ? 'Düşük puanlı yorum yok'
                : 'No low ratings'
              : `${lowRated30dRepliedCount}/${lowRated30dCount}`
          }
          deltaKind="neutral"
          deltaSuffix={
            responseRate === null
              ? scopeLabel
              : isTr
                ? `düşük puanlı yorum · ${scopeLabel}`
                : `low ratings · ${scopeLabel}`
          }
          icon={<MessageSquareReply size={14} strokeWidth={2} />}
        />
        <StatCard
          label={isTr ? 'Yeni müşteri' : 'New customers'}
          value={Number(newCustomers30dRows[0]?.count ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={scopeLabel}
          deltaKind="neutral"
          icon={<UserPlus size={14} strokeWidth={2} />}
        />
      </div>

      {/* Two independent columns on lg (no empty holes when a card is
          missing or short): chart + channels + topics on the left, pending
          tasks + activity on the right. Below lg the column wrappers are
          `display: contents`, so `order-*` keeps the single-column order:
          chart, pending, channels, topics, activity.
          Keyboard order still matches what is on screen: the channel and
          topic sections are read-only (no links or buttons), so Tab goes
          chart → pending tasks → activity in both layouts. Do not add a
          focusable element to those two sections without revisiting this. */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3">
          <section
            className="bz-card p-5 sm:p-6 hidden sm:block order-1 lg:order-none"
            aria-label={isTr ? 'Nabız' : 'Pulse'}
          >
            <PulseRangeToggle
              ranges={{
                '30g': { data: trend30, peak: peak30 },
                '90g': { data: trend90, peak: peak90 },
                ytd: { data: trendYtd, peak: peakYtd },
              }}
              defaultRange="30g"
              isTr={isTr}
              // Slot elements cross the server→client boundary; explicit keys
              // keep React's key check quiet where they render next to siblings.
              header={
                <div key="pulse-header">
                  <Eyebrow>{isTr ? 'NABIZ' : 'PULSE'}</Eyebrow>
                  <p className="mt-1.5 text-[13px] text-[#525252]">
                    {isTr ? 'Platformlara göre günlük yorum' : 'Daily reviews by platform'}
                  </p>
                </div>
              }
              footerAction={
                <Link
                  key="pulse-analytics"
                  href={scopedHref(`/${locale}/dashboard/analytics`)}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md text-[12px] font-medium text-[#525252] hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
                >
                  {isTr ? 'Detaylı analitik' : 'Detailed analytics'}
                  <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
                </Link>
              }
            />
          </section>

          {/* Channel cards (Google card adds the rating-before/after strip). */}
          {platformDistData.length > 0 && (
            <section className="order-3 lg:order-none" aria-label={isTr ? 'Kanal dağılımı' : 'Channel breakdown'}>
              {/* No link here: "Detaylı analitik" in the chart card (and
                  "Analitik" in the mobile summary card) already opens the
                  same page. */}
              <header className="mb-3">
                <Eyebrow>{isTr ? 'KANAL DAĞILIMI' : 'CHANNEL BREAKDOWN'}</Eyebrow>
              </header>
              <ChannelDistribution
                channels={channelStats}
                googleImpact={googleImpact}
                isTr={isTr}
              />
            </section>
          )}

          {/* AI topics (last 30 days) — tablet + desktop only. */}
          {dashboardThemes.themes.length > 0 && (
            <section className="bz-card p-5 sm:p-6 hidden sm:block order-4 lg:order-none">
              <header className="mb-5 flex items-center justify-between gap-3">
                <Eyebrow>{isTr ? 'SIK BAHSEDİLEN KONULAR' : 'TRENDING TOPICS'}</Eyebrow>
                <span className="bz-mono text-[10.5px] text-[#737373] tabular-nums shrink-0">
                  {isTr ? 'SON 30 GÜN' : 'LAST 30 DAYS'}
                </span>
              </header>
              <ul className="space-y-3.5">
                {dashboardThemes.themes.slice(0, 5).map((t) => {
                  // 3-segment sentiment bar (pos / neu / neg). Older cache
                  // entries without sentiment fall back to a count bar.
                  const hasSentiment = typeof t.sentimentPositivePct === 'number';
                  const pos = hasSentiment ? (t.sentimentPositivePct as number) : 0;
                  const neu = hasSentiment ? (t.sentimentNeutralPct ?? 0) : 0;
                  const neg = hasSentiment ? (t.sentimentNegativePct ?? Math.max(0, 100 - pos - neu)) : 0;
                  return (
                    <li key={t.theme}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
                        <span className="font-medium text-[#0A0A0A] truncate">{t.theme}</span>
                        <span className="bz-mono tabular-nums text-[11px] text-[#737373] shrink-0">
                          {t.count} {isTr ? 'bahsedilme' : 'mentions'}
                        </span>
                      </div>
                      {hasSentiment ? (
                        <>
                          <div
                            className="flex h-2 overflow-hidden rounded-full bg-[#F5F5F5]"
                            role="img"
                            aria-label={
                              isTr
                                ? `${pos}% pozitif, ${neu}% nötr, ${neg}% negatif`
                                : `${pos}% positive, ${neu}% neutral, ${neg}% negative`
                            }
                          >
                            <div className="h-full" style={{ width: `${pos}%`, background: '#16A34A' }} />
                            <div className="h-full" style={{ width: `${neu}%`, background: '#A3A3A3' }} />
                            <div className="h-full" style={{ width: `${neg}%`, background: '#DC2626' }} />
                          </div>
                          <div className="mt-1 flex justify-between gap-3 bz-mono text-[10px]">
                            <span className="text-[#16A34A] font-semibold">
                              +{pos}% {isTr ? 'pozitif' : 'positive'}
                            </span>
                            <span className="text-[#737373]">
                              {isTr ? 'nötr' : 'neutral'} {neu}%
                            </span>
                            <span className="text-[#DC2626] font-semibold">
                              -{neg}% {isTr ? 'negatif' : 'negative'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="h-2 rounded-full bg-[#F5F5F5] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0A0A0A] transition-all duration-500"
                            style={{
                              width: `${Math.max(8, (t.count / (dashboardThemes.themes[0]?.count ?? 1)) * 100)}%`,
                            }}
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

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3">
          <PendingTasks className="order-2 lg:order-none" tasks={pendingTaskItems} isTr={isTr} />
          <ActivityFeed
            // Keyed by business scope: the feed keeps its own list after mount
            // (live pushes), so a business switch must remount it.
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
