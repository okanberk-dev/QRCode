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
};
