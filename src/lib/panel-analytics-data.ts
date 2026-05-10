import { PLATFORMS, type PlatformId } from '@/components/ui';
import type { KpiSpec } from '@/components/dashboard/analytics/AnalyticsKpiGrid';
import type { ChannelMiniRow } from '@/components/dashboard/analytics/ChannelDistributionMini';
import type { ThemeMention } from '@/components/dashboard/analytics/TopMentionsPolarity';
import { buildPlatformDailyTrend } from '@/lib/analytics-platform-trend';
import { calculateNPS } from '@/lib/analytics-nps';
import { prisma } from '@/lib/prisma';

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

function responseLabel(hours: number | null, isTr: boolean) {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} ${isTr ? 'dk' : 'm'}`;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes > 0
    ? `${whole}${isTr ? 'sa' : 'h'} ${minutes}${isTr ? 'dk' : 'm'}`
    : `${whole}${isTr ? 'sa' : 'h'}`;
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
  const reviewsDelta = pctDelta(reviewsCount, feedbacksPrevWindow);
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

  const sparkReviews = Array.from({ length: windowDays }, (_, index) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (windowDays - 1 - index));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return feedbacksWindow.filter(
      (feedback) => feedback.createdAt >= dayStart && feedback.createdAt < dayEnd,
    ).length;
  });

  const targetRatings = restaurants
    .map((restaurant) => restaurant.targetRating)
    .filter((rating): rating is number => typeof rating === 'number');
  const resolvedTargetRating =
    targetRatings.length > 0
      ? Math.round((targetRatings.reduce((sum, rating) => sum + rating, 0) / targetRatings.length) * 10) / 10
      : 4.0;

  const kpis: KpiSpec[] = [
    {
      label: isTr ? 'TOPLAM YORUM' : 'TOTAL REVIEWS',
      value: reviewsCount.toLocaleString(isTr ? 'tr-TR' : 'en-US'),
      delta: reviewsDelta.value,
      deltaKind: reviewsDelta.kind,
      subtitle: isTr ? `${feedbacksPrevWindow} önceki dönem` : `${feedbacksPrevWindow} prev period`,
      sparkline: sparkReviews,
      sparklineColor: '#0A0A0A',
    },
    {
      label: isTr ? 'ORTALAMA PUAN' : 'AVG RATING',
      value: avgRatingNow > 0 ? avgRatingNow.toFixed(2) : '—',
      delta: avgRatingNow > 0 ? `${avgRatingNow >= resolvedTargetRating ? '+' : ''}${(avgRatingNow - resolvedTargetRating).toFixed(2)}` : null,
      deltaKind: avgRatingNow >= resolvedTargetRating ? 'up' : 'down',
      subtitle: isTr ? `hedef ${resolvedTargetRating.toFixed(1)}` : `target ${resolvedTargetRating.toFixed(1)}`,
      sparkline: sparkReviews,
      sparklineColor: '#A8D62E',
    },
    {
      label: isTr ? 'YANIT SÜRESİ' : 'REPLY TIME',
      value: responseLabel(avgResponseHours, isTr),
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
      label: 'NPS',
      value: npsResult.total > 0 ? String(npsResult.npsScore) : '—',
      delta: npsResult.total > 0 ? `Promoter %${npsResult.promoterPct}` : null,
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
      delta: returnRate !== null ? `${returningCustomers}/${totalUniqueCustomers}` : null,
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
  for (const feedback of feedbacksWindow) {
    const jsDay = feedback.createdAt.getDay();
    const day = jsDay === 0 ? 6 : jsDay - 1;
    const hour = feedback.createdAt.getHours();
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
    trend:
      reviewsCount > 0
        ? isTr
          ? `${windowDays} günlük pencerede ${reviewsCount} yorum toplandı; önceki döneme göre ${reviewsDelta.value}.`
          : `${reviewsCount} reviews collected in the ${windowDays}-day window; ${reviewsDelta.value} versus the previous period.`
        : '',
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
