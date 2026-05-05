import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractThemes } from '@/lib/analytics-themes';
// §38.32 — deriveCustomerFields + CustomerSegment + SegmentChip artık
// dashboard'da kullanılmıyor (BUGÜN BEKLEYEN feedback-detail render kaldırıldı).
// Customers list/drawer'da hâlâ aktif (§38.17 paterni).
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Download,
  Inbox,
  Plus,
  QrCode,
  ShieldCheck,
  Star,
} from 'lucide-react';
import OnboardingNudge, { type OnboardingStep } from '@/components/dashboard/OnboardingNudge';
import ActivationChecklistCard from '@/components/dashboard/ActivationChecklistCard';
import AIInsightBanner from '@/components/dashboard/AIInsightBanner';
import PulseRangeToggle from '@/components/dashboard/PulseRangeToggle';
import ChannelDistribution from '@/components/dashboard/ChannelDistribution';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import ScopeDropdown from '@/components/dashboard/ScopeDropdown';
import { buildActivityFeed } from '@/lib/activity-feed';
import { Eyebrow, PageHeader, Sparkline, StatCard } from '@/components/ui';
import PendingTasks from '@/components/dashboard/PendingTasks';
import { buildPendingTasks } from '@/lib/dashboard-tasks';

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
    title: locale === 'tr' ? 'Panel — Buaze' : 'Dashboard — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

// Tek source-of-truth filter — "ratings>=4 + platform set" 6+ yerden tekrar
// ediyordu. Const olarak dosya-üstünde tut, abstraction değil (CLAUDE.md §7).
const REDIRECT_WHERE = {
  rating: { gte: 4 },
  platform: { not: null },
} as const;

const PLATFORM_LABELS_TR: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
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

  // Phase 8c+ §38.31 — Header "Bu hafta" dropdown URL searchParam scope.
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

  // User + restaurants (single fetch, scoped via include).
  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    include: {
      restaurants: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          initialGoogleRating: true,
          currentGoogleRating: true,
          _count: { select: { feedbacks: true } },
        },
      },
    },
  });
  if (!user) redirect(`/${locale}/auth/login`);

  const restIds = user.restaurants.map((r) => r.id);
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

  // ---- Tek toplu Prisma transaction bloğu ----
  // Supabase pooler production'da connection_limit=1 ile çalışır; aynı
  // request içinde çok sayıda paralel query açmak pool_timeout riskini
  // artırır. Array transaction tek connection üstünden sırayla çalışır.
  // Boş restIds için Prisma `in: []` zaten 0 satır döner; fallback path
  // gereksiz. (Postgres `WHERE id = ANY(ARRAY[]::text[])` syntactically OK.)
  const [
    // _redirectCountAllTime: §38.27'de KPI'dan kaldırıldı; transaction sırasını
    // korumak için destructure'da kalır, prefix ile lint silence.
    _redirectCountAllTime,
    latestFeedbacks,
    trendFeedbacks,
    restaurantRatings,
    starGroups,
    platformGroups,
    qrPerfRows,
    qrScanGroups,
    last7Avg,
    last7Redirected,
    prev7Count,
    prev7Avg,
    prev7Redirected,
    last7Scans,
    prev7Scans,
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
  ] = await prisma.$transaction([
    // KPI 4: Platforma yönlendirme (all-time) — değer KPI'da; delta last7 vs prev7
    prisma.feedback.count({ where: { restaurantId: restIdIn, ...REDIRECT_WHERE } }),
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
    // §38.31 — placeholder (eski last7Redirected; KPI Yönlendirme §38.27'de
    // KPI'dan kaldırıldı, transaction sırasını korumak için count tutuldu).
    prisma.feedback.count({
      where: { restaurantId: restIdIn, createdAt: { gte: scopeStart }, ...REDIRECT_WHERE },
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
    // §38.31 — Önceki scope window yönlendirme (placeholder).
    prisma.feedback.count({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: prevScopeStart, lt: prevScopeEnd },
        ...REDIRECT_WHERE,
      },
    }),
    // §38.31 — Scope window QR scans (placeholder; KPI'dan §38.27'de
    // kaldırıldı, transaction sırası korunur).
    prisma.qrScan.count({
      where: { restaurantId: restIdIn, createdAt: { gte: scopeStart } },
    }),
    // §38.31 — Prev scope window QR scans (placeholder).
    prisma.qrScan.count({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: prevScopeStart, lt: prevScopeEnd },
      },
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
      select: { rating: true, comment: true },
    }),
    // Phase 8c+ §38.30 — NABIZ chart 30G/90G/YTD chip toggle için ham veri.
    // En geriye uzanan window (YTD veya 90 gün, hangisi daha eski). JS-side
    // 3 dataset'e bucketlanır (trend30 daily, trend90 daily, trendYtd weekly).
    // Mevcut 7-day trendFeedbacks (mobile hero sparkline) etkilenmez.
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn, createdAt: { gte: trendOldestStart } },
      select: { createdAt: true, rating: true },
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
  const trendsChartData: { date: string; count: number; avgRating: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (6 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const jsDay = dayStart.getDay();
    const labelIdx = jsDay === 0 ? 6 : jsDay - 1;
    const dayFbs = trendFeedbacks.filter(
      (f) => f.createdAt >= dayStart && f.createdAt < dayEnd,
    );
    const count = dayFbs.length;
    const ratingSum = dayFbs.reduce((sum, f) => sum + (f.rating || 0), 0);
    const ratingAvg = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 0;
    trendsChartData.push({ date: dayLabels[labelIdx], count, avgRating: ratingAvg });
  }

  // Phase 8c+ §38.30 — NABIZ chart 30G/90G/YTD bucket helpers + peak per
  // range. 3 dataset trendFeedbacksRange (en geniş window) üzerinden
  // tek pass. Tasarım kaynağı: page-dashboard.jsx line 230-247.
  type TrendBucketRow = { createdAt: Date; rating: number };
  function bucketDaily(rows: TrendBucketRow[], days: number) {
    const buckets: { date: string; count: number; avgRating: number; dateMs: number }[] = [];
    for (let i = 0; i < days; i++) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - (days - 1 - i));
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayRows = rows.filter(
        (f) => f.createdAt >= dayStart && f.createdAt < dayEnd,
      );
      const count = dayRows.length;
      const ratingSum = dayRows.reduce((sum, f) => sum + (f.rating || 0), 0);
      const avgRating = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 0;
      buckets.push({
        // 30G ve 90G için "4 May" gibi kısa label; Recharts dense data'da
        // tick interval'ını otomatik handle eder (XAxis dataKey="date").
        date: dayStart.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
          day: 'numeric',
          month: 'short',
        }),
        count,
        avgRating,
        dateMs: dayStart.getTime(),
      });
    }
    return buckets;
  }

  function bucketWeekly(rows: TrendBucketRow[], fromDate: Date) {
    const buckets: { date: string; count: number; avgRating: number; dateMs: number }[] = [];
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    let cursor = new Date(start);
    while (cursor.getTime() < now) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekRows = rows.filter(
        (f) => f.createdAt >= cursor && f.createdAt < weekEnd,
      );
      const count = weekRows.length;
      const ratingSum = weekRows.reduce((sum, f) => sum + (f.rating || 0), 0);
      const avgRating = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 0;
      buckets.push({
        date: cursor.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
          day: 'numeric',
          month: 'short',
        }),
        count,
        avgRating,
        dateMs: cursor.getTime(),
      });
      cursor = new Date(weekEnd);
    }
    return buckets;
  }

  function findPeak(
    buckets: { count: number; dateMs: number }[],
  ): { dateText: string; count: number } | null {
    if (buckets.length === 0) return null;
    let peakIdx = 0;
    let peakCount = 0;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].count > peakCount) {
        peakCount = buckets[i].count;
        peakIdx = i;
      }
    }
    if (peakCount === 0) return null;
    return {
      dateText: new Date(buckets[peakIdx].dateMs).toLocaleDateString(
        isTr ? 'tr-TR' : 'en-US',
        { day: 'numeric', month: 'long' },
      ),
      count: peakCount,
    };
  }

  // 30G + 90G daily buckets, YTD weekly buckets (~18 hafta max → chart temiz).
  const trend30 = bucketDaily(trendFeedbacksRange, 30);
  const trend90 = bucketDaily(trendFeedbacksRange, 90);
  const trendYtd = bucketWeekly(trendFeedbacksRange, ytdStart);

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
  // extractThemes helper içinde min 8 yorum + OpenAI key kontrolü; yoksa
  // empty fallback (UI section gizli). Cache 1 saat (CLAUDE.md §34.9).
  const themeComments: Array<{ rating: number; comment: string }> = themesFeedbacks
    .filter((f): f is { rating: number; comment: string } =>
      typeof f.comment === 'string' && f.comment.length > 0,
    )
    .map((f) => ({ rating: f.rating, comment: f.comment }));
  const themeCacheKey = `dashboard-themes:${user.id}:30d`;
  const dashboardThemes = await extractThemes(themeComments, locale, themeCacheKey, user.id);

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

  // ---- Onboarding nudge (mevcut signal'lardan türet) ----
  const hasRestaurant = user.restaurants.length > 0;
  const hasActiveRestaurant = user.restaurants.some((r) => r.isActive);
  const hasReviews = totalReviews > 0;
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 1,
      label: isTr ? 'İşletme profilini tamamla' : 'Complete business profile',
      done: !!user.name && hasRestaurant,
      href: `/${locale}/dashboard/account?section=profile`,
    },
    {
      id: 2,
      label: isTr ? 'İlk işletmeyi ekle' : 'Add first business',
      done: hasRestaurant,
      href: `/${locale}/dashboard/restaurants`,
    },
    {
      id: 3,
      label: isTr ? 'İlk QR kodunu oluştur' : 'Generate first QR code',
      done: hasActiveRestaurant,
      href: `/${locale}/dashboard/qr`,
    },
    {
      id: 4,
      label: isTr ? 'Yorum platform bağlantılarını ekle' : 'Add review platform links',
      done: hasReviews,
      href: `/${locale}/dashboard/integrations`,
    },
    {
      id: 5,
      label: isTr ? 'Müşteri yorumlarını izle' : 'Track customer feedback',
      done: hasReviews,
      href: `/${locale}/dashboard/feedbacks`,
    },
  ];

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

  // ---- Quick actions (mobile + desktop unified) ----
  const quickActions = [
    {
      id: 'qr',
      icon: <QrCode size={18} strokeWidth={2} />,
      label: isTr ? 'QR' : 'QR',
      href: `/${locale}/dashboard/qr`,
    },
    {
      id: 'feedback',
      icon: <Star size={18} strokeWidth={2} />,
      label: isTr ? 'Yorumlar' : 'Reviews',
      href: `/${locale}/dashboard/feedbacks`,
    },
    {
      id: 'menu',
      icon: <Building2 size={18} strokeWidth={2} />,
      label: isTr ? 'Menü' : 'Menu',
      href: `/${locale}/dashboard/menu`,
    },
    {
      id: 'platforms',
      icon: <ShieldCheck size={18} strokeWidth={2} />,
      label: isTr ? 'Platform' : 'Links',
      href: `/${locale}/dashboard/integrations`,
    },
  ];

  // ---- Google Rating Impact ----
  const impactStats = user.restaurants
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
  const hour = nowDate.getHours();
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
  const pendingHook = isTr
    ? pendingCount > 0
      ? `Bugün ${pendingCount} yorum yanıt bekliyor.`
      : 'Bugün yanıtsız yorumun yok 🎉'
    : pendingCount > 0
      ? `Today ${pendingCount} review${pendingCount > 1 ? 's' : ''} await reply.`
      : "You're all caught up today 🎉";
  const primaryRestaurantName = user.restaurants[0]?.name ?? '';
  const dateText = nowDate.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className="mx-auto max-w-[1200px] space-y-6 px-4 sm:px-7 py-6 lg:py-8"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <PageHeader
        eyebrow={isTr ? 'PANEL / GENEL BAKIŞ' : 'PANEL / OVERVIEW'}
        eyebrowPulse
        title={`${greeting}, ${userFirstName}. ${pendingHook}`}
        subtitle={
          primaryRestaurantName
            ? `${primaryRestaurantName} · ${dateText}`
            : dateText
        }
        actions={
          <>
            <Link
              href={`/${locale}/dashboard/analytics`}
              className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px]"
            >
              <Download size={13} strokeWidth={2} />
              {isTr ? 'Rapor indir' : 'Download report'}
            </Link>
            {/* §38.31 — Header dynamic ScopeDropdown (önceki §38.30 sade
                Link'ti). 4 option: Bu hafta / Bu ay / Son 90 gün / Bu yıl.
                URL searchParam `?scope=` ile server component'i tetikler;
                KPI window'ları (Toplam yorum / Yanıt oranı / Yeni müşteri)
                + delta + AI banner kapsam değişir. Default '7d'. */}
            <ScopeDropdown current={scopeUrlValue} isTr={isTr} />
            <Link
              href={`/${locale}/dashboard/feedbacks`}
              className="bz-btn-primary inline-flex items-center gap-1.5 text-[12px]"
            >
              <Plus size={13} strokeWidth={2} />
              {isTr ? 'Yorum İste' : 'Request review'}
            </Link>
          </>
        }
      />

      {/* Phase 8c+ §38.28 — Mobile-only hero card. Tasarım kaynağı:
          .design-owner-2026/page-mobile-v2.jsx MobileDashboard hero —
          graphite bg + lime accent + büyük rating + 7-gün sparkline.
          Desktop'ta gizli (KPI 4-card zaten "Genel puan" gösteriyor); mobil
          dar ekranda owner anasayfaya açtığında ilk gördüğü "nabız"
          özetlemesi. */}
      {avgRating > 0 && (
        <section
          className="sm:hidden rounded-[18px] bg-[#0A0A0A] text-white p-[18px] relative overflow-hidden"
          aria-label={isTr ? 'Bugünün özeti' : "Today's summary"}
        >
          <div className="pulse-eyebrow text-white/60 text-[9.5px]">
            {isTr ? 'BUGÜN · ' : 'TODAY · '}
            {nowDate.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <div className="mt-2 mb-3">
            <div className="flex items-baseline gap-1.5">
              <span
                className="bz-h-tight"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 44,
                  lineHeight: 0.9,
                  letterSpacing: '-0.04em',
                  color: '#C6F24E',
                }}
              >
                {avgRating.toFixed(2)}
              </span>
              <span className="flex gap-0.5">
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
            <div className="bz-mono text-[11px] text-white/60 mt-1.5">
              {ratingDelta.value !== '0%' && (
                <span className="text-[#C6F24E] font-semibold">
                  {ratingDelta.kind === 'down' ? '↓' : '↑'} {ratingDelta.value.replace(/^[+-]/, '')}
                </span>
              )}
              {ratingDelta.value !== '0%' && ' · '}
              {totalReviews}{' '}
              {isTr ? 'yorum bu ay' : 'reviews this month'}
            </div>
          </div>
          {/* Mini 7-gün sparkline (trendsChartData.count series) — graphite
              bg üzerinde lime gradient area + lime stroke. */}
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

      {/* Phase 8c+ §38.27 — AI İçgörü banner. extractThemes synthesis dolu
          ise mount edilir; haftalık dismiss localStorage ile (ertesi hafta
          tekrar gelir). */}
      {dashboardThemes.synthesis && (
        <AIInsightBanner
          insight={dashboardThemes.synthesis}
          actionHref={`/${locale}/dashboard/analytics`}
          isTr={isTr}
        />
      )}

      <OnboardingNudge locale={locale} steps={onboardingSteps} />

      {/* §38.43 — Activation checklist mobile'da gizli (tasarım .design-owner-2026/
          page-mobile-v2.jsx MobileDashboard'da yok). sm:block ile sadece tablet+
          desktop'ta görünür. CLAUDE.md §19.5 paterni intact. */}
      {user.restaurants[0] && (
        <div className="hidden sm:block">
          <ActivationChecklistCard
            restaurantId={user.restaurants[0].id}
            locale={locale}
          />
        </div>
      )}

      {/* §38.32 — BUGÜN BEKLEYEN: 3 task tipi summary (reply / platform Google
          sync / reminder churn). Tasarım .design-owner-2026/page-dashboard.jsx
          line 250-280. Eski 4-feedback inline detail render + segment crossover
          (§38.17) kaldırıldı (UI duplikasyon — owner zaten /feedbacks page'de
          detail görür). campaign tipi schema'da yok + kullanıcı kararı (silindi).
          Yemeksepeti/Getir/Trendyol public API yok → sadece Google sync check. */}
      <PendingTasks
        tasks={dashboardTasks}
        isTr={isTr}
        viewAllHref={`/${locale}/dashboard/feedbacks?tab=low&hasReply=false`}
      />

      {/* Phase 8c+ §38.27 — KPI 4-card 1:1 tasarım parity. Tasarım kaynağı
          .design-owner-2026/page-dashboard.jsx: GENEL PUAN / TOPLAM YORUM /
          YANIT ORANI / YENİ MÜŞTERİ. QR taranma + Platform yönlendirme
          metrikleri /dashboard/analytics'te zaten zengin; ana dashboard
          owner action-odaklı 4-card'a sade. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label={isTr ? 'Genel puan' : 'Avg rating'}
          value={avgRating > 0 ? `${avgRating.toFixed(1)}` : '—'}
          delta={ratingDelta.value}
          deltaKind={ratingDelta.kind}
          deltaSuffix={isTr ? '/ 5.0' : '/ 5.0'}
          icon={<Star size={14} strokeWidth={2} fill="#C6F24E" stroke="#C6F24E" />}
          accent="#C6F24E"
        />
        <StatCard
          label={isTr ? 'Toplam yorum' : 'Total reviews'}
          value={totalReviews.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={totalReviewsDelta.value}
          deltaKind={totalReviewsDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
          icon={<Inbox size={14} strokeWidth={2} />}
        />
        <StatCard
          label={isTr ? 'Yanıt oranı' : 'Response rate'}
          value={
            lowRated30dCount > 0
              ? `%${Math.round((lowRated30dRepliedCount / lowRated30dCount) * 100)}`
              : '—'
          }
          deltaSuffix={
            lowRated30dCount > 0
              ? isTr
                ? `${lowRated30dRepliedCount}/${lowRated30dCount} · son 30 gün`
                : `${lowRated30dRepliedCount}/${lowRated30dCount} · last 30 days`
              : isTr
                ? 'düşük puan yorum yok'
                : 'no low rating reviews'
          }
          icon={<ShieldCheck size={14} strokeWidth={2} />}
        />
        <StatCard
          label={isTr ? 'Yeni müşteri' : 'New customers'}
          value={Number(newCustomers30dRows[0]?.count ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          deltaSuffix={isTr ? 'son 30 gün · CRM\'de aktif' : 'last 30 days · in CRM'}
          icon={<Building2 size={14} strokeWidth={2} />}
        />
      </div>

      {/* §38.43 — Quick Actions mobile'da gizli (tasarım .design-owner-2026/
          page-mobile-v2.jsx MobileDashboard'da yok; mobile bottom nav zaten
          5-item primary nav sağlıyor). sm:grid ile sadece tablet+ desktop. */}
      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {quickActions.map((a) => (
          <Link
            key={a.id}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-[14px] border border-[#EDEDED] bg-white px-1 py-3.5 transition-colors hover:border-[#0A0A0A]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#FAFAFA] text-[#0A0A0A]">
              {a.icon}
            </span>
            <span className="text-[11px] sm:text-[12px] font-medium text-[#0A0A0A]">
              {a.label}
            </span>
          </Link>
        ))}
      </div>

      {/* §38.43 — NABIZ chart mobile'da gizli (tasarım .design-owner-2026/
          page-mobile-v2.jsx MobileDashboard'da büyük chart yok; küçük ekranda
          chart UX kötü). sm:block ile sadece tablet+ desktop. Phase 8c+ §38.30
          desktop tasarım intact. */}
      <section className="bz-card p-5 sm:p-6 hidden sm:block">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
          <div>
            <Eyebrow>{isTr ? 'NABIZ · SON 30 GÜN' : 'PULSE · LAST 30 DAYS'}</Eyebrow>
            <div className="flex items-baseline gap-2.5 mt-1.5">
              <span
                className="bz-h-tight"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 24,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {avgRating > 0 ? avgRating.toFixed(2) : '—'}
              </span>
              {ratingDelta.value !== '0%' && (
                <span
                  className={`text-[11px] font-semibold ${
                    ratingDelta.kind === 'down' ? 'text-[#DC2626]' : 'text-[#16A34A]'
                  }`}
                >
                  {ratingDelta.kind === 'down' ? '↓' : '↑'} {ratingDelta.value.replace(/^[+-]/, '')}
                </span>
              )}
              <span className="text-[12px] text-[#737373]">
                {isTr ? 'vs. önceki 30 gün' : 'vs. prev 30 days'}
              </span>
            </div>
          </div>
          <Link
            href={`/${locale}/dashboard/analytics`}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#525252] hover:text-[#0A0A0A] transition-colors self-start sm:self-end"
          >
            {isTr ? 'Detaylı analitik' : 'Detailed analytics'}
            <ArrowRight size={12} strokeWidth={2} />
          </Link>
        </header>

        <PulseRangeToggle
          ranges={{
            '30g': { data: trend30, peak: peak30 },
            '90g': { data: trend90, peak: peak90 },
            ytd: { data: trendYtd, peak: peakYtd },
          }}
          defaultRange="30g"
          isTr={isTr}
        />

        {/* Legend dots — tasarım line 237-247 (Ortalama puan graphite line +
            Günlük yorum hacmi gri swatch). Mobile'da gizli (peak hint
            zaten yeterli sinyal verir). */}
        <div className="hidden sm:flex items-center gap-4 mt-3 text-[11.5px] text-[#737373]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-0.5 rounded-sm bg-[#0A0A0A]" />
            {isTr ? 'Ortalama puan' : 'Avg rating'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#EDEDED]" />
            {isTr ? 'Günlük yorum hacmi' : 'Daily review volume'}
          </span>
        </div>
      </section>

      {/* KANAL DAĞILIMI — Phase 8c+ §38.31. Tasarım kaynağı:
          .design-owner-2026/project/page-dashboard.jsx ChannelCard line
          134-157 (4-card grid + delta + 5 yıldız + count). Google card'da
          ek "impact strip" (initialGoogleRating → currentGoogleRating)
          Buaze etkisi (CLAUDE.md §37.3). prevPlatformGroups ile delta
          hesabı (önceki scope window vs current). */}
      {platformDistData.length > 0 && (
        <section>
          <header className="mb-3 flex items-end justify-between gap-3">
            <div>
              <Eyebrow>{isTr ? 'KANAL DAĞILIMI' : 'CHANNEL BREAKDOWN'}</Eyebrow>
              <h2 className="bz-h-tight mt-1 text-[18px] sm:text-[20px]">
                {isTr ? 'Platform performansı' : 'Platform performance'}
              </h2>
            </div>
            <Link
              href={`/${locale}/dashboard/analytics`}
              className="text-[12px] text-[#525252] hover:text-[#0A0A0A] inline-flex items-center gap-1"
            >
              {isTr ? 'Tüm kanallar' : 'All channels'}
              <ArrowRight size={11} strokeWidth={2} />
            </Link>
          </header>
          <ChannelDistribution
            channels={channelStats}
            googleImpact={googleImpact}
            isTr={isTr}
          />
        </section>
      )}

      {/* §38.43 — SIK BAHSEDİLEN KONULAR mobile'da gizli (tasarım .design-owner-2026/
          page-mobile-v2.jsx MobileDashboard'da yok). sm:block ile sadece tablet+
          desktop. AI tema kart desktop için intact. */}
      {dashboardThemes.themes.length > 0 && (
        <section className="bz-card p-5 sm:p-6 hidden sm:block">
          <header className="mb-5 flex items-end justify-between gap-3">
            <div>
              <Eyebrow>{isTr ? 'SIK BAHSEDİLEN KONULAR' : 'TRENDING TOPICS'}</Eyebrow>
              <h2 className="bz-h-tight mt-1 text-[18px] sm:text-[20px]">
                {isTr ? 'Müşteriler ne konuşuyor' : 'What customers talk about'}
              </h2>
            </div>
            <span className="bz-mono text-[10.5px] text-[#737373] tabular-nums shrink-0">
              {isTr ? 'SON 30 GÜN' : 'LAST 30 DAYS'}
            </span>
          </header>
          <ul className="space-y-3.5">
            {dashboardThemes.themes.slice(0, 5).map((t) => {
              // Phase 8c+ §38.27 — Stacked sentiment bar (tasarım kaynağı:
              // .design-owner-2026/page-dashboard.jsx). sentimentPositivePct
              // §38.20'de eklendi (opsiyonel); set'liyse 3-segment stacked
              // (lime/gri/kırmızı), yoksa eski tek-renk fallback (graceful).
              const hasSentiment = typeof t.sentimentPositivePct === 'number';
              const pos = hasSentiment ? (t.sentimentPositivePct as number) : 0;
              // Heuristic: pos%, neu = pos+neg complement içinde 1/3 (kalan
              // 1/3 nötr varsayım); neg = 100 - pos - neu. Daha doğru tek
              // pos% var (extractThemes neu/neg ayırmıyor); pratik: neg = 100 - pos.
              const neg = hasSentiment ? 100 - pos : 0;
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
                            ? `${pos}% pozitif, ${neg}% negatif`
                            : `${pos}% positive, ${neg}% negative`
                        }
                      >
                        <div className="h-full" style={{ width: `${pos}%`, background: '#16A34A' }} />
                        <div className="h-full" style={{ width: `${neg}%`, background: '#DC2626' }} />
                      </div>
                      <div className="mt-1 flex justify-between bz-mono text-[10px]">
                        <span className="text-[#16A34A]">
                          +{pos}% {isTr ? 'pozitif' : 'positive'}
                        </span>
                        <span className="text-[#DC2626]">
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
          {/* Inner synthesis card kaldırıldı — AIInsightBanner page üstünde
              aynı synthesis'i taşıyor; duplicate UX önlemi (§38.27). */}
        </section>
      )}


      {/* §38.41 — CANLI AKIŞ timeline (tasarım .design-owner-2026/page-dashboard.jsx
          line 309-340). Feedback + Reply + AI Draft + Sistem Notification union.
          §38.40 audit'inde kullanıcı raporu: eski custom inline 8-item CANLI AKIŞ
          + ActivityFeed component duplicate + "Tümünü gör" 404 → eski section
          silindi, viewAllHref locale-aware override edildi. Tasarımda olmayan
          YORUM GÖRÜNÜMÜ + QR performansı + Konum performansı + Restaurants
          list + Upgrade CTA section'ları da bu PR'da kaldırıldı (kullanıcı
          talebi: "tasarımda yoksa sil"). */}
      <ActivityFeed
        events={activityEvents}
        isTr={isTr}
        viewAllHref={`/${locale}/dashboard/feedbacks`}
      />
    </div>
  );
}
