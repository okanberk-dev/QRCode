/**
 * Full Google review sync for the reply inbox (CLAUDE.md §54).
 *
 * Pages through `reviews.list` with `nextPageToken` (50 per page, newest
 * update first) and stores every review in `google_reviews` with one bulk
 * `INSERT … ON CONFLICT DO UPDATE` per chunk, so a 2 000-review business costs
 * ~40 Google requests and ~10 SQL statements. A reply written or deleted on
 * Google directly is overwritten by the next sync (reply fields are always
 * taken from Google). Rows Google no longer returns are deleted only after a
 * COMPLETE pass — a partial pass (quota hit mid-way) never deletes.
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { GoogleReview, GoogleReviewsResponse } from '@/lib/google-business';
import { detectReviewLanguage, splitGoogleTranslation } from '@/lib/google-review-text';

/** 40 × 50 = the newest 2 000 reviews per sync. */
export const MAX_SYNC_PAGES = 40;

export interface CollectedReviews {
  reviews: GoogleReview[];
  averageRating: number | null;
  totalReviewCount: number;
  /** True when Google returned no further page token. */
  complete: boolean;
  pages: number;
  /** Error thrown by a page after the first one (the pages before it are kept). */
  error?: unknown;
}

/**
 * Collects every page. The first page's error is thrown (nothing to keep);
 * a later page's error ends the pass with `complete: false` and the pages
 * read so far.
 */
export async function collectAllReviewPages(
  fetchPage: (pageToken: string | undefined) => Promise<GoogleReviewsResponse>,
  opts: { maxPages?: number; gapMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<CollectedReviews> {
  const maxPages = Math.max(1, opts.maxPages ?? MAX_SYNC_PAGES);
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const reviews: GoogleReview[] = [];
  const seen = new Set<string>();
  let averageRating: number | null = null;
  let totalReviewCount = 0;
  let pageToken: string | undefined;
  let pages = 0;

  for (let page = 0; page < maxPages; page++) {
    if (page > 0 && (opts.gapMs ?? 300) > 0) await sleep(opts.gapMs ?? 300);
    let res: GoogleReviewsResponse;
    try {
      res = await fetchPage(pageToken);
    } catch (error) {
      if (page === 0) throw error;
      return { reviews, averageRating, totalReviewCount, complete: false, pages, error };
    }
    pages++;
    if (page === 0) {
      averageRating = res.averageRating;
      totalReviewCount = res.totalReviewCount;
    }
    for (const review of res.reviews ?? []) {
      // A review edited between two page requests can appear twice.
      const key = review.reviewId || review.name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      reviews.push(review);
    }
    pageToken = res.nextPageToken || undefined;
    if (!pageToken) return { reviews, averageRating, totalReviewCount, complete: true, pages };
  }
  return { reviews, averageRating, totalReviewCount, complete: false, pages };
}

const STAR: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function date(value: string | undefined | null): Date | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function httpsOrNull(value: string | undefined | null): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v.startsWith('https://') && v.length <= 2000 ? v : null;
}

export interface GoogleReviewRowInput {
  reviewId: string;
  reviewName: string;
  reviewerName: string | null;
  reviewerPhotoUrl: string | null;
  isAnonymous: boolean;
  rating: number | null;
  comment: string | null;
  originalText: string | null;
  translatedText: string | null;
  language: string | null;
  hasText: boolean;
  createTime: Date | null;
  updateTime: Date | null;
  hasReply: boolean;
  replyComment: string | null;
  replyUpdateTime: Date | null;
}

/** Only the fields the inbox needs; the comment text is never changed. */
export function toGoogleReviewRow(raw: GoogleReview): GoogleReviewRowInput | null {
  const reviewId = typeof raw?.reviewId === 'string' ? raw.reviewId.trim() : '';
  const reviewName = typeof raw?.name === 'string' ? raw.name.trim() : '';
  if (!reviewId || !reviewName) return null;
  const comment = typeof raw.comment === 'string' && raw.comment.trim() ? raw.comment : null;
  const split = splitGoogleTranslation(comment);
  const replyComment =
    typeof raw.reviewReply?.comment === 'string' && raw.reviewReply.comment.trim()
      ? raw.reviewReply.comment
      : null;
  const anonymous = Boolean(raw.reviewer?.isAnonymous);
  return {
    reviewId,
    reviewName,
    reviewerName: anonymous ? null : (raw.reviewer?.displayName?.trim() || null),
    reviewerPhotoUrl: anonymous ? null : httpsOrNull(raw.reviewer?.profilePhotoUrl),
    isAnonymous: anonymous,
    rating: raw.starRating ? STAR[raw.starRating] ?? null : null,
    comment,
    originalText: split.original,
    translatedText: split.translated,
    language: detectReviewLanguage(split.original),
    hasText: Boolean(split.original),
    createTime: date(raw.createTime),
    updateTime: date(raw.updateTime),
    hasReply: Boolean(replyComment),
    replyComment,
    replyUpdateTime: replyComment ? date(raw.reviewReply?.updateTime) : null,
  };
}

const UPSERT_CHUNK = 200;

/**
 * Stores a sync pass. Returns the number of rows written and deleted.
 * `complete` allows deleting rows Google no longer returns.
 */
export async function persistReviewSync(
  restaurantId: string,
  rawReviews: GoogleReview[],
  opts: { complete: boolean; seenAt?: Date },
): Promise<{ written: number; deleted: number }> {
  const seenAt = opts.seenAt ?? new Date();
  const rows = rawReviews.map(toGoogleReviewRow).filter((r): r is GoogleReviewRowInput => r !== null);

  let written = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const values = chunk.map(
      (r) => Prisma.sql`(${randomUUID()}, ${restaurantId}, ${r.reviewId}, ${r.reviewName}, ${r.reviewerName},
        ${r.reviewerPhotoUrl}, ${r.isAnonymous}, ${r.rating}, ${r.comment}, ${r.originalText}, ${r.translatedText},
        ${r.language}, ${r.hasText}, ${r.createTime}, ${r.updateTime}, ${r.hasReply}, ${r.replyComment},
        ${r.replyUpdateTime}, ${seenAt}, NOW(), NOW())`,
    );
    written += await prisma.$executeRaw`
      INSERT INTO "google_reviews" (
        "id", "restaurant_id", "review_id", "review_name", "reviewer_name", "reviewer_photo_url",
        "is_anonymous", "rating", "comment", "original_text", "translated_text", "language", "has_text",
        "create_time", "update_time", "has_reply", "reply_comment", "reply_update_time", "last_seen_at",
        "created_at", "updated_at"
      ) VALUES ${Prisma.join(values)}
      ON CONFLICT ("restaurant_id", "review_id") DO UPDATE SET
        "review_name" = EXCLUDED."review_name",
        "reviewer_name" = EXCLUDED."reviewer_name",
        "reviewer_photo_url" = EXCLUDED."reviewer_photo_url",
        "is_anonymous" = EXCLUDED."is_anonymous",
        "rating" = EXCLUDED."rating",
        "comment" = EXCLUDED."comment",
        "original_text" = EXCLUDED."original_text",
        "translated_text" = EXCLUDED."translated_text",
        "language" = EXCLUDED."language",
        "has_text" = EXCLUDED."has_text",
        "create_time" = EXCLUDED."create_time",
        "update_time" = EXCLUDED."update_time",
        "has_reply" = EXCLUDED."has_reply",
        "reply_comment" = EXCLUDED."reply_comment",
        "reply_update_time" = EXCLUDED."reply_update_time",
        "last_seen_at" = EXCLUDED."last_seen_at",
        "updated_at" = NOW()
    `;
  }

  let deleted = 0;
  if (opts.complete) {
    const res = await prisma.googleReview.deleteMany({
      where: { restaurantId, lastSeenAt: { lt: seenAt } },
    });
    deleted = res.count;
  }
  return { written, deleted };
}

/** Writes a reply the owner just published (or removed) without waiting for the next sync. */
export async function recordReplyOnReview(
  restaurantId: string,
  reviewId: string,
  reply: { comment: string; updateTime?: string | null } | null,
): Promise<void> {
  await prisma.googleReview.updateMany({
    where: { restaurantId, reviewId },
    data: reply
      ? {
          hasReply: true,
          replyComment: reply.comment,
          replyUpdateTime: date(reply.updateTime ?? null) ?? new Date(),
        }
      : { hasReply: false, replyComment: null, replyUpdateTime: null },
  });
}
