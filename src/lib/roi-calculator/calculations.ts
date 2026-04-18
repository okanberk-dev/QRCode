// src/lib/roi-calculator/calculations.ts
// Pure functions only. No React. No side effects.

import {
  BUSINESS_TYPE_PROFILE_MULTIPLIERS,
  LEAD_BASE_MONTHLY_FACTOR,
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
  RoiInputs,
  VisibilityLevel,
  ReviewsNeededResult,
  LeadPotential,
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

  // Target already met or exceeded
  if (targetRating <= currentRating) return 'TARGET_MET';

  // Guard: impossible rating values
  if (
    targetRating > RATING_MAX ||
    currentRating < RATING_MIN ||
    targetRating < RATING_MIN
  ) {
    return 'TARGET_MET';
  }

  // When currentReviews = 0, solve directly:
  // All new reviews come in at PROJECTED_FUTURE_REVIEW_AVERAGE.
  // We need enough of them so the average >= targetRating.
  if (currentReviews === 0) {
    if (targetRating > PROJECTED_FUTURE_REVIEW_AVERAGE) {
      // Target is unreachable with our projected average
      return { min: MAX_REVIEWS_NEEDED_CAP, max: MAX_REVIEWS_NEEDED_CAP };
    }
    // Any positive number of reviews gets us there
    const min = 1;
    const max = Math.min(
      Math.ceil(min * REVIEW_RANGE_UPPER_MULTIPLIER),
      MAX_REVIEWS_NEEDED_CAP,
    );
    return { min, max };
  }

  // General case (currentReviews > 0):
  // Solve analytically:
  // (currentScoreTotal + n * AVG) / (currentReviews + n) >= targetRating
  // n * (AVG - targetRating) >= targetRating * currentReviews - currentScoreTotal
  // n >= numerator / denominator

  const currentScoreTotal = currentRating * currentReviews;
  const numerator    = targetRating * currentReviews - currentScoreTotal;
  const denominator  = PROJECTED_FUTURE_REVIEW_AVERAGE - targetRating;

  // denominator <= 0 means target is unreachable (target >= projected average)
  if (denominator <= 0) {
    return { min: MAX_REVIEWS_NEEDED_CAP, max: MAX_REVIEWS_NEEDED_CAP };
  }

  const rawMin = Math.ceil(numerator / denominator);

  // rawMin <= 0 means target already met (shouldn't reach here but guard anyway)
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

  // Weighted average — rebalanced per user request
  const combined =
    ratingOpportunityScore       * 0.35 +  // rating gap is most important
    reviewVolumeOpportunityScore * 0.20 +  // current review count
    customerBaseScore            * 0.30 +  // customer volume (bigger pool = more impact)
    targetGapScore               * 0.15;   // ambition level

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

  if (monthlyCustomers === 0) return { min: 0, max: 1 };

  // Step 1: review opportunity rate — how likely a customer is to leave a review
  // given the current rating and our platform nudge
  const reviewOpportunityRate = clampNumber(
    (RATING_MAX - currentRating) * REVIEW_OPPORTUNITY_FACTOR + REVIEW_OPPORTUNITY_BASE,
    REVIEW_OPPORTUNITY_RATE_MIN,
    REVIEW_OPPORTUNITY_RATE_MAX,
  );

  // Step 2: base interaction pool from monthly customers
  const baseLeadPool = monthlyCustomers * LEAD_BASE_MONTHLY_FACTOR;

  // Step 3: scale by visibility level
  const visibilityMultiplier = VISIBILITY_MULTIPLIERS[visibility];

  // Step 4: scale by review activity (more reviews → more profile visits)
  const reviewActivityBoost = 1 + reviewOpportunityRate * 2;

  // Step 5: business type profile multiplier
  const profileMultiplier = BUSINESS_TYPE_PROFILE_MULTIPLIERS[businessType];

  const adjusted = baseLeadPool * visibilityMultiplier * reviewActivityBoost * profileMultiplier;

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
