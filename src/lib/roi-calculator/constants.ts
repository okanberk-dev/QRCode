// lib/roi-calculator/constants.ts
// ROI hesaplamalarında kullanılan sabitler.
// Tüm katsayılar sektör benchmarks + Buaze müşteri verilerine göre kalibre edilmiştir.

export const PROJECTED_FUTURE_REVIEW_AVERAGE = 4.8;
export const REVIEW_RANGE_UPPER_MULTIPLIER = 1.35;
export const MAX_REVIEWS_NEEDED_CAP = 500;
export const MAX_LEAD_POTENTIAL_CAP = 400;
export const MAX_REVENUE_CAP = 500_000;
export const MAX_PAYBACK_DAYS = 365;

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_STEP = 0.1;

// ─── Buaze Starter plan fiyatları (aylık) ────────────────────────────────────
export const PLAN_COST_MONTHLY = {
  tr: 500,    // ₺500/ay
  en: 10,     // $10/mo
} as const;

// Varsayılan ortalama müşteri değeri (sektöre göre)
export const DEFAULT_AVG_CUSTOMER_VALUE = {
  tr: {
    restaurant: 350,
    cafe:       150,
    hotel:      2500,
    clinic:     1500,
    other:      500,
  },
  en: {
    restaurant: 25,
    cafe:       10,
    hotel:      180,
    clinic:     120,
    other:      40,
  },
} as const;

// Yeni lead'in gerçek müşteriye dönüşüm oranı (Google yorum araştırmaları: %18–28)
export const LEAD_TO_CUSTOMER_CONVERSION_RATE = 0.22;

// ─── Lead potansiyeli ────────────────────────────────────────────────────────
export const BUSINESS_TYPE_PROFILE_MULTIPLIERS = {
  restaurant: 1.8,   // yüksek yaya trafiği, yüksek arama niyeti
  cafe:        1.5,
  hotel:       1.3,  // daha uzun karar süreci, daha az arama
  clinic:      1.2,
  other:       1.0,
} as const;

// Aylık müşterinin %10'u potansiyel Google profili ziyaretine dönüşür (baz havuz)
export const LEAD_BASE_MONTHLY_FACTOR = 0.10;

// Görünürlük seviyesi bazlı profil ziyaret ↔ lead dönüşüm çarpanı
export const VISIBILITY_MULTIPLIERS = {
  low:    0.20,
  medium: 0.40,
  strong: 0.65,
} as const;

export const LEAD_RANGE_LOW_MULTIPLIER  = 0.8;
export const LEAD_RANGE_HIGH_MULTIPLIER = 1.35;

// Visibility score thresholds (0–1 normalised)
export const VISIBILITY_THRESHOLD_MEDIUM = 0.22;
export const VISIBILITY_THRESHOLD_STRONG = 0.48;
