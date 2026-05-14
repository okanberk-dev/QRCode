// CLAUDE.md §X — Reputation OS Suite (snapshot capture helper).
//
// Captures the current state of a restaurant's reputation metrics into
// `restaurant_health_snapshots`. Two entry points:
//
//   - captureBaselineSnapshot(restaurantId) — called from Google OAuth
//     callback after the first location is selected. Creates a single
//     `kind='baseline'` row if one doesn't already exist.
//
//   - captureMonthlySnapshot(restaurantId) — called from the monthly cron
//     (`/api/cron/monthly-health-snapshot`). Creates a `kind='monthly'` row;
//     idempotent on year-month (skips if a monthly snapshot already exists
//     for the current calendar month).
//
// Google API calls are best-effort — if Google quota is exhausted (429) or
// the integration is reauth-pending, the snapshot still saves with `null`
// Google fields. Notes column records the partial-fetch reason for ops.

import { prisma } from '@/lib/prisma';
import {
  fetchGoogleBusinessLocations,
  googleReviewManagementEnabled,
  listLocationMedia,
  listLocationQuestions,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  GoogleBusinessApiError,
} from '@/lib/google-business';
import {
  computeHealthScore,
  type HealthSnapshotInput,
} from './health-score';
import * as Sentry from '@sentry/nextjs';

/**
 * Cron-friendly Google integration lookup — doesn't require a PanelActor.
 * Resolves restaurant's owner userId then finds the most-recently-updated
 * GoogleIntegration row for that owner. Matches the actor-based helper's
 * fallback path without auth context.
 */
async function getRestaurantGoogleIntegration(restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { userId: true },
  });
  if (!restaurant?.userId) return null;
  return prisma.googleIntegration.findFirst({
    where: { userId: restaurant.userId },
    orderBy: { updatedAt: 'desc' },
  });
}

export type SnapshotKind = 'baseline' | 'monthly';

export interface SnapshotResult {
  ok: true;
  snapshotId: string;
  metrics: HealthSnapshotInput;
  healthScore: number;
  partial: boolean; // true if any Google field was null due to API failure
}

export interface SnapshotSkip {
  ok: false;
  reason: 'no_integration' | 'review_management_disabled' | 'no_selected_location' | 'already_exists';
}

export type CaptureSnapshotOutput = SnapshotResult | SnapshotSkip;

/**
 * Aggregate feedback panel metrics for a restaurant. Cheap query — uses
 * indexed (restaurant_id) columns.
 */
async function aggregateFeedbackMetrics(restaurantId: string): Promise<{
  feedbackTotal: number;
  feedbackAvgRating: number | null;
  feedbackLowRated: number;
  feedbackReplied: number;
}> {
  const [total, avgRating, lowRated, repliedRow] = await prisma.$transaction([
    prisma.feedback.count({ where: { restaurantId } }),
    prisma.feedback.aggregate({
      where: { restaurantId },
      _avg: { rating: true },
    }),
    prisma.feedback.count({ where: { restaurantId, rating: { lte: 3 } } }),
    prisma.feedback.count({
      where: { restaurantId, replies: { some: {} } },
    }),
  ]);

  return {
    feedbackTotal: total,
    feedbackAvgRating: avgRating._avg.rating ?? null,
    feedbackLowRated: lowRated,
    feedbackReplied: repliedRow,
  };
}

/**
 * Google Business Profile metrics. Best-effort: each API call wrapped in
 * try/catch so a partial fetch still surfaces useful data. Returns a tuple
 * of (metrics, notes) — notes describes which sub-fetch failed (ops obs).
 */
async function aggregateGoogleMetrics(restaurantId: string): Promise<{
  googleRating: number | null;
  googleReviewCount: number | null;
  googleMediaCount: number | null;
  googleUnansweredQs: number | null;
  profileComplete: number | null;
  notes: string[];
}> {
  const notes: string[] = [];
  const integration = await getRestaurantGoogleIntegration(restaurantId);
  if (!integration) {
    notes.push('no_integration');
    return {
      googleRating: null,
      googleReviewCount: null,
      googleMediaCount: null,
      googleUnansweredQs: null,
      profileComplete: null,
      notes,
    };
  }

  const cached = parseGoogleLocationsCache(integration.locationsJson);
  let selection = selectedGoogleLocation(cached, restaurantId);

  // Locations cache henüz yoksa bir kez sync dene. Quota dolu olabilir
  // (429) → kabul edip null metric'lerle devam et.
  if (!selection && cached.accounts.length === 0) {
    try {
      const fresh = await fetchGoogleBusinessLocations(integration);
      selection = selectedGoogleLocation(fresh, restaurantId);
    } catch (err) {
      if (err instanceof GoogleBusinessApiError) {
        notes.push(`locations_fetch_failed:${err.code}`);
      } else {
        notes.push('locations_fetch_unknown_error');
      }
    }
  }

  if (!selection) {
    notes.push('no_selected_location');
    return {
      googleRating: null,
      googleReviewCount: null,
      googleMediaCount: null,
      googleUnansweredQs: null,
      profileComplete: null,
      notes,
    };
  }

  // Profile completeness (heuristic — title + address + categories)
  const profileComplete = selection.title && selection.address ? 100 : selection.title ? 50 : 0;

  // Media count (best effort)
  let mediaCount: number | null = null;
  try {
    const media = await listLocationMedia(integration, selection);
    mediaCount = media.count;
  } catch (err) {
    if (err instanceof GoogleBusinessApiError) {
      notes.push(`media_fetch_failed:${err.code}`);
    } else {
      notes.push('media_fetch_unknown_error');
    }
  }

  // Q&A unanswered count (best effort — Q&A API often disabled)
  let unansweredQs: number | null = null;
  try {
    const qs = await listLocationQuestions(integration, selection);
    unansweredQs = qs.unansweredCount;
  } catch (err) {
    if (err instanceof GoogleBusinessApiError) {
      notes.push(`questions_fetch_failed:${err.code}`);
    } else {
      notes.push('questions_fetch_unknown_error');
    }
  }

  // Reviews summary (rating + count). We use the same reviews endpoint that
  // the gauge uses but only need the aggregate fields, not the list.
  let googleRating: number | null = null;
  let googleReviewCount: number | null = null;
  try {
    const { listGoogleReviews } = await import('@/lib/google-business');
    const reviewsRes = await listGoogleReviews(integration, selection);
    googleRating = reviewsRes.averageRating ?? null;
    googleReviewCount = reviewsRes.totalReviewCount ?? null;
  } catch (err) {
    if (err instanceof GoogleBusinessApiError) {
      notes.push(`reviews_fetch_failed:${err.code}`);
    } else {
      notes.push('reviews_fetch_unknown_error');
    }
  }

  return {
    googleRating,
    googleReviewCount,
    googleMediaCount: mediaCount,
    googleUnansweredQs: unansweredQs,
    profileComplete,
    notes,
  };
}

interface CaptureOptions {
  kind: SnapshotKind;
  /** Monthly cron passes the calendar month boundary to enforce uniqueness. */
  monthBoundary?: Date;
}

/**
 * Build and persist a health snapshot. Idempotent based on `kind`:
 *   - baseline: skip if any baseline row already exists for this restaurant
 *   - monthly:  skip if a monthly row exists within `monthBoundary`'s month
 */
export async function captureSnapshot(
  restaurantId: string,
  opts: CaptureOptions,
): Promise<CaptureSnapshotOutput> {
  // Idempotency check
  if (opts.kind === 'baseline') {
    const existing = await prisma.restaurantHealthSnapshot.findFirst({
      where: { restaurantId, kind: 'baseline' },
      select: { id: true },
    });
    if (existing) return { ok: false, reason: 'already_exists' };
  } else if (opts.kind === 'monthly') {
    const boundary = opts.monthBoundary ?? new Date();
    const monthStart = new Date(Date.UTC(boundary.getUTCFullYear(), boundary.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(boundary.getUTCFullYear(), boundary.getUTCMonth() + 1, 1));
    const existing = await prisma.restaurantHealthSnapshot.findFirst({
      where: {
        restaurantId,
        kind: 'monthly',
        capturedAt: { gte: monthStart, lt: monthEnd },
      },
      select: { id: true },
    });
    if (existing) return { ok: false, reason: 'already_exists' };
  }

  // Guard: review management disabled or no integration → skip silently
  // (still no error). Baseline call site is OAuth callback; if owner
  // never configured Google Business, no baseline yet — that's fine.
  if (!(await googleReviewManagementEnabled(restaurantId))) {
    return { ok: false, reason: 'review_management_disabled' };
  }

  // Fetch metrics in parallel — feedback aggregate doesn't depend on Google.
  const [feedback, google] = await Promise.all([
    aggregateFeedbackMetrics(restaurantId),
    aggregateGoogleMetrics(restaurantId).catch((err) => {
      Sentry.captureException(err, { tags: { module: 'reputation-snapshot' } });
      return {
        googleRating: null,
        googleReviewCount: null,
        googleMediaCount: null,
        googleUnansweredQs: null,
        profileComplete: null,
        notes: ['google_fetch_top_level_throw'],
      };
    }),
  ]);

  const metrics: HealthSnapshotInput = {
    googleRating: google.googleRating,
    googleReviewCount: google.googleReviewCount,
    googleMediaCount: google.googleMediaCount,
    googleUnansweredQs: google.googleUnansweredQs,
    profileComplete: google.profileComplete,
    feedbackTotal: feedback.feedbackTotal,
    feedbackAvgRating: feedback.feedbackAvgRating,
    feedbackLowRated: feedback.feedbackLowRated,
    feedbackReplied: feedback.feedbackReplied,
  };

  const { overall } = computeHealthScore(metrics);
  const partial = google.notes.length > 0;

  const row = await prisma.restaurantHealthSnapshot.create({
    data: {
      restaurantId,
      kind: opts.kind,
      googleRating: metrics.googleRating,
      googleReviewCount: metrics.googleReviewCount,
      googleMediaCount: metrics.googleMediaCount,
      googleUnansweredQs: metrics.googleUnansweredQs,
      profileComplete: metrics.profileComplete,
      feedbackTotal: metrics.feedbackTotal,
      feedbackAvgRating: metrics.feedbackAvgRating,
      feedbackLowRated: metrics.feedbackLowRated,
      feedbackReplied: metrics.feedbackReplied,
      healthScore: overall,
      notes: google.notes.length > 0 ? google.notes.join(', ') : null,
    },
    select: { id: true },
  });

  return {
    ok: true,
    snapshotId: row.id,
    metrics,
    healthScore: overall,
    partial,
  };
}

/**
 * Convenience wrapper used from OAuth callback. Fire-and-forget — the
 * caller doesn't block the user redirect on this.
 */
export async function captureBaselineSnapshot(restaurantId: string): Promise<void> {
  try {
    await captureSnapshot(restaurantId, { kind: 'baseline' });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { module: 'reputation-snapshot', kind: 'baseline' },
      extra: { restaurantId },
    });
  }
}

/**
 * Get baseline + latest snapshot for delta comparison. Used by monthly
 * report mail + UI badge ("Buaze öncesi 47 → bugün 73").
 */
export async function getHealthSnapshotDelta(restaurantId: string): Promise<{
  baseline: { score: number; capturedAt: Date } | null;
  latest: { score: number; capturedAt: Date } | null;
  previous: { score: number; capturedAt: Date } | null;
}> {
  // CLAUDE.md §40.1 — connection_limit=1 altında paralel read'leri
  // `prisma.$transaction([...])` tek connection üstünden sıralar.
  const [baseline, latestTwo] = await prisma.$transaction([
    prisma.restaurantHealthSnapshot.findFirst({
      where: { restaurantId, kind: 'baseline' },
      orderBy: { capturedAt: 'asc' },
      select: { healthScore: true, capturedAt: true },
    }),
    prisma.restaurantHealthSnapshot.findMany({
      where: { restaurantId, kind: 'monthly' },
      orderBy: { capturedAt: 'desc' },
      take: 2,
      select: { healthScore: true, capturedAt: true },
    }),
  ]);

  return {
    baseline:
      baseline && baseline.healthScore != null
        ? { score: baseline.healthScore, capturedAt: baseline.capturedAt }
        : null,
    latest:
      latestTwo[0] && latestTwo[0].healthScore != null
        ? { score: latestTwo[0].healthScore, capturedAt: latestTwo[0].capturedAt }
        : null,
    previous:
      latestTwo[1] && latestTwo[1].healthScore != null
        ? { score: latestTwo[1].healthScore, capturedAt: latestTwo[1].capturedAt }
        : null,
  };
}
