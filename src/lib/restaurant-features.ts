export const RESTAURANT_FEATURE_SELECT = {
  id: true,
  googleReviewManagementEnabled: true,
  pulseAiEnabled: true,
  menuEnabled: true,
  menuPublished: true,
  aiAnalyticsEnabled: true,
  externalPlatformsEnabled: true,
  updatedAt: true,
} as const;

export const RESTAURANT_FEATURE_KEYS = [
  'googleReviewManagementEnabled',
  'pulseAiEnabled',
  'menuEnabled',
  'menuPublished',
  'aiAnalyticsEnabled',
  'externalPlatformsEnabled',
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
    'yemekSepetiEnabled',
    'getirEnabled',
    'trendyolEnabled',
    'tripAdvisorEnabled',
    'airbnbEnabled',
    'bookingEnabled',
    'yandexEnabled',
    'otherPlatformUrl',
    'otherPlatformLabel',
    'otherPlatformEnabled',
  ].includes(field);
}
