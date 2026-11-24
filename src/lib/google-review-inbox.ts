/**
 * Google review reply inbox — query parsing, Prisma filters and statistics
 * (CLAUDE.md §54). Pure: no DB calls, so every rule here is unit-tested. The
 * routes under /api/restaurants/[id]/google/business/inbox use it.
 */
import type { Prisma } from '@prisma/client';
import { extractReviewKeywords, type ReviewKeyword } from '@/lib/google-review-text';

export type InboxStatus = 'unreplied' | 'replied' | 'all';
export type InboxTextFilter = 'with' | 'without' | 'all';

export interface InboxFilter {
  status: InboxStatus;
  stars: number[];
  text: InboxTextFilter;
  /** YYYY-MM-DD, inclusive, in the display time zone. */
  from: string | null;
  to: string | null;
  q: string;
}

export const DEFAULT_INBOX_FILTER: InboxFilter = {
  status: 'unreplied',
  stars: [],
  text: 'all',
  from: null,
  to: null,
  q: '',
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDay(value: string | null): string | null {
  if (!value || !DAY_RE.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) ? value : null;
}

export function parseInboxFilter(params: URLSearchParams): InboxFilter {
  const status = params.get('status');
  const text = params.get('text');
  const stars = (params.get('stars') ?? '')
    .split(',')
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  return {
    status: status === 'replied' || status === 'all' ? status : 'unreplied',
    stars: Array.from(new Set(stars)).sort(),
    text: text === 'with' || text === 'without' ? text : 'all',
    from: validDay(params.get('from')),
    to: validDay(params.get('to')),
    q: (params.get('q') ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
  };
}

/** The UTC offset (ms) of `timeZone` at `at`. */
function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Midnight of a YYYY-MM-DD day in `timeZone`, as a UTC Date. */
export function zonedDayStart(day: string, timeZone: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  const first = guess - offset;
  // Re-check across a DST change at midnight.
  const offset2 = tzOffsetMs(new Date(first), timeZone);
  return new Date(guess - offset2);
}

export function buildInboxWhere(
  restaurantId: string,
  filter: InboxFilter,
  timeZone: string,
): Prisma.GoogleReviewWhereInput {
  const and: Prisma.GoogleReviewWhereInput[] = [{ restaurantId }];
  if (filter.status === 'unreplied') and.push({ hasReply: false });
  if (filter.status === 'replied') and.push({ hasReply: true });
  if (filter.stars.length > 0 && filter.stars.length < 5) and.push({ rating: { in: filter.stars } });
  if (filter.text === 'with') and.push({ hasText: true });
  if (filter.text === 'without') and.push({ hasText: false });
  if (filter.from || filter.to) {
    const range: Prisma.DateTimeNullableFilter = {};
    if (filter.from) range.gte = zonedDayStart(filter.from, timeZone);
    if (filter.to) {
      const end = zonedDayStart(filter.to, timeZone);
      range.lt = new Date(end.getTime() + 24 * 3600_000);
    }
    and.push({ createTime: range });
  }
  if (filter.q) {
    const contains = { contains: filter.q, mode: 'insensitive' as const };
    and.push({
      OR: [
        { reviewerName: contains },
        { originalText: contains },
        { translatedText: contains },
        { replyComment: contains },
      ],
    });
  }
  return and.length === 1 ? and[0] : { AND: and };
}

/** Bulk replies are allowed only for 4–5★ reviews without a reply. */
export function isBulkEligible(review: { rating: number | null; hasReply: boolean }): boolean {
  return !review.hasReply && (review.rating ?? 0) >= 4;
}

// ─── statistics ──────────────────────────────────────────────────────────

export interface InsightRow {
  rating: number | null;
  createTime: Date | null;
  hasReply: boolean;
  replyUpdateTime: Date | null;
  originalText: string | null;
  language: string | null;
}

export type ResponseTrend = 'faster' | 'slower' | 'same';

export interface ResponseTimeStats {
  /** Average over every reply, in hours. */
  overallHours: number | null;
  /** Replies written in the last 30 days. */
  currentHours: number | null;
  /** Replies written 30–60 days ago. */
  previousHours: number | null;
  /**
   * Change of the average time, in percent (negative = got shorter). Null
   * when either window has no reply.
   */
  changePct: number | null;
  /** Shorter time is "faster" (good, green), longer is "slower" (red). */
  trend: ResponseTrend | null;
}

export interface ReviewInsights {
  total: number;
  replied: number;
  unreplied: number;
  replyRate: number | null;
  distribution: { rating: number; count: number }[];
  responseTime: ResponseTimeStats;
  newLast30: number;
  newPrev30: number;
  keywords: ReviewKeyword[];
}

const DAY_MS = 24 * 3600_000;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeResponseTime(rows: InsightRow[], now: Date = new Date()): ResponseTimeStats {
  const nowMs = now.getTime();
  const all: number[] = [];
  const current: number[] = [];
  const previous: number[] = [];
  for (const r of rows) {
    if (!r.hasReply || !r.replyUpdateTime || !r.createTime) continue;
    const diffH = (r.replyUpdateTime.getTime() - r.createTime.getTime()) / 3600_000;
    if (!(diffH > 0)) continue;
    all.push(diffH);
    const age = nowMs - r.replyUpdateTime.getTime();
    if (age < 30 * DAY_MS) current.push(diffH);
    else if (age < 60 * DAY_MS) previous.push(diffH);
  }
  const currentHours = average(current);
  const previousHours = average(previous);
  let changePct: number | null = null;
  let trend: ResponseTrend | null = null;
  if (currentHours !== null && previousHours !== null && previousHours > 0) {
    changePct = Math.round(((currentHours - previousHours) / previousHours) * 100);
    trend = changePct < 0 ? 'faster' : changePct > 0 ? 'slower' : 'same';
  }
  return { overallHours: average(all), currentHours, previousHours, changePct, trend };
}

export function computeInsights(rows: InsightRow[], now: Date = new Date()): ReviewInsights {
  const counts = new Map<number, number>();
  let replied = 0;
  let newLast30 = 0;
  let newPrev30 = 0;
  const nowMs = now.getTime();
  for (const r of rows) {
    if (r.rating) counts.set(r.rating, (counts.get(r.rating) ?? 0) + 1);
    if (r.hasReply) replied++;
    if (r.createTime) {
      const age = nowMs - r.createTime.getTime();
      if (age < 30 * DAY_MS) newLast30++;
      else if (age < 60 * DAY_MS) newPrev30++;
    }
  }
  const total = rows.length;
  return {
    total,
    replied,
    unreplied: total - replied,
    replyRate: total > 0 ? Math.round((replied / total) * 100) : null,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: counts.get(rating) ?? 0 })),
    responseTime: computeResponseTime(rows, now),
    newLast30,
    newPrev30,
    keywords: extractReviewKeywords(
      rows.map((r) => ({ text: r.originalText, rating: r.rating, language: r.language })),
      12,
    ),
  };
}

/** "−%45" / "+%12" (Turkish places % before the number). */
export function formatChangePct(changePct: number, locale: 'tr' | 'en'): string {
  const sign = changePct > 0 ? '+' : changePct < 0 ? '−' : '';
  const abs = Math.abs(changePct);
  const value = abs > 999 ? '999+' : String(abs);
  return locale === 'tr' ? `${sign}%${value}` : `${sign}${value}%`;
}

export function formatHours(hours: number | null, locale: 'tr' | 'en'): string {
  if (hours === null) return '—';
  if (hours < 1) {
    const min = Math.max(1, Math.round(hours * 60));
    return locale === 'tr' ? `${min} dk` : `${min} min`;
  }
  if (hours < 48) {
    const h = Math.round(hours * 10) / 10;
    return locale === 'tr' ? `${h.toLocaleString('tr-TR')} sa` : `${h} h`;
  }
  const d = Math.round((hours / 24) * 10) / 10;
  return locale === 'tr' ? `${d.toLocaleString('tr-TR')} gün` : `${d} d`;
}
