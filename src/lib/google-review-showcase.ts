/**
 * Public Google review showcase — CLAUDE.md §53.
 *
 * A business that connected its Google Business Profile (and whose workspace
 * is in GBP_ALLOWED_TENANTS) gets its own Google reviews cached in
 * `google_review_caches` and shown on its embed widget (`/embed/{slug}/google`).
 *
 * Rules:
 *  - Only the fields we show are stored (review id, reviewer name + photo URL,
 *    star rating, comment, create/update time, owner reply, average rating,
 *    total count). Comment text is stored exactly as Google returns it;
 *    any selection happens only when rendering.
 *  - Refresh runs from ONE central queue (`runGoogleReviewRefreshQueue`, the
 *    `google-reviews-refresh` cron), one business at a time, every 6–12 h per
 *    business (stable per-business spread). Failures back off exponentially
 *    and NEVER clear the last good snapshot.
 *  - Readers (embed, panels) only read the cache; they never call Google.
 */

import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  GoogleBusinessApiError,
  listGoogleReviews,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  type GoogleBusinessLocation,
  type GoogleReview,
} from '@/lib/google-business';
import { googleConnectionState, isGoogleTenantAllowed } from '@/lib/gbp-access';
import { collectAllReviewPages, persistReviewSync } from '@/lib/google-review-sync';

// ─── types ───────────────────────────────────────────────────────────────

export interface PublicGoogleReview {
  reviewId: string;
  reviewer: {
    displayName: string | null;
    profilePhotoUrl: string | null;
    isAnonymous: boolean;
  };
  /** starRating ONE..FIVE as 1..5; null for STAR_RATING_UNSPECIFIED. */
  rating: number | null;
  /** Exactly as Google returned it (null when the review has no text). */
  comment: string | null;
  createTime: string | null;
  updateTime: string | null;
  reviewReply: { comment: string; updateTime: string | null } | null;
}

export interface GoogleReviewShowcase {
  averageRating: number | null;
  totalReviewCount: number;
  reviews: PublicGoogleReview[];
  reviewsUrl: string | null;
  fetchedAt: Date;
}

/** Cache-level failure codes beyond GoogleBusinessFailureCode. */
export type ShowcaseFailureCode =
  | 'GOOGLE_NOT_CONNECTED'
  | 'GOOGLE_NO_LOCATION'
  | 'GOOGLE_TENANT_NOT_ALLOWED'
  | 'GOOGLE_REAUTH_REQUIRED'
  | 'GOOGLE_RATE_LIMITED'
  | 'GOOGLE_FORBIDDEN'
  | 'GOOGLE_API_NOT_PROVISIONED'
  | 'GOOGLE_NOT_CONFIGURED'
  | 'GOOGLE_SERVER_ERROR'
  | 'GOOGLE_NETWORK_ERROR'
  | 'GOOGLE_API_ERROR'
  | 'INTERNAL_ERROR';

// ─── pure helpers (unit-tested) ──────────────────────────────────────────

const STAR_VALUES: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export function starRatingToNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
  }
  if (typeof value !== 'string') return null;
  return STAR_VALUES[value.trim().toUpperCase()] ?? null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Only https photo URLs are kept (rendered with no-referrer). */
function safePhotoUrl(value: unknown): string | null {
  const s = str(value);
  if (!s || s.length > 1000) return null;
  try {
    return new URL(s).protocol === 'https:' ? s : null;
  } catch {
    return null;
  }
}

/** Maps one Business Profile review to the stored shape; null if unusable. */
export function normalizeGoogleReview(raw: GoogleReview | unknown): PublicGoogleReview | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name);
  const reviewId = str(r.reviewId) ?? (name ? name.split('/').pop() ?? null : null);
  if (!reviewId) return null;

  const reviewer = (typeof r.reviewer === 'object' && r.reviewer !== null
    ? r.reviewer
    : {}) as Record<string, unknown>;
  const reply = (typeof r.reviewReply === 'object' && r.reviewReply !== null
    ? r.reviewReply
    : null) as Record<string, unknown> | null;
  const replyComment = reply ? str(reply.comment) : null;

  return {
    reviewId,
    reviewer: {
      displayName: str(reviewer.displayName),
      profilePhotoUrl: safePhotoUrl(reviewer.profilePhotoUrl),
      isAnonymous: reviewer.isAnonymous === true,
    },
    rating: starRatingToNumber(r.starRating),
    comment: str(r.comment),
    createTime: str(r.createTime),
    updateTime: str(r.updateTime),
    reviewReply: replyComment ? { comment: replyComment, updateTime: str(reply?.updateTime) } : null,
  };
}

/** Normalizes a page list, drops duplicates (same reviewId) keeping the first. */
export function normalizeGoogleReviews(raw: unknown[]): PublicGoogleReview[] {
  const seen = new Set<string>();
  const out: PublicGoogleReview[] = [];
  for (const item of raw) {
    const review = normalizeGoogleReview(item);
    if (!review || seen.has(review.reviewId)) continue;
    seen.add(review.reviewId);
    out.push(review);
  }
  return out;
}

/** Reads the JSON column back; anything malformed is dropped, never thrown. */
export function parseStoredReviews(value: unknown): PublicGoogleReview[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PublicGoogleReview => {
    if (typeof item !== 'object' || item === null) return false;
    const r = item as Record<string, unknown>;
    return typeof r.reviewId === 'string' && typeof r.reviewer === 'object' && r.reviewer !== null;
  });
}

/**
 * What the widget shows: newest first (update time), reviews with text
 * before rating-only ones. Nothing is hidden by rating and no text is changed.
 */
export function pickDisplayReviews(reviews: PublicGoogleReview[], limit: number): PublicGoogleReview[] {
  const time = (r: PublicGoogleReview) => Date.parse(r.updateTime ?? r.createTime ?? '') || 0;
  return [...reviews]
    .sort((a, b) => {
      const textA = a.comment ? 1 : 0;
      const textB = b.comment ? 1 : 0;
      if (textA !== textB) return textB - textA;
      return time(b) - time(a);
    })
    .slice(0, Math.max(0, limit));
}

/** "See all on Google" link for a selected Business Profile location. */
export function reviewsUrlFor(location: Pick<GoogleBusinessLocation, 'placeId' | 'mapsUri'> | null): string | null {
  if (!location) return null;
  if (location.placeId) {
    return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(location.placeId)}`;
  }
  return location.mapsUri && location.mapsUri.startsWith('https://') ? location.mapsUri : null;
}

const HOUR_MS = 60 * 60 * 1000;
export const REFRESH_MIN_MS = 6 * HOUR_MS;
export const REFRESH_MAX_MS = 12 * HOUR_MS;
const BACKOFF_BASE_MS = 15 * 60 * 1000;
export const BACKOFF_MAX_MS = 12 * HOUR_MS;

/**
 * Successful refresh interval: 6–12 h, fixed per business (hash of its id)
 * so businesses spread over the day instead of refreshing in a burst.
 */
export function refreshIntervalMs(restaurantId: string): number {
  const digest = createHash('sha256').update(restaurantId).digest();
  const fraction = digest.readUInt32BE(0) / 0x1_0000_0000;
  return REFRESH_MIN_MS + Math.floor(fraction * (REFRESH_MAX_MS - REFRESH_MIN_MS));
}

/** Failures that will not fix themselves by retrying soon. */
const STUCK_CODES = new Set<ShowcaseFailureCode>([
  'GOOGLE_NOT_CONNECTED',
  'GOOGLE_NO_LOCATION',
  'GOOGLE_TENANT_NOT_ALLOWED',
  'GOOGLE_REAUTH_REQUIRED',
  'GOOGLE_API_NOT_PROVISIONED',
  'GOOGLE_NOT_CONFIGURED',
]);

/**
 * Delay before the next attempt after `failureCount` consecutive failures
 * (1 = first failure). 15 min × 2^(n−1), capped at 12 h, never below
 * Google's Retry-After. States that need a person (reconnect, no location,
 * closed tenant, quota 0) wait the maximum.
 */
export function backoffDelayMs(
  failureCount: number,
  code: ShowcaseFailureCode,
  retryAfterSeconds?: number | null,
): number {
  if (STUCK_CODES.has(code)) return BACKOFF_MAX_MS;
  const n = Math.max(1, Math.floor(failureCount));
  const exp = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.min(n - 1, 10));
  const hinted = retryAfterSeconds && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 0;
  return Math.min(BACKOFF_MAX_MS, Math.max(exp, hinted));
}

/** Maps a thrown Business Profile error to a cache failure code. */
export function showcaseFailureFromError(err: unknown): {
  code: ShowcaseFailureCode;
  retryAfterSeconds?: number;
} {
  if (err instanceof GoogleBusinessApiError) {
    if (err.requiresReauth) return { code: 'GOOGLE_REAUTH_REQUIRED' };
    if (err.code === 'GOOGLE_API_ERROR' && err.status === 403) return { code: 'GOOGLE_FORBIDDEN' };
    return { code: err.code, retryAfterSeconds: err.retryAfterSeconds };
  }
  return { code: 'INTERNAL_ERROR' };
}

/** Errors that mean the shared Google quota is hot: stop the whole run. */
export function isQuotaPressure(code: ShowcaseFailureCode): boolean {
  return code === 'GOOGLE_RATE_LIMITED' || code === 'GOOGLE_FORBIDDEN';
}

// ─── database-backed ─────────────────────────────────────────────────────

/** The public widget shows at most the newest 100 (§53). */
const SHOWCASE_LIMIT = 100;
const LEASE_MS = 5 * 60 * 1000;

export type RefreshResult =
  | { ok: true; reviews: number }
  | { ok: false; code: ShowcaseFailureCode; skipped?: 'busy' | 'missing' };

async function recordFailure(
  restaurantId: string,
  previousFailures: number,
  code: ShowcaseFailureCode,
  now: Date,
  retryAfterSeconds?: number,
): Promise<RefreshResult> {
  const failureCount = previousFailures + 1;
  await prisma.googleReviewCache.update({
    where: { restaurantId },
    data: {
      failureCount,
      lastErrorCode: code,
      nextAttemptAt: new Date(now.getTime() + backoffDelayMs(failureCount, code, retryAfterSeconds)),
    },
  });
  return { ok: false, code };
}

/** Makes sure a business has a cache row and is due now. */
export async function enqueueGoogleReviewRefresh(restaurantId: string, now: Date = new Date()): Promise<void> {
  await prisma.googleReviewCache.upsert({
    where: { restaurantId },
    create: { restaurantId, nextAttemptAt: now },
    update: { nextAttemptAt: now, failureCount: 0 },
  });
}

/**
 * Refreshes one business. Takes a 5-minute lease so two runners never fetch
 * the same business at once. The last good snapshot is kept on failure.
 */
export async function refreshGoogleReviewCache(
  restaurantId: string,
  now: Date = new Date(),
): Promise<RefreshResult> {
  const leaseCutoff = new Date(now.getTime() - LEASE_MS);
  const lease = await prisma.googleReviewCache.updateMany({
    where: {
      restaurantId,
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: leaseCutoff } }],
    },
    data: { lastAttemptAt: now },
  });
  if (lease.count === 0) {
    const exists = await prisma.googleReviewCache.findUnique({
      where: { restaurantId },
      select: { id: true },
    });
    return { ok: false, code: 'INTERNAL_ERROR', skipped: exists ? 'busy' : 'missing' };
  }

  const [cacheRow, restaurant] = await prisma.$transaction([
    prisma.googleReviewCache.findUnique({ where: { restaurantId }, select: { failureCount: true } }),
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { userId: true } }),
  ]);
  const failures = cacheRow?.failureCount ?? 0;
  if (!restaurant?.userId) return recordFailure(restaurantId, failures, 'GOOGLE_NOT_CONNECTED', now);

  if (!(await isGoogleTenantAllowed(restaurant.userId))) {
    return recordFailure(restaurantId, failures, 'GOOGLE_TENANT_NOT_ALLOWED', now);
  }

  const integration = await prisma.googleIntegration.findUnique({ where: { userId: restaurant.userId } });
  const state = googleConnectionState(integration, process.env.GOOGLE_CLIENT_ID);
  if (!integration || state === 'not_connected') {
    return recordFailure(restaurantId, failures, 'GOOGLE_NOT_CONNECTED', now);
  }
  if (state !== 'connected') return recordFailure(restaurantId, failures, 'GOOGLE_REAUTH_REQUIRED', now);

  const selection = selectedGoogleLocation(parseGoogleLocationsCache(integration.locationsJson), restaurantId);
  if (!selection) return recordFailure(restaurantId, failures, 'GOOGLE_NO_LOCATION', now);

  try {
    // §54 — every page (nextPageToken), not only the newest 100: the reply
    // inbox and its statistics read `google_reviews`.
    const collected = await collectAllReviewPages((pageToken) =>
      listGoogleReviews(integration, selection, pageToken),
    );
    await persistReviewSync(restaurantId, collected.reviews, { complete: collected.complete, seenAt: now });

    // The widget keeps showing only the newest 100 (normalized snapshot).
    const reviews = normalizeGoogleReviews(collected.reviews.slice(0, SHOWCASE_LIMIT));
    await prisma.googleReviewCache.update({
      where: { restaurantId },
      data: {
        locationName: selection.locationName,
        averageRating: collected.averageRating,
        totalReviewCount: collected.totalReviewCount,
        reviews: reviews as unknown as Prisma.InputJsonValue,
        reviewsUrl: reviewsUrlFor(selection),
        fetchedAt: now,
        failureCount: 0,
        lastErrorCode: null,
        nextAttemptAt: new Date(now.getTime() + refreshIntervalMs(restaurantId)),
      },
    });
    if (collected.error) {
      // Kept what was read; the rest comes with the next attempt.
      const { code, retryAfterSeconds } = showcaseFailureFromError(collected.error);
      return recordFailure(restaurantId, 0, code, now, retryAfterSeconds);
    }
    return { ok: true, reviews: collected.reviews.length };
  } catch (err) {
    const { code, retryAfterSeconds } = showcaseFailureFromError(err);
    return recordFailure(restaurantId, failures, code, now, retryAfterSeconds);
  }
}

/**
 * Adds a queue row for every business that has a selected Business Profile
 * location under its owner's connection and an allowed tenant.
 */
async function seedQueue(now: Date): Promise<number> {
  const integrations = await prisma.googleIntegration.findMany({
    where: { NOT: { userId: { startsWith: 'admin:' } } },
    select: { userId: true, locationsJson: true },
    take: 500,
  });
  const candidateIds: string[] = [];
  for (const integration of integrations) {
    const ids = Object.keys(parseGoogleLocationsCache(integration.locationsJson).restaurantLocations);
    if (ids.length === 0 || !(await isGoogleTenantAllowed(integration.userId))) continue;
    const owned = await prisma.restaurant.findMany({
      where: { id: { in: ids }, userId: integration.userId },
      select: { id: true },
    });
    candidateIds.push(...owned.map((r) => r.id));
  }
  if (candidateIds.length === 0) return 0;
  const created = await prisma.googleReviewCache.createMany({
    data: candidateIds.map((restaurantId) => ({ restaurantId, nextAttemptAt: now })),
    skipDuplicates: true,
  });
  return created.count;
}

export interface RefreshQueueSummary {
  seeded: number;
  due: number;
  refreshed: number;
  failed: number;
  skipped: number;
  stoppedForQuota: boolean;
}

/**
 * The central scheduler. Runs due businesses one by one with a gap, stops
 * early when Google (or our own global budget) says the shared quota is hot.
 */
export async function runGoogleReviewRefreshQueue(
  opts: { maxJobs?: number; budgetMs?: number; gapMs?: number; now?: () => Date } = {},
): Promise<RefreshQueueSummary> {
  const clock = opts.now ?? (() => new Date());
  const started = Date.now();
  const budgetMs = opts.budgetMs ?? 240_000;
  const gapMs = opts.gapMs ?? 2_000;

  const seeded = await seedQueue(clock());
  const due = await prisma.googleReviewCache.findMany({
    where: { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: clock() } }] },
    orderBy: { nextAttemptAt: 'asc' },
    select: { restaurantId: true },
    take: opts.maxJobs ?? 20,
  });

  const summary: RefreshQueueSummary = {
    seeded,
    due: due.length,
    refreshed: 0,
    failed: 0,
    skipped: 0,
    stoppedForQuota: false,
  };

  for (let i = 0; i < due.length; i++) {
    if (Date.now() - started > budgetMs) break;
    if (i > 0 && gapMs > 0) await new Promise((resolve) => setTimeout(resolve, gapMs));
    const result = await refreshGoogleReviewCache(due[i].restaurantId, clock());
    if (result.ok) {
      summary.refreshed++;
    } else if (result.skipped) {
      summary.skipped++;
    } else {
      summary.failed++;
      if (isQuotaPressure(result.code)) {
        summary.stoppedForQuota = true;
        break;
      }
    }
  }
  return summary;
}

/** Last good snapshot for a business, or null. Never calls Google. */
export async function readGoogleReviewShowcase(restaurantId: string): Promise<GoogleReviewShowcase | null> {
  const row = await prisma.googleReviewCache.findUnique({
    where: { restaurantId },
    select: {
      averageRating: true,
      totalReviewCount: true,
      reviews: true,
      reviewsUrl: true,
      fetchedAt: true,
    },
  });
  if (!row?.fetchedAt) return null;
  return {
    averageRating: row.averageRating,
    totalReviewCount: row.totalReviewCount,
    reviews: parseStoredReviews(row.reviews),
    reviewsUrl: row.reviewsUrl,
    fetchedAt: row.fetchedAt,
  };
}

/**
 * Deletes every piece of Google review data fetched with the connection of
 * `userRef` (cache rows, stored reviews, reply jobs and AI reply drafts of
 * that owner's businesses).
 * Called on disconnect. Returns the business ids that were cleaned.
 */
export async function deleteGoogleReviewDataForOwner(userRef: string): Promise<string[]> {
  if (!userRef || userRef.startsWith('admin:')) return [];
  const restaurants = await prisma.restaurant.findMany({
    where: { userId: userRef },
    select: { id: true },
  });
  const ids = restaurants.map((r) => r.id);
  if (ids.length === 0) return [];
  await prisma.$transaction([
    prisma.googleReviewCache.deleteMany({ where: { restaurantId: { in: ids } } }),
    prisma.googleReviewAiDraft.deleteMany({ where: { restaurantId: { in: ids } } }),
    prisma.googleReview.deleteMany({ where: { restaurantId: { in: ids } } }),
    prisma.googleReplyJob.deleteMany({ where: { restaurantId: { in: ids } } }),
  ]);
  return ids;
}
