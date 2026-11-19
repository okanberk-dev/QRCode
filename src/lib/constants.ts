/**
 * System-generated feedback comments and marker strings.
 * Centralizing these helps avoid magic string errors and simplifies maintenance.
 */
export const SYSTEM_FEEDBACK = {
  /** 
   * Used when a user gives 4-5 stars and is redirected to a public review platform.
   * This marker helps distinguish between manual comments and automatic redirects in stats.
   */
  HIGH_RATING_REDIRECT: 'High Rating Redirect',
} as const;

/**
 * Type-safe feedback comment types
 */
export type SystemFeedbackType = typeof SYSTEM_FEEDBACK[keyof typeof SYSTEM_FEEDBACK];

/**
 * Monthly feedback-ingest quota per plan.
 * `enterprise` is effectively unlimited; we expose a high ceiling so
 * the UI progress bar stays sensible without special-casing Infinity.
 */
export const PLAN_QUOTA: Record<string, number> = {
  trial: 500,
  monthly: 2000,
  yearly: 50000,
  enterprise: 999999,
};

/**
 * §38.51 — AI yanıt (FeedbackReply.source='ai_copilot') aylık quota per plan.
 * Tasarım kaynağı: .design-owner-2026/page-account.jsx Plan widget "AI yanıt
 * / ay" progress bar (Growth=2000). Pulse AI Co-Pilot maliyeti kontrol eder.
 */
export const PLAN_QUOTA_AI_REPLIES: Record<string, number> = {
  trial: 500,
  monthly: 2000,
  yearly: 5000,
  enterprise: 999999,
};

export const PLAN_LABELS: Record<string, { tr: string; en: string }> = {
  trial: { tr: 'Deneme', en: 'Trial' },
  monthly: { tr: 'Aylık', en: 'Monthly' },
  yearly: { tr: 'Yıllık', en: 'Yearly' },
  enterprise: { tr: 'Kurumsal', en: 'Enterprise' },
  expired: { tr: 'Süresi doldu', en: 'Expired' },
};

/**
 * Public review flow — minimum star rating that is offered the public
 * platform link. Ratings below it land in the business's own feedback form
 * first (the customer always keeps the right to post publicly wherever they
 * want — CLAUDE.md §19.1.1).
 *
 * Owner-configurable per restaurant via `Restaurant.redirectMinRating`.
 * Default 5 → only 5-star customers are handed the platform link.
 */
export const REDIRECT_MIN_RATING_OPTIONS = [4, 5] as const;

export type RedirectMinRating = (typeof REDIRECT_MIN_RATING_OPTIONS)[number];

export const DEFAULT_REDIRECT_MIN_RATING: RedirectMinRating = 5;

/**
 * Coerce any stored / submitted value to a supported threshold. Anything that
 * is not exactly 4 falls back to the default (5) — including null, undefined,
 * strings and out-of-range numbers — so a drifted DB row or a hand-crafted
 * request can never widen the public-platform funnel.
 */
export function normalizeRedirectMinRating(value: unknown): RedirectMinRating {
  return value === 4 ? 4 : DEFAULT_REDIRECT_MIN_RATING;
}
