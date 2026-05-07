import type { PlatformId } from '@/components/ui';
import type { IntegrationProvider } from '@/lib/integration-domains';

export type ManagedPlatformCategory = 'review' | 'social' | 'message' | 'api';

export type PlatformUrlField =
  | 'googleReviewUrl'
  | 'yemekSepetiUrl'
  | 'getirYemekUrl'
  | 'trendyolYemekUrl'
  | 'tripAdvisorUrl'
  | 'airbnbUrl'
  | 'bookingUrl'
  | 'yandexUrl'
  | 'yelpUrl'
  | 'foursquareUrl'
  | 'instagramUrl'
  | 'facebookUrl'
  | 'whatsappUrl';

export type PlatformEnabledField =
  | 'googleEnabled'
  | 'yemekSepetiEnabled'
  | 'getirEnabled'
  | 'trendyolEnabled'
  | 'tripAdvisorEnabled'
  | 'airbnbEnabled'
  | 'bookingEnabled'
  | 'yandexEnabled'
  | 'yelpEnabled'
  | 'foursquareEnabled';

export interface ManagedPlatformDef {
  slug: string;
  provider: IntegrationProvider;
  name: string;
  category: ManagedPlatformCategory;
  categoryLabel: { tr: string; en: string };
  accent: string;
  initials: string;
  placeholder: string;
  uiPlatformId?: PlatformId;
  logoFile?: string;
  urlField?: PlatformUrlField;
  enabledField?: PlatformEnabledField;
  externalReview?: boolean;
  comingSoon?: boolean;
}

export type ManageablePlatformDef = ManagedPlatformDef & {
  urlField: PlatformUrlField;
  comingSoon?: false;
};

const MANAGED_PLATFORM_DEFS_INTERNAL = [
  {
    slug: 'google',
    provider: 'google',
    name: 'Google',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#4285F4',
    initials: 'G',
    placeholder: 'https://g.page/r/...',
    uiPlatformId: 'google',
    urlField: 'googleReviewUrl',
    enabledField: 'googleEnabled',
  },
  {
    slug: 'yemeksepeti',
    provider: 'yemeksepeti',
    name: 'Yemeksepeti',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#FA0050',
    initials: 'YS',
    placeholder: 'https://www.yemeksepeti.com/restaurant/...',
    uiPlatformId: 'yemeksepeti',
    urlField: 'yemekSepetiUrl',
    enabledField: 'yemekSepetiEnabled',
    externalReview: true,
  },
  {
    slug: 'getir',
    provider: 'getir',
    name: 'Getir Yemek',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#5D3EBC',
    initials: 'GT',
    placeholder: 'https://getir.com/yemek/restaurant/...',
    uiPlatformId: 'getir',
    urlField: 'getirYemekUrl',
    enabledField: 'getirEnabled',
    externalReview: true,
  },
  {
    slug: 'trendyol',
    provider: 'trendyol_go',
    name: 'Trendyol GO',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#F27A1A',
    initials: 'TY',
    placeholder: 'https://tgoapp.com/restaurant/...',
    uiPlatformId: 'trendyol',
    urlField: 'trendyolYemekUrl',
    enabledField: 'trendyolEnabled',
    externalReview: true,
  },
  {
    slug: 'tripadvisor',
    provider: 'tripadvisor',
    name: 'Tripadvisor',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#34E0A1',
    initials: 'TA',
    placeholder: 'https://www.tripadvisor.com/Restaurant_Review-...',
    uiPlatformId: 'tripadvisor',
    urlField: 'tripAdvisorUrl',
    enabledField: 'tripAdvisorEnabled',
    externalReview: true,
  },
  {
    slug: 'airbnb',
    provider: 'airbnb',
    name: 'Airbnb',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#FF5A5F',
    initials: 'AB',
    placeholder: 'https://www.airbnb.com/rooms/...',
    uiPlatformId: 'airbnb',
    urlField: 'airbnbUrl',
    enabledField: 'airbnbEnabled',
    externalReview: true,
  },
  {
    slug: 'booking',
    provider: 'booking',
    name: 'Booking',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#003580',
    initials: 'BK',
    placeholder: 'https://www.booking.com/hotel/tr/...',
    uiPlatformId: 'booking',
    urlField: 'bookingUrl',
    enabledField: 'bookingEnabled',
    externalReview: true,
  },
  {
    slug: 'yandex',
    provider: 'yandex',
    name: 'Yandex',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#FC3F1D',
    initials: 'YX',
    placeholder: 'https://yandex.com.tr/maps/org/...',
    uiPlatformId: 'yandex',
    urlField: 'yandexUrl',
    enabledField: 'yandexEnabled',
    externalReview: true,
  },
  {
    slug: 'yelp',
    provider: 'yelp',
    name: 'Yelp',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#D32323',
    initials: 'Y',
    placeholder: 'https://www.yelp.com/biz/...',
    uiPlatformId: 'yelp',
    urlField: 'yelpUrl',
    enabledField: 'yelpEnabled',
    externalReview: true,
  },
  {
    slug: 'foursquare',
    provider: 'foursquare',
    name: 'Foursquare',
    category: 'review',
    categoryLabel: { tr: 'Yorum', en: 'Review' },
    accent: '#F94877',
    initials: '4SQ',
    placeholder: 'https://foursquare.com/v/...',
    uiPlatformId: 'foursquare',
    urlField: 'foursquareUrl',
    enabledField: 'foursquareEnabled',
    externalReview: true,
  },
  {
    slug: 'instagram',
    provider: 'instagram',
    name: 'Instagram',
    category: 'social',
    categoryLabel: { tr: 'Sosyal', en: 'Social' },
    accent: '#E1306C',
    initials: 'IG',
    placeholder: 'https://instagram.com/isletmem',
    logoFile: 'instagram',
    urlField: 'instagramUrl',
  },
  {
    slug: 'facebook',
    provider: 'facebook',
    name: 'Facebook',
    category: 'social',
    categoryLabel: { tr: 'Sosyal', en: 'Social' },
    accent: '#1877F2',
    initials: 'FB',
    placeholder: 'https://facebook.com/isletmem',
    logoFile: 'facebook',
    urlField: 'facebookUrl',
  },
  {
    slug: 'whatsapp',
    provider: 'whatsapp',
    name: 'WhatsApp',
    category: 'message',
    categoryLabel: { tr: 'Mesaj', en: 'Message' },
    accent: '#25D366',
    initials: 'WA',
    placeholder: 'https://wa.me/905551112233',
    logoFile: 'whatsapp',
    urlField: 'whatsappUrl',
  },
  {
    slug: 'webhook',
    provider: 'other',
    name: 'Webhook',
    category: 'api',
    categoryLabel: { tr: 'API', en: 'API' },
    accent: '#525252',
    initials: 'WH',
    placeholder: '',
    comingSoon: true,
  },
] as const satisfies readonly ManagedPlatformDef[];

export const MANAGED_PLATFORM_DEFS: readonly ManagedPlatformDef[] = MANAGED_PLATFORM_DEFS_INTERNAL;

function isManageablePlatform(platform: ManagedPlatformDef): platform is ManageablePlatformDef {
  return Boolean(platform.urlField) && !platform.comingSoon;
}

export const MANAGEABLE_PLATFORM_DEFS: readonly ManageablePlatformDef[] =
  MANAGED_PLATFORM_DEFS.filter(isManageablePlatform);

export const MANAGED_REVIEW_PLATFORMS: readonly ManageablePlatformDef[] =
  MANAGED_PLATFORM_DEFS.filter(
    (platform): platform is ManageablePlatformDef =>
      isManageablePlatform(platform) && platform.category === 'review',
  );

export const MANAGED_SOCIAL_PLATFORMS: readonly ManageablePlatformDef[] =
  MANAGED_PLATFORM_DEFS.filter(
    (platform): platform is ManageablePlatformDef =>
      isManageablePlatform(platform) &&
      (platform.category === 'social' || platform.category === 'message'),
  );

export function getManagedPlatform(slug: string | null | undefined) {
  return MANAGED_PLATFORM_DEFS.find((platform) => platform.slug === slug);
}

export function getManageablePlatform(slug: string | null | undefined) {
  const platform = getManagedPlatform(slug);
  return platform && isManageablePlatform(platform) ? platform : null;
}
