/**
 * Bulk Google reply queue — the runner (CLAUDE.md §54). Storage, the Google
 * call and the quota are injected, so the rules are unit-tested without a DB:
 *
 *  - one item at a time, with a gap, under a lease (two runners never send
 *    the same job at once);
 *  - quota: every send first takes a slot from the Update-request budget
 *    (Google: 300/min, 10 000/day per project). Out of daily budget → the job
 *    pauses and resumes later; out of minute budget → the item waits;
 *  - 429 / 5xx / network → retried with exponential backoff (Retry-After
 *    respected), at most MAX_ATTEMPTS; a 429 also ends the current run;
 *  - idempotent: an item is claimed with a pending→sending compare-and-set,
 *    and a review that already has a reply (sent on Google or by another
 *    job) is skipped instead of sent again;
 *  - lost Google access (reauth) pauses the job until the owner reconnects.
 */

export type ReplyItemStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
export type ReplyJobStatus = 'running' | 'paused' | 'done';

export interface ReplyQueueItem {
  id: string;
  reviewId: string;
  comment: string;
  status: ReplyItemStatus;
  attempts: number;
  nextAttemptAt: Date | null;
}

export interface ReplyQueueStore {
  acquireLease(jobId: string, until: Date, now: Date): Promise<boolean>;
  releaseLease(jobId: string): Promise<void>;
  /** Items left in `sending` by a crashed runner go back to `pending`. */
  requeueStuck(jobId: string): Promise<void>;
  /** The next pending item due at `now` (oldest first). */
  nextDueItem(jobId: string, now: Date): Promise<ReplyQueueItem | null>;
  /** Earliest `nextAttemptAt` of a pending item that is not due yet. */
  nextPendingAt(jobId: string): Promise<Date | null>;
  /** pending → sending (attempts set); false if another runner took it. */
  claim(itemId: string, attempts: number): Promise<boolean>;
  reviewState(jobId: string, reviewId: string): Promise<{ exists: boolean; hasReply: boolean }>;
  markSent(itemId: string, at: Date, reply: { comment: string; updateTime?: string | null }): Promise<void>;
  markRetry(itemId: string, code: string, at: Date): Promise<void>;
  markFailed(itemId: string, code: string): Promise<void>;
  markSkipped(itemId: string, code: string): Promise<void>;
  setJobStatus(jobId: string, status: ReplyJobStatus): Promise<void>;
}

export type SendOutcome =
  | { ok: true; reply: { comment: string; updateTime?: string | null } }
  | {
      ok: false;
      code: string;
      retriable: boolean;
      /** Google said "too many requests": stop this run. */
      quota?: boolean;
      /** The Google connection must be renewed: pause the job. */
      reauth?: boolean;
      retryAfterSeconds?: number;
    };

export interface ReplySender {
  send(reviewId: string, comment: string): Promise<SendOutcome>;
}

export interface QuotaDecision {
  allowed: boolean;
  /** 'day' pauses the job; 'minute' only delays the item. */
  scope?: 'day' | 'minute';
  retryAfterSeconds?: number;
}

export interface ReplyQuotaGate {
  take(): Promise<QuotaDecision>;
}

export interface RunReplyQueueDeps {
  store: ReplyQueueStore;
  sender: ReplySender;
  quota: ReplyQuotaGate;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface RunReplyQueueOptions {
  budgetMs?: number;
  gapMs?: number;
  leaseMs?: number;
  maxAttempts?: number;
}

export interface RunReplyQueueSummary {
  busy: boolean;
  sent: number;
  failed: number;
  skipped: number;
  retried: number;
  stoppedFor: 'quota' | 'daily_quota' | 'reauth' | 'budget' | null;
  status: ReplyJobStatus | null;
}

export const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 10 * 60_000;

/** 5 s, 10 s, 20 s… capped at 10 min, never shorter than Retry-After. */
export function retryDelayMs(attempt: number, retryAfterSeconds?: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
  const floor = retryAfterSeconds && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 0;
  return Math.min(Math.max(exp, floor), 24 * 3600_000);
}

export async function runReplyQueue(
  jobId: string,
  deps: RunReplyQueueDeps,
  opts: RunReplyQueueOptions = {},
): Promise<RunReplyQueueSummary> {
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const budgetMs = opts.budgetMs ?? 240_000;
  const gapMs = opts.gapMs ?? 250;
  const leaseMs = opts.leaseMs ?? Math.max(60_000, budgetMs + 30_000);
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const { store, sender, quota } = deps;

  const summary: RunReplyQueueSummary = {
    busy: false,
    sent: 0,
    failed: 0,
    skipped: 0,
    retried: 0,
    stoppedFor: null,
    status: null,
  };

  const startedAt = now().getTime();
  if (!(await store.acquireLease(jobId, new Date(startedAt + leaseMs), now()))) {
    summary.busy = true;
    return summary;
  }

  try {
    await store.requeueStuck(jobId);
    let first = true;
    for (;;) {
      if (now().getTime() - startedAt > budgetMs) {
        summary.stoppedFor = 'budget';
        summary.status = 'running';
        break;
      }
      const item = await store.nextDueItem(jobId, now());
      if (!item) {
        const later = await store.nextPendingAt(jobId);
        summary.status = later ? 'running' : 'done';
        await store.setJobStatus(jobId, summary.status);
        break;
      }

      if (!first && gapMs > 0) await sleep(gapMs);
      first = false;

      const gate = await quota.take();
      if (!gate.allowed) {
        const wait = retryDelayMs(1, gate.retryAfterSeconds ?? (gate.scope === 'day' ? 3600 : 60));
        await store.markRetry(item.id, gate.scope === 'day' ? 'QUOTA_DAILY' : 'QUOTA_MINUTE', new Date(now().getTime() + wait));
        summary.retried++;
        if (gate.scope === 'day') {
          summary.stoppedFor = 'daily_quota';
          summary.status = 'paused';
          await store.setJobStatus(jobId, 'paused');
        } else {
          summary.stoppedFor = 'quota';
          summary.status = 'running';
        }
        break;
      }

      const attempts = item.attempts + 1;
      if (!(await store.claim(item.id, attempts))) continue;

      const review = await store.reviewState(jobId, item.reviewId);
      if (!review.exists) {
        await store.markSkipped(item.id, 'REVIEW_NOT_FOUND');
        summary.skipped++;
        continue;
      }
      if (review.hasReply) {
        await store.markSkipped(item.id, 'ALREADY_REPLIED');
        summary.skipped++;
        continue;
      }

      let outcome: SendOutcome;
      try {
        outcome = await sender.send(item.reviewId, item.comment);
      } catch {
        outcome = { ok: false, code: 'INTERNAL_ERROR', retriable: true };
      }

      if (outcome.ok) {
        await store.markSent(item.id, now(), outcome.reply);
        summary.sent++;
        continue;
      }
      if (outcome.reauth) {
        await store.markRetry(item.id, outcome.code, new Date(now().getTime() + retryDelayMs(attempts)));
        summary.retried++;
        summary.stoppedFor = 'reauth';
        summary.status = 'paused';
        await store.setJobStatus(jobId, 'paused');
        break;
      }
      if (outcome.retriable && attempts < maxAttempts) {
        await store.markRetry(
          item.id,
          outcome.code,
          new Date(now().getTime() + retryDelayMs(attempts, outcome.retryAfterSeconds)),
        );
        summary.retried++;
        if (outcome.quota) {
          summary.stoppedFor = 'quota';
          summary.status = 'running';
          break;
        }
        continue;
      }
      await store.markFailed(item.id, outcome.code);
      summary.failed++;
    }
  } finally {
    await store.releaseLease(jobId);
  }
  return summary;
}
