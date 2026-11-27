import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { resolveUserPayloadIdentity } from '@/lib/panel-access';
import { prisma } from '@/lib/prisma';
import { readAll } from '@/lib/db-batch';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { Download } from 'lucide-react';
import {
  BarChart,
  PageHeader,
  PLATFORMS,
  type PlatformId,
} from '@/components/ui';
import AnalyticsFilterBar from '@/components/dashboard/analytics/AnalyticsFilterBar';
import { HeatmapDayHour } from '@/components/dashboard/analytics/HeatmapDayHour';
// Gün × Saat bucket'ları işletmenin yerel saatinde hesaplanır (CLAUDE.md §46).
// `Date#getHours()` / `getDay()` sunucunun TZ'sini kullanır — Vercel'de UTC —
// bu yüzden İstanbul'daki bir öğle yoğunluğu 09:00'da görünüyordu.
const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
function makeZonedDayHour(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  return (date: Date): { day: number; hour: number } => {
    let day = -1;
    let hour = -1;
    for (const part of fmt.formatToParts(date)) {
      if (part.type === 'weekday') day = WEEKDAY_INDEX[part.value] ?? -1;
      else if (part.type === 'hour') hour = Number(part.value) % 24;
    }
    return { day, hour };
  };
}
// §38.158 — PulseTrendChart import kaldırıldı (14 haftalık trend section silindi).
// Component dosyası `src/components/dashboard/analytics/PulseTrendChart.tsx`
// orphan kaldı — 0 callsite. CLAUDE.md §34 silmiş feature paterni intact;
// gelecek başka surface'tan reuse ihtiyacı çıkarsa restore edilir.
import { AnalyticsKpiGrid } from '@/components/dashboard/analytics/AnalyticsKpiGrid';
import { AiInsightsCard } from '@/components/dashboard/analytics/AiInsightsCard';
import { ChannelDistributionMini } from '@/components/dashboard/analytics/ChannelDistributionMini';
// Stage 66 §38.147 — HANDOFF AnalyticsDesktop redesign component'ları:
// MainTrendChart (stacked area + crosshair tooltip), SentimentDonut (SVG arc
// + center %), TopMentionsPolarity (theme list + ↑↓· arrow).
// §49 — the static "GÜNCEL · BU SAYFA" live label and the mobile-only average
// rating hero were removed: the header subtitle names the business + period,
// and the ORTALAMA PUAN KPI card already shows the rating with its sparkline.
import { VolumeChart } from '@/components/charts/VolumeChart';
import { SentimentDonut } from '@/components/dashboard/analytics/SentimentDonut';
import { TopMentionsPolarity } from '@/components/dashboard/analytics/TopMentionsPolarity';
import { extractThemes, getCachedThemes } from '@/lib/analytics-themes';
import { extractStructuredInsight, getCachedStructuredInsight } from '@/lib/weekly-structured-insight';
import { calculateNPS } from '@/lib/analytics-nps';
// §38.158 — buildWeeklyTrend + getWeeklyTrendWindow import kaldırıldı
// (PulseTrendChart 14-haftalık görünüm sadece bu helper'ları tüketiyordu).
// Helper dosyası lib/analytics-weekly-trend.ts orphan kaldı — gelecek
// dashboard veya rapor surface'inde reuse ihtiyacı çıkarsa restore edilir.
import { buildVolumeSeries } from '@/lib/volume-series';
import {
  BACKLOG_REPLY_DAYS,
  computeReplyTimes,
  describeChange,
  describeRatingChange,
  formatDuration,
  metricInfo,
  metricLabel,
} from '@/lib/feedback-metrics';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { getPanelRestaurants, getPanelUser } from '../_lib/panel-data';

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
    title: locale === 'tr' ? 'Analitik' : 'Analytics',
    robots: { index: false, follow: false },
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

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const spanDays = Math.round((endMs - startMs) / DAY_MS);
  if (spanDays < 1 || spanDays > 365) return null;
  // The end date is inclusive ("Bitiş" in the picker, "20 Eki – 5 Kas" in the
  // header): the window runs to the last millisecond of that day, so reviews
  // left on the end date are counted.
  return {
    start: new Date(startMs),
    end: new Date(endMs + DAY_MS - 1),
    days: spanDays + 1,
  };
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

  // Request-memoised (React cache): on a hard load the dashboard layout has
  // already read the user and the business list, so these are not queried
  // again.
  const userRow = await getPanelUser(payload.userId);
  if (!userRow) redirect(`/${locale}/auth/login`);
  // Team members included — same scope the API layer resolves (CLAUDE.md
  // §38.240). `user.restaurants` (owned only) left invited team members with
  // an empty analytics page. Same scope + order (createdAt asc) as before.
  const identity = resolveUserPayloadIdentity({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
  const user = {
    id: userRow.id,
    restaurants: await getPanelRestaurants(identity.userId, identity.role, identity.email),
  };

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

  // The panel works on one business at a time: the shell's business switcher
  // writes `?restaurantId` (whitelisted against the scope here). Without a
  // valid one this is the first active business — the one the switcher
  // selects by default — instead of "every business", which showed totals for
  // all of them under the switcher's single-business label until the shell
  // rewrote the URL (same rule as the dashboard home).
  const ownedIds = user.restaurants.map((r) => r.id);
  const selectedRestaurantId =
    sp.restaurantId && sp.restaurantId !== 'all' && ownedIds.includes(sp.restaurantId)
      ? sp.restaurantId
      : (user.restaurants.find((r) => r.isActive)?.id ?? null);
  const restaurantIds = selectedRestaurantId ? [selectedRestaurantId] : ownedIds;

  const now = Date.now();
  // §38.50 — Custom range: explicit start/end. Aksi halde rolling window
  // (now - windowDays). prevWindow custom range için: aynı uzunlukta
  // önceki pencere (start - windowDays → start).
  const windowStart = customRange ? customRange.start : new Date(now - windowDays * DAY_MS);
  const windowEnd = customRange ? customRange.end : new Date(now);
  const prevWindowStart = customRange
    ? new Date(customRange.start.getTime() - windowDays * DAY_MS)
    : new Date(now - windowDays * 2 * DAY_MS);
  // Daily series (trend chart + KPI sparklines) end on the last day of the
  // window. They used to count back from today, so a custom range in the past
  // drew an empty chart next to KPIs that had reviews.
  const seriesAnchor = customRange ? customRange.end : new Date(now);

  // Apply platform + branch filters to all queries via shared base WHERE.
  const baseWhere = {
    restaurantId: { in: restaurantIds },
    ...(platformFilter ? { platform: platformFilter } : {}),
    ...(branchFilter ? { branch: branchFilter } : {}),
  } as const;

  // Only what the page renders is queried. The QR scan, redirect, low-rating
  // and "today" counts fed KPIs that were removed earlier (§38.50) and were
  // still run on every load.
  const [feedbacksWindow, prevAggregate, branchRows, backlogReplyRows] = await readAll([
    // Window feedback'leri — multi-purpose select: day/hour buckets,
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
        email: true,
        phone: true,
        hasKvkkConsent: true,
        redirected: true,
        replies: {
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    }),
    // Previous period: rating count + average (KPI changes, §58).
    prisma.feedback.aggregate({
      where: { ...baseWhere, createdAt: { gte: prevWindowStart, lt: windowStart } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    // Distinct branches for the filter dropdown — limited to the business(es)
    // in scope (a branch of another business would only ever show an empty
    // page), not affected by the current branch filter so the owner can pick
    // a different one. With no business in scope `in: []` returns no rows.
    prisma.feedback.findMany({
      where: { restaurantId: { in: restaurantIds }, branch: { not: null } },
      distinct: ['branch'],
      select: { branch: true },
      take: 50,
    }),
    // Replies written in the window to feedback from before it: counted as
    // backlog replies, kept out of the reply-time median (§58).
    prisma.feedbackReply.findMany({
      where: {
        createdAt: { gte: windowStart, lte: windowEnd },
        feedback: { ...baseWhere, redirected: false, createdAt: { lt: windowStart } },
      },
      select: { feedbackId: true, createdAt: true, feedback: { select: { createdAt: true } } },
      take: 2000,
    }),
  ]);
  const feedbacksPrevWindow = prevAggregate._count._all;
  const branches = branchRows
    .map((r) => r.branch as string)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, isTr ? 'tr-TR' : 'en-US'));
  // Keep an active branch filter selectable (and clearable) even when the
  // business in scope has no reviews from it.
  if (branchFilter && !branches.includes(branchFilter)) branches.push(branchFilter);

  // Header subtitle: what the page shows — the business in scope (the shell's
  // business switcher writes `?restaurantId`) and the period.
  const scopeLabel = (() => {
    if (restaurantIds.length === 0) return '';
    if (restaurantIds.length === 1) {
      return user.restaurants.find((r) => r.id === restaurantIds[0])?.name ?? '';
    }
    return isTr
      ? `Tüm işletmeler (${restaurantIds.length})`
      : `All businesses (${restaurantIds.length})`;
  })();
  const periodLabel = (() => {
    if (customRange) {
      const fmt = new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
      return `${fmt.format(customRange.start)} – ${fmt.format(customRange.end)}`;
    }
    if (rangeKey === '1y') return isTr ? 'Son 12 ay' : 'Last 12 months';
    return isTr ? `Son ${windowDays} gün` : `Last ${windowDays} days`;
  })();
  // CSV export keeps the current scope + filters (same params as the page).
  // The business is the resolved one, so the export never silently widens to
  // every business when the URL has no `?restaurantId` yet.
  const exportQuery = new URLSearchParams();
  for (const key of ['range', 'platform', 'branch', 'customStart', 'customEnd'] as const) {
    const value = sp[key];
    if (typeof value === 'string' && value) exportQuery.set(key, value);
  }
  if (selectedRestaurantId) exportQuery.set('restaurantId', selectedRestaurantId);
  if (!isTr) exportQuery.set('locale', 'en');
  const exportQs = exportQuery.toString();
  const exportHref = `/api/dashboard/analytics/export${exportQs ? `?${exportQs}` : ''}`;

  // KPI calculations (definitions: lib/feedback-metrics.ts, §58).
  // Ratings = every QR rating (redirects included); feedback = private form.
  const reviewsCount = feedbacksWindow.length;
  const feedbackOnly = feedbacksWindow.filter((f) => !f.redirected);
  const redirectCount = reviewsCount - feedbackOnly.length;
  const ratingsChange = describeChange(reviewsCount, feedbacksPrevWindow, { isTr });
  const avgRatingNow =
    reviewsCount > 0
      ? feedbacksWindow.reduce((s, f) => s + (f.rating ?? 0), 0) / reviewsCount
      : 0;
  const ratingChange = describeRatingChange(avgRatingNow || null, prevAggregate._avg.rating ?? null, isTr);
  // NPS over every rating.
  const npsResult = calculateNPS(feedbacksWindow.map((f) => ({ rating: f.rating ?? 0 })));
  // 1–3★ feedback reply rate in the window.
  const lowFeedback = feedbackOnly.filter((f) => (f.rating ?? 0) <= 3);
  const lowReplied = lowFeedback.filter((f) => f.replies.length > 0).length;
  // Reply time: median over feedback that arrived in the window; replies to
  // feedback older than 30 days are backlog replies.
  const replyStats = computeReplyTimes(
    [
      ...feedbackOnly.map((f) => ({ createdAt: f.createdAt, firstReplyAt: f.replies[0]?.createdAt ?? null })),
      ...backlogReplyRows.map((r) => ({ createdAt: r.feedback.createdAt, firstReplyAt: r.createdAt })),
    ],
    { start: windowStart, end: new Date(windowEnd.getTime() + 1) },
  );
  const backlogCount = new Set(
    backlogReplyRows
      .filter((r) => r.createdAt.getTime() - r.feedback.createdAt.getTime() > BACKLOG_REPLY_DAYS * 86_400_000)
      .map((r) => r.feedbackId),
  ).size;

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

  // Where redirected customers were sent (§58). Only shown with 2+ platforms:
  // with one platform the card repeats the KPI.
  const channelCounts = new Map<string, number>();
  for (const f of feedbacksWindow) {
    if (!f.redirected) continue;
    const key = (f.platform || '').toLowerCase();
    if (!key) continue;
    channelCounts.set(key, (channelCounts.get(key) ?? 0) + 1);
  }
  const channelRows = PLATFORM_DISPLAY.filter((p) => channelCounts.has(p.key))
    .map((p) => ({
      platform: p.key,
      label: PLATFORMS[p.id].label,
      count: channelCounts.get(p.key) ?? 0,
      color: PLATFORMS[p.id].color,
    }))
    .sort((a, b) => b.count - a.count);
  const showPlatformShare = !platformFilter && channelRows.length >= 2;

  // Günlük dağılım (day-of-week) — over the selected period, like every other
  // card. It used a fixed last-7-days window, so with "Son 90 gün" or a custom
  // range in the past it counted reviews the header said were not shown.
  const dayLabels = isTr ? DAY_LABELS_TR : DAY_LABELS_EN;
  const zonedDayHour = makeZonedDayHour(resolveDisplayTimeZone());
  const dayBuckets: number[] = Array(7).fill(0);
  for (const f of feedbacksWindow) {
    const { day: idx } = zonedDayHour(f.createdAt);
    if (idx >= 0 && idx < 7) dayBuckets[idx] = (dayBuckets[idx] || 0) + 1;
  }
  const dayData = dayBuckets.map((v, i) => ({ label: dayLabels[i], value: v }));

  // ---- Saat-bazlı dağılım (yeni metric, Phase 2026-05) ----
  // Owner: "Hangi saatlerde peak?" personel + kapasite planlama.
  // 24-bucket; sparse label'lar (her 3 saatte bir) chart'ı temiz tutar.
  const hourBuckets: number[] = Array(24).fill(0);
  for (const f of feedbacksWindow) {
    const { hour } = zonedDayHour(f.createdAt);
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
    const { day, hour } = zonedDayHour(f.createdAt);
    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
      heatmapMatrix[day][hour] += 1;
    }
  }
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      heatmapCells.push({ day: d, hour: h, count: heatmapMatrix[d][h] });
    }
  }

  // §38.158 — `weeklyTrend` compute PulseTrendChart ile birlikte silindi.
  // KPI delta + main chart 30-day stacked area + sentiment donut hâlâ
  // `feedbacksWindow` üzerinden compute edilir (bu PR'da etkilenmedi).

  // Stage 66 §38.147 — HANDOFF AnalyticsDesktop main chart 30-day stacked
  // area data. Saf helper feedbacksWindow'dan daily platform breakdown
  // üretir (Google + Tripadvisor + Buaze QR + Other 4-bucket). Backend
  // gerek yok — mevcut feedbacksWindow query reuse (CLAUDE.md §7
  // replication önleme).
  const volumePoints = buildVolumeSeries(
    feedbacksWindow.map((f) => ({ createdAt: f.createdAt, rating: f.rating, redirected: f.redirected })),
    { windowDays, end: seriesAnchor, timeZone: resolveDisplayTimeZone(), locale: isTr ? 'tr' : 'en' },
  );

  // Stage 66 §38.147 — HANDOFF AnalyticsDesktop sentiment donut overall
  // breakdown. NPS-style heuristic: rating 5 = positive, rating 3-4 =
  // neutral, rating 1-2 = negative. AI-bağımsız (extractThemes opsiyonel),
  // her zaman compute edilebilir.
  const ratingBuckets = { pos: 0, neu: 0, neg: 0 };
  for (const f of feedbacksWindow) {
    const r = f.rating ?? 0;
    if (r === 5) ratingBuckets.pos += 1;
    else if (r === 3 || r === 4) ratingBuckets.neu += 1;
    else if (r >= 1 && r <= 2) ratingBuckets.neg += 1;
  }
  const sentimentTotal = ratingBuckets.pos + ratingBuckets.neu + ratingBuckets.neg;
  const sentimentPos =
    sentimentTotal > 0 ? Math.round((ratingBuckets.pos / sentimentTotal) * 100) : 0;
  const sentimentNeu =
    sentimentTotal > 0 ? Math.round((ratingBuckets.neu / sentimentTotal) * 100) : 0;
  // Negative ensures sum = 100 (rounding compensation)
  const sentimentNeg = sentimentTotal > 0 ? Math.max(0, 100 - sentimentPos - sentimentNeu) : 0;

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

  // ---- AI sentiment themes (CLAUDE.md §15 + §34.x — OpenAI extractThemes) ----
  // Feedback yorumlarından top 5 şikayet + top 5 övgü teması. Cache key
  // (restaurant + filter + window) ile process-local 1h TTL. Workspace-bazlı
  // owner restaurantId'ye göre; çoklu lokasyon "all" için userId.
  const themesCacheKey = [
    'v58',
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
  const themesComments = feedbackOnly
    .filter((f) => typeof f.restaurantId === 'string' && aiEnabledRestaurantIds.has(f.restaurantId))
    .filter((f): f is typeof f & { comment: string } => typeof f.comment === 'string' && f.comment.trim().length > 0)
    .map((f) => ({ rating: f.rating, comment: f.comment }));
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
  const structuredCacheKey = `analytics-structured:v58:${user.id}:${restaurantIds.join(',')}:${isoWeekKey}`;
  const ratingDistribution: Record<number, number> = {};
  for (const f of feedbackOnly) {
    const r = f.rating ?? 0;
    if (r >= 1 && r <= 5) ratingDistribution[r] = (ratingDistribution[r] ?? 0) + 1;
  }
  // Never wait for the model (§58): cached results render now; a miss
  // starts the call in the background and the next visit shows it.
  const emptyThemes = { themes: [], synthesis: '', source: 'fallback' as const };
  const emptyInsight = { trend: '', win: '', risk: '', source: 'fallback' as const };
  const cachedThemes = aiAnalyticsAvailable ? await getCachedThemes(themesCacheKey) : null;
  const cachedInsight = aiAnalyticsAvailable ? getCachedStructuredInsight(structuredCacheKey) : null;
  if (aiAnalyticsAvailable && !cachedThemes) {
    void extractThemes(themesComments, isTr ? 'tr' : 'en', themesCacheKey, user.id).catch(() => {});
  }
  if (aiAnalyticsAvailable && !cachedInsight) {
    void extractStructuredInsight(
      { comments: themesComments, ratingDistribution },
      isTr ? 'tr' : 'en',
      structuredCacheKey,
      user.id,
    ).catch(() => {});
  }
  const themes = cachedThemes ?? emptyThemes;
  const structuredInsight = cachedInsight ?? emptyInsight;

  // KPI sparkline (the volume chart below shows daily counts). Average rating: running average
  // of the rated days so far (smooth, no day-to-day zigzag, §58).
  const sparkAvgRating: number[] = [];
  {
    let sum = 0;
    let n = 0;
    for (const p of volumePoints) {
      if (p.avgRating !== null) {
        sum += p.avgRating * p.total;
        n += p.total;
      }
      if (n > 0) sparkAvgRating.push(Math.round((sum / n) * 100) / 100);
    }
    if (sparkAvgRating.length < 2) sparkAvgRating.length = 0;
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-6">
      <PageHeader
        /* §38.66 — Analytics 5-col KPI + chart + heatmap + topic grid yoğun
           dashboard; hero h1 ezici hissedilir. titleScale="compact".
           §49 — no eyebrow (the topbar breadcrumb already says "Analitik");
           the subtitle names the business in scope and the period. */
        titleScale="compact"
        title={isTr ? 'Analitik' : 'Analytics'}
        subtitle={scopeLabel ? `${scopeLabel} · ${periodLabel}` : periodLabel}
        actions={
          <a
            href={exportHref}
            download
            className="bz-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 sm:min-h-0"
            aria-label={isTr ? 'Rapor indir (CSV)' : 'Export report (CSV)'}
          >
            <Download size={14} strokeWidth={2} aria-hidden="true" />
            {isTr ? 'Rapor indir' : 'Export report'}
          </a>
        }
      />

      <AnalyticsFilterBar isTr={isTr} branches={branches} />

      {/* §38.50 — KPI 5-col single row (tasarım birebir parity).
          Toplam yorum / Ortalama puan / Yanıt süresi / NPS / Tekrar gelme.
          Secondary 3 KPI (Dönüşüm/Yönlendirme/AI Yanıt) silindi — owner kararı. */}
      <AnalyticsKpiGrid
        kpis={[
          {
            label: metricLabel('ratings', isTr),
            info: metricInfo('ratings', isTr),
            value: reviewsCount.toLocaleString(isTr ? 'tr-TR' : 'en-US'),
            change: feedbacksPrevWindow > 0 || reviewsCount > 0 ? ratingsChange : null,
            subtitle: isTr
              ? `${redirectCount} yönlendirme · ${feedbackOnly.length} geri bildirim`
              : `${redirectCount} redirects · ${feedbackOnly.length} feedback`,
          },
          {
            label: metricLabel('avgRating', isTr),
            info: metricInfo('avgRating', isTr),
            value: avgRatingNow > 0 ? avgRatingNow.toFixed(2).replace('.', isTr ? ',' : '.') : '—',
            change: ratingChange,
            subtitle: isTr
              ? `hedef ${resolvedTargetRating.toFixed(1).replace('.', ',')}`
              : `target ${resolvedTargetRating.toFixed(1)}`,
            sparkline: sparkAvgRating,
            sparklineColor: '#83AF3B',
          },
          {
            label: metricLabel('replyTime', isTr),
            info: metricInfo('replyTime', isTr),
            value: replyStats.medianMs !== null ? formatDuration(replyStats.medianMs, isTr) : '—',
            subtitle: [
              lowFeedback.length > 0
                ? isTr
                  ? `1–3★: ${lowReplied}/${lowFeedback.length} yanıtlandı`
                  : `1–3★: ${lowReplied}/${lowFeedback.length} replied`
                : isTr
                  ? 'Bu dönemde 1–3★ geri bildirim yok'
                  : 'No 1–3★ feedback in this period',
              backlogCount > 0
                ? isTr
                  ? `eski ${backlogCount} kayda yanıt ayrı`
                  : `${backlogCount} older replies apart`
                : '',
            ]
              .filter(Boolean)
              .join(' · '),
          },
          {
            label: 'NPS',
            info: isTr
              ? '5★ destekçi, 4★ pasif, 1–3★ eleştiren. NPS = destekçi % − eleştiren %.'
              : '5★ promoter, 4★ passive, 1–3★ detractor. NPS = promoter % − detractor %.',
            value: npsResult.total > 0 ? String(npsResult.npsScore) : '—',
            subtitle:
              npsResult.total > 0
                ? isTr
                  ? `${npsResult.promoters}\u00a0destekçi · ${npsResult.passives}\u00a0pasif · ${npsResult.detractors}\u00a0eleştiren`
                  : `${npsResult.promoters}\u00a0promoters · ${npsResult.passives}\u00a0passive · ${npsResult.detractors}\u00a0detractors`
                : isTr
                  ? 'yeterli veri yok'
                  : 'not enough data',
          },
          {
            label: metricLabel('returning', isTr),
            info: metricInfo('returning', isTr),
            value: returnRate !== null ? (isTr ? `%${returnRate}` : `${returnRate}%`) : '—',
            subtitle:
              totalUniqueCustomers > 0
                ? isTr
                  ? `${totalUniqueCustomers} müşteriden ${returningCustomers} kişi`
                  : `${returningCustomers} of ${totalUniqueCustomers}`
                : isTr
                  ? 'İletişim bilgisi bırakan yok'
                  : 'No contact details yet',
          },
        ]}
        isTr={isTr}
      />

      {/* Stage 66 §38.147 — HANDOFF AnalyticsDesktop main chart 30-day
          stacked area (primary daily trend). 4-series stacked: Google +
          Tripadvisor + Buaze QR + Other. Crosshair tooltip + per-series
          breakdown. PulseTrendChart 14-week complementary alt section'da
          kalır (longitudinal weekly trend, Buaze-specific Stage 25 §38.25
          paterni intact). */}
      <VolumeChart
        title={isTr ? 'Puan hacmi' : 'Rating volume'}
        subtitle={windowDays > 92 ? (isTr ? 'Haftalık' : 'Weekly') : isTr ? 'Günlük' : 'Daily'}
        ranges={[{ key: 'window', label: periodLabel, points: volumePoints }]}
        isTr={isTr}
      />

      {/* §38.158 — PUAN VE HACİM TRENDİ (PulseTrendChart 14 haftalık)
          kullanıcı talebi ile kaldırıldı ("analitik sayfasındaki 14 günlük
          analitik kısmını da kaldır"). MainTrendChart 30-day daily stacked
          area + KPI 5-card delta + SentimentDonut + TopMentionsPolarity
          intact — analitik akışı sade tek-chart + KPI + breakdown ile
          devam eder. PulseTrendChart component dosyası orphan kaldı
          (CLAUDE.md §34 paterni — gelecek başka surface'ten reuse
          ihtiyacı çıkarsa restore edilir). */}

      {/* Stage 66 §38.147 — HANDOFF AnalyticsDesktop bottom 3-up grid
          (tasarım birebir parity). Sol KANAL DAĞILIMI (1.4fr) + Orta
          DUYGU DAĞILIMI donut (1fr) + Sağ EN ÇOK BAHSEDİLENLER (1fr).
          Mevcut KONU SENTİMENT detaylı 3-segment progress bar section
          silindi: SentimentDonut overall view (NPS-style rating-bazlı,
          AI-bağımsız) + TopMentionsPolarity per-theme polarity arrow
          (extractThemes data) ikilisi HANDOFF spec'ine birebir uyar +
          owner için 2 farklı sentiment angle sunar (overall + per-theme). */}
      {/* Channel breakdown only means something across platforms: with a
          platform filter it is hidden, but sentiment + top mentions stay
          (they used to disappear with it). */}
      <div
        className={`grid gap-6 ${
          showPlatformShare ? 'lg:grid-cols-[1.4fr_1fr_1fr]' : 'lg:grid-cols-2'
        }`}
      >
        {showPlatformShare && (
          <ChannelDistributionMini
            channels={channelRows}
            isTr={isTr}
            caption={
              isTr
                ? 'Yüksek puanla yönlendirilen müşterilerin gittiği platformlar'
                : 'Where high-rating customers were sent'
            }
          />
        )}

        {/* Stage 66 §38.147 — DUYGU DAĞILIMI donut. Rating distribution
            NPS-style heuristic (rating 5 = positive, 3-4 = neutral,
            1-2 = negative). AI-bağımsız, her zaman compute edilebilir. */}
        <SentimentDonut
          pos={sentimentPos}
          neu={sentimentNeu}
          neg={sentimentNeg}
          isTr={isTr}
          totalSample={sentimentTotal}
        />

        {/* Stage 66 §38.147 — EN ÇOK BAHSEDİLENLER per-theme polarity.
            extractThemes themes[] data direkt. Polarity derive: pos% ≥60
            → ↑ green, <35 → ↓ red, else → · neutral. AI yok ise empty
            state ("yeterli veri yok"). */}
        <TopMentionsPolarity themes={themes.themes} isTr={isTr} />
      </div>

      {/* 2-col 1fr/1fr: Günlük dağılım + Saat-bazlı dağılım */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bz-card p-5 sm:p-6">
          <h2 className="text-[15px] font-medium text-pn-ink">{isTr ? 'Günlere göre' : 'By weekday'}</h2>
          <p className="mt-0.5 mb-4 text-[13px] text-[#525252]">
            {isTr ? 'Hangi günler daha çok puan geliyor?' : 'Which days bring the most ratings?'}
          </p>
          <BarChart data={dayData} height={160} showValues />
        </section>

        <section className="bz-card p-5 sm:p-6">
          <h2 className="text-[15px] font-medium text-pn-ink">{isTr ? 'Saatlere göre' : 'By hour'}</h2>
          <p className="mt-0.5 mb-4 text-[13px] text-[#525252]">
            {isTr ? 'Yoğun saatler hangileri?' : 'Which hours are busiest?'}
          </p>
          <BarChart data={hourData} height={160} />

        </section>
      </div>

      {/* Phase 8c+ §38.24 — Heatmap Gün × Saat (2D yoğunluk haritası) */}
      <section className="bz-card p-5 sm:p-6">
        <HeatmapDayHour cells={heatmapCells} isTr={isTr} />
      </section>

      {/* §38.50 — Bottom row: Heatmap + AI İÇGÖRÜLER 2-up grid (tasarım birebir).
          AI İÇGÖRÜLER artık light card (CLAUDE.md §38.50). KONU SENTİMENT
          (eski bottom dark) yukarı 2-up grid sağ kart'a taşındı. */}
      <AiInsightsCard
        trend={structuredInsight.trend}
        win={structuredInsight.win}
        risk={structuredInsight.risk}
        isTr={isTr}
      />
    </div>
  );
}
