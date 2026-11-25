/**
 * Bulk Google reply jobs — database side (CLAUDE.md §54). The runner rules
 * live in google-reply-queue.ts; this file wires them to Prisma, the Google
 * API and the quota.
 */
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { writeAdminAuditLog } from '@/lib/audit-log';
import {
  GoogleBusinessApiError,
  ReplyContentBlockedError,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  updateGoogleReviewReply,
} from '@/lib/google-business';
import { recordReplyOnReview } from '@/lib/google-review-sync';
import { ReplyApprovalRequiredError } from '@/lib/reply-approval';
import {
  runReplyQueue,
  type ReplyJobStatus,
  type ReplyQueueItem,
  type ReplyQueueStore,
  type ReplyQuotaGate,
  type ReplySender,
  type RunReplyQueueSummary,
  type SendOutcome,
} from '@/lib/google-reply-queue';

/** Google's Update-request quota per project (we stay under it). */
export const GBP_UPDATES_PER_MINUTE = 300;
export const GBP_UPDATES_PER_DAY = 10_000;
export const MAX_BULK_ITEMS = 100;

export const ACTIVE_ITEM_STATUSES = ['pending', 'sending'] as const;

export function googleUpdateQuotaGate(): ReplyQuotaGate {
  return {
    async take() {
      const day = await rateLimit('gbp:update:day', GBP_UPDATES_PER_DAY, 24 * 3600_000);
      if (!day.allowed) return { allowed: false, scope: 'day', retryAfterSeconds: day.retryAfterSeconds };
      const minute = await rateLimit('gbp:update:min', GBP_UPDATES_PER_MINUTE, 60_000);
      if (!minute.allowed) return { allowed: false, scope: 'minute', retryAfterSeconds: minute.retryAfterSeconds };
      return { allowed: true };
    },
  };
}

function prismaReplyStore(restaurantId: string, audit: { actorId: string; actorSource: 'admin' | 'user' }): ReplyQueueStore {
  return {
    async acquireLease(jobId, until, now) {
      const res = await prisma.googleReplyJob.updateMany({
        where: { id: jobId, status: { not: 'done' }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
        data: { leaseUntil: until },
      });
      return res.count === 1;
    },
    async releaseLease(jobId) {
      await prisma.googleReplyJob.updateMany({ where: { id: jobId }, data: { leaseUntil: null } });
    },
    async requeueStuck(jobId) {
      await prisma.googleReplyJobItem.updateMany({
        where: { jobId, status: 'sending' },
        data: { status: 'pending' },
      });
    },
    async nextDueItem(jobId, now) {
      const row = await prisma.googleReplyJobItem.findFirst({
        where: { jobId, status: 'pending', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, reviewId: true, comment: true, status: true, attempts: true, nextAttemptAt: true },
      });
      return (row as ReplyQueueItem | null) ?? null;
    },
    async nextPendingAt(jobId) {
      const row = await prisma.googleReplyJobItem.findFirst({
        where: { jobId, status: 'pending' },
        orderBy: { nextAttemptAt: 'asc' },
        select: { nextAttemptAt: true },
      });
      return row ? row.nextAttemptAt ?? new Date() : null;
    },
    async claim(itemId, attempts) {
      const res = await prisma.googleReplyJobItem.updateMany({
        where: { id: itemId, status: 'pending' },
        data: { status: 'sending', attempts },
      });
      return res.count === 1;
    },
    async reviewState(_jobId, reviewId) {
      const row = await prisma.googleReview.findUnique({
        where: { restaurantId_reviewId: { restaurantId, reviewId } },
        select: { hasReply: true },
      });
      return { exists: Boolean(row), hasReply: Boolean(row?.hasReply) };
    },
    async markSent(itemId, at, reply) {
      const item = await prisma.googleReplyJobItem.update({
        where: { id: itemId },
        data: { status: 'sent', sentAt: at, errorCode: null, nextAttemptAt: null },
        select: { jobId: true, reviewId: true, comment: true },
      });
      await recordReplyOnReview(restaurantId, item.reviewId, reply);
      const review = await prisma.googleReview.findUnique({
        where: { restaurantId_reviewId: { restaurantId, reviewId: item.reviewId } },
        select: { reviewName: true },
      });
      if (review) {
        await prisma.googleReviewAiDraft.deleteMany({ where: { restaurantId, reviewName: review.reviewName } });
      }
      await writeAdminAuditLog({
        actorId: audit.actorId,
        actorSource: audit.actorSource,
        action: 'owner.google.review.bulk_reply_sent',
        targetId: restaurantId,
        payload: { jobId: item.jobId, reviewId: item.reviewId, comment: item.comment.slice(0, 1000) },
      });
    },
    async markRetry(itemId, code, at) {
      await prisma.googleReplyJobItem.update({
        where: { id: itemId },
        data: { status: 'pending', errorCode: code, nextAttemptAt: at },
      });
    },
    async markFailed(itemId, code) {
      await prisma.googleReplyJobItem.update({
        where: { id: itemId },
        data: { status: 'failed', errorCode: code, nextAttemptAt: null },
      });
    },
    async markSkipped(itemId, code) {
      await prisma.googleReplyJobItem.update({
        where: { id: itemId },
        data: { status: 'skipped', errorCode: code, nextAttemptAt: null },
      });
    },
    async setJobStatus(jobId, status) {
      await prisma.googleReplyJob.update({ where: { id: jobId }, data: { status } });
    },
  };
}

/** Maps a Google error to a queue outcome (retry, pause or fail). */
export function sendOutcomeFromError(err: unknown): Extract<SendOutcome, { ok: false }> {
  if (err instanceof ReplyContentBlockedError) return { ok: false, code: 'CONTENT_BLOCKED', retriable: false };
  if (err instanceof ReplyApprovalRequiredError) return { ok: false, code: 'APPROVAL_REQUIRED', retriable: false };
  if (err instanceof GoogleBusinessApiError) {
    const status = err.status;
    const code = err.code ?? 'GOOGLE_ERROR';
    if (err.requiresReauth || code === 'GOOGLE_REAUTH_REQUIRED' || code === 'GOOGLE_TENANT_NOT_ALLOWED') {
      return { ok: false, code, retriable: false, reauth: true };
    }
    if (status === 429 || code === 'GOOGLE_RATE_LIMITED') {
      return { ok: false, code, retriable: true, quota: true, retryAfterSeconds: err.retryAfterSeconds };
    }
    if (status >= 500 || code === 'GOOGLE_NETWORK_ERROR' || code === 'GOOGLE_SERVER_ERROR') {
      return { ok: false, code, retriable: true, retryAfterSeconds: err.retryAfterSeconds };
    }
    return { ok: false, code, retriable: false };
  }
  return { ok: false, code: 'INTERNAL_ERROR', retriable: true };
}

async function googleReplySender(restaurantId: string): Promise<ReplySender | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { userId: true, googleReviewManagementEnabled: true },
  });
  if (!restaurant?.userId || !restaurant.googleReviewManagementEnabled) return null;
  const integration = await prisma.googleIntegration.findUnique({ where: { userId: restaurant.userId } });
  if (!integration) return null;
  const selection = selectedGoogleLocation(parseGoogleLocationsCache(integration.locationsJson), restaurantId);
  if (!selection) return null;
  const prefix = `accounts/${selection.accountId}/locations/${selection.locationId}/reviews/`;
  return {
    async send(reviewId, comment) {
      if (!/^[A-Za-z0-9_-]+$/.test(reviewId)) return { ok: false, code: 'REVIEW_NOT_FOUND', retriable: false };
      try {
        const row = await prisma.googleReview.findFirst({
          where: { restaurantId, reviewId },
          select: { rating: true },
        });
        // Bulk/queue sends carry no per-review approval: 1–3★ is refused.
        const reply = await updateGoogleReviewReply(integration, `${prefix}${reviewId}`, comment, {
          rating: row?.rating ?? null,
          approval: null,
        });
        return { ok: true, reply: { comment: reply.comment ?? comment, updateTime: reply.updateTime ?? null } };
      } catch (err) {
        return sendOutcomeFromError(err);
      }
    },
  };
}

/** Runs one job for up to `budgetMs`. Safe to call concurrently (lease). */
export async function processReplyJob(
  jobId: string,
  opts: { budgetMs?: number } = {},
): Promise<RunReplyQueueSummary | null> {
  const job = await prisma.googleReplyJob.findUnique({
    where: { id: jobId },
    select: { restaurantId: true, actorId: true, actorSource: true, status: true },
  });
  if (!job || job.status === 'done') return null;
  const sender = await googleReplySender(job.restaurantId);
  const store = prismaReplyStore(job.restaurantId, {
    actorId: job.actorId,
    actorSource: job.actorSource === 'admin' ? 'admin' : 'user',
  });
  if (!sender) {
    // Connection or location gone: every pending item waits for a reconnect.
    await prisma.googleReplyJob.update({ where: { id: jobId }, data: { status: 'paused' } });
    return null;
  }
  return runReplyQueue(jobId, { store, sender, quota: googleUpdateQuotaGate() }, { budgetMs: opts.budgetMs ?? 240_000 });
}

/** Cron: picks up running jobs a crashed or timed-out request left behind. */
export async function resumeReplyJobs(opts: { maxJobs?: number; budgetMs?: number } = {}): Promise<number> {
  const now = new Date();
  const jobs = await prisma.googleReplyJob.findMany({
    where: { status: 'running', OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
    orderBy: { updatedAt: 'asc' },
    select: { id: true },
    take: opts.maxJobs ?? 5,
  });
  let ran = 0;
  for (const job of jobs) {
    const res = await processReplyJob(job.id, { budgetMs: opts.budgetMs ?? 60_000 });
    if (res && !res.busy) ran++;
  }
  return ran;
}

export interface ReplyJobProgress {
  id: string;
  status: ReplyJobStatus;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  items: { reviewId: string; status: string; errorCode: string | null }[];
}

export async function readReplyJobProgress(jobId: string, restaurantId: string): Promise<ReplyJobProgress | null> {
  const job = await prisma.googleReplyJob.findFirst({
    where: { id: jobId, restaurantId },
    select: {
      id: true,
      status: true,
      total: true,
      items: { select: { reviewId: true, status: true, errorCode: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!job) return null;
  const count = (s: string) => job.items.filter((i) => i.status === s).length;
  return {
    id: job.id,
    status: (job.status as ReplyJobStatus) ?? 'running',
    total: job.total,
    sent: count('sent'),
    failed: count('failed'),
    skipped: count('skipped'),
    pending: count('pending') + count('sending'),
    items: job.items,
  };
}
