import type { PlatformId } from '@/components/marketing/PlatformLogo';

/**
 * The 10 public review platforms Buaze stores links for (CLAUDE.md §5,
 * src/lib/platform-redirect-resolver.ts). Buaze keeps the link and sends the
 * customer to the platform's own review page; it imports no reviews.
 * Brand colors are the platforms' own (§11 "dokunulmayan platform hex'leri").
 */
export type ReviewPlatformGroup = 'search' | 'delivery' | 'travel' | 'international';

export interface ReviewPlatform {
  key: string;
  name: string;
  color: string;
  logo: PlatformId;
  group: ReviewPlatformGroup;
}

export const REVIEW_PLATFORMS: readonly ReviewPlatform[] = [
  { key: 'google', name: 'Google', color: '#4285F4', logo: 'google', group: 'search' },
  { key: 'yandex', name: 'Yandex', color: '#FC3F1D', logo: 'yandex', group: 'search' },
  { key: 'foursquare', name: 'Foursquare', color: '#F94877', logo: 'foursquare', group: 'search' },
  { key: 'yemeksepeti', name: 'Yemeksepeti', color: '#FA0050', logo: 'yemeksepeti', group: 'delivery' },
  { key: 'getir', name: 'Getir', color: '#5D3EBC', logo: 'getir-yemek', group: 'delivery' },
  { key: 'trendyol_go', name: 'Trendyol GO', color: '#F27A1A', logo: 'trendyol-go', group: 'delivery' },
  { key: 'tripadvisor', name: 'Tripadvisor', color: '#34E0A1', logo: 'tripadvisor', group: 'travel' },
  { key: 'booking', name: 'Booking.com', color: '#003580', logo: 'booking', group: 'travel' },
  { key: 'airbnb', name: 'Airbnb', color: '#FF5A5F', logo: 'airbnb', group: 'travel' },
  { key: 'yelp', name: 'Yelp', color: '#FF1A1A', logo: 'yelp', group: 'international' },
] as const;

export const REVIEW_PLATFORM_COUNT = REVIEW_PLATFORMS.length;
