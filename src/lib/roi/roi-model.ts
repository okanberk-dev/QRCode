/**
 * ROI calculator model — pure, dependency-free, shared by the /roi calculator
 * (client) and the report pipeline (/api/roi/save → e-mail + PDF).
 *
 * Honest by construction (marketing spec D9): every number comes from the
 * visitor's own inputs. The defaults are only starting values the visitor is
 * told to replace; they are not Buaze customer data or research. The model
 * values one thing that Buaze measurably changes — the time spent writing
 * replies (Pulse AI drafts) — and compares it with the plan price. It does
 * NOT model rating changes, ranking, revenue from extra reviews or anything
 * about low ratings staying off public platforms.
 */

export interface RoiInputs {
  /** Customers served per month. */
  monthlyCustomers: number;
  /** Share of customers who scan the QR code and leave a rating (%). */
  ratingRatePct: number;
  /** Share of ratings you want to answer (%). */
  replySharePct: number;
  /** Minutes to write a reply from scratch. */
  minutesManual: number;
  /** Minutes to review and send a Pulse AI draft. */
  minutesWithDraft: number;
  /** Cost of one working hour (USD). */
  hourlyCostUsd: number;
  /** Monthly Buaze price (USD); null when no plan is selected. */
  planMonthlyUsd: number | null;
}

export interface RoiResult {
  ratingsPerMonth: number;
  repliesPerMonth: number;
  /** Hours per month writing every reply by hand. */
  hoursManual: number;
  /** Hours per month for the same replies with Pulse AI drafts. */
  hoursWithDrafts: number;
  hoursSaved: number;
  /** Monthly value of the hours saved (USD). */
  timeValueUsd: number;
  planMonthlyUsd: number | null;
  /** timeValue − plan price per month; null without a plan price. */
  monthlyDifferenceUsd: number | null;
  yearlyDifferenceUsd: number | null;
  /** Share of ratings you answer today (= replySharePct). */
  coverageNowPct: number;
  /** Share you could answer with drafts in the time you spend today. */
  coverageSameTimePct: number;
}

export const ROI_LIMITS = {
  monthlyCustomers: { min: 100, max: 20000, step: 100 },
  ratingRatePct: { min: 1, max: 30, step: 1 },
  replySharePct: { min: 10, max: 100, step: 5 },
  minutesManual: { min: 1, max: 20, step: 1 },
  minutesWithDraft: { min: 1, max: 20, step: 1 },
  hourlyCostUsd: { min: 1, max: 100, step: 1 },
  planMonthlyUsd: { min: 0, max: 100000, step: 1 },
} as const;

/** Starting values shown in the calculator; the visitor replaces them. */
export const ROI_DEFAULTS: Record<'tr' | 'en', Omit<RoiInputs, 'planMonthlyUsd'>> = {
  tr: {
    monthlyCustomers: 1500,
    ratingRatePct: 5,
    replySharePct: 40,
    minutesManual: 5,
    minutesWithDraft: 2,
    hourlyCostUsd: 6,
  },
  en: {
    monthlyCustomers: 1500,
    ratingRatePct: 5,
    replySharePct: 40,
    minutesManual: 5,
    minutesWithDraft: 2,
    hourlyCostUsd: 20,
  },
};

export const ROI_SECTORS = ['restaurant', 'cafe', 'hotel', 'clinic', 'other'] as const;
export type RoiSector = (typeof ROI_SECTORS)[number];

export const ROI_SECTOR_LABELS: Record<'tr' | 'en', Record<RoiSector, string>> = {
  tr: { restaurant: 'Restoran', cafe: 'Kafe', hotel: 'Otel', clinic: 'Klinik', other: 'Diğer' },
  en: { restaurant: 'Restaurant', cafe: 'Cafe', hotel: 'Hotel', clinic: 'Clinic', other: 'Other' },
};

export function isRoiSector(value: unknown): value is RoiSector {
  return typeof value === 'string' && (ROI_SECTORS as readonly string[]).includes(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Coerce untrusted input (form state, request body) into valid inputs:
 * out-of-range values are clamped, garbage falls back to the defaults, and
 * the draft time can never exceed the manual time.
 */
export function normalizeRoiInputs(
  raw: Partial<Record<keyof RoiInputs, unknown>>,
  locale: 'tr' | 'en' = 'tr',
): RoiInputs {
  const d = ROI_DEFAULTS[locale];
  const L = ROI_LIMITS;
  const minutesManual = Math.round(clampNumber(raw.minutesManual, L.minutesManual.min, L.minutesManual.max, d.minutesManual));
  const minutesWithDraft = Math.min(
    minutesManual,
    Math.round(clampNumber(raw.minutesWithDraft, L.minutesWithDraft.min, L.minutesWithDraft.max, d.minutesWithDraft)),
  );
  const planRaw = raw.planMonthlyUsd;
  const planMonthlyUsd =
    planRaw === null || planRaw === undefined || planRaw === ''
      ? null
      : Math.round(clampNumber(planRaw, L.planMonthlyUsd.min, L.planMonthlyUsd.max, NaN) * 100) / 100;
  return {
    monthlyCustomers: Math.round(
      clampNumber(raw.monthlyCustomers, L.monthlyCustomers.min, L.monthlyCustomers.max, d.monthlyCustomers),
    ),
    ratingRatePct: clampNumber(raw.ratingRatePct, L.ratingRatePct.min, L.ratingRatePct.max, d.ratingRatePct),
    replySharePct: clampNumber(raw.replySharePct, L.replySharePct.min, L.replySharePct.max, d.replySharePct),
    minutesManual,
    minutesWithDraft,
    hourlyCostUsd: clampNumber(raw.hourlyCostUsd, L.hourlyCostUsd.min, L.hourlyCostUsd.max, d.hourlyCostUsd),
    planMonthlyUsd: planMonthlyUsd !== null && Number.isFinite(planMonthlyUsd) ? planMonthlyUsd : null,
  };
}

export function computeRoi(inputs: RoiInputs): RoiResult {
  const ratingsPerMonth = Math.round((inputs.monthlyCustomers * inputs.ratingRatePct) / 100);
  const repliesPerMonth = Math.round((ratingsPerMonth * inputs.replySharePct) / 100);
  const minutesManualTotal = repliesPerMonth * inputs.minutesManual;
  const minutesDraftTotal = repliesPerMonth * inputs.minutesWithDraft;
  const hoursManual = round1(minutesManualTotal / 60);
  const hoursWithDrafts = round1(minutesDraftTotal / 60);
  const hoursSaved = round1(Math.max(0, minutesManualTotal - minutesDraftTotal) / 60);
  const timeValueUsd = Math.round(hoursSaved * inputs.hourlyCostUsd);
  const plan = inputs.planMonthlyUsd;
  const monthlyDifferenceUsd = plan === null ? null : Math.round(timeValueUsd - plan);
  const yearlyDifferenceUsd = monthlyDifferenceUsd === null ? null : monthlyDifferenceUsd * 12;

  const coverageNowPct = Math.round(inputs.replySharePct);
  // Replies you could send with drafts in the minutes you spend today.
  const repliesSameTime =
    inputs.minutesWithDraft > 0 ? Math.floor(minutesManualTotal / inputs.minutesWithDraft) : repliesPerMonth;
  const coverageSameTimePct =
    ratingsPerMonth > 0 ? Math.min(100, Math.round((repliesSameTime / ratingsPerMonth) * 100)) : coverageNowPct;

  return {
    ratingsPerMonth,
    repliesPerMonth,
    hoursManual,
    hoursWithDrafts,
    hoursSaved,
    timeValueUsd,
    planMonthlyUsd: plan,
    monthlyDifferenceUsd,
    yearlyDifferenceUsd,
    coverageNowPct,
    coverageSameTimePct: Math.max(coverageNowPct, coverageSameTimePct),
  };
}

/** "$1,250" / "−$40" — USD in both locales (CLAUDE.md §15.2). */
export function formatUsd(value: number, opts: { signed?: boolean } = {}): string {
  const abs = Math.abs(Math.round(value)).toLocaleString('en-US');
  if (value < 0) return `−$${abs}`;
  if (opts.signed && value > 0) return `+$${abs}`;
  return `$${abs}`;
}

/** "3,5" (TR) / "3.5" (EN). */
export function formatHours(value: number, locale: 'tr' | 'en'): string {
  return value.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}
