/**
 * Daily (or weekly, for long windows) rating volume for the panel charts
 * (CLAUDE.md §58): Panel "Puan hacmi" and Analytics use the same series and
 * the same chart. Days are cut in the display time zone (§46). Pure.
 */

export interface VolumeRow {
  createdAt: Date;
  rating: number | null;
  redirected: boolean;
}

export interface VolumePoint {
  /** Short label ("24.11", or week start for weekly buckets). */
  label: string;
  /** Long label for the tooltip ("24 Kasım" / "18–24 Kasım"). */
  longLabel: string;
  isoDate: string;
  feedback: number;
  redirects: number;
  total: number;
  avgRating: number | null;
}

const DAY_MS = 86_400_000;

function dayKey(date: Date, fmt: Intl.DateTimeFormat): string {
  // en-CA formats as YYYY-MM-DD.
  return fmt.format(date);
}

/** Windows longer than this use weekly buckets (readable bar width). */
export const WEEKLY_AFTER_DAYS = 92;

export function buildVolumeSeries(
  rows: VolumeRow[],
  opts: { windowDays: number; end: Date; timeZone: string; locale: 'tr' | 'en' },
): VolumePoint[] {
  const { windowDays, end, timeZone, locale } = opts;
  if (windowDays <= 0) return [];
  const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const shortFmt = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', { timeZone, day: '2-digit', month: '2-digit' });
  const longFmt = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', { timeZone, day: 'numeric', month: 'long' });

  const days: Array<{ key: string; date: Date }> = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const date = new Date(end.getTime() - i * DAY_MS);
    days.push({ key: dayKey(date, keyFmt), date });
  }
  const byDay = new Map<string, { feedback: number; redirects: number; sum: number; rated: number }>();
  for (const d of days) byDay.set(d.key, { feedback: 0, redirects: 0, sum: 0, rated: 0 });
  for (const r of rows) {
    const bucket = byDay.get(dayKey(r.createdAt, keyFmt));
    if (!bucket) continue;
    if (r.redirected) bucket.redirects += 1;
    else bucket.feedback += 1;
    if (r.rating && r.rating > 0) {
      bucket.sum += r.rating;
      bucket.rated += 1;
    }
  }

  const step = windowDays > WEEKLY_AFTER_DAYS ? 7 : 1;
  const points: VolumePoint[] = [];
  // Weekly buckets end on the last day, so the newest week is complete.
  for (let endIdx = days.length - 1; endIdx >= 0; endIdx -= step) {
    const startIdx = Math.max(0, endIdx - step + 1);
    let feedback = 0;
    let redirects = 0;
    let sum = 0;
    let rated = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      const b = byDay.get(days[i].key)!;
      feedback += b.feedback;
      redirects += b.redirects;
      sum += b.sum;
      rated += b.rated;
    }
    const first = days[startIdx].date;
    const last = days[endIdx].date;
    points.unshift({
      label: shortFmt.format(step === 1 ? last : first),
      longLabel: step === 1 ? longFmt.format(last) : `${longFmt.format(first)} – ${longFmt.format(last)}`,
      isoDate: days[endIdx].key,
      feedback,
      redirects,
      total: feedback + redirects,
      avgRating: rated > 0 ? Math.round((sum / rated) * 10) / 10 : null,
    });
  }
  return points;
}

/** Busiest bucket, for the "En yoğun gün" hint; null when all zero. */
export function peakPoint(points: VolumePoint[]): VolumePoint | null {
  let best: VolumePoint | null = null;
  for (const p of points) if (p.total > (best?.total ?? 0)) best = p;
  return best;
}
