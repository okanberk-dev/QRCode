export interface WeeklyTrendFeedbackInput {
  rating: number | null;
  createdAt: Date | string;
}

export interface WeeklyTrendPoint {
  label: string;
  rangeLabel: string;
  startIso: string;
  endIso: string;
  rating: number | null;
  volume: number;
  sentimentPct: number | null;
  hasData: boolean;
}

interface WeeklyTrendOptions {
  now?: Date;
  weeks?: number;
  locale?: 'tr' | 'en';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfIsoWeek(date: Date): Date {
  const weekStart = startOfLocalDay(date);
  const jsDay = weekStart.getDay();
  const isoOffset = jsDay === 0 ? 6 : jsDay - 1;
  weekStart.setDate(weekStart.getDate() - isoOffset);
  return weekStart;
}

export function getWeeklyTrendWindow(now = new Date(), weeks = 14) {
  const currentWeekStart = startOfIsoWeek(now);
  const start = new Date(currentWeekStart);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function formatRange(start: Date, endExclusive: Date, locale: 'tr' | 'en') {
  const formatter = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
  });
  const end = new Date(endExclusive.getTime() - DAY_MS);
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function buildWeeklyTrend(
  feedbacks: WeeklyTrendFeedbackInput[],
  options: WeeklyTrendOptions = {},
): WeeklyTrendPoint[] {
  const weeks = options.weeks ?? 14;
  const locale = options.locale ?? 'tr';
  const { start } = getWeeklyTrendWindow(options.now ?? new Date(), weeks);
  const buckets = Array.from({ length: weeks }, () => ({
    ratingSum: 0,
    volume: 0,
    highRatingCount: 0,
  }));

  for (const feedback of feedbacks) {
    if (typeof feedback.rating !== 'number' || !Number.isFinite(feedback.rating)) continue;
    const createdAt =
      feedback.createdAt instanceof Date ? feedback.createdAt : new Date(feedback.createdAt);
    const weekIdx = Math.floor((createdAt.getTime() - start.getTime()) / WEEK_MS);
    if (weekIdx < 0 || weekIdx >= weeks) continue;
    buckets[weekIdx].ratingSum += feedback.rating;
    buckets[weekIdx].volume += 1;
    if (feedback.rating >= 4) buckets[weekIdx].highRatingCount += 1;
  }

  return buckets.map((bucket, index) => {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + index * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const hasData = bucket.volume > 0;
    return {
      label: `H${index + 1}`,
      rangeLabel: formatRange(weekStart, weekEnd, locale),
      startIso: weekStart.toISOString(),
      endIso: weekEnd.toISOString(),
      rating: hasData ? Math.round((bucket.ratingSum / bucket.volume) * 100) / 100 : null,
      volume: bucket.volume,
      sentimentPct: hasData ? Math.round((bucket.highRatingCount / bucket.volume) * 100) : null,
      hasData,
    };
  });
}
