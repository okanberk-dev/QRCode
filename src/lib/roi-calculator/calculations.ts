import {
  PROJECTED_FUTURE_REVIEW_AVERAGE,
  REVIEW_RANGE_UPPER_MULTIPLIER,
  BUSINESS_TYPE_COEFFICIENTS,
  VISIBILITY_MULTIPLIERS,
  BusinessType,
  VisibilityLevel,
} from './constants';

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function sanitizeNumericInput(raw: any): number {
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) return 0;
  return Math.max(0, parsed);
}

export interface RoiInputs {
  monthlyCustomers: number;
  currentRating: number;
  currentReviews: number;
  targetRating: number;
  businessType: BusinessType;
}

export function calculateReviewsNeededRange(inputs: RoiInputs): { min: number, max: number } | "TARGET_MET" {
  if (inputs.targetRating <= inputs.currentRating) {
    return "TARGET_MET";
  }

  const currentScoreTotal = inputs.currentRating * inputs.currentReviews;
  
  // Find minimum n where (currentScoreTotal + n * FUTURE_AVG) / (currentReviews + n) >= targetRating
  // (currentScoreTotal + n * FUTURE_AVG) >= targetRating * currentReviews + targetRating * n
  // n * FUTURE_AVG - n * targetRating >= targetRating * currentReviews - currentScoreTotal
  // n * (FUTURE_AVG - targetRating) >= targetRating * currentReviews - currentScoreTotal
  // n >= (targetRating * currentReviews - currentScoreTotal) / (FUTURE_AVG - targetRating)

  if (inputs.currentReviews === 0) {
    return { min: 1, max: 2 }; // Need at least 1 review to have a rating
  }

  const denominator = PROJECTED_FUTURE_REVIEW_AVERAGE - inputs.targetRating;
  if (denominator <= 0) {
    return { min: 50, max: 75 }; 
  }

  const min = Math.ceil((inputs.targetRating * inputs.currentReviews - currentScoreTotal) / denominator);
  const clampedMin = Math.max(1, min);
  const max = Math.ceil(clampedMin * REVIEW_RANGE_UPPER_MULTIPLIER);

  return { min: clampedMin, max: Math.min(max, 1000) }; // Clamp to sensible upper bound
}

export function calculateVisibilityImpact(inputs: RoiInputs): VisibilityLevel {
  const ratingGap = inputs.targetRating - inputs.currentRating;
  
  // Normalised score logic
  // 1. Rating Opportunity: Gap between 5 and current
  const ratingOpp = (5 - inputs.currentRating) / 4; // 0 to 1
  
  // 2. Review Volume Opportunity: Having few reviews means more impact per new review
  const volumeOpp = inputs.currentReviews < 50 ? 0.8 : inputs.currentReviews < 200 ? 0.5 : 0.2;
  
  // 3. Customer Base: High volume means more people see the improved rating
  const baseOpp = Math.min(inputs.monthlyCustomers / 1000, 1);

  const combined = (ratingOpp * 0.4) + (volumeOpp * 0.3) + (baseOpp * 0.3);

  if (combined > 0.6) return 'strong';
  if (combined > 0.3) return 'medium';
  return 'low';
}

export function calculateLeadPotential(inputs: RoiInputs, visibility: VisibilityLevel): { min: number, max: number } {
  // reviewOpportunityRate = clamp((5 − currentRating) × 0.04 + 0.03, 0.04, 0.18)
  const reviewOpportunityRate = clampNumber((5 - inputs.currentRating) * 0.04 + 0.03, 0.04, 0.18);
  
  // potentialNewReviews = monthlyCustomers × reviewOpportunityRate
  const potentialNewReviews = inputs.monthlyCustomers * reviewOpportunityRate;
  
  // estimatedLeadBase = potentialNewReviews × VISIBILITY_MULTIPLIERS[visibility]
  const estimatedLeadBase = potentialNewReviews * VISIBILITY_MULTIPLIERS[visibility];
  
  // Apply BUSINESS_TYPE_COEFFICIENTS[businessType] once
  const adjusted = estimatedLeadBase * (BUSINESS_TYPE_COEFFICIENTS[inputs.businessType] || 0.02) * 100; // Multiplied by 100 for "Interactions" scale
  
  const min = Math.floor(adjusted * 0.8);
  const max = Math.ceil(adjusted * 1.4);

  // Clamp final range to realistic values
  return { 
    min: Math.max(0, min), 
    max: Math.max(0, max) 
  };
}

export function formatRange(min: number, max: number): string {
  if (min === max) return `${min}`;
  return `${min}–${max}`;
}
