// src/lib/roi-calculator/calculations.ts
// Pure functions only. No React. No side effects.

import {
  BUSINESS_TYPE_COEFFICIENTS,
  LEAD_RANGE_HIGH_MULTIPLIER,
  LEAD_RANGE_LOW_MULTIPLIER,
  MAX_LEAD_POTENTIAL_CAP,
  MAX_REVIEWS_NEEDED_CAP,
  PROJECTED_FUTURE_REVIEW_AVERAGE,
  RATING_MAX,
  RATING_MIN,
  REVIEW_OPPORTUNITY_BASE,
  REVIEW_OPPORTUNITY_FACTOR,
  REVIEW_OPPORTUNITY_RATE_MAX,
  REVIEW_OPPORTUNITY_RATE_MIN,
  REVIEW_RANGE_UPPER_MULTIPLIER,
  VISIBILITY_MULTIPLIERS,
  VISIBILITY_THRESHOLD_MEDIUM,
  VISIBILITY_THRESHOLD_STRONG,
} from './constants';

import type {
  BusinessType,
  LeadPotential,
  ReviewsNeededResult,
  RoiInputs,
  VisibilityLevel,
} from '../../components/roi-calculator/roi-calculator.types';

// ─────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function sanitizeNumericInput(raw: string | number): number {
  const parsed = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

export function formatRange(min: number, max: number): string {
  return `${min}–${max}`;
}

// ─────────────────────────────────────────────
// Reviews needed
// ─────────────────────────────────────────────

export function calculateReviewsNeededRange(
  inputs: RoiInputs,
): ReviewsNeededResult {
  const { currentRating, currentReviews, targetRating } = inputs;

  // Target already met
  if (targetRating <= currentRating) return 'TARGET_MET';

  // Edge case: impossible target
  if (targetRating > RATING_MAX || currentRating < RATING_MIN) return 'TARGET_MET';

  const currentScoreTotal = currentRating * currentReviews;

  // Binary search for minimum n
  // targetScoreTotal(n) = (currentScoreTotal + n * AVG) / (currentReviews + n) >= targetRating
  // Solving analytically:
  // currentScoreTotal + n * AVG >= targetRating * (currentReviews + n)
  // n * (AVG - targetRating) >= targetRating * currentReviews - currentScoreTotal
  // n >= (targetRating * currentReviews - currentScoreTotal) / (AVG - targetRating)

  const numerator = targetRating * currentReviews - currentScoreTotal;
  const denominator = PROJECTED_FUTURE_REVIEW_AVERAGE - targetRating;

  // If denominator <= 0, target is unreachable with this average
  if (denominator <= 0) {
    return { min: MAX_REVIEWS_NEEDED_CAP, max: MAX_REVIEWS_NEEDED_CAP };
  }

  const rawMin = Math.ceil(numerator / denominator);

  if (rawMin <= 0) return 'TARGET_MET';

  const min = clampNumber(rawMin, 1, MAX_REVIEWS_NEEDED_CAP);
  const max = clampNumber(
    Math.ceil(min * REVIEW_RANGE_UPPER_MULTIPLIER),
    min + 1,
    MAX_REVIEWS_NEEDED_CAP,
  );

  return { min, max };
}

// ─────────────────────────────────────────────
// Visibility impact
// ─────────────────────────────────────────────

export function calculateVisibilityImpact(inputs: RoiInputs): VisibilityLevel {
  const { currentRating, currentReviews, monthlyCustomers, targetRating } = inputs;

  // Each sub-score normalised 0–1
  const ratingOpportunityScore = clampNumber(
    (RATING_MAX - currentRating) / (RATING_MAX - RATING_MIN),
    0, 1,
  );

  const reviewVolumeOpportunityScore = clampNumber(
    1 - Math.min(currentReviews, 500) / 500,
    0, 1,
  );

  const customerBaseScore = clampNumber(
    Math.min(monthlyCustomers, 1000) / 1000,
    0, 1,
  );

  const targetGapScore = clampNumber(
    (targetRating - currentRating) / (RATING_MAX - RATING_MIN),
    0, 1,
  );

  // Weighted average
  const combined =
    ratingOpportunityScore    * 0.30 +
    reviewVolumeOpportunityScore * 0.25 +
    customerBaseScore          * 0.25 +
    targetGapScore             * 0.20;

  if (combined >= VISIBILITY_THRESHOLD_STRONG) return 'strong';
  if (combined >= VISIBILITY_THRESHOLD_MEDIUM) return 'medium';
  return 'low';
}

// ─────────────────────────────────────────────
// Lead / profile interaction potential
// ─────────────────────────────────────────────

export function calculateLeadPotential(
  inputs: RoiInputs,
  visibility: VisibilityLevel,
): LeadPotential {
  const { monthlyCustomers, currentRating, businessType } = inputs;

  const reviewOpportunityRate = clampNumber(
    (RATING_MAX - currentRating) * REVIEW_OPPORTUNITY_FACTOR + REVIEW_OPPORTUNITY_BASE,
    REVIEW_OPPORTUNITY_RATE_MIN,
    REVIEW_OPPORTUNITY_RATE_MAX,
  );

  const potentialNewReviews = monthlyCustomers * reviewOpportunityRate;
  const visibilityMultiplier = VISIBILITY_MULTIPLIERS[visibility];
  const businessCoefficient  = BUSINESS_TYPE_COEFFICIENTS[businessType];

  const estimatedLeadBase = potentialNewReviews * visibilityMultiplier;
  const adjusted = estimatedLeadBase * (1 + businessCoefficient * 10);

  const min = clampNumber(Math.floor(adjusted * LEAD_RANGE_LOW_MULTIPLIER),  0, MAX_LEAD_POTENTIAL_CAP);
  const max = clampNumber(Math.ceil(adjusted  * LEAD_RANGE_HIGH_MULTIPLIER), min + 1, MAX_LEAD_POTENTIAL_CAP);

  return { min, max };
}

// ─────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────

export function computeRoiResults(inputs: RoiInputs) {
  const reviewsNeeded   = calculateReviewsNeededRange(inputs);
  const visibilityLevel = calculateVisibilityImpact(inputs);
  const leadPotential   = calculateLeadPotential(inputs, visibilityLevel);
  return { reviewsNeeded, visibilityLevel, leadPotential };
}
