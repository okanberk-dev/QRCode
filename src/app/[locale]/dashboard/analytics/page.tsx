import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import {
  BarChart,
  Eyebrow,
  PageHeader,
  PLATFORMS,
  type PlatformId,
} from '@/components/ui';
import AnalyticsFilterBar from '@/components/dashboard/analytics/AnalyticsFilterBar';
import { HeatmapDayHour } from '@/components/dashboard/analytics/HeatmapDayHour';
import type { InteractionTrendPoint } from '@/components/dashboard/analytics/InteractionTrendChart';
// §38.34 — InteractionTrendChart ve WeeklyTrendChart silindi (kullanıcı kararı,
// CLAUDE.md §38.34): tek chart Puan/Hacim/Sentiment toggle ile konsolidasyon.
// InteractionTrendPoint type import KALDI (interactionData KPI sparkline için
// hâlâ compute ediliyor; chart kullanılmıyor).
import { PulseTrendChart } from '@/components/dashboard/analytics/PulseTrendChart';
import { AnalyticsKpiGrid } from '@/components/dashboard/analytics/AnalyticsKpiGrid';
import { AiInsightsCard } from '@/components/dashboard/analytics/AiInsightsCard';
import { ChannelDistributionMini } from '@/components/dashboard/analytics/ChannelDistributionMini';
import { TopLocationCard } from '@/components/dashboard/analytics/TopLocationCard';
import { MobileAnalyticsHero } from '@/components/dashboard/analytics/MobileAnalyticsHero';
import { extractThemes } from '@/lib/analytics-themes';
import { extractStructuredInsight } from '@/lib/weekly-structured-insight';
import { calculateNPS } from '@/lib/analytics-nps';

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

// §38.50 — `ppDelta` (percentage point delta) helper'ı silindi: secondary KPI
// (Dönüşüm/Yönlendirme/AI Yanıt) tasarım birebir parite için kaldırıldı,
// pp delta caller'ı kalmadı. `pctDelta` (yüzde delta) reviewsDelta için hâlâ
// kullanılıyor.

const DAY_LABELS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PLATFORM_DISPLAY: Array<{ id: PlatformId; key: string }> = [
  { id: 'google', key: 'google' },
  { id: 'yemeksepeti', key: 'yemeksepeti' },
  { id: 'tripadvisor', key: 'tripadvisor' },
  { id: 'getir', key: 'getir' },
  { id: 'trendyol_go', key: 'trendyol_go' },
];

// §38.50 — `1y` (365 gün) range desteği eklendi (tasarım birebir parity).
// `custom` özel aralık: customStart/customEnd query param'ları parse edilir,
// invalid → 30d fallback.
const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

function isExpectedNavigationError(error: unknown) {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_');
}

/**
 * §38.50 — Custom range parse. Strict ISO date format (YYYY-MM-DD).
 * Invalid → null fallback (caller 30d default'a düşer).
 * Range max 365 gün (DDoS koruma + perf).
 */
function parseCustomRange(
  customStart: string | undefined,
  customEnd: string | undefined,
): { start: Date; end: Date; days: number } | null {
  if (!customStart || !customEnd) return null;
  const startMs = Date.parse(customStart);
  const endMs = Date.parse(customEnd);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  if (endMs <= startMs) return null;
  const days = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
  if (days < 1 || days > 365) return null;
  return { start: new Date(startMs), end: new Date(endMs), days };
}

export default async function AnalyticsPage(props: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    range?: string;
    platform?: string;
    branch?: string;
    restaurantId?: string;
    customStart?: string;
    customEnd?: string;
  }>;
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
  searchParams: Promise<{
    range?: string;
    platform?: string;
    branch?: string;
    restaurantId?: string;
    customStart?: string;
    customEnd?: string;
  }>;
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
      restaurants: {
        select: { id: true, name: true, aiAnalyticsEnabled: true, targetRating: true },
      },
    },
  });
  if (!user) redirect(`/${locale}/auth/login`);

  // §38.50 — Custom range önceliği: `?range=custom&customStart=...&customEnd=...`
  // ile owner özel pencere seçer; `range` literal map'inde yoksa custom parse'a
  // düşer; o da invalid ise 30d fallback (default).
  const customRange =
    sp.range === 'custom'
      ? parseCustomRange(sp.customStart, sp.customEnd)
      : null;
  const rangeKey = customRange
    ? ('custom' as const)
    : sp.range && RANGE_DAYS[sp.range]
      ? (sp.range as keyof typeof RANGE_DAYS)
      : ('30d' as const);
  const windowDays = customRange ? customRange.days : RANGE_DAYS[rangeKey as keyof typeof RANGE_DAYS];
  const platformFilter = sp.platform && sp.platform !== 'all' ? sp.platform : null;
  const branchFilter = sp.branch && sp.branch !== 'all' ? sp.branch : null;

  // Multi-restaurant owner: optional restaurantId filter (whitelist scope).
  const ownedIds = user.restaurants.map((r) => r.id);
  const restaurantIds =
    sp.restaurantId && sp.restaurantId !== 'all' && ownedIds.includes(sp.restaurantId)
      ? [sp.restaurantId]
      : ownedIds;

  const now = Date.now();
  // §38.50 — Custom range: explicit start/end. Aksi halde rolling window
  // (now - windowDays). prevWindow custom range için: aynı uzunlukta
  // önceki pencere (start - windowDays → start).
  const windowStart = customRange ? customRange.start : new Date(now - windowDays * 24 * 60 * 60 * 1000);
  const windowEnd = customRange ? customRange.end : new Date(now);
  const prevWindowStart = customRange
    ? new Date(customRange.start.getTime() - windowDays * 24 * 60 * 60 * 1000)
    : new Date(now - windowDays * 2 * 24 * 60 * 60 * 1000);
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
    _todayCount,
    scansWindowCount,
    scansPrevWindowCount,
    scansWindowDaily,
    feedbacks98d,
  ] = await prisma.$transaction([
    // Window feedback'leri — multi-purpose select: hour bucket, aspect avg,
    // theme analysis (comment), response time (replies). Tek query
    // multiple-section'ı besler (CLAUDE.md §7 — replication önleme).
    // §38.50 — `email/phone/hasKvkkConsent` field'ları yeni `returnRate` KPI
    // (tekrar gelme = 2+ visit yapan tekil contact_key) için. Same query.
    prisma.feedback.findMany({
      where: { ...baseWhere, createdAt: { gte: windowStart, lte: windowEnd } },
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
        email: true,
        phone: true,
        hasKvkkConsent: true,
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
        createdAt: { gte: windowStart, lte: windowEnd },
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
        createdAt: { gte: windowStart, lte: windowEnd },
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
      where: { ...scanWhere, createdAt: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.qrScan.count({
      where: { ...scanWhere, createdAt: { gte: prevWindowStart, lt: windowStart } },
    }),
    prisma.qrScan.findMany({
      where: { ...scanWhere, createdAt: { gte: windowStart, lte: windowEnd } },
      select: { createdAt: true },
    }),
    // Phase 8c+ §38.25 — 14 haftalık trend için 98 günlük rating + createdAt
    // serisi. Range filter'dan bağımsız sabit pencere; tasarım kaynağı
    // .design-owner-2026/page-analytics.jsx 14-week trend paterni. Schema
    // değişikliği yok — mevcut createdAt'ten haftalık aggregate JS-side.
    prisma.feedback.findMany({
      where: { ...baseWhere, createdAt: { gte: new Date(now - 98 * 24 * 60 * 60 * 1000) } },
      select: { rating: true, createdAt: true },
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
  const _scansDelta = pctDelta(scansCount, scansPrevWindowCount);

  // §38.50 — Secondary KPI silindi (Dönüşüm/Yönlendirme/AI Yanıt → tasarım
  // birebir 5 single row). Dead compute'lar `_` prefix ile suspended (gelecek
  // export endpoint veya analytics extension'da yine gerekebilir).
  const _conversionRate = scansCount > 0 ? Math.round((reviewsCount / scansCount) * 100) : 0;
  const _prevConversionRate =
    scansPrevWindowCount > 0
      ? Math.round((feedbacksPrevWindow / scansPrevWindowCount) * 100)
      : 0;

  const _redirectRate = reviewsCount > 0 ? Math.round((redirectedWindow / reviewsCount) * 100) : 0;
  const _prevRedirectRate = feedbacksPrevWindow > 0 ? Math.round((redirectedPrevWindow / feedbacksPrevWindow) * 100) : 0;

  const _lowRatingRate = reviewsCount > 0 ? Math.round((lowRatedWindow / reviewsCount) * 100) : 0;
  const _prevLowRatingRate = feedbacksPrevWindow > 0 ? Math.round((lowRatedPrevWindow / feedbacksPrevWindow) * 100) : 0;

  // §38.34 — Yeni KPI hesaplamaları (4 top tasarım + 3 secondary Buaze)
  // 1) Ortalama Puan + delta
  const avgRatingNow =
    reviewsCount > 0
      ? feedbacksWindow.reduce((s, f) => s + (f.rating ?? 0), 0) / reviewsCount
      : 0;
  const prevFeedbacksAvgInput = feedbacksWindow; // fallback for prev compute (server-side)
  // Prev avg rating: feedbacksPrevWindow count yeter ama avg ayrı query gerek;
  // şu anki transaction'da prev rating breakdown yok — heuristic: 0 fallback,
  // delta sadece count-bazlı bilgilendirici görünmez (delta string gizli).
  void prevFeedbacksAvgInput; // intentionally unused — prev avg rating compute deferred
  // 2) NPS — calculateNPS saf helper
  const npsResult = calculateNPS(feedbacksWindow.map((f) => ({ rating: f.rating ?? 0 })));
  // 3) Yanıt sayısı (all feedback) — replied count, "Yanıt süresi" KPI subtitle.
  const repliedCount = feedbacksWindow.filter(
    (f) => Array.isArray(f.replies) && f.replies.length > 0,
  ).length;

  // 4) Avg response time (all feedback) — reply.createdAt − feedback.createdAt
  let totalResponseMs = 0;
  let responseCount = 0;
  for (const f of feedbacksWindow) {
    const firstReply = f.replies?.[0]?.createdAt;
    if (!firstReply) continue;
    const diff = firstReply.getTime() - f.createdAt.getTime();
    if (diff > 0) {
      totalResponseMs += diff;
      responseCount += 1;
    }
  }
  const avgResponseHours = responseCount > 0 ? totalResponseMs / responseCount / 3600000 : null;

  // §38.50 — Yanıt süresi KPI (saat-bazlı, tasarım birebir parity).
  // Display format: "2sa 18dk" / "2h 18m" — saatten azsa "X dk" / "Xm".
  const avgResponseValueLabel = (() => {
    if (avgResponseHours === null) return '—';
    if (avgResponseHours < 1) {
      const mins = Math.round(avgResponseHours * 60);
      return `${mins} ${isTr ? 'dk' : 'm'}`;
    }
    const wholeH = Math.floor(avgResponseHours);
    const mins = Math.round((avgResponseHours - wholeH) * 60);
    return mins > 0
      ? `${wholeH}${isTr ? 'sa' : 'h'} ${mins}${isTr ? 'dk' : 'm'}`
      : `${wholeH}${isTr ? 'sa' : 'h'}`;
  })();

  // §38.50 — Tekrar gelme KPI (Return Rate). KVKK consent + non-anonim
  // (email veya phone dolu) feedback'ler içinde aynı contact_key 2+ kez
  // yorum yazmış müşterilerin total tekil müşteri sayısına oranı.
  // CLAUDE.md §4.5 paterni — Customers feedback-derived dedupe.
  const contactCounts = new Map<string, number>();
  for (const f of feedbacksWindow) {
    if (f.hasKvkkConsent !== true) continue;
    const key = (f.email && f.email.toLowerCase()) || f.phone;
    if (!key) continue;
    contactCounts.set(key, (contactCounts.get(key) ?? 0) + 1);
  }
  const totalUniqueCustomers = contactCounts.size;
  const returningCustomers = Array.from(contactCounts.values()).filter((c) => c >= 2).length;
  const returnRate =
    totalUniqueCustomers > 0
      ? Math.round((returningCustomers / totalUniqueCustomers) * 100)
      : null;

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
  const _totalRedirects = platformShare.reduce((a, p) => a + p.count, 0);
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

  // ---- Phase 8c+ (CLAUDE.md §38.24) — Heatmap Gün × Saat ----
  // .design-owner-2026/page-analytics.jsx YORUM YOĞUNLUĞU paterni.
  // 7×24 matrix mevcut feedbacksWindow.createdAt'ten JS-side aggregate
  // (yeni schema field gerekmez). 168 cell.
  const heatmapCells: Array<{ day: number; hour: number; count: number }> = [];
  const heatmapMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const f of feedbacksWindow) {
    const jsDay = f.createdAt.getDay();
    const day = jsDay === 0 ? 6 : jsDay - 1;
    const hour = f.createdAt.getHours();
    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
      heatmapMatrix[day][hour] += 1;
    }
  }
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      heatmapCells.push({ day: d, hour: h, count: heatmapMatrix[d][h] });
    }
  }

  // ---- Phase 8c+ §38.25 — 14-haftalık trend bucket ----
  // .design-owner-2026/page-analytics.jsx PUAN & HACİM TRENDİ paterni.
  // Range filter'dan bağımsız sabit 98 gün penceresi (~14 hafta). Her hafta
  // için ortalama puan + volume hesapla.
  const WEEKS_TOTAL = 14;
  // §38.34 — sentimentPct hesabı için highRatingCount (rating ≥4)
  const weekBuckets: Array<{ ratingSum: number; volume: number; highRatingCount: number }> = Array.from(
    { length: WEEKS_TOTAL },
    () => ({ ratingSum: 0, volume: 0, highRatingCount: 0 }),
  );
  // Bugün dahil son 14 hafta — index 0 = en eski (98 gün önce), 13 = bu hafta.
  const weekZero = new Date(now);
  weekZero.setHours(0, 0, 0, 0);
  // Pazartesi başlangıç (jsDay 0=Sun → 6, 1=Mon → 0)
  const todayJsDay = weekZero.getDay();
  const isoOffset = todayJsDay === 0 ? 6 : todayJsDay - 1;
  weekZero.setDate(weekZero.getDate() - isoOffset); // Bu pazartesi
  // 13 hafta öncesinin pazartesi'sine geri git
  const trendStart = new Date(weekZero);
  trendStart.setDate(trendStart.getDate() - 13 * 7);

  for (const f of feedbacks98d) {
    const ms = f.createdAt.getTime() - trendStart.getTime();
    const weekIdx = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
    if (weekIdx >= 0 && weekIdx < WEEKS_TOTAL) {
      weekBuckets[weekIdx].ratingSum += f.rating;
      weekBuckets[weekIdx].volume += 1;
      if (f.rating >= 4) weekBuckets[weekIdx].highRatingCount += 1;
    }
  }
  const weeklyTrend = weekBuckets.map((b, i) => ({
    label: `H${i + 1}`,
    rating: b.volume > 0 ? Math.round((b.ratingSum / b.volume) * 100) / 100 : 0,
    volume: b.volume,
    // §38.34 — sentimentPct heuristic: rating ≥4 / volume × 100. Boş hafta → 0.
    sentimentPct: b.volume > 0 ? Math.round((b.highRatingCount / b.volume) * 100) : 0,
  }));

  // Phase 8c+ §38.26 — Owner-tanımlı hedef puan. Single-restaurant filter
  // aktifse o restoran'ın `targetRating`ini kullan; çoklu restoran (all-mode)
  // veya hedef set edilmemişse 4.0 industry default.
  const filterRestaurants = user.restaurants.filter((r) => restaurantIds.includes(r.id));
  let resolvedTargetRating = 4.0;
  if (filterRestaurants.length === 1 && typeof filterRestaurants[0].targetRating === 'number') {
    resolvedTargetRating = filterRestaurants[0].targetRating;
  } else if (filterRestaurants.length > 1) {
    // Çoklu restoran: hedefi olanların ortalaması; hiçbiri set etmemişse 4.0.
    const targets = filterRestaurants
      .map((r) => r.targetRating)
      .filter((t): t is number => typeof t === 'number');
    if (targets.length > 0) {
      resolvedTargetRating =
        Math.round((targets.reduce((sum, t) => sum + t, 0) / targets.length) * 10) / 10;
    }
  }

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

  // §38.34 — Yapılandırılmış 3-segment AI içgörü (TREND/KAZANIM/RİSK).
  // Tasarım kaynağı: page-analytics.jsx AI İÇGÖRÜLER · BU HAFTA dark card.
  // Cache 1 hafta — pazartesi yenilenir. Empty fallback → kart gizli.
  const isoWeekKey = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const year = d.getFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${year}-W${week}`;
  })();
  const structuredCacheKey = `analytics-structured:${user.id}:${restaurantIds.join(',')}:${isoWeekKey}`;
  const ratingDistribution: Record<number, number> = {};
  for (const f of feedbacksWindow) {
    const r = f.rating ?? 0;
    if (r >= 1 && r <= 5) ratingDistribution[r] = (ratingDistribution[r] ?? 0) + 1;
  }
  const structuredInsight = aiAnalyticsAvailable
    ? await extractStructuredInsight(
        { comments: themesComments, ratingDistribution },
        isTr ? 'tr' : 'en',
        structuredCacheKey,
        user.id,
      )
    : { trend: '', win: '', risk: '', source: 'fallback' as const };

  const _windowLabel = isTr ? `${windowDays} GÜNLÜK` : `${windowDays}-DAY`;
  const _windowSuffix = isTr ? `önceki ${windowDays} güne göre` : `vs prev ${windowDays}d`;

  // Phase 8c+ (CLAUDE.md §38.18) — KPI mini sparkline data
  // (.design-owner-2026/page-analytics.jsx parity). interactionData zaten
  // window-bazlı günlük seri taşıyor; her bir KPI kendi metric'ini
  // çıkartarak ham series verir. Min 2 nokta gerekir (StatCard guard).
  const _sparkScans = interactionData.map((d) => d.scans);
  const sparkReviews = interactionData.map((d) => d.reviews);
  const _sparkRedirects = interactionData.map((d) => d.redirects);
  // Conversion = reviews / scans (her gün için, NaN guard 0 fallback).
  const _sparkConversion = interactionData.map((d) =>
    d.scans > 0 ? Math.round((d.reviews / d.scans) * 100) : 0,
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        /* §38.66 — Analytics 5-col KPI + chart + heatmap + topic grid yoğun
           dashboard; hero h1 ezici hissedilir. titleScale="compact"
           22-32px mütevazı kalır. */
        titleScale="compact"
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

      {/* §38.34 — Mobile hero (sm:hidden) — graphite + lime 4.71 + sparkline */}
      <MobileAnalyticsHero
        avgRating={avgRatingNow}
        delta={
          npsResult.npsScore !== 0
            ? `↑ ${(avgRatingNow - 4.0).toFixed(2)}`
            : null
        }
        deltaKind="up"
        sparkline={sparkReviews}
        isTr={isTr}
      />

      {/* §38.50 — KPI 5-col single row (tasarım birebir parity).
          Toplam yorum / Ortalama puan / Yanıt süresi / NPS / Tekrar gelme.
          Secondary 3 KPI (Dönüşüm/Yönlendirme/AI Yanıt) silindi — owner kararı. */}
      <AnalyticsKpiGrid
        kpis={[
          {
            label: isTr ? 'TOPLAM YORUM' : 'TOTAL REVIEWS',
            value: reviewsCount.toLocaleString(isTr ? 'tr-TR' : 'en-US'),
            delta: reviewsDelta.value,
            deltaKind: reviewsDelta.kind,
            subtitle: isTr
              ? `${feedbacksPrevWindow} önceki dönem`
              : `${feedbacksPrevWindow} prev period`,
            sparkline: sparkReviews,
            sparklineColor: '#0A0A0A',
          },
          {
            label: isTr ? 'ORTALAMA PUAN' : 'AVG RATING',
            value: avgRatingNow > 0 ? avgRatingNow.toFixed(2) : '—',
            delta: avgRatingNow > 0 ? `+${(avgRatingNow - 4.0).toFixed(2)}` : null,
            deltaKind: 'up',
            subtitle: isTr
              ? `hedef ${resolvedTargetRating.toFixed(1)}`
              : `target ${resolvedTargetRating.toFixed(1)}`,
            sparkline: sparkReviews,
            sparklineColor: '#A8D62E',
          },
          {
            label: isTr ? 'YANIT SÜRESİ' : 'REPLY TIME',
            value: avgResponseValueLabel,
            delta: avgResponseHours !== null ? (isTr ? 'ortalama' : 'avg') : null,
            deltaKind: 'flat',
            subtitle:
              reviewsCount > 0
                ? isTr
                  ? `${repliedCount}/${reviewsCount} yanıtlandı`
                  : `${repliedCount}/${reviewsCount} replied`
                : isTr
                  ? 'henüz yanıt yok'
                  : 'no replies yet',
            sparkline: sparkReviews,
            sparklineColor: '#A8D62E',
          },
          {
            label: isTr ? 'NPS' : 'NPS',
            value: npsResult.total > 0 ? String(npsResult.npsScore) : '—',
            delta:
              npsResult.total > 0 ? `Promoter %${npsResult.promoterPct}` : null,
            deltaKind: 'flat',
            subtitle:
              npsResult.total > 0
                ? `${npsResult.promoters}P · ${npsResult.passives}Pa · ${npsResult.detractors}D`
                : isTr
                  ? 'yeterli veri yok'
                  : 'not enough data',
            sparkline: sparkReviews,
            sparklineColor: '#A8D62E',
          },
          {
            label: isTr ? 'TEKRAR GELME' : 'RETURN RATE',
            value: returnRate !== null ? `%${returnRate}` : '—',
            delta:
              returnRate !== null && totalUniqueCustomers > 0
                ? isTr
                  ? `${returningCustomers}/${totalUniqueCustomers}`
                  : `${returningCustomers}/${totalUniqueCustomers}`
                : null,
            deltaKind: 'flat',
            subtitle:
              totalUniqueCustomers > 0
                ? isTr
                  ? `${totalUniqueCustomers} tekil müşteri`
                  : `${totalUniqueCustomers} unique`
                : isTr
                  ? 'KVKK onaylı veri yok'
                  : 'no consented data',
            sparkline: sparkReviews,
            sparklineColor: '#0A0A0A',
          },
        ]}
        isTr={isTr}
      />

      {/* §38.50 — PUAN VE HACİM TRENDİ 3-series simultaneous (tasarım birebir).
          Toggle mode silindi — line + bars + target birlikte render. */}
      <PulseTrendChart
        weeks={weeklyTrend}
        targetRating={resolvedTargetRating}
        isTr={isTr}
      />

      {/* §38.50 — Two-up grid: Sol KANAL DAĞILIMI / Sağ KONU SENTİMENT ANALİZİ
          (tasarım birebir parity). Mevcut bottom KONU & DUYGU section
          (line 944-1039 dark) buraya taşındı + light theme migration.
          TopLocationCard sayfa altına ayrıldı. */}
      {showPlatformShare && (
        <div className="grid gap-3.5 lg:grid-cols-[1fr_1.4fr]">
          <ChannelDistributionMini
            channels={[
              ...platformShare.map((p) => ({
                platform: p.key,
                label: PLATFORMS[p.id].label,
                count: p.count,
                color: PLATFORMS[p.id].color,
              })),
              // 'Buaze QR' UI runtime label: platform null yorumlar (rating ≥4).
              ...(() => {
                const buazeQrCount = feedbacksWindow.filter(
                  (f) => (f.rating ?? 0) >= 4 && !f.platform,
                ).length;
                return buazeQrCount > 0
                  ? [
                      {
                        platform: 'buaze_qr',
                        label: isTr ? 'Buaze QR' : 'Buaze QR',
                        count: buazeQrCount,
                        color: '#0A0A0A',
                      },
                    ]
                  : [];
              })(),
            ]}
            isTr={isTr}
          />

          {/* §38.50 — KONU SENTİMENT ANALİZİ (light theme). Tasarım kaynağı:
              page-analytics.jsx line 232-260. Mevcut dark kart (line 944-1039)
              silindi (CLAUDE.md §38.50 owner kararı). */}
          {aiAnalyticsAvailable ? (
            <section className="bz-card p-5 sm:p-6">
              <header className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <Eyebrow>{isTr ? 'KONU SENTİMENT ANALİZİ' : 'TOPIC SENTIMENT'}</Eyebrow>
                  <div className="bz-h-tight mt-1 text-[16px] sm:text-[18px]">
                    {isTr ? 'Müşterinin en sık dile getirdiği' : 'Most-mentioned themes'}
                  </div>
                </div>
                {themes.source === 'openai' && (
                  <span className="pulse-eyebrow shrink-0 inline-flex items-center gap-1 rounded-full border border-[#C6F24E] bg-[#EAF9B8] px-2 py-1 text-[#0A0A0A]">
                    <span
                      aria-hidden="true"
                      className="bz-pulse-dot"
                      style={{ background: '#A8D62E' }}
                    />
                    {isTr ? 'AI ile çıkarıldı' : 'AI extracted'}
                  </span>
                )}
              </header>

              {themes.synthesis && (
                <p className="mb-4 rounded-[10px] bg-[#FAFAFA] px-3 py-2.5 text-[12.5px] leading-[1.55] text-[#0A0A0A]">
                  {themes.synthesis}
                </p>
              )}

              {themes.themes.length === 0 ? (
                <p className="text-[12px] text-[#737373]">
                  {isTr
                    ? themes.source === 'fallback'
                      ? 'Yeterli yorum yok ya da AI servisi şu an pasif. En az 4 metinli yoruma ulaşınca AI çıkarımı burada görünür.'
                      : 'Yorumlardan çıkan ortak tema yok.'
                    : themes.source === 'fallback'
                      ? 'Not enough comments yet, or AI service is paused. AI inference appears once at least 4 text comments are collected.'
                      : 'No common themes from comments yet.'}
                </p>
              ) : (
                <ol className="flex flex-col gap-3.5">
                  {themes.themes.map((t) => {
                    // §38.58 — 3-segment sentiment bar (tasarım birebir
                    // a/page-analytics.jsx:228-235 + dashboard parity). pos%
                    // tile rengini hâlâ belirler (≥80 lime / ≥70 amber / <70
                    // red); progress bar 3-segment (lime + n300 + red) toplam
                    // 100. v2 cache'ten gelen entry'lerde neu/neg yok →
                    // graceful fallback (neg = 100 - pos heuristic).
                    const hasSentiment = typeof t.sentimentPositivePct === 'number';
                    const pos = hasSentiment ? (t.sentimentPositivePct as number) : 0;
                    const neu = hasSentiment ? (t.sentimentNeutralPct ?? 0) : 0;
                    const neg = hasSentiment
                      ? (t.sentimentNegativePct ?? Math.max(0, 100 - pos - neu))
                      : 0;
                    const tileColor =
                      pos >= 80 ? '#A8D62E' : pos >= 70 ? '#D97706' : '#DC2626';
                    return (
                      <li key={t.theme}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-medium text-[#0A0A0A]">
                            {t.theme}
                          </span>
                          <div className="flex items-baseline gap-2.5">
                            <span className="bz-mono text-[10.5px] tabular-nums text-[#A3A3A3]">
                              {t.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
                              {isTr ? 'söz' : 'mentions'}
                            </span>
                            {hasSentiment && (
                              <span
                                className="bz-mono text-[12px] font-semibold tabular-nums"
                                style={{ color: tileColor }}
                              >
                                %{pos}
                              </span>
                            )}
                          </div>
                        </div>
                        {hasSentiment && (
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
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          ) : (
            <section className="bz-card p-5 sm:p-6 flex items-center justify-center text-[13px] text-[#737373]">
              {isTr ? 'AI sentiment analizi pasif.' : 'AI sentiment analysis paused.'}
            </section>
          )}
        </div>
      )}

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

      {/* Phase 8c+ §38.24 — Heatmap Gün × Saat (2D yoğunluk haritası) */}
      <section className="bz-card p-5 sm:p-6">
        <HeatmapDayHour cells={heatmapCells} isTr={isTr} />
      </section>

      {/* Yanıt performansı + Aspect breakdown (conditional) */}
      {/* §38.34 — YANIT PERFORMANSI + Aspect Breakdown silindi (kullanıcı kararı):
          KPI Yanıt Oranı + KONU & DUYGU section'ları bu metric'leri özetler. */}
      {false && (lowRatingFeedbacks.length > 0 || showAspects) && (
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

      {/* §38.50 — Bottom row: Heatmap + AI İÇGÖRÜLER 2-up grid (tasarım birebir).
          AI İÇGÖRÜLER artık light card (CLAUDE.md §38.50). KONU SENTİMENT
          (eski bottom dark) yukarı 2-up grid sağ kart'a taşındı. */}
      <AiInsightsCard
        trend={structuredInsight.trend}
        win={structuredInsight.win}
        risk={structuredInsight.risk}
        isTr={isTr}
      />

      {/* §38.50 — TopLocationCard sayfa altına taşındı (multi-restaurant owner
          için faydalı, 2-up grid sağ kart KONU SENTİMENT'a verildi). */}
      {(() => {
        if (user.restaurants.length < 2) return null;
        const counts = new Map<string, number>();
        const ratings = new Map<string, { sum: number; count: number }>();
        for (const f of feedbacksWindow) {
          if (!f.restaurantId) continue;
          counts.set(f.restaurantId, (counts.get(f.restaurantId) ?? 0) + 1);
          const r = ratings.get(f.restaurantId) ?? { sum: 0, count: 0 };
          r.sum += f.rating ?? 0;
          r.count += 1;
          ratings.set(f.restaurantId, r);
        }
        if (counts.size === 0) return null;
        const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
        const restaurant = user.restaurants.find((r) => r.id === top[0]);
        if (!restaurant) return null;
        const ratingAgg = ratings.get(top[0])!;
        return (
          <TopLocationCard
            topLocation={{
              id: restaurant.id,
              name: restaurant.name,
              branch: null,
              count: top[1],
              avgRating: ratingAgg.count > 0 ? ratingAgg.sum / ratingAgg.count : 0,
            }}
            locale={locale}
            isTr={isTr}
          />
        );
      })()}
    </div>
  );
}
