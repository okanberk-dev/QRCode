import { PLATFORMS, type PlatformId } from '@/components/ui';

/**
 * Shared display helpers for the review inboxes (owner
 * `/[locale]/dashboard/feedbacks` + admin `/admin/reviews`).
 *
 * Platform values are the *storage* ids written to `Feedback.platform`
 * (`google`, `yemeksepeti`, `getir`, `trendyol_go`, …). A `null` platform is
 * a review collected on Buaze's own QR form. Never `toUpperCase()` a storage
 * key for display — that produced "YEMEKSEPETI" (dotless I) and
 * "TRENDYOL_GO" in the old inbox.
 */

/** Filter ids offered by the inbox toolbar (storage ids + `buaze_qr`). */
export const INBOX_PLATFORM_FILTER_IDS = [
  'google',
  'buaze_qr',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
  'booking',
  'airbnb',
  'yandex',
  'yelp',
  'foursquare',
] as const;

export type InboxPlatformFilterId = (typeof INBOX_PLATFORM_FILTER_IDS)[number];

/** Human label for a stored platform value. `null` → "Buaze QR". */
export function platformLabel(platform: string | null | undefined, isTr: boolean): string {
  if (!platform || platform === 'buaze_qr' || platform === 'buaze') return 'Buaze QR';
  if (platform === 'custom') return isTr ? 'Özel link' : 'Custom link';
  return (PLATFORMS as Record<string, { label: string }>)[platform]?.label ?? platform;
}

/**
 * PlatformChip id for a stored platform value, or `null` when the review came
 * from the Buaze QR form (render a QR icon instead) or the value is unknown.
 */
export function platformIconId(platform: string | null | undefined): PlatformId | null {
  if (!platform || platform === 'custom' || platform === 'buaze_qr') return null;
  return platform in PLATFORMS ? (platform as PlatformId) : null;
}
