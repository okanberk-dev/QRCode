export const PROJECTED_FUTURE_REVIEW_AVERAGE = 4.8;
export const REVIEW_RANGE_UPPER_MULTIPLIER = 1.35;

export const BUSINESS_TYPE_COEFFICIENTS = {
  restaurant: 0.035,
  cafe: 0.03,
  hotel: 0.025,
  clinic: 0.02,
  other: 0.02,
} as const;

export const VISIBILITY_MULTIPLIERS = {
  low: 0.08,
  medium: 0.14,
  strong: 0.22,
} as const;

export type BusinessType = keyof typeof BUSINESS_TYPE_COEFFICIENTS;
export type VisibilityLevel = keyof typeof VISIBILITY_MULTIPLIERS;
