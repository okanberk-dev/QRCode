// lib/roi-calculator/constants.ts

export const PROJECTED_FUTURE_REVIEW_AVERAGE = 4.8;
export const REVIEW_RANGE_UPPER_MULTIPLIER = 1.35;
export const MAX_REVIEWS_NEEDED_CAP = 500;
export const MAX_LEAD_POTENTIAL_CAP = 200;

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_STEP = 0.1;

export const BUSINESS_TYPE_COEFFICIENTS = {
  restaurant: 0.035,
  cafe:       0.03,
  hotel:      0.025,
  clinic:     0.02,
  other:      0.02,
} as const;

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
export const VISIBILITY_THRESHOLD_MEDIUM = 0.35;
export const VISIBILITY_THRESHOLD_STRONG = 0.65;
