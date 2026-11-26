export const RESTAURANT_FEATURE_SELECT = {
  id: true,
  googleReviewManagementEnabled: true,
  pulseAiEnabled: true,
  menuEnabled: true,
  menuPublished: true,
  aiAnalyticsEnabled: true,
  externalPlatformsEnabled: true,
  surveysEnabled: true,
  loyaltyEnabled: true,
  updatedAt: true,
} as const;

export const RESTAURANT_FEATURE_KEYS = [
  'googleReviewManagementEnabled',
  'pulseAiEnabled',
  'menuEnabled',
  'menuPublished',
  'aiAnalyticsEnabled',
  'externalPlatformsEnabled',
  // Admin master switch for the owner Surveys module (2026-10 owner↔admin
  // link). Default true — existing owners keep access.
  'surveysEnabled',
  // Loyalty card module (CLAUDE.md §60). Default true.
  'loyaltyEnabled',
] as const;

export type RestaurantFeatureKey = (typeof RESTAURANT_FEATURE_KEYS)[number];

export type RestaurantFeatureEntitlements = Record<RestaurantFeatureKey, boolean>;

export const EXTERNAL_REVIEW_PROVIDERS = [
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
  'airbnb',
  'booking',
  'yandex',
  // Stage 10 — Yelp + Foursquare resolver chain (CLAUDE.md §38.52 + §38.80).
  // Both are external review platforms gated by `externalPlatformsEnabled`
  // master flag (CLAUDE.md §5.2). When the flag is off, owner-saved Yelp /
  // Foursquare URLs are stripped from the public review surface payload and
  // the resolver skips both providers (parity with delivery + tripadvisor).
  'yelp',
  'foursquare',
] as const;

const EXTERNAL_REVIEW_PROVIDER_SET = new Set<string>(EXTERNAL_REVIEW_PROVIDERS);

export function isExternalReviewProvider(provider: string | null | undefined) {
  return Boolean(provider && EXTERNAL_REVIEW_PROVIDER_SET.has(provider));
}

export function isExternalPlatformField(field: string) {
  return [
    'yemekSepetiUrl',
    'getirYemekUrl',
    'trendyolYemekUrl',
    'tripAdvisorUrl',
    'airbnbUrl',
    'bookingUrl',
    'yandexUrl',
    'yelpUrl',
    'foursquareUrl',
    'yemekSepetiEnabled',
    'getirEnabled',
    'trendyolEnabled',
    'tripAdvisorEnabled',
    'airbnbEnabled',
    'bookingEnabled',
    'yandexEnabled',
    'yelpEnabled',
    'foursquareEnabled',
    'otherPlatformUrl',
    'otherPlatformLabel',
    'otherPlatformEnabled',
  ].includes(field);
}
