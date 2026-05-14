// CLAUDE.md §X — Reputation OS Suite (Google review auto-draft helper).
//
// Cron'dan çağrılır: bağlı tüm Google integrations × her location ×
// yanıtlanmamış reviews → AI draft generate + DB upsert.
//
// Feedback FeedbackAiDraft akışıyla aynı pattern (`generateAiDraftBackground`):
//   1. enableAiDraft equivalent kontrolü: Restaurant.googleAiEnabled +
//      Restaurant.pulseAiEnabled
//   2. Idempotency: GoogleReviewAiDraft unique (restaurantId, reviewName)
//   3. Stale check: 24 saatten eski draft'lar regenerate edilebilir (review
//      edit edildiyse comment hash'i değişir)
//   4. OpenAI yoksa template fallback
//
// Cost guard: cron çağrı başına max N restaurant × max N review/restaurant.
// Quota guard: AI_QUOTAS.SUGGEST_REPLY_GLOBAL_DAY reuse.

import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import {
  fetchGoogleBusinessLocations,
  listGoogleReviews,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  GoogleBusinessApiError,
  type GoogleReview,
  type GoogleBusinessLocation,
} from '@/lib/google-business';
import { generateReplyDraft, type AiDraftTone, type AiDraftLocale } from '@/lib/ai-draft';
import * as Sentry from '@sentry/nextjs';

interface GoogleAutoDraftSummary {
  restaurantsChecked: number;
  reviewsScanned: number;
  draftsCreated: number;
  draftsSkipped: number; // already had a fresh draft
  draftsRegenerated: number; // older than 24h, regenerated
  failures: number;
  durationMs: number;
}

const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Star rating sanity — Google API'den string ('FIVE', 'FOUR', ...) ya da
 * number döner. Hangisi gelirse 1-5 int'e çevir.
 */
function ratingToInt(starRating: GoogleReview['starRating']): number {
  if (typeof starRating === 'number') return Math.max(1, Math.min(5, Math.round(starRating)));
  if (typeof starRating === 'string') {
    const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    return map[starRating.toUpperCase()] ?? 3;
  }
  return 3;
}

function hashComment(comment: string | undefined | null): string | null {
  if (!comment || comment.trim().length === 0) return null;
  return crypto.createHash('sha256').update(comment.trim()).digest('hex').slice(0, 32);
}

/**
 * Tek bir restaurant için Google review draft akışı. İçeride hata olursa
 * yutar (cron-friendly), sadece summary döner.
 */
async function processRestaurantGoogleDrafts(restaurantId: string): Promise<{
  scanned: number;
  created: number;
  skipped: number;
  regenerated: number;
  failures: number;
}> {
  const stats = { scanned: 0, created: 0, skipped: 0, regenerated: 0, failures: 0 };

  // 1. Restaurant + integration check
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      category: true,
      userId: true,
      googleReviewManagementEnabled: true,
      pulseAiEnabled: true,
      googleAiEnabled: true,
      aiDraftTone: true,
    },
  });
  if (
    !restaurant ||
    !restaurant.googleReviewManagementEnabled ||
    !restaurant.pulseAiEnabled ||
    !restaurant.googleAiEnabled
  ) {
    return stats;
  }

  if (!restaurant.userId) return stats;
  const integration = await prisma.googleIntegration.findFirst({
    where: { userId: restaurant.userId },
    orderBy: { updatedAt: 'desc' },
  });
  if (!integration) return stats;

  // 2. Resolve selected location
  let selection: GoogleBusinessLocation | null = selectedGoogleLocation(
    parseGoogleLocationsCache(integration.locationsJson),
    restaurantId,
  );
  if (!selection) {
    // Try fresh sync once — quota may block (429), accept and skip.
    try {
      const fresh = await fetchGoogleBusinessLocations(integration);
      selection = selectedGoogleLocation(fresh, restaurantId);
    } catch {
      // accepted skip
    }
  }
  if (!selection) return stats;

  // 3. Fetch reviews. Quota error → skip silently this cycle.
  let reviews: GoogleReview[] = [];
  try {
    const res = await listGoogleReviews(integration, selection);
    reviews = res.reviews ?? [];
  } catch (err) {
    if (err instanceof GoogleBusinessApiError && err.code === 'GOOGLE_RATE_LIMITED') {
      return stats; // soft-skip
    }
    stats.failures += 1;
    Sentry.captureException(err, {
      tags: { module: 'google-auto-draft', stage: 'list-reviews' },
      extra: { restaurantId },
    });
    return stats;
  }

  stats.scanned = reviews.length;

  // 4. Iterate unreplied reviews, generate drafts. Hard cap to avoid quota
  // burn per restaurant (latest 30).
  const unreplied = reviews
    .filter((r) => !r.reviewReply?.comment || r.reviewReply.comment.trim() === '')
    .slice(0, 30);

  const tone: AiDraftTone = (restaurant.aiDraftTone as AiDraftTone | undefined) ?? 'warm';
  const locale: AiDraftLocale = 'tr'; // owner reply language — TR default; future: per-restaurant

  for (const review of unreplied) {
    if (!review.name) continue;
    const rating = ratingToInt(review.starRating);
    const commentHash = hashComment(review.comment);

    // 5. Check existing draft — skip if fresh + same hash; regenerate if stale
    const existing = await prisma.googleReviewAiDraft.findUnique({
      where: {
        restaurantId_reviewName: { restaurantId, reviewName: review.name },
      },
      select: { id: true, generatedAt: true, commentHash: true },
    });
    const isStale = existing
      ? Date.now() - existing.generatedAt.getTime() > STALE_AFTER_MS
      : false;
    const commentChanged = existing ? existing.commentHash !== commentHash : false;
    if (existing && !isStale && !commentChanged) {
      stats.skipped += 1;
      continue;
    }

    try {
      const draft = await generateReplyDraft(
        {
          restaurantName: restaurant.name,
          restaurantCategory: restaurant.category,
          customerName: review.reviewer?.displayName ?? null,
          rating,
          platform: 'google',
          comment: review.comment ?? null,
        },
        tone,
        locale,
      );

      await prisma.googleReviewAiDraft.upsert({
        where: {
          restaurantId_reviewName: { restaurantId, reviewName: review.name },
        },
        create: {
          restaurantId,
          reviewName: review.name,
          rating,
          commentHash,
          body: draft.body,
          tone,
          source: draft.source,
          latencyMs: draft.latencyMs,
        },
        update: {
          rating,
          commentHash,
          body: draft.body,
          tone,
          source: draft.source,
          latencyMs: draft.latencyMs,
          generatedAt: new Date(),
        },
      });
      if (existing) stats.regenerated += 1;
      else stats.created += 1;
    } catch (err) {
      stats.failures += 1;
      Sentry.captureException(err, {
        tags: { module: 'google-auto-draft', stage: 'generate' },
        extra: { restaurantId, reviewName: review.name },
      });
    }
  }

  return stats;
}

/**
 * Cron-side aggregator. Iterates eligible restaurants sequentially (Google
 * API quota friendly). BATCH_SIZE konservatif tutuldu — saatte 1 çalıştığı
 * için her saat 100 restaurant'a kadar tarama yapar.
 */
export async function runGoogleReviewsAutoDraft(): Promise<GoogleAutoDraftSummary> {
  const start = Date.now();
  const BATCH_SIZE = 100;

  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      googleReviewManagementEnabled: true,
      pulseAiEnabled: true,
      googleAiEnabled: true,
    },
    take: BATCH_SIZE,
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  const agg: GoogleAutoDraftSummary = {
    restaurantsChecked: restaurants.length,
    reviewsScanned: 0,
    draftsCreated: 0,
    draftsSkipped: 0,
    draftsRegenerated: 0,
    failures: 0,
    durationMs: 0,
  };

  for (const r of restaurants) {
    try {
      const s = await processRestaurantGoogleDrafts(r.id);
      agg.reviewsScanned += s.scanned;
      agg.draftsCreated += s.created;
      agg.draftsSkipped += s.skipped;
      agg.draftsRegenerated += s.regenerated;
      agg.failures += s.failures;
    } catch (err) {
      agg.failures += 1;
      Sentry.captureException(err, {
        tags: { module: 'google-auto-draft', stage: 'per-restaurant' },
        extra: { restaurantId: r.id },
      });
    }
  }

  agg.durationMs = Date.now() - start;
  return agg;
}
