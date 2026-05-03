import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
        select: { name: true, notificationEmail: true, isActive: true, googleReviewManagementEnabled: true, currentGoogleRating: true, user: { select: { email: true } } },
      });

      if (!restaurant || !restaurant.isActive || !restaurant.googleReviewManagementEnabled) {
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

        // Send notifications for these new low reviews
        for (const review of newLowReviews) {
          const toEmail = restaurant.notificationEmail || restaurant.user?.email;
          if (toEmail) {
            await sendFeedbackNotification({
              rating: STAR_VALUE[review.starRating!] ?? 3,
              restaurantName: restaurant.name,
              name: review.reviewer?.displayName,
              comment: review.comment,
              platform: 'google',
              toEmail,
            });
            emailSentCount++;
          }
        }

        // Update lastReviewNotifiedAt — track max time across ALL reviews
        // fetched so we don't re-process them next run
        let localMaxTime = cutoffTime;
        for (const review of res.reviews) {
          if ((review.createTime || '') > localMaxTime) {
            localMaxTime = review.createTime || '';
          }
        }

        if (localMaxTime > (selection.lastReviewNotifiedAt || '')) {
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
          locationsJson: cache as any,
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
