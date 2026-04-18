// src/lib/roi-calculator/calculations.ts
// Pure functions only. No React. No side effects.

import {
  BUSINESS_TYPE_PROFILE_MULTIPLIERS,
  LEAD_BASE_MONTHLY_FACTOR,
  LEAD_RANGE_HIGH_MULTIPLIER,
  LEAD_RANGE_LOW_MULTIPLIER,
  LEAD_TO_CUSTOMER_CONVERSION_RATE,
  MAX_LEAD_POTENTIAL_CAP,
  MAX_PAYBACK_DAYS,
  MAX_REVENUE_CAP,
  MAX_REVIEWS_NEEDED_CAP,
  PLAN_COST_MONTHLY,
  PROJECTED_FUTURE_REVIEW_AVERAGE,
  RATING_MAX,
  RATING_MIN,
  REVIEW_RANGE_UPPER_MULTIPLIER,
  VISIBILITY_MULTIPLIERS,
  VISIBILITY_THRESHOLD_MEDIUM,
  VISIBILITY_THRESHOLD_STRONG,
} from './constants';

import type {
  LeadPotential,
  RevenuePotential,
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
  return `${min.toLocaleString('tr-TR')}–${max.toLocaleString('tr-TR')}`;
}

export function formatCurrencyRange(min: number, max: number, locale: 'tr' | 'en'): string {
  const sep = locale === 'tr' ? '.' : ',';
  const format = (n: number) =>
    Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const symbol = locale === 'tr' ? '₺' : '$';
  return `${symbol}${format(min)}–${symbol}${format(max)}`;
}

// ─────────────────────────────────────────────
// Reviews needed
// ─────────────────────────────────────────────

export function calculateReviewsNeededRange(
  inputs: RoiInputs,
): ReviewsNeededResult {
  const { currentRating, currentReviews, targetRating } = inputs;

  if (targetRating <= currentRating) return 'TARGET_MET';

  if (
    targetRating > RATING_MAX ||
    currentRating < RATING_MIN ||
    targetRating < RATING_MIN
  ) {
    return 'TARGET_MET';
  }

  if (currentReviews === 0) {
    if (targetRating > PROJECTED_FUTURE_REVIEW_AVERAGE) {
      return { min: MAX_REVIEWS_NEEDED_CAP, max: MAX_REVIEWS_NEEDED_CAP };
    }
    const min = 1;
    const max = Math.min(
      Math.ceil(min * REVIEW_RANGE_UPPER_MULTIPLIER),
      MAX_REVIEWS_NEEDED_CAP,
    );
    return { min, max };
  }

  // (currentScoreTotal + n * AVG) / (currentReviews + n) >= targetRating
  const currentScoreTotal = currentRating * currentReviews;
  const numerator    = targetRating * currentReviews - currentScoreTotal;
  const denominator  = PROJECTED_FUTURE_REVIEW_AVERAGE - targetRating;

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

  const combined =
    ratingOpportunityScore       * 0.35 +
    reviewVolumeOpportunityScore * 0.20 +
    customerBaseScore            * 0.30 +
    targetGapScore               * 0.15;

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
  const { monthlyCustomers, businessType } = inputs;

  if (monthlyCustomers === 0) return { min: 0, max: 1 };

  // Aylık müşteri havuzunun belirli yüzdesi potansiyel yeni müşteriye dönüşür
  const baseLeadPool = monthlyCustomers * LEAD_BASE_MONTHLY_FACTOR;

  // Görünürlük seviyesine göre çarpan
  const visibilityMultiplier = VISIBILITY_MULTIPLIERS[visibility];

  // İşletme türü bazlı arama niyeti çarpanı
  const profileMultiplier = BUSINESS_TYPE_PROFILE_MULTIPLIERS[businessType];

  const adjusted = baseLeadPool * visibilityMultiplier * profileMultiplier;

  const min = clampNumber(Math.floor(adjusted * LEAD_RANGE_LOW_MULTIPLIER),  1, MAX_LEAD_POTENTIAL_CAP);
  const max = clampNumber(Math.ceil(adjusted  * LEAD_RANGE_HIGH_MULTIPLIER), min + 1, MAX_LEAD_POTENTIAL_CAP);

  return { min, max };
}

// ─────────────────────────────────────────────
// Monthly revenue potential & payback period
// ─────────────────────────────────────────────

export function calculateRevenuePotential(
  leads: LeadPotential,
  avgCustomerValue: number,
): RevenuePotential {
  if (avgCustomerValue <= 0) return { min: 0, max: 0 };

  const revenueMin = leads.min * avgCustomerValue * LEAD_TO_CUSTOMER_CONVERSION_RATE;
  const revenueMax = leads.max * avgCustomerValue * LEAD_TO_CUSTOMER_CONVERSION_RATE;

  return {
    min: clampNumber(Math.round(revenueMin), 0, MAX_REVENUE_CAP),
    max: clampNumber(Math.round(revenueMax), 0, MAX_REVENUE_CAP),
  };
}

/**
 * Amorti süresini gün bazında hesaplar. Aylık ek ciro plan bedelinden
 * büyükse Buaze kendini 30 günden kısa sürede amorti eder.
 */
export function calculatePaybackDays(
  revenue: RevenuePotential,
  locale: 'tr' | 'en',
): { min: number; max: number } {
  const planCost = PLAN_COST_MONTHLY[locale];
  if (revenue.max <= 0) return { min: MAX_PAYBACK_DAYS, max: MAX_PAYBACK_DAYS };

  const minDays = Math.max(1, Math.ceil((planCost / revenue.max) * 30));
  const maxDays = Math.max(minDays, Math.ceil((planCost / Math.max(revenue.min, 1)) * 30));

  return {
    min: clampNumber(minDays, 1, MAX_PAYBACK_DAYS),
    max: clampNumber(maxDays, minDays, MAX_PAYBACK_DAYS),
  };
}

// ─────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────

export function computeRoiResults(inputs: RoiInputs, locale: 'tr' | 'en' = 'tr') {
  const reviewsNeeded   = calculateReviewsNeededRange(inputs);
  const visibilityLevel = calculateVisibilityImpact(inputs);
  const leadPotential   = calculateLeadPotential(inputs, visibilityLevel);
  const revenuePotential = calculateRevenuePotential(leadPotential, inputs.avgCustomerValue);
  const paybackDays     = calculatePaybackDays(revenuePotential, locale);

  return { reviewsNeeded, visibilityLevel, leadPotential, revenuePotential, paybackDays };
}
