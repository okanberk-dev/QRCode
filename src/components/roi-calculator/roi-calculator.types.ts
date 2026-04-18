import { BusinessType, VisibilityLevel } from '@/lib/roi-calculator/constants';

export interface RoiCalculatorInputs {
  monthlyCustomers: number;
  currentRating: number;
  currentReviews: number;
  targetRating: number;
  businessType: BusinessType;
}

export interface RoiCalculatorResults {
  reviewsNeeded: { min: number; max: number } | "TARGET_MET";
  visibilityImpact: VisibilityLevel;
  leadPotential: { min: number; max: number };
}
