// lib/roi-calculator/constants.ts

export const PROJECTED_FUTURE_REVIEW_AVERAGE = 4.8;
export const REVIEW_RANGE_UPPER_MULTIPLIER = 1.35;
export const MAX_REVIEWS_NEEDED_CAP = 500;
export const MAX_LEAD_POTENTIAL_CAP = 200;

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_STEP = 0.1;

export const BUSINESS_TYPE_PROFILE_MULTIPLIERS = {
  restaurant: 1.8,   // high foot traffic, high search intent
  cafe:        1.5,
  hotel:       1.3,  // longer decision cycle, fewer searches
  clinic:      1.2,
  other:       1.0,
} as const;

export const LEAD_BASE_MONTHLY_FACTOR = 0.05; // 5% of monthly customers = base lead pool

export const VISIBILITY_MULTIPLIERS = {
  low:    0.08,
  medium: 0.14,
  strong: 0.22,
} as const;

export const REVIEW_OPPORTUNITY_RATE_MIN = 0.04;
export const REVIEW_OPPORTUNITY_RATE_MAX = 0.18;
export const REVIEW_OPPORTUNITY_BASE     = 0.03;
export const REVIEW_OPPORTUNITY_FACTOR   = 0.04;

export const LEAD_RANGE_LOW_MULTIPLIER  = 0.8;
export const LEAD_RANGE_HIGH_MULTIPLIER = 1.4;

// Visibility score thresholds (0–1 normalised)
export const VISIBILITY_THRESHOLD_MEDIUM = 0.22;
export const VISIBILITY_THRESHOLD_STRONG = 0.48;
