import { PLATFORMS, type PlatformId } from '@/components/ui';
import type { KpiSpec } from '@/components/dashboard/analytics/AnalyticsKpiGrid';
import type { ChannelMiniRow } from '@/components/dashboard/analytics/ChannelDistributionMini';
import type { ThemeMention } from '@/components/dashboard/analytics/TopMentionsPolarity';
import { buildPlatformDailyTrend } from '@/lib/analytics-platform-trend';
import { calculateNPS, satisfactionDisplay } from '@/lib/analytics-nps';
import { describeChange, metricInfo, metricLabel } from '@/lib/feedback-metrics';
import { prisma } from '@/lib/prisma';
import { resolveDisplayTimeZone } from '@/lib/timezone';

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

const STOPWORDS = new Set([
  'ama',
  'ancak',
  'bile',
  'bir',
  'çok',
  'daha',
  'değil',
  'gibi',
  'için',
  'ile',
  'olan',
  'olarak',
  'sonra',
  'the',
  'and',
  'that',
  'this',
  'with',
  'from',
  'have',
  'was',
  'were',
  'not',
  'very',
  'really',
]);

export interface PanelAnalyticsRestaurant {
  id: string;
  name: string;
  targetRating: number | null;
}

export interface PanelAnalyticsData {
  kpis: KpiSpec[];
  platformTrendPoints: ReturnType<typeof buildPlatformDailyTrend>;
  channels: ChannelMiniRow[];
  sentiment: { pos: number; neu: number; neg: number; total: number };
  themes: ThemeMention[];
  heatmapCells: Array<{ day: number; hour: number; count: number }>;
  insight: { trend: string; win: string; risk: string };
  reviewsCount: number;
  windowDays: number;
}

function responseLabel(hours: number | null, isTr: boolean) {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} ${isTr ? 'dk' : 'm'}`;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes > 0
    ? `${whole}${isTr ? 'sa' : 'h'} ${minutes}${isTr ? 'dk' : 'm'}`
    : `${whole}${isTr ? 'sa' : 'h'}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/**
 * Day-of-week (Mon=0..Sun=6) + hour (0-23) in the display timezone
 * (CLAUDE.md §46). `Date#getDay/getHours` use the server TZ (UTC on Vercel),
 * which put a 08:46 Istanbul review into the 05:00 cell.
 */
function makeDayHourResolver(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  return (date: Date): { day: number; hour: number } => {
    let day = 0;
    let hour = 0;
    for (const part of fmt.formatToParts(date)) {
      if (part.type === 'weekday') day = WEEKDAY_INDEX[part.value] ?? 0;
      else if (part.type === 'hour') hour = Number(part.value) % 24;
    }
    return { day, hour };
  };
}

/** Calendar day key (YYYY-MM-DD) in the display timezone. */
function makeDayKeyResolver(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return (date: Date) => fmt.format(date);
}

function trendSentence(
  reviewsCount: number,
  prevCount: number,
  windowDays: number,
  isTr: boolean,
): string {
  if (reviewsCount === 0) return '';
  const lead = isTr
    ? `${windowDays} günlük pencerede ${reviewsCount} yorum toplandı`
    : `${reviewsCount} reviews collected in the ${windowDays}-day window`;
  if (prevCount === 0) {
    return isTr
      ? `${lead}; önceki dönemde yorum yoktu.`
      : `${lead}; there were no reviews in the previous period.`;
  }
  const pct = Math.round(((reviewsCount - prevCount) / prevCount) * 1000) / 10;
  const abs = Math.abs(pct).toLocaleString(isTr ? 'tr-TR' : 'en-US');
  if (pct === 0) {
    return isTr ? `${lead}; önceki dönemle aynı seviyede.` : `${lead}; flat versus the previous period.`;
  }
  if (pct > 0) {
    return isTr
      ? `${lead}; önceki döneme göre %${abs} arttı.`
      : `${lead}; up ${abs}% versus the previous period.`;
  }
  return isTr
    ? `${lead}; önceki döneme göre %${abs} azaldı.`
    : `${lead}; down ${abs}% versus the previous period.`;
}

function tokenize(comment: string) {
  return comment
    .toLocaleLowerCase('tr-TR')
    .split(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
}

export async function buildPanelAnalyticsData({
  restaurants,
  rangeKey,
  platformFilter,
  locale,
}: {
  restaurants: PanelAnalyticsRestaurant[];
  rangeKey: string;
  platformFilter: string | null;
  locale: 'tr' | 'en';
}): Promise<PanelAnalyticsData> {
  const isTr = locale === 'tr';
  const restaurantIds = restaurants.map((restaurant) => restaurant.id);
  const windowDays = RANGE_DAYS[rangeKey] ?? RANGE_DAYS['30d'];
  const now = Date.now();
  const windowStart = new Date(now - windowDays * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now);
  const prevWindowStart = new Date(now - windowDays * 2 * 24 * 60 * 60 * 1000);

  if (restaurantIds.length === 0) {
    return {
      kpis: [],
      platformTrendPoints: buildPlatformDailyTrend([], { windowDays, locale, now: new Date(now) }),
      channels: [],
      sentiment: { pos: 0, neu: 0, neg: 0, total: 0 },
      themes: [],
      heatmapCells: [],
      insight: { trend: '', win: '', risk: '' },
      reviewsCount: 0,
      windowDays,
    };
  }

  const baseWhere = {
    restaurantId: { in: restaurantIds },
    ...(platformFilter ? { platform: platformFilter } : {}),
  } as const;

  const [feedbacksWindow, feedbacksPrevWindow] = await prisma.$transaction([
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
  ]);

  const reviewsCount = feedbacksWindow.length;
  const avgRatingNow =
    reviewsCount > 0
      ? feedbacksWindow.reduce((sum, feedback) => sum + (feedback.rating ?? 0), 0) / reviewsCount
      : 0;

  const npsResult = calculateNPS(feedbacksWindow.map((feedback) => ({ rating: feedback.rating ?? 0 })));
  const repliedCount = feedbacksWindow.filter((feedback) => feedback.replies.length > 0).length;

  let totalResponseMs = 0;
  let responseCount = 0;
  for (const feedback of feedbacksWindow) {
    const firstReply = feedback.replies[0]?.createdAt;
    if (!firstReply) continue;
    const diff = firstReply.getTime() - feedback.createdAt.getTime();
    if (diff > 0) {
      totalResponseMs += diff;
      responseCount += 1;
    }
  }
  const avgResponseHours = responseCount > 0 ? totalResponseMs / responseCount / 3600000 : null;

  const contactCounts = new Map<string, number>();
  for (const feedback of feedbacksWindow) {
    if (feedback.hasKvkkConsent !== true) continue;
    const key = (feedback.email && feedback.email.toLowerCase()) || feedback.phone;
    if (!key) continue;
    contactCounts.set(key, (contactCounts.get(key) ?? 0) + 1);
  }
  const totalUniqueCustomers = contactCounts.size;
  const returningCustomers = Array.from(contactCounts.values()).filter((count) => count >= 2).length;
  const returnRate =
    totalUniqueCustomers > 0 ? Math.round((returningCustomers / totalUniqueCustomers) * 100) : null;

  // Day buckets in the display timezone (§46) — not the server's midnight.
  const displayTimeZone = resolveDisplayTimeZone();
  const dayKeyOf = makeDayKeyResolver(displayTimeZone);
  const reviewsPerDay = new Map<string, number>();
  for (const feedback of feedbacksWindow) {
    const key = dayKeyOf(feedback.createdAt);
    reviewsPerDay.set(key, (reviewsPerDay.get(key) ?? 0) + 1);
  }
  const sparkReviews = Array.from({ length: windowDays }, (_, index) => {
    const day = new Date(now - (windowDays - 1 - index) * 24 * 60 * 60 * 1000);
    return reviewsPerDay.get(dayKeyOf(day)) ?? 0;
  });

  const targetRatings = restaurants
    .map((restaurant) => restaurant.targetRating)
    .filter((rating): rating is number => typeof rating === 'number');
  const resolvedTargetRating =
    targetRatings.length > 0
      ? Math.round((targetRatings.reduce((sum, rating) => sum + rating, 0) / targetRatings.length) * 10) / 10
      : 4.0;

  // Same card language as the owner analytics page (§58): sentence-case
  // labels, Turkish decimals, a trend only where it is the card's own series.
  const dec = (v: number, digits: number) => (isTr ? v.toFixed(digits).replace('.', ',') : v.toFixed(digits));
  const ratingGap = avgRatingNow - resolvedTargetRating;
  const satisfaction = satisfactionDisplay(npsResult, isTr);
  const kpis: KpiSpec[] = [
    {
      label: isTr ? 'Toplam yorum' : 'Total reviews',
      value: reviewsCount.toLocaleString(isTr ? 'tr-TR' : 'en-US'),
      change: feedbacksPrevWindow === 0 ? null : describeChange(reviewsCount, feedbacksPrevWindow, { isTr }),
      subtitle:
        feedbacksPrevWindow === 0
          ? isTr
            ? 'önceki dönemde yorum yok'
            : 'none in previous period'
          : isTr
            ? `önceki dönemde ${feedbacksPrevWindow.toLocaleString('tr-TR')}`
            : `${feedbacksPrevWindow.toLocaleString('en-US')} in previous period`,
      sparkline: sparkReviews,
      sparklineColor: '#111110',
    },
    {
      label: isTr ? 'Ortalama puan' : 'Average rating',
      value: avgRatingNow > 0 ? dec(avgRatingNow, 2) : '—',
      delta: avgRatingNow > 0 ? `${ratingGap >= 0 ? '+' : '−'}${dec(Math.abs(ratingGap), 2)}` : null,
      deltaKind: ratingGap >= 0 ? 'up' : 'down',
      subtitle: isTr ? `hedef ${dec(resolvedTargetRating, 1)} · fark hedefe göre` : `target ${dec(resolvedTargetRating, 1)} · gap to target`,
    },
    {
      label: isTr ? 'Yanıt süresi' : 'Reply time',
      value: responseLabel(avgResponseHours, isTr),
      subtitle:
        reviewsCount > 0
          ? isTr
            ? `ortalama · ${repliedCount}/${reviewsCount} yanıtlandı`
            : `average · ${repliedCount}/${reviewsCount} replied`
          : isTr
            ? 'henüz yanıt yok'
            : 'no replies yet',
    },
    {
      // "NPS" in plain words (2026-11-28, lib/analytics-nps.ts satisfactionDisplay).
      label: metricLabel('satisfaction', isTr),
      info: metricInfo('satisfaction', isTr),
      value: satisfaction?.value ?? '—',
      subtitle: satisfaction?.subtitle ?? (isTr ? 'yeterli veri yok' : 'not enough data'),
    },
    {
      label: isTr ? 'Tekrar gelen' : 'Returning',
      value: returnRate !== null ? (isTr ? `%${returnRate}` : `${returnRate}%`) : '—',
      subtitle:
        totalUniqueCustomers > 0
          ? isTr
            ? `${totalUniqueCustomers} müşteriden ${returningCustomers} kişi`
            : `${returningCustomers} of ${totalUniqueCustomers}`
          : isTr
            ? 'KVKK onaylı veri yok'
            : 'no consented data',
    },
  ];

  const platformTrendPoints = buildPlatformDailyTrend(
    feedbacksWindow.map((feedback) => ({
      rating: feedback.rating,
      platform: feedback.platform,
      createdAt: feedback.createdAt,
    })),
    { windowDays, locale, now: new Date(now) },
  );

  const channelMap = new Map<string, ChannelMiniRow>();
  for (const feedback of feedbacksWindow) {
    const platform = feedback.platform || 'buaze_qr';
    const platformMeta = PLATFORMS[platform as PlatformId];
    const current = channelMap.get(platform) ?? {
      platform,
      label: platform === 'buaze_qr' ? 'Buaze QR' : platformMeta?.label ?? platform,
      count: 0,
      color: platform === 'buaze_qr' ? '#0A0A0A' : platformMeta?.color ?? '#737373',
    };
    current.count += 1;
    channelMap.set(platform, current);
  }
  const channels = Array.from(channelMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  const ratingBuckets = { pos: 0, neu: 0, neg: 0 };
  for (const feedback of feedbacksWindow) {
    const rating = feedback.rating ?? 0;
    if (rating === 5) ratingBuckets.pos += 1;
    else if (rating === 3 || rating === 4) ratingBuckets.neu += 1;
    else if (rating >= 1 && rating <= 2) ratingBuckets.neg += 1;
  }
  const sentimentTotal = ratingBuckets.pos + ratingBuckets.neu + ratingBuckets.neg;
  const sentimentPos = sentimentTotal > 0 ? Math.round((ratingBuckets.pos / sentimentTotal) * 100) : 0;
  const sentimentNeu = sentimentTotal > 0 ? Math.round((ratingBuckets.neu / sentimentTotal) * 100) : 0;
  const sentimentNeg = sentimentTotal > 0 ? Math.max(0, 100 - sentimentPos - sentimentNeu) : 0;

  const themeMap = new Map<string, { count: number; pos: number; neu: number; neg: number }>();
  for (const feedback of feedbacksWindow) {
    if (!feedback.comment) continue;
    for (const token of new Set(tokenize(feedback.comment))) {
      const current = themeMap.get(token) ?? { count: 0, pos: 0, neu: 0, neg: 0 };
      current.count += 1;
      if ((feedback.rating ?? 0) >= 4) current.pos += 1;
      else if ((feedback.rating ?? 0) <= 2) current.neg += 1;
      else current.neu += 1;
      themeMap.set(token, current);
    }
  }
  const themes = Array.from(themeMap.entries())
    .map(([theme, value]) => ({
      theme,
      count: value.count,
      sentimentPositivePct: Math.round((value.pos / Math.max(value.count, 1)) * 100),
      sentimentNeutralPct: Math.round((value.neu / Math.max(value.count, 1)) * 100),
      sentimentNegativePct: Math.round((value.neg / Math.max(value.count, 1)) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const heatmapMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const dayHourOf = makeDayHourResolver(displayTimeZone);
  for (const feedback of feedbacksWindow) {
    const { day, hour } = dayHourOf(feedback.createdAt);
    heatmapMatrix[day][hour] += 1;
  }
  const heatmapCells: Array<{ day: number; hour: number; count: number }> = [];
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      heatmapCells.push({ day, hour, count: heatmapMatrix[day][hour] });
    }
  }

  const lowRatedCount = feedbacksWindow.filter((feedback) => (feedback.rating ?? 0) <= 2).length;
  const topTheme = themes[0]?.theme ?? null;
  const insight = {
    trend: trendSentence(reviewsCount, feedbacksPrevWindow, windowDays, isTr),
    win:
      topTheme && sentimentPos >= 50
        ? isTr
          ? `Pozitif sinyal güçlü: ${topTheme} konusu öne çıkıyor.`
          : `Positive signal is strong: ${topTheme} is the leading topic.`
        : '',
    risk:
      lowRatedCount > 0
        ? isTr
          ? `${lowRatedCount} düşük puanlı yorum var; hızlı yanıt önceliği verilmeli.`
          : `${lowRatedCount} low-rated reviews need quick response priority.`
        : '',
  };

  return {
    kpis,
    platformTrendPoints,
    channels,
    sentiment: { pos: sentimentPos, neu: sentimentNeu, neg: sentimentNeg, total: sentimentTotal },
    themes,
    heatmapCells,
    insight,
    reviewsCount,
    windowDays,
  };
}
