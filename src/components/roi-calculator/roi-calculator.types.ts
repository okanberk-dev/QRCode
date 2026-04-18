// src/components/roi-calculator/roi-calculator.types.ts

export type BusinessType = 'restaurant' | 'cafe' | 'hotel' | 'clinic' | 'other';
export type VisibilityLevel = 'low' | 'medium' | 'strong';

export interface RoiInputs {
  monthlyCustomers: number;
  currentRating:    number;
  currentReviews:   number;
  targetRating:     number;
  avgCustomerValue: number;
  businessType:     BusinessType;
}

export interface ReviewRange {
  min: number;
  max: number;
}

export type ReviewsNeededResult = ReviewRange | 'TARGET_MET';

export interface LeadPotential {
  min: number;
  max: number;
}

export interface RevenuePotential {
  min: number;
  max: number;
}

export type PaybackDaysResult = { min: number; max: number };

export interface RoiResults {
  reviewsNeeded:     ReviewsNeededResult;
  visibilityLevel:   VisibilityLevel;
  leadPotential:     LeadPotential;
  revenuePotential:  RevenuePotential;
  paybackDays:       PaybackDaysResult;
}

// Raw string form values before parsing
export interface RoiFormValues {
  monthlyCustomers: string;
  currentRating:    string;
  currentReviews:   string;
  targetRating:     string;
  avgCustomerValue: string;
  businessType:     BusinessType;
}
