/**
 * Owner alert mails for new Google reviews (CLAUDE.md §54).
 *
 * A sync (central queue, page-entry refresh, manual sync, admin refresh)
 * stores a new review with `notified_at` NULL; this module claims those rows
 * atomically and mails the owner for the low ones (1–3★, same rule and same
 * preference as the Buaze QR alert), labelled "Google yorumu geldi". No
 * Google API call happens here — the hourly `google-reviews-alert` cron is
 * only a safety net that retries what a sync left behind.
 */
import { prisma } from '@/lib/prisma';
import { getNotificationPrefsForUser } from '@/lib/notification-preferences';

/** A review older than this when first seen is recorded, never mailed. */
export const GOOGLE_ALERT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
/** Same threshold as the Buaze QR low-rating alert. */
export const GOOGLE_ALERT_MAX_RATING = 3;
/** Resend allows 2 requests/s (§21.39). */
const MAIL_GAP_MS = 550;

export interface PendingGoogleReview {
  id: string;
  rating: number | null;
  reviewerName: string | null;
  originalText: string | null;
  comment: string | null;
  createTime: Date | null;
}

/** Pure: should this claimed row produce a mail? (tested) */
export function shouldMailGoogleReview(
  row: Pick<PendingGoogleReview, 'rating' | 'createTime'>,
  now: Date,
): boolean {
  if (typeof row.rating !== 'number' || row.rating < 1 || row.rating > GOOGLE_ALERT_MAX_RATING) return false;
  if (!row.createTime) return false;
  return now.getTime() - row.createTime.getTime() <= GOOGLE_ALERT_WINDOW_MS;
}

export interface GoogleAlertSummary {
  claimed: number;
  sent: number;
  failed: number;
}

/**
 * Mails the owner about this business's new low Google reviews. Safe to call
 * from several places at once: rows are claimed with one UPDATE … RETURNING,
 * so a review is mailed at most once. A failed send releases its row for the
 * next attempt (until it ages out of the alert window).
 */
export async function notifyNewGoogleReviews(
  restaurantId: string,
  now: Date = new Date(),
): Promise<GoogleAlertSummary> {
  const summary: GoogleAlertSummary = { claimed: 0, sent: 0, failed: 0 };

  const claimed = await prisma.$queryRaw<PendingGoogleReview[]>`
    UPDATE "google_reviews"
    SET "notified_at" = ${now}
    WHERE "restaurant_id" = ${restaurantId} AND "notified_at" IS NULL
    RETURNING "id", "rating", "reviewer_name" AS "reviewerName", "original_text" AS "originalText",
              "comment", "create_time" AS "createTime"
  `;
  summary.claimed = claimed.length;
  const toMail = claimed.filter((row) => shouldMailGoogleReview(row, now));
  if (toMail.length === 0) return summary;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      isActive: true,
      notificationEmail: true,
      googleReviewManagementEnabled: true,
      user: { select: { id: true, email: true, scheduledDeletionAt: true } },
    },
  });
  // Paused business, switched-off module or an account about to be deleted:
  // the reviews stay recorded, no mail (§38.197).
  if (
    !restaurant ||
    !restaurant.isActive ||
    !restaurant.googleReviewManagementEnabled ||
    restaurant.user?.scheduledDeletionAt
  ) {
    return summary;
  }
  const prefs = await getNotificationPrefsForUser(restaurant.user?.id ?? null);
  if (!prefs.lowRatingEmail) return summary;

  const toEmail = restaurant.notificationEmail || restaurant.user?.email || null;
  const release = async (ids: string[]) => {
    if (ids.length === 0) return;
    await prisma.googleReview.updateMany({ where: { id: { in: ids } }, data: { notifiedAt: null } });
  };
  if (!toEmail) {
    // Retried once the owner fills in a notification address.
    await release(toMail.map((r) => r.id));
    summary.failed = toMail.length;
    return summary;
  }

  const { sendFeedbackNotification } = await import('@/lib/email');
  for (let i = 0; i < toMail.length; i++) {
    const row = toMail[i];
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, MAIL_GAP_MS));
    let ok = false;
    try {
      ok = await sendFeedbackNotification({
        rating: row.rating ?? GOOGLE_ALERT_MAX_RATING,
        restaurantName: restaurant.name,
        name: row.reviewerName,
        comment: row.originalText ?? row.comment,
        platform: 'google',
        source: 'google',
        toEmail,
        submittedAt: row.createTime,
      });
    } catch (err) {
      console.error('[google-review-alerts] send threw', {
        restaurantId,
        error: err instanceof Error ? err.name : 'unknown',
      });
    }
    if (ok) {
      summary.sent++;
    } else {
      summary.failed++;
      await release([row.id]);
    }
  }
  return summary;
}

/**
 * Safety net for the hourly cron: every business with an unhandled review.
 * Reads the database only.
 */
export async function notifyPendingGoogleReviews(
  opts: { maxBusinesses?: number; now?: Date } = {},
): Promise<GoogleAlertSummary & { businesses: number }> {
  const now = opts.now ?? new Date();
  const pending = await prisma.googleReview.findMany({
    where: { notifiedAt: null },
    distinct: ['restaurantId'],
    select: { restaurantId: true },
    take: opts.maxBusinesses ?? 200,
  });
  const total = { claimed: 0, sent: 0, failed: 0, businesses: pending.length };
  for (const { restaurantId } of pending) {
    try {
      const r = await notifyNewGoogleReviews(restaurantId, now);
      total.claimed += r.claimed;
      total.sent += r.sent;
      total.failed += r.failed;
    } catch (err) {
      console.error('[google-review-alerts] business skipped', {
        restaurantId,
        error: err instanceof Error ? err.name : 'unknown',
      });
    }
  }
  return total;
}
