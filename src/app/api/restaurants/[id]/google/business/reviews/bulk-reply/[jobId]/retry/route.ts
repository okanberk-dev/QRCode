import { NextRequest, NextResponse, after } from 'next/server';
import { ApiErrors } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { gateConnectedGoogleReviewRoute } from '@/lib/google-review-route';
import { processReplyJob, readReplyJobProgress } from '@/lib/google-reply-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Puts the failed items of a job back in the queue (and resumes a paused
 * job, e.g. after a reconnect). Items that were sent are never sent again;
 * the runner also skips a review that got a reply meanwhile.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  const { id, jobId } = await params;
  const ctx = await gateConnectedGoogleReviewRoute(req, id, { write: true });
  if (!ctx.ok) return ctx.response;

  const limit = await rateLimit(`google-review-bulk-retry:${ctx.actor.id}:${id}`, 10, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(undefined, 'RATE_LIMITED', limit.retryAfterSeconds);
  }

  const job = await prisma.googleReplyJob.findFirst({ where: { id: jobId, restaurantId: id }, select: { id: true } });
  if (!job) return ApiErrors.notFound(ctx.locale === 'tr' ? 'Gönderim bulunamadı.' : 'Job not found.');

  await prisma.$transaction([
    prisma.googleReplyJobItem.updateMany({
      where: { jobId, status: 'failed' },
      data: { status: 'pending', attempts: 0, nextAttemptAt: null, errorCode: null },
    }),
    prisma.googleReplyJobItem.updateMany({
      where: { jobId, status: 'pending' },
      data: { nextAttemptAt: null },
    }),
    prisma.googleReplyJob.update({ where: { id: jobId }, data: { status: 'running' } }),
  ]);

  after(async () => {
    await processReplyJob(jobId, { budgetMs: 280_000 }).catch(() => undefined);
  });

  return NextResponse.json(await readReplyJobProgress(jobId, id));
}
