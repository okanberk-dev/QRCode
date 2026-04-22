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
