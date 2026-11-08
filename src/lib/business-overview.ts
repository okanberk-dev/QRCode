// Multi-business (franchise) overview — pure helpers for the owner
// "İşletmelerim" table. No React, no Prisma; covered by
// `tests/business-overview.test.ts`.

import type { PlatformLinkSummary } from '@/lib/platform-link-status';

export interface PortfolioRow {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  suspendedByAdmin?: boolean;
  /** All-time review count. */
  reviewsTotal: number;
  /** Reviews in the last 30 days. */
  reviews30d: number;
  /** Average rating of the last 30 days (null = no reviews). */
  avgRating30d: number | null;
  /** Reviews the team has not opened yet. */
  unread: number;
  /** ISO time of the newest review (null = none yet). */
  lastFeedbackAt: string | null;
  /** Review-platform link summary (same numbers as the platforms page). */
  platforms: PlatformLinkSummary;
}

export type AttentionReason = 'paused' | 'platform_issue' | 'no_platform' | 'unread' | 'quiet';

/**
 * Why a business needs a look, most urgent first. Paused businesses only
 * report `paused` (nothing else matters until they are back on).
 */
export function attentionReasons(row: PortfolioRow): AttentionReason[] {
  if (!row.isActive) return ['paused'];
  const reasons: AttentionReason[] = [];
  if (row.platforms.issue > 0) reasons.push('platform_issue');
  // A broken link is already reported above; "no platform" means nothing
  // was ever added (or everything is off).
  if (row.platforms.connected === 0 && row.platforms.issue === 0) reasons.push('no_platform');
  if (row.unread > 0) reasons.push('unread');
  if (row.reviews30d === 0) reasons.push('quiet');
  return reasons;
}

export interface PortfolioTotals {
  businesses: number;
  active: number;
  reviews30d: number;
  /** Review-weighted average over active businesses (null = no reviews). */
  avgRating30d: number | null;
  unread: number;
  /** Active businesses with at least one attention reason. */
  needsAttention: number;
}

export function portfolioTotals(rows: readonly PortfolioRow[]): PortfolioTotals {
  let active = 0;
  let reviews30d = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  let unread = 0;
  let needsAttention = 0;
  for (const row of rows) {
    if (!row.isActive) continue;
    active += 1;
    reviews30d += row.reviews30d;
    unread += row.unread;
    if (row.avgRating30d !== null && row.reviews30d > 0) {
      ratingSum += row.avgRating30d * row.reviews30d;
      ratingCount += row.reviews30d;
    }
    if (attentionReasons(row).length > 0) needsAttention += 1;
  }
  return {
    businesses: rows.length,
    active,
    reviews30d,
    avgRating30d: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    unread,
    needsAttention,
  };
}

export type PortfolioSortKey = 'name' | 'reviews30d' | 'rating' | 'unread' | 'attention';

/**
 * Sorted copy. Missing ratings / never-reviewed businesses always sink to the
 * bottom regardless of direction; ties keep the original (creation) order.
 */
export function sortPortfolioRows(
  rows: readonly PortfolioRow[],
  key: PortfolioSortKey,
  dir: 'asc' | 'desc',
  locale: 'tr' | 'en',
): PortfolioRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const collator = new Intl.Collator(locale === 'tr' ? 'tr-TR' : 'en-US', { sensitivity: 'base' });
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    let diff = 0;
    switch (key) {
      case 'name':
        diff = sign * collator.compare(a.row.name, b.row.name);
        break;
      case 'reviews30d':
        diff = sign * (a.row.reviews30d - b.row.reviews30d);
        break;
      case 'unread':
        diff = sign * (a.row.unread - b.row.unread);
        break;
      case 'rating': {
        const ar = a.row.avgRating30d;
        const br = b.row.avgRating30d;
        if (ar === null && br === null) diff = 0;
        else if (ar === null) diff = 1;
        else if (br === null) diff = -1;
        else diff = sign * (ar - br);
        break;
      }
      case 'attention':
        diff = sign * (attentionReasons(a.row).length - attentionReasons(b.row).length);
        break;
    }
    return diff !== 0 ? diff : a.index - b.index;
  });
  return indexed.map((entry) => entry.row);
}
