import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import {
  BarChart,
  Eyebrow,
  LegendDot,
  PageHeader,
  PlatformChip,
  PLATFORMS,
  StatCard,
  type PlatformId,
} from '@/components/ui';
import AnalyticsFilterBar from '@/components/dashboard/analytics/AnalyticsFilterBar';
import InteractionTrendChart, {
  type InteractionTrendPoint,
} from '@/components/dashboard/analytics/InteractionTrendChart';
import { extractThemes } from '@/lib/analytics-themes';

// Note: InteractionTrendChart taşır 'use client' direktifini — Next.js 15
// otomatik client boundary çizer, server-side pre-render minimal HTML
// üretir, browser'da Recharts hydrate olur. `dynamic({ ssr: false })`
// Server Component'te yasak (CLAUDE.md §27 — dynamic+ssr:false sadece
// client component içinde kullanılabilir).

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Analitik — Buaze' : 'Analytics — Buaze',
    robots: { index: false, follow: false },
  };
}

function pctDelta(curr: number, prev: number): { value: string; kind: 'up' | 'down' | 'neutral' } {
  if (prev === 0) {
    if (curr === 0) return { value: '0%', kind: 'neutral' };
    return { value: 'Yeni', kind: 'up' };
  }
  const pct = Math.round(((curr - prev) / prev) * 1000) / 10;
  return {
    value: `${pct >= 0 ? '+' : ''}${pct}%`,
    kind: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
  };
}

function ppDelta(currPct: number, prevPct: number, invertGood = false): { value: string; kind: 'up' | 'down' | 'neutral' } {
  const diff = currPct - prevPct;
  const rounded = Math.round(diff * 10) / 10;
  const sign = rounded >= 0 ? '+' : '';
  const isPositive = invertGood ? rounded < 0 : rounded > 0;
  const isNegative = invertGood ? rounded > 0 : rounded < 0;
  return {
    value: `${sign}${rounded}pp`,
    kind: isPositive ? 'up' : isNegative ? 'down' : 'neutral',
  };
}

const DAY_LABELS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PLATFORM_DISPLAY: Array<{ id: PlatformId; key: string }> = [
  { id: 'google', key: 'google' },
  { id: 'yemeksepeti', key: 'yemeksepeti' },
  { id: 'tripadvisor', key: 'tripadvisor' },
  { id: 'getir', key: 'getir' },
  { id: 'trendyol_go', key: 'trendyol_go' },
];

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function isExpectedNavigationError(error: unknown) {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_');
}

export default async function AnalyticsPage(props: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ range?: string; platform?: string; branch?: string; restaurantId?: string }>;
}) {
  try {
    return await renderAnalyticsPage(props);
  } catch (error) {
    if (!isExpectedNavigationError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error('[AnalyticsPage] Server render failed', { message, stack });
    }
    throw error;
  }
}

async function renderAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ range?: string; platform?: string; branch?: string; restaurantId?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const isTr = locale === 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(`/${locale}/auth/login`);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      restaurants: { select: { id: true, name: true, aiAnalyticsEnabled: true } },
    },
  });
  if (!user) redirect(`/${locale}/auth/login`);

  // Parse filters from URL searchParams (server-side, no client fetch).
  const rangeKey = (sp.range && RANGE_DAYS[sp.range] ? sp.range : '30d') as keyof typeof RANGE_DAYS;
  const windowDays = RANGE_DAYS[rangeKey];
  const platformFilter = sp.platform && sp.platform !== 'all' ? sp.platform : null;
  const branchFilter = sp.branch && sp.branch !== 'all' ? sp.branch : null;

  // Multi-restaurant owner: optional restaurantId filter (whitelist scope).
  const ownedIds = user.restaurants.map((r) => r.id);
  const restaurantIds =
    sp.restaurantId && sp.restaurantId !== 'all' && ownedIds.includes(sp.restaurantId)
      ? [sp.restaurantId]
      : ownedIds;

  const now = Date.now();
  const windowStart = new Date(now - windowDays * 24 * 60 * 60 * 1000);
  const prevWindowStart = new Date(now - windowDays * 2 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Apply platform + branch filters to all queries via shared base WHERE.
  const baseWhere = {
    restaurantId: { in: restaurantIds },
    ...(platformFilter ? { platform: platformFilter } : {}),
    ...(branchFilter ? { branch: branchFilter } : {}),
  } as const;

  // QR scan tracking — feedback proxy yerine gerçek scan event'i
  // (CLAUDE.md §34.x). Branch + platform filter feedback'e özel; QrScan
  // tablosunda branch alanı yok, sadece restaurantId + tableNumber + platform.
  // Platform filter QrScan'e de uygulanabilir, branch filter sadece feedback.
  const scanWhere = {
    restaurantId: { in: restaurantIds },
    ...(platformFilter ? { platform: platformFilter } : {}),
  } as const;

  const [
    feedbacksWindow,
    feedbacksPrevWindow,
    feedbacks7d,
    redirectedWindow,
    redirectedPrevWindow,
    lowRatedWindow,
    lowRatedPrevWindow,
    todayCount,
    scansWindowCount,
    scansPrevWindowCount,
    scansWindowDaily,
  ] = await prisma.$transaction([
    // Window feedback'leri — multi-purpose select: hour bucket, aspect avg,
    // theme analysis (comment), response time (replies). Tek query
    // multiple-section'ı besler (CLAUDE.md §7 — replication önleme).
    prisma.feedback.findMany({
      where: { ...baseWhere, createdAt: { gte: windowStart } },
      select: {
        id: true,
        restaurantId: true,
        rating: true,
        platform: true,
        comment: true,
        createdAt: true,
        foodRating: true,
        serviceRating: true,
        atmosphereRating: true,
        replies: {
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    }),
    prisma.feedback.count({
      where: { ...baseWhere, createdAt: { gte: prevWindowStart, lt: windowStart } },
    }),
    prisma.feedback.findMany({
      where: { ...baseWhere, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.feedback.count({
      where: {
        ...baseWhere,
        createdAt: { gte: windowStart },
        rating: { gte: 4 },
        platform: { not: null },
      },
    }),
    prisma.feedback.count({
      where: {
        ...baseWhere,
        createdAt: { gte: prevWindowStart, lt: windowStart },
        rating: { gte: 4 },
        platform: { not: null },
      },
    }),
    prisma.feedback.count({
      where: {
        ...baseWhere,
        createdAt: { gte: windowStart },
        rating: { lte: 3 },
      },
    }),
    prisma.feedback.count({
      where: {
        ...baseWhere,
        createdAt: { gte: prevWindowStart, lt: windowStart },
        rating: { lte: 3 },
      },
    }),
    prisma.feedback.count({
      where: { ...baseWhere, createdAt: { gte: startOfToday } },
    }),
    // QR scans — window + delta + daily bucket (interaction chart 3. seri)
    prisma.qrScan.count({
      where: { ...scanWhere, createdAt: { gte: windowStart } },
    }),
    prisma.qrScan.count({
      where: { ...scanWhere, createdAt: { gte: prevWindowStart, lt: windowStart } },
    }),
    prisma.qrScan.findMany({
      where: { ...scanWhere, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
  ]);

  // Distinct branches for filter dropdown (across owned restaurants, not
  // affected by current branch filter so user can pick a different one).
  const branchRows = ownedIds.length
    ? await prisma.feedback.findMany({
        where: { restaurantId: { in: ownedIds }, branch: { not: null } },
        distinct: ['branch'],
        select: { branch: true },
        take: 50,
      })
    : [];
  const branches = branchRows
    .map((r) => r.branch as string)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, isTr ? 'tr-TR' : 'en-US'));

  // KPI calculations — scans gerçek QrScan'den, reviews feedback'ten ayrı.
  const reviewsCount = feedbacksWindow.length;
  const scansCount = scansWindowCount;
  const reviewsDelta = pctDelta(reviewsCount, feedbacksPrevWindow);
  const scansDelta = pctDelta(scansCount, scansPrevWindowCount);

  // Conversion rate = scan'den sonra yorum bırakanların oranı.
  // 0 scan → "—" göster, division-by-zero korunur.
  const conversionRate = scansCount > 0 ? Math.round((reviewsCount / scansCount) * 100) : 0;
  const prevConversionRate =
    scansPrevWindowCount > 0
      ? Math.round((feedbacksPrevWindow / scansPrevWindowCount) * 100)
      : 0;
  const conversionDelta = ppDelta(conversionRate, prevConversionRate);

  const redirectRate = reviewsCount > 0 ? Math.round((redirectedWindow / reviewsCount) * 100) : 0;
  const prevRedirectRate = feedbacksPrevWindow > 0 ? Math.round((redirectedPrevWindow / feedbacksPrevWindow) * 100) : 0;
  const redirectDelta = ppDelta(redirectRate, prevRedirectRate);

  const lowRatingRate = reviewsCount > 0 ? Math.round((lowRatedWindow / reviewsCount) * 100) : 0;
  const prevLowRatingRate = feedbacksPrevWindow > 0 ? Math.round((lowRatedPrevWindow / feedbacksPrevWindow) * 100) : 0;
  const lowRatingDelta = ppDelta(lowRatingRate, prevLowRatingRate, true);

  // Window-day daily distribution (etkileşim chart) — dynamic length, 3-seri funnel.
  // Funnel: scans (qrScan, üst) ⊇ reviews (feedback) ⊇ redirects (rating≥4+platform).
  const dateFmt = new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
  });
  const interactionData: InteractionTrendPoint[] = Array.from({ length: windowDays }, (_, i) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (windowDays - 1 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayFbs = feedbacksWindow.filter(
      (f) => f.createdAt >= dayStart && f.createdAt < dayEnd,
    );
    const scans = scansWindowDaily.filter(
      (s) => s.createdAt >= dayStart && s.createdAt < dayEnd,
    ).length;
    const reviews = dayFbs.length;
    const redirects = dayFbs.filter(
      (f) => (f.rating ?? 0) >= 4 && f.platform != null && f.platform !== '',
    ).length;
    return { date: dateFmt.format(dayStart), scans, reviews, redirects };
  });

  // Platform paylaşımı — sadece "Tümü" filter'ında anlamlı (tek platform
  // seçiliyse breakdown gereksiz). Platform filter aktifse bu kart gizlenir.
  const platformShare = PLATFORM_DISPLAY.map((p) => {
    const count = feedbacksWindow.filter(
      (f) => (f.platform || '').toLowerCase() === p.key && f.rating >= 4,
    ).length;
    return { id: p.id, key: p.key, count };
  })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const totalRedirects = platformShare.reduce((a, p) => a + p.count, 0);
  const showPlatformShare = !platformFilter;

  // Günlük dağılım (7-day day-of-week) — fixed 7d window
  const dayLabels = isTr ? DAY_LABELS_TR : DAY_LABELS_EN;
  const dayBuckets: number[] = Array(7).fill(0);
  for (const f of feedbacks7d) {
    const jsDay = f.createdAt.getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    dayBuckets[idx] = (dayBuckets[idx] || 0) + 1;
  }
  const dayData = dayBuckets.map((v, i) => ({ label: dayLabels[i], value: v }));

  // ---- Saat-bazlı dağılım (yeni metric, Phase 2026-05) ----
  // Owner: "Hangi saatlerde peak?" personel + kapasite planlama.
  // 24-bucket; sparse label'lar (her 3 saatte bir) chart'ı temiz tutar.
  const hourBuckets: number[] = Array(24).fill(0);
  for (const f of feedbacksWindow) {
    const hour = f.createdAt.getHours();
    if (hour >= 0 && hour < 24) hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
  }
  const hourData = hourBuckets.map((v, h) => ({
    label: h % 3 === 0 ? `${h.toString().padStart(2, '0')}` : '',
    value: v,
  }));

  // ---- Aspect breakdown (yemek / servis / atmosfer) ----
  // Schema'da rating'lere ek olarak 3 alt-rating var (Feedback.foodRating, vb.).
  // Public review formu opsiyonel sorduğu için sparse data — yeterli sample
  // (≥5) varsa StatCard 3'lüsü göster, yoksa section gizlenir.
  const aspectAvg = (key: 'foodRating' | 'serviceRating' | 'atmosphereRating') => {
    const rated = feedbacksWindow.filter((f) => f[key] != null);
    if (rated.length < 5) return null;
    const sum = rated.reduce((a, f) => a + (f[key] ?? 0), 0);
    return { avg: sum / rated.length, count: rated.length };
  };
  const aspectFood = aspectAvg('foodRating');
  const aspectService = aspectAvg('serviceRating');
  const aspectAtmosphere = aspectAvg('atmosphereRating');
  const showAspects = !!(aspectFood || aspectService || aspectAtmosphere);

  // ---- Yanıt süresi metric ----
  // Düşük puan (≤3★) yorumlar için ilk yanıta kadar geçen süre. Reputation
  // guard: 8h+ yanıtsız "incident" sayılır, owner aksiyon alır.
  const lowRatingFeedbacks = feedbacksWindow.filter((f) => f.rating <= 3);
  const respondedLatencies: number[] = []; // ms
  let pendingOver8h = 0;
  let pendingTotal = 0;
  const nowMs = Date.now();
  const EIGHT_H = 8 * 60 * 60 * 1000;
  for (const f of lowRatingFeedbacks) {
    const reply = f.replies[0];
    if (reply) {
      respondedLatencies.push(reply.createdAt.getTime() - f.createdAt.getTime());
    } else {
      pendingTotal += 1;
      if (nowMs - f.createdAt.getTime() > EIGHT_H) pendingOver8h += 1;
    }
  }
  // Median latency hesabı (saat cinsinden)
  let medianResponseHours: number | null = null;
  if (respondedLatencies.length > 0) {
    const sorted = [...respondedLatencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianMs =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    medianResponseHours = Math.round((medianMs / (60 * 60 * 1000)) * 10) / 10;
  }
  const responseRate =
    lowRatingFeedbacks.length > 0
      ? Math.round((respondedLatencies.length / lowRatingFeedbacks.length) * 100)
      : null;

  // ---- AI sentiment themes (CLAUDE.md §15 + §34.x — OpenAI extractThemes) ----
  // Feedback yorumlarından top 5 şikayet + top 5 övgü teması. Cache key
  // (restaurant + filter + window) ile process-local 1h TTL. Workspace-bazlı
  // owner restaurantId'ye göre; çoklu lokasyon "all" için userId.
  const themesCacheKey = [
    user.id,
    restaurantIds.length > 1 ? 'all' : restaurantIds[0] || 'none',
    rangeKey,
    platformFilter || 'all',
    branchFilter || 'all',
  ].join(':');
  const aiEnabledRestaurantIds = new Set(
    user.restaurants.filter((r) => r.aiAnalyticsEnabled).map((r) => r.id),
  );
  const aiAnalyticsAvailable = restaurantIds.some((restaurantId) =>
    aiEnabledRestaurantIds.has(restaurantId),
  );
  const themesComments = feedbacksWindow
    .filter((f) => typeof f.restaurantId === 'string' && aiEnabledRestaurantIds.has(f.restaurantId))
    .filter((f): f is typeof f & { comment: string } => typeof f.comment === 'string' && f.comment.trim().length > 0)
    .map((f) => ({ rating: f.rating, comment: f.comment }));
  const themes = aiAnalyticsAvailable
    ? await extractThemes(themesComments, isTr ? 'tr' : 'en', themesCacheKey, user.id)
    : { themes: [], synthesis: '', source: 'fallback' as const };

  const windowLabel = isTr ? `${windowDays} GÜNLÜK` : `${windowDays}-DAY`;
  const windowSuffix = isTr ? `önceki ${windowDays} güne göre` : `vs prev ${windowDays}d`;

  // Phase 8c+ (CLAUDE.md §38.18) — KPI mini sparkline data
  // (.design-owner-2026/page-analytics.jsx parity). interactionData zaten
  // window-bazlı günlük seri taşıyor; her bir KPI kendi metric'ini
  // çıkartarak ham series verir. Min 2 nokta gerekir (StatCard guard).
  const sparkScans = interactionData.map((d) => d.scans);
  const sparkReviews = interactionData.map((d) => d.reviews);
  const sparkRedirects = interactionData.map((d) => d.redirects);
  // Conversion = reviews / scans (her gün için, NaN guard 0 fallback).
  const sparkConversion = interactionData.map((d) =>
    d.scans > 0 ? Math.round((d.reviews / d.scans) * 100) : 0,
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow={isTr ? 'İŞLETME PANELİ' : 'OWNER PANEL'}
        title={isTr ? 'Analitik' : 'Analytics'}
        description={
          isTr
            ? 'Yorum, yönlendirme ve trafik metriklerini filtrele.'
            : 'Filter review, redirect, and traffic metrics.'
        }
      />

      <AnalyticsFilterBar
        isTr={isTr}
        branches={branches}
        restaurants={user.restaurants}
      />

      {/* 6 KPI cards: Bugün + scans/reviews/conversion + redirect/low-rating
          Mobile 2-col → tablet 3-col → desktop 6-col cascade. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        <StatCard
          label={isTr ? 'Bugün' : 'Today'}
          value={todayCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          deltaSuffix={isTr ? 'yorum' : 'reviews'}
          accent="#C6F24E"
        />
        <StatCard
          label={isTr ? `${windowDays} gün taranma` : `${windowDays}d scans`}
          value={scansCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={scansDelta.value}
          deltaKind={scansDelta.kind}
          deltaSuffix={windowSuffix}
          sparkline={sparkScans}
          sparklineColor="#737373"
        />
        <StatCard
          label={isTr ? `${windowDays} gün yorum` : `${windowDays}d reviews`}
          value={reviewsCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={reviewsDelta.value}
          deltaKind={reviewsDelta.kind}
          deltaSuffix={windowSuffix}
          sparkline={sparkReviews}
          sparklineColor="#0A0A0A"
        />
        <StatCard
          label={isTr ? 'Dönüşüm oranı' : 'Conversion rate'}
          value={scansCount > 0 ? `${conversionRate}%` : '—'}
          delta={scansCount > 0 && scansPrevWindowCount > 0 ? conversionDelta.value : undefined}
          deltaKind={scansCount > 0 && scansPrevWindowCount > 0 ? conversionDelta.kind : undefined}
          deltaSuffix={windowSuffix}
          sparkline={sparkConversion}
          sparklineColor="#A8D62E"
        />
        <StatCard
          label={isTr ? 'Yönlendirme oranı' : 'Redirect rate'}
          value={`${redirectRate}%`}
          delta={redirectDelta.value}
          deltaKind={redirectDelta.kind}
          deltaSuffix={windowSuffix}
          sparkline={sparkRedirects}
          sparklineColor="#A8D62E"
        />
        <StatCard
          label={isTr ? 'Düşük puan oranı' : 'Low rating rate'}
          value={`${lowRatingRate}%`}
          delta={lowRatingDelta.value}
          deltaKind={lowRatingDelta.kind}
          deltaSuffix={windowSuffix}
        />
      </div>

      {/* 2-col 2fr/1fr: window-day etkileşim + Platform paylaşımı (koşullu) */}
      <div className={`grid gap-3.5 ${showPlatformShare ? 'lg:grid-cols-[2fr_1fr]' : ''}`}>
        <section className="bz-card p-5 sm:p-6">
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
            <div>
              <Eyebrow>{`${windowLabel} ${isTr ? 'ETKİLEŞİM' : 'INTERACTION'}`}</Eyebrow>
              <div className="bz-h-tight mt-1 text-[18px]">
                {isTr ? 'Yorum ve yönlendirme trendi' : 'Reviews & redirects trend'}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 shrink-0">
              <LegendDot color="#737373" label={isTr ? 'Taranma' : 'Scans'} />
              <LegendDot color="#0A0A0A" label={isTr ? 'Yorum' : 'Reviews'} />
              <LegendDot color="#A8D62E" label={isTr ? 'Yönlendirme' : 'Redirects'} />
            </div>
          </header>
          <InteractionTrendChart data={interactionData} isTr={isTr} />
        </section>

        {showPlatformShare && (
          <section className="bz-card p-5 sm:p-6">
            <Eyebrow>{isTr ? 'PLATFORM PAYLAŞIMI' : 'PLATFORM SHARE'}</Eyebrow>
            <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
              {totalRedirects} {isTr ? 'yönlendirme' : 'redirects'}
            </div>
            <div className="mt-3.5 flex flex-col gap-3">
              {platformShare.length === 0 ? (
                <p className="text-[12px] text-[#737373]">
                  {isTr ? 'Henüz yönlendirme yok.' : 'No redirects yet.'}
                </p>
              ) : (
                platformShare.map((p) => {
                  const pct = totalRedirects > 0 ? Math.round((p.count / totalRedirects) * 100) : 0;
                  return (
                    <div key={p.key}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="inline-flex items-center gap-2">
                          <PlatformChip id={p.id} size={16} />
                          {PLATFORMS[p.id].label}
                        </span>
                        <span className="bz-mono font-semibold">{p.count}</span>
                      </div>
                      <div
                        className="rounded-[3px] overflow-hidden"
                        style={{ height: 6, background: '#F5F5F5' }}
                      >
                        <div
                          className="h-full rounded-[3px]"
                          style={{ width: `${pct}%`, background: PLATFORMS[p.id].color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>

      {/* 2-col 1fr/1fr: Günlük dağılım + Saat-bazlı dağılım */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <section className="bz-card p-5 sm:p-6">
          <Eyebrow>{isTr ? 'GÜNLÜK DAĞILIM' : 'DAY DISTRIBUTION'}</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3" style={{ fontSize: 18 }}>
            {isTr ? 'Hangi günler en çok yorum geliyor?' : 'When are reviews coming in?'}
          </div>
          <BarChart data={dayData} height={160} showValues />
        </section>

        <section className="bz-card p-5 sm:p-6">
          <Eyebrow>{isTr ? 'SAAT BAZLI DAĞILIM' : 'HOUR DISTRIBUTION'}</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3" style={{ fontSize: 18 }}>
            {isTr ? 'Yoğun saatler hangileri?' : 'Which hours are peak?'}
          </div>
          <BarChart data={hourData} height={160} />
          <p className="mt-2 text-[11px] text-[#737373]">
            {isTr
              ? 'Personel ve kapasite planlaması için 24 saatlik dağılım.'
              : 'Hourly distribution for staffing & capacity planning.'}
          </p>
        </section>
      </div>

      {/* Yanıt performansı + Aspect breakdown (conditional) */}
      {(lowRatingFeedbacks.length > 0 || showAspects) && (
        <div className="grid gap-3.5 lg:grid-cols-2">
          {lowRatingFeedbacks.length > 0 && (
            <section className="bz-card p-5 sm:p-6">
              <Eyebrow>{isTr ? 'YANIT PERFORMANSI' : 'RESPONSE PERFORMANCE'}</Eyebrow>
              <div className="bz-h-tight mt-1 mb-4" style={{ fontSize: 18 }}>
                {isTr ? 'Düşük puanlara yanıt süresi' : 'Reply latency for low ratings'}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'YANIT ORANI' : 'REPLY RATE'}
                  </div>
                  <div className="bz-h-tight-2 mt-1 tabular-nums" style={{ fontSize: 22 }}>
                    {responseRate !== null ? `${responseRate}%` : '—'}
                  </div>
                  <div className="text-[11px] text-[#737373] mt-0.5">
                    {respondedLatencies.length}/{lowRatingFeedbacks.length}
                  </div>
                </div>
                <div>
                  <div className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'MEDYAN SÜRE' : 'MEDIAN TIME'}
                  </div>
                  <div className="bz-h-tight-2 mt-1 tabular-nums" style={{ fontSize: 22 }}>
                    {medianResponseHours !== null ? `${medianResponseHours}s` : '—'}
                  </div>
                  <div className="text-[11px] text-[#737373] mt-0.5">
                    {isTr ? 'yanıt geliş süresi' : 'time to first reply'}
                  </div>
                </div>
                <div>
                  <div className="pulse-eyebrow text-[#737373]">
                    {isTr ? '8 SAAT+ BEKLEYEN' : 'PENDING 8H+'}
                  </div>
                  <div
                    className="bz-h-tight-2 mt-1 tabular-nums text-[#0A0A0A]"
                    style={{ fontSize: 22 }}
                  >
                    {pendingOver8h}
                  </div>
                  <div className="text-[11px] text-[#737373] mt-0.5">
                    {isTr ? `toplam ${pendingTotal} bekleyen` : `${pendingTotal} pending total`}
                  </div>
                </div>
              </div>
              {pendingOver8h > 0 && (
                <p className="mt-3 inline-flex items-start gap-2 rounded-md border-l-2 border-[#FCA5A5] bg-[#FAFAFA] px-2.5 py-1.5 text-[11px] leading-[1.55] text-[#525252]">
                  <span aria-hidden="true" className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#FCA5A5]" />
                  <span>
                    {isTr
                      ? `${pendingOver8h} yorum 8 saati aştı. İlk fırsatta yanıtlamak müşteri ilişkisini güçlendirir.`
                      : `${pendingOver8h} reviews exceeded 8h. Replying soon strengthens customer rapport.`}
                  </span>
                </p>
              )}
            </section>
          )}

          {showAspects && (
            <section className="bz-card p-5 sm:p-6">
              <Eyebrow>{isTr ? 'KATEGORİ ANALİZİ' : 'ASPECT BREAKDOWN'}</Eyebrow>
              <div className="bz-h-tight mt-1 mb-4" style={{ fontSize: 18 }}>
                {isTr ? 'Yemek · Servis · Atmosfer' : 'Food · Service · Atmosphere'}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'food', data: aspectFood, tr: 'Yemek', en: 'Food' },
                  { key: 'service', data: aspectService, tr: 'Servis', en: 'Service' },
                  { key: 'atmosphere', data: aspectAtmosphere, tr: 'Atmosfer', en: 'Atmosphere' },
                ].map((row) => (
                  <div key={row.key}>
                    <div className="pulse-eyebrow text-[#737373]">
                      {(isTr ? row.tr : row.en).toUpperCase()}
                    </div>
                    {row.data ? (
                      <>
                        <div className="bz-h-tight-2 mt-1 tabular-nums" style={{ fontSize: 22 }}>
                          {row.data.avg.toFixed(1)}
                          <span className="text-[12px] text-[#737373] font-normal"> /5</span>
                        </div>
                        <div className="text-[11px] text-[#737373] mt-0.5">
                          {row.data.count} {isTr ? 'değerlendirme' : 'ratings'}
                        </div>
                      </>
                    ) : (
                      <div className="bz-h-tight-2 mt-1 tabular-nums text-[#A3A3A3]" style={{ fontSize: 22 }}>
                        —
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[#737373]">
                {isTr
                  ? 'Müşterinin opsiyonel olarak verdiği alt-kategori puanları (≥5 örneklem).'
                  : 'Optional sub-category ratings from customers (≥5 sample).'}
              </p>
            </section>
          )}
        </div>
      )}

      {/* AI sentiment themes — single section: müşterinin en sık dile getirdiği
          ortak temalar + AI sentez çıkarımı. Praise vs complaint ayrımı
          kaldırıldı (CLAUDE.md §34.x retrofit, 2026-05). Phase 8c+ (CLAUDE.md
          §38.18) — dark card visual treatment (.design-owner-2026/page-analytics
          AI İçgörüler kart paterni). */}
      {aiAnalyticsAvailable && (
      <section className="rounded-2xl bg-[#0A0A0A] text-white p-5 sm:p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.4)]">
        <header className="flex items-start justify-between gap-2 mb-3">
          <div>
            <Eyebrow color="#C6F24E">{isTr ? 'AI ÇIKARIMI' : 'AI INFERENCE'}</Eyebrow>
            <div className="bz-h-tight mt-1 text-white" style={{ fontSize: 18 }}>
              {isTr ? 'Müşterinin en sık dile getirdiği' : 'Most-mentioned themes'}
            </div>
          </div>
          {themes.source === 'openai' && (
            <span className="pulse-eyebrow shrink-0 inline-flex items-center gap-1 rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-2 py-1 text-[#C6F24E]">
              <span aria-hidden="true" className="bz-pulse-dot" style={{ background: '#C6F24E' }} />
              AI
            </span>
          )}
        </header>

        {themes.synthesis && (
          <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] leading-[1.6] text-white">
            {themes.synthesis}
          </p>
        )}

        {themes.themes.length === 0 ? (
          <p className="text-[12px] text-white/60">
            {isTr
              ? themes.source === 'fallback'
                ? 'Yeterli yorum yok ya da AI servisi şu an pasif. En az 4 metinli yoruma ulaşınca AI çıkarımı burada görünür.'
                : 'Yorumlardan çıkan ortak tema yok.'
              : themes.source === 'fallback'
                ? 'Not enough comments yet, or AI service is paused. AI inference appears once at least 4 text comments are collected.'
                : 'No common themes from comments yet.'}
          </p>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2">
            {themes.themes.map((t, idx) => {
              // Phase 8c+ (CLAUDE.md §38.20) — sentiment progress bar
              // (.design-owner-2026/page-analytics Topics paterni). Sentiment
              // opsiyonel; eski cache entry'lerinde / model uymadığında
              // undefined → progress bar render skip (graceful).
              const hasSentiment = typeof t.sentimentPositivePct === 'number';
              const pos = hasSentiment ? (t.sentimentPositivePct as number) : 0;
              const neg = 100 - pos;
              return (
                <li
                  key={t.theme}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="bz-mono text-[11px] font-semibold text-white/50">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-white">
                      {t.theme}
                    </span>
                    <span className="bz-mono text-[11px] font-semibold tabular-nums text-white/70">
                      ×{t.count}
                    </span>
                  </div>
                  {hasSentiment && (
                    <>
                      <div
                        className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/10"
                        role="img"
                        aria-label={
                          isTr
                            ? `${pos}% pozitif, ${neg}% negatif`
                            : `${pos}% positive, ${neg}% negative`
                        }
                      >
                        <div
                          className="h-full"
                          style={{ width: `${pos}%`, background: '#A8D62E' }}
                        />
                        <div
                          className="h-full"
                          style={{ width: `${neg}%`, background: 'rgba(248, 113, 113, 0.6)' }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between bz-mono text-[10px]">
                        <span className="text-[#A8D62E]">
                          {pos}% {isTr ? 'olumlu' : 'positive'}
                        </span>
                        <span className="text-red-300/80">
                          {neg}% {isTr ? 'olumsuz' : 'negative'}
                        </span>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
      )}
    </div>
  );
}
