// Wave B4 (CLAUDE.md §38.B + §38.193) — execute owner-initiated scheduled
// deletions.
//
// Daily 03:00 UTC. Finds users whose `scheduledDeletionAt <= now` and
// hard-deletes them via the shared cascade helper (CLAUDE.md §38.0 +
// §37.9). Owner had a 30-day grace window during which they could click
// the cancel link in the confirmation mail; if we got here without a
// cancel the wipe proceeds.
//
// Per-user try/catch isolation (CLAUDE.md §40.1) — one bad user (P2022
// drift, transient connection drop, Restaurant cascade hitting a stale
// FK) doesn't abort the rest of the batch. We just log + skip + retry
// tomorrow.

import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { executeUserHardDelete, isHardDeleteDeferred } from '@/lib/user-hard-delete';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Conservative batch — cascade delete on a User with 5+ restaurants and
// thousands of feedback rows can easily take 5-10 seconds; 50 per run
// keeps us under the 300s ceiling even in worst-case fan-out. Next-day
// cron picks up anything we skipped.
const BATCH_SIZE = 50;

interface ProcessSummary {
  candidates: number;
  deleted: number;
  /** Billing still in flight (pending payment / charge, at most 7 days): retried tomorrow. */
  deferred: number;
  failures: number;
  invoicesAnonymized: number;
  subscriptionsDeleted: number;
  auditRowsRedacted: number;
  durationMs: number;
}

export async function runScheduledDeletions(): Promise<ProcessSummary> {
  const start = Date.now();
  const now = new Date();

  // Pick up everyone whose grace window has elapsed. `isActive` is NOT a
  // filter here — admin-soft-deleted users with a scheduledDeletionAt
  // from a prior owner-initiated request still need their wipe; the
  // separate /api/account/delete handler refuses to schedule when the
  // user is already inactive, so this branch only ever fires once.
  const candidates = await prisma.user.findMany({
    where: {
      scheduledDeletionAt: { lte: now },
      // Defence: skip rows where token has already been cleared (shouldn't
      // happen but a manual SQL fix or a half-applied migration could
      // leave scheduledDeletionAt set + token null).
      NOT: { deletionCancelToken: null },
    },
    take: BATCH_SIZE,
    orderBy: { scheduledDeletionAt: 'asc' },
    select: { id: true, email: true, scheduledDeletionAt: true },
  });

  let deleted = 0;
  let deferred = 0;
  let failures = 0;
  let invoicesAnonymized = 0;
  let subscriptionsDeleted = 0;
  let auditRowsRedacted = 0;

  for (const candidate of candidates) {
    try {
      const stats = await executeUserHardDelete(candidate.id, candidate.email, {
        id: null,
        source: 'cron',
        action: 'cron.account.scheduled_delete',
        extra: {
          scheduledDeletionAt: candidate.scheduledDeletionAt?.toISOString() ?? null,
          executedAt: now.toISOString(),
          gracePolicy: '30d',
        },
      });
      if (isHardDeleteDeferred(stats)) {
        // A payment or automatic charge is in flight; the cron retries tomorrow (billing spec §11.6).
        deferred += 1;
        continue;
      }
      deleted += 1;
      invoicesAnonymized += stats.invoicesAnonymized;
      subscriptionsDeleted += stats.subscriptionsDeleted;
      auditRowsRedacted += stats.auditRowsRedacted;
    } catch (err) {
      failures += 1;
      const errName = err instanceof Error ? err.name : 'unknown';
      const errMessage = err instanceof Error ? err.message.slice(0, 200) : 'unknown';
      // CLAUDE.md §37.7 PII redaction — log userId, not email.
      console.error('[SCHEDULED_DELETION] cascade failed', {
        userId: candidate.id,
        errName,
        errMessage,
      });
      Sentry.captureException(err, {
        tags: { cron: 'process-scheduled-deletions' },
        extra: { userId: candidate.id },
      });
    }
  }

  return {
    candidates: candidates.length,
    deleted,
    deferred,
    failures,
    invoicesAnonymized,
    subscriptionsDeleted,
    auditRowsRedacted,
    durationMs: Date.now() - start,
  };
}

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runScheduledDeletions();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[SCHEDULED_DELETION] cron failed', err);
    Sentry.captureException(err, { tags: { cron: 'process-scheduled-deletions' } });
    const message = err instanceof Error ? err.message : 'cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/process-scheduled-deletions', handleCron);
