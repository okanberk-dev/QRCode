import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getNotificationPrefsForRestaurant } from '@/lib/notification-preferences';
import { sendFeedbackNotification } from '@/lib/email';
import {
  parseGoogleLocationsCache,
  listGoogleReviews,
  GoogleBusinessApiError,
} from '@/lib/google-business';

// Google reviews alert cron (CLAUDE.md §37.2 H pattern).
// Vercel Cron tarafından saatte 1 kez çağrılır.
//
// Akış:
//   1. CRON_SECRET guard (fail-closed — env yoksa 401)
//   2. GoogleIntegration tablosundan locationsJson'lu kayıtları çek
//   3. Her restaurant × location için Google reviews fetch
//   4. 1-3 yıldız yorumlar → sendFeedbackNotification ile mail
//   5. lastReviewNotifiedAt watermark güncelle (idempotency)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 mins for cron

const STAR_VALUE: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/**
 * Cron logic — shared helper. Hem GET handler hem (gelecekte) admin manual
 * trigger doğrudan çağırabilir (CLAUDE.md §21.13 self-fetch antipattern).
 */
export async function runGoogleReviewsAlert() {
  // 1. Fetch all integrations that have locations configured
  const integrations = await prisma.googleIntegration.findMany({
    where: {
      locationsJson: { not: undefined },
    },
  });

  let processedCount = 0;
  let emailSentCount = 0;

  // 2. Iterate over each integration
  for (const integration of integrations) {
    if (!integration.locationsJson) continue;

    const cache = parseGoogleLocationsCache(integration.locationsJson);
    let cacheUpdated = false;

    // 3. Iterate over the restaurant selections within this integration
    for (const [restaurantId, selection] of Object.entries(cache.restaurantLocations)) {
      // Find if this restaurant is active and has googleReviewManagementEnabled
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          name: true,
          notificationEmail: true,
          isActive: true,
          googleReviewManagementEnabled: true,
          currentGoogleRating: true,
          // §38.197 — scheduledDeletionAt'i fetch + check (findUnique unique
          // field where'i destekler, kompoze filter için after-fetch check).
          user: { select: { email: true, scheduledDeletionAt: true } },
        },
      });

      if (
        !restaurant ||
        !restaurant.isActive ||
        !restaurant.googleReviewManagementEnabled ||
        // §38.197 — Hesabı silinmek üzere planlanmış owner'a Google düşük
        // puanlı yorum bildirimi gönderme (30g grace lifecycle suppression).
        restaurant.user?.scheduledDeletionAt
      ) {
        continue;
      }

      // Fetch reviews for this location
      try {
        const res = await listGoogleReviews(integration, selection);

        if (typeof res.averageRating === 'number' && res.averageRating !== restaurant.currentGoogleRating) {
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: { currentGoogleRating: res.averageRating },
          });
        }

        // Determine the cutoff time for new reviews
        // Default to 24 hours ago if no previous sync time exists
        const fallbackTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const cutoffTime = selection.lastReviewNotifiedAt || fallbackTime;

        let maxCreateTime = selection.lastReviewNotifiedAt || '';

        // Filter for low-rating reviews (<= 3 stars) that are newer than cutoffTime
        const newLowReviews = res.reviews.filter((review) => {
          const rating = review.starRating ? STAR_VALUE[review.starRating] ?? 0 : 0;
          const createTime = review.createTime || '';

          // Track the most recent review time we've seen
          if (createTime > maxCreateTime) {
            maxCreateTime = createTime;
          }

          return rating > 0 && rating <= 3 && createTime > cutoffTime;
        });

        // Honour the owner's alert preference — /api/feedback already gates the
        // in-house low-rating mail on `lowRatingEmail`, but this cron did not,
        // so an owner who had switched the alert off kept receiving it for
        // Google reviews. Preference off → no mail, but the watermark still
        // advances (they deliberately don't want these, so never retry).
        const notifPrefs = await getNotificationPrefsForRestaurant(restaurantId);
        const toEmail = restaurant.notificationEmail || restaurant.user?.email;

        // Send notifications for these new low reviews.
        let allDelivered = true;
        if (notifPrefs.lowRatingEmail && toEmail) {
          for (const review of newLowReviews) {
            const ok = await sendFeedbackNotification({
              rating: STAR_VALUE[review.starRating!] ?? 3,
              restaurantName: restaurant.name,
              name: review.reviewer?.displayName,
              comment: review.comment,
              platform: 'google',
              toEmail,
            });
            if (ok) {
              emailSentCount++;
            } else {
              // Do not burn the watermark on a review the owner never heard
              // about — the next run must retry it.
              allDelivered = false;
            }
          }
        } else if (notifPrefs.lowRatingEmail && !toEmail) {
          // No deliverable address at all: keep the watermark so the alert is
          // retried once the owner fills in a notification e-mail.
          allDelivered = newLowReviews.length === 0;
        }

        // Update lastReviewNotifiedAt — track max time across ALL reviews
        // fetched so we don't re-process them next run. Skipped entirely when
        // a send failed: previously the watermark advanced regardless of the
        // send result, so a single Resend hiccup meant that low-rating review
        // was marked "notified" and the owner never learned about it.
        let localMaxTime = cutoffTime;
        for (const review of res.reviews) {
          if ((review.createTime || '') > localMaxTime) {
            localMaxTime = review.createTime || '';
          }
        }

        if (allDelivered && localMaxTime > (selection.lastReviewNotifiedAt || '')) {
          selection.lastReviewNotifiedAt = localMaxTime;
          cacheUpdated = true;
        }

        processedCount++;
      } catch (err) {
        // Per-restaurant fail isolation. `googleBusinessFetch` already emits a
        // single Sentry event with `tags: { integration: 'google-business' }`;
        // here we just record a PII-safe local breadcrumb (restaurantId + code)
        // so this restaurant's watermark does not advance — next cron retries.
        if (err instanceof GoogleBusinessApiError) {
          console.error('[Cron] Google reviews skip', {
            restaurantId,
            code: err.code,
            requiresReauth: err.requiresReauth,
          });
        } else {
          console.error('[Cron] Google reviews unexpected error', { restaurantId });
        }
      }
    }

    // 4. Save updated locationsJson back to the integration if modified
    if (cacheUpdated) {
      await prisma.googleIntegration.update({
        where: { id: integration.id },
        data: {
          locationsJson: cache as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  return { ok: true, processedCount, emailSentCount };
}

export async function GET(req: NextRequest) {
  // CRON_SECRET fail-closed guard (CLAUDE.md §37.2 H)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runGoogleReviewsAlert();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[Cron] Google reviews alert failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
