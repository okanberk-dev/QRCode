// Dashboard home: several feedback counts (plus the activation QR count and
// the failing Google link check) are read in ONE raw SQL statement
// (COUNT(*) FILTER / scalar sub-selects) instead of one round trip each. This
// module maps that row to the numbers the page renders. Pure, no imports, so
// tests can pin the mapping (tests/dashboard-home-feedback-stats.test.ts).

/** Column names of the raw stats row (snake_case, as Postgres returns them). */
export interface HomeFeedbackStatsRow {
  /** rating <= 3 AND created_at >= scope start (Response rate denominator). */
  low_rated_in_scope: bigint | number | null;
  /** …of those, with at least one reply (Response rate numerator). */
  low_rated_replied_in_scope: bigint | number | null;
  /** rating <= 3 with no reply, all time (pending "reply" task). */
  unreplied_count: bigint | number | null;
  /** Oldest of those (pending task relative time). NULL when none. */
  oldest_unreplied_at: Date | null;
  /** Distinct consented contacts that left a review in the scope window. */
  new_customers: bigint | number | null;
  /** Contacts with >= 2 visits whose last visit is 30+ days ago. */
  churned_customers: bigint | number | null;
  /** QR codes generated for the activation-checklist business. */
  activation_qr_count: bigint | number | null;
  /** Newest failing Google link check in the last 24 h; NULL when none. */
  google_failing_check_at: Date | null;
}

export interface HomeFeedbackStats {
  lowRatedInScope: number;
  lowRatedRepliedInScope: number;
  unrepliedCount: number;
  oldestUnrepliedAt: Date | null;
  newCustomers: number;
  churnedCustomers: number;
  activationQrCount: number;
  googleFailingCheckAt: Date | null;
}

function toCount(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

/**
 * `row` is undefined when the account has no business in scope (the page
 * then runs a `WHERE FALSE` stub): every count is 0 and there is no oldest
 * unreplied review — the same values the separate Prisma queries returned
 * for an empty `restaurantId IN ()` filter.
 */
export function mapHomeFeedbackStats(row: HomeFeedbackStatsRow | undefined): HomeFeedbackStats {
  return {
    lowRatedInScope: toCount(row?.low_rated_in_scope),
    lowRatedRepliedInScope: toCount(row?.low_rated_replied_in_scope),
    unrepliedCount: toCount(row?.unreplied_count),
    oldestUnrepliedAt: row?.oldest_unreplied_at ?? null,
    newCustomers: toCount(row?.new_customers),
    churnedCustomers: toCount(row?.churned_customers),
    activationQrCount: toCount(row?.activation_qr_count),
    googleFailingCheckAt: row?.google_failing_check_at ?? null,
  };
}
