// "Buaze ile" card on the owner home (2026-11-28): what changed since the
// business started with Buaze. Pure (no Prisma), so the rules are tested in
// tests/since-buaze.test.ts.
//
// Rows (each only with enough data, never invented):
// - Google rating and Google review count: the Business Profile baseline
//   taken when the owner connected the location (§43 health snapshot, or
//   `Restaurant.initialGoogleRating`) against today's stored values. Places
//   data is never stored (§5.1.2), so Places-only businesses get no Google row.
// - QR rating average: the first 30 days after the first rating against the
//   last 30 days (both windows need 5+ ratings and must not overlap).
// - Ratings collected and customers sent to review pages, all time.
// A baseline younger than 14 days shows nothing for that row (§57).

export const MIN_BASELINE_AGE_DAYS = 14;
const DAY_MS = 86_400_000;
const QR_WINDOW_DAYS = 30;
const QR_MIN_RATINGS = 5;

export interface SinceBuazeInput {
  now: Date;
  /** First QR rating of the business (start of the Buaze history). */
  firstRatingAt: Date | null;
  google: {
    baseRating: number | null;
    baseCount: number | null;
    /** When the baseline was taken; null = connect time unknown. */
    baseAt: Date | null;
    currentRating: number | null;
    currentCount: number | null;
  } | null;
  qr: { firstAvg: number | null; firstCount: number; lastAvg: number | null; lastCount: number } | null;
  totals: { ratings: number; redirects: number };
}

export type SinceTone = 'up' | 'down' | 'flat';

export interface SinceRow {
  key: 'googleRating' | 'googleCount' | 'qrRating' | 'collected';
  label: string;
  /** "4,2 → 4,5" or a single value. */
  value: string;
  change: { text: string; tone: SinceTone } | null;
  sub: string;
}

export interface SinceBuazeView {
  /** "14 Mart 2026'dan beri" — from the earliest date shown. */
  since: string | null;
  rows: SinceRow[];
}

function fmtRating(v: number, isTr: boolean): string {
  const s = (Math.round(v * 10) / 10).toFixed(1);
  return isTr ? s.replace('.', ',') : s;
}

function fmtInt(v: number, isTr: boolean): string {
  return v.toLocaleString(isTr ? 'tr-TR' : 'en-US');
}

/** Percent change from `from` to `to`, rounded; null when `from` is 0. */
export function percentChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return Math.round(((to - from) / from) * 100);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Change pill for two ratings, worked out from the values the card shows
 * (one decimal), so "3,8 → 3,8" never says "−%2".
 */
function ratingPill(from: number, to: number, isTr: boolean): { text: string; tone: SinceTone } | null {
  const f = round1(from);
  const t = round1(to);
  if (f === t) return { text: isTr ? 'Değişim yok' : 'No change', tone: 'flat' };
  return pctPill(percentChange(f, t), isTr);
}

function pctPill(pct: number | null, isTr: boolean): { text: string; tone: SinceTone } | null {
  if (pct === null) return null;
  if (pct === 0) return { text: isTr ? 'Değişim yok' : 'No change', tone: 'flat' };
  const abs = Math.abs(pct);
  const num = isTr ? `%${abs}` : `${abs}%`;
  return { text: `${pct > 0 ? '+' : '−'}${num}`, tone: pct > 0 ? 'up' : 'down' };
}

function oldEnough(at: Date | null, now: Date): boolean {
  return at === null || now.getTime() - at.getTime() >= MIN_BASELINE_AGE_DAYS * DAY_MS;
}

function fmtDate(d: Date, isTr: boolean, timeZone?: string): string {
  return d.toLocaleDateString(isTr ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone });
}

export function buildSinceBuaze(input: SinceBuazeInput, isTr: boolean, timeZone?: string): SinceBuazeView | null {
  const rows: SinceRow[] = [];
  const dates: Date[] = [];
  const g = input.google;

  if (g && g.baseRating !== null && g.currentRating !== null && g.baseRating > 0 && oldEnough(g.baseAt, input.now)) {
    const from = g.baseRating;
    const to = g.currentRating;
    rows.push({
      key: 'googleRating',
      label: isTr ? 'Google puanı' : 'Google rating',
      value: `${fmtRating(from, isTr)} → ${fmtRating(to, isTr)}`,
      change: ratingPill(from, to, isTr),
      sub: isTr ? 'Google bağlantısından bugüne' : 'Since you connected Google',
    });
    if (g.baseAt) dates.push(g.baseAt);
  }

  if (g && g.baseCount !== null && g.currentCount !== null && oldEnough(g.baseAt, input.now) && g.currentCount >= g.baseCount) {
    const added = g.currentCount - g.baseCount;
    rows.push({
      key: 'googleCount',
      label: isTr ? 'Google yorum sayısı' : 'Google reviews',
      value: `${fmtInt(g.baseCount, isTr)} → ${fmtInt(g.currentCount, isTr)}`,
      change: g.baseCount > 0 ? pctPill(percentChange(g.baseCount, g.currentCount), isTr) : added > 0 ? { text: `+${fmtInt(added, isTr)}`, tone: 'up' } : null,
      sub: added > 0 ? (isTr ? `${fmtInt(added, isTr)} yeni Google yorumu` : `${fmtInt(added, isTr)} new Google reviews`) : isTr ? 'Yeni Google yorumu yok' : 'No new Google reviews',
    });
    if (g.baseAt) dates.push(g.baseAt);
  }

  const q = input.qr;
  const first = input.firstRatingAt;
  // The two 30-day windows must not overlap: 60+ days of history.
  if (
    q &&
    first &&
    input.now.getTime() - first.getTime() >= 2 * QR_WINDOW_DAYS * DAY_MS &&
    q.firstAvg !== null &&
    q.lastAvg !== null &&
    q.firstCount >= QR_MIN_RATINGS &&
    q.lastCount >= QR_MIN_RATINGS
  ) {
    rows.push({
      key: 'qrRating',
      label: isTr ? 'QR puan ortalaması' : 'QR rating average',
      value: `${fmtRating(q.firstAvg, isTr)} → ${fmtRating(q.lastAvg, isTr)}`,
      change: ratingPill(q.firstAvg, q.lastAvg, isTr),
      sub: isTr ? 'İlk 30 gün ile son 30 gün' : 'First 30 days vs last 30 days',
    });
  }

  if (input.totals.ratings > 0 && first && oldEnough(first, input.now)) {
    rows.push({
      key: 'collected',
      label: isTr ? 'Toplanan puan' : 'Ratings collected',
      value: fmtInt(input.totals.ratings, isTr),
      change: null,
      sub:
        input.totals.redirects > 0
          ? isTr
            ? `${fmtInt(input.totals.redirects, isTr)} müşteri yorum sayfasına gönderildi`
            : `${fmtInt(input.totals.redirects, isTr)} customers sent to a review page`
          : isTr
            ? 'QR ile gelen tüm puanlar'
            : 'Every rating from your QR codes',
    });
    dates.push(first);
  }

  if (rows.length === 0) return null;
  const earliest = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  return {
    since: earliest
      ? isTr
        ? `${fmtDate(earliest, true, timeZone)} tarihinden beri`
        : `Since ${fmtDate(earliest, false, timeZone)}`
      : null,
    rows,
  };
}
