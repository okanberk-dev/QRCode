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
  Eyebrow,
  PageHeader,
  PLATFORMS,
  type PlatformId,
} from '@/components/ui';
import AnalyticsFilterBar from '@/components/dashboard/analytics/AnalyticsFilterBar';
import { HeatmapDayHour } from '@/components/dashboard/analytics/HeatmapDayHour';
/** One day of the window, for the KPI sparklines. */
interface DailyPoint {
  /** Review count that day. */
  reviews: number;
  /** That day's average rating; null when there were no reviews. */
  avgRating: number | null;
}

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
import { MainTrendChart } from '@/components/dashboard/analytics/MainTrendChart';
import { SentimentDonut } from '@/components/dashboard/analytics/SentimentDonut';
import { TopMentionsPolarity } from '@/components/dashboard/analytics/TopMentionsPolarity';
import { extractThemes } from '@/lib/analytics-themes';
import { extractStructuredInsight } from '@/lib/weekly-structured-insight';
import { calculateNPS } from '@/lib/analytics-nps';
// §38.158 — buildWeeklyTrend + getWeeklyTrendWindow import kaldırıldı
// (PulseTrendChart 14-haftalık görünüm sadece bu helper'ları tüketiyordu).
// Helper dosyası lib/analytics-weekly-trend.ts orphan kaldı — gelecek
// dashboard veya rapor surface'inde reuse ihtiyacı çıkarsa restore edilir.
import { buildPlatformDailyTrend } from '@/lib/analytics-platform-trend';
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

function pctDelta(curr: number, prev: number): { value: string | null; kind: 'up' | 'down' | 'neutral' } {
  // No reviews in the previous period: a percentage is meaningless (the old
  // "Yeni" label was unclear and untranslated) — the subtitle says why.
  if (prev === 0) return { value: null, kind: 'neutral' };
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
  const [feedbacksWindow, feedbacksPrevWindow, branchRows] = await readAll([
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
  ]);
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

  // KPI calculations.
  const reviewsCount = feedbacksWindow.length;
  const reviewsDelta = pctDelta(reviewsCount, feedbacksPrevWindow);

  // 1) Ortalama Puan — no delta yet (the previous period's average is not
  // queried).
  const avgRatingNow =
    reviewsCount > 0
      ? feedbacksWindow.reduce((s, f) => s + (f.rating ?? 0), 0) / reviewsCount
      : 0;
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

  // Daily series for the KPI sparklines — one point per day of the window,
  // ending on the window's last day (same days as the trend chart).
  const dailySeries: DailyPoint[] = Array.from({ length: windowDays }, (_, i) => {
    const dayStart = new Date(seriesAnchor);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (windowDays - 1 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayFbs = feedbacksWindow.filter(
      (f) => f.createdAt >= dayStart && f.createdAt < dayEnd,
    );
    const rated = dayFbs.filter((f) => (f.rating ?? 0) > 0);
    const avgRating =
      rated.length > 0 ? rated.reduce((sum, f) => sum + f.rating, 0) / rated.length : null;
    return { reviews: dayFbs.length, avgRating };
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
  // KANAL DAĞILIMI rows: platforms + 'Buaze QR' (rating ≥4 with no platform).
  const buazeQrCount = feedbacksWindow.filter(
    (f) => (f.rating ?? 0) >= 4 && !f.platform,
  ).length;
  const channelRows = [
    ...platformShare.map((p) => ({
      platform: p.key,
      label: PLATFORMS[p.id].label,
      count: p.count,
      color: PLATFORMS[p.id].color,
    })),
    ...(buazeQrCount > 0
      ? [{ platform: 'buaze_qr', label: 'Buaze QR', count: buazeQrCount, color: '#0A0A0A' }]
      : []),
  ];
  // Only meaningful across platforms (hidden under a platform filter) and
  // only when there is something to show — the card renders nothing for an
  // empty list, which left an empty grid column.
  const showPlatformShare = !platformFilter && channelRows.length > 0;

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
  const platformTrendPoints = buildPlatformDailyTrend(
    feedbacksWindow.map((f) => ({
      rating: f.rating,
      platform: f.platform,
      createdAt: f.createdAt,
    })),
    { windowDays, locale: isTr ? 'tr' : 'en', now: seriesAnchor },
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
  // Both AI helpers need only the comments + rating distribution above and
  // read no database (outbound OpenAI + quota checks only), so they run
  // side by side instead of two LLM round trips back to back on a cache miss.
  const [themes, structuredInsight] = await Promise.all([
    aiAnalyticsAvailable
      ? extractThemes(themesComments, isTr ? 'tr' : 'en', themesCacheKey, user.id)
      : Promise.resolve({ themes: [], synthesis: '', source: 'fallback' as const }),
    aiAnalyticsAvailable
      ? extractStructuredInsight(
          { comments: themesComments, ratingDistribution },
          isTr ? 'tr' : 'en',
          structuredCacheKey,
          user.id,
        )
      : Promise.resolve({ trend: '', win: '', risk: '', source: 'fallback' as const }),
  ]);

  // Phase 8c+ (CLAUDE.md §38.18) — KPI mini sparkline data from the daily
  // series. Min 2 nokta gerekir (StatCard guard).
  const sparkReviews = dailySeries.map((d) => d.reviews);
  // ORTALAMA PUAN — günlük ortalama. Yorumsuz günler son bilinen değeri
  // taşır (sahte 0 çukuru olmasın); ilk yorumdan önceki günler atlanır.
  // En az 2 günde yorum yoksa trend yok → sparkline gizli.
  const ratedDays = dailySeries.filter((d) => d.avgRating !== null).length;
  const sparkAvgRating: number[] = [];
  if (ratedDays >= 2) {
    let lastAvg: number | null = null;
    for (const d of dailySeries) {
      if (d.avgRating !== null) lastAvg = d.avgRating;
      if (lastAvg !== null) sparkAvgRating.push(Math.round(lastAvg * 100) / 100);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
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
            label: isTr ? 'TOPLAM YORUM' : 'TOTAL REVIEWS',
            value: reviewsCount.toLocaleString(isTr ? 'tr-TR' : 'en-US'),
            delta: reviewsDelta.value,
            deltaKind: reviewsDelta.kind,
            subtitle:
              feedbacksPrevWindow > 0
                ? isTr
                  ? `önceki dönemde ${feedbacksPrevWindow.toLocaleString('tr-TR')}`
                  : `${feedbacksPrevWindow.toLocaleString('en-US')} in previous period`
                : isTr
                  ? 'önceki dönemde yorum yok'
                  : 'none in previous period',
            sparkline: sparkReviews,
            sparklineColor: '#0A0A0A',
          },
          {
            label: isTr ? 'ORTALAMA PUAN' : 'AVG RATING',
            value: avgRatingNow > 0 ? avgRatingNow.toFixed(2) : '—',
            // Sabit 4.0 baz alınan "+" delta önceki döneme göre değişim değildi
            // (3.5 ortalamada "+-0.50" basıyordu); prev avg hesaplanana dek yok.
            delta: null,
            subtitle: isTr
              ? `hedef ${resolvedTargetRating.toFixed(1)}`
              : `target ${resolvedTargetRating.toFixed(1)}`,
            sparkline: sparkAvgRating,
            sparklineColor: '#A8D62E',
          },
          // YANIT SÜRESİ / NPS / TEKRAR GELME have no daily series of their own;
          // they used to borrow the review-volume sparkline, which drew a
          // rising trend even when the metric was "—". No sparkline instead.
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
          },
          {
            label: isTr ? 'NPS' : 'NPS',
            value: npsResult.total > 0 ? String(npsResult.npsScore) : '—',
            // 5★ destekçi, 4★ pasif, 1-3★ eleştiren (lib/analytics-nps.ts).
            delta: null,
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
            label: isTr ? 'TEKRAR GELME' : 'RETURN RATE',
            value: returnRate !== null ? (isTr ? `%${returnRate}` : `${returnRate}%`) : '—',
            // The bare "2/6" next to the value was unclear — the subtitle
            // says it in words.
            delta: null,
            subtitle:
              totalUniqueCustomers > 0
                ? isTr
                  ? `${totalUniqueCustomers} müşteriden ${returningCustomers} kişi tekrar geldi`
                  : `${returningCustomers} of ${totalUniqueCustomers} ${
                      totalUniqueCustomers === 1 ? 'customer' : 'customers'
                    } came back`
                : isTr
                  ? 'KVKK onaylı veri yok'
                  : 'no consented data',
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
      <MainTrendChart points={platformTrendPoints} isTr={isTr} />

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
        className={`grid gap-3.5 ${
          showPlatformShare ? 'lg:grid-cols-[1.4fr_1fr_1fr]' : 'lg:grid-cols-2'
        }`}
      >
        {showPlatformShare && (
          <ChannelDistributionMini
            channels={channelRows}
            isTr={isTr}
            caption={
              isTr
                ? '4-5 yıldızlı yorumların geldiği kanallar'
                : 'Where 4-5 star reviews came from'
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
