import { NextRequest, NextResponse, after } from 'next/server';
import { ApiErrors } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';
import { gateGoogleReviewRoute } from '@/lib/google-review-route';
import { processReplyJob, readReplyJobProgress } from '@/lib/google-reply-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Progress of a bulk reply job. A running job whose runner is gone (lease
 * expired) and that has items due is restarted from here, so the page's
 * polling alone keeps a job moving.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  const { id, jobId } = await params;
  const gate = await gateGoogleReviewRoute(req, id);
  if (!gate.ok) return gate.response;

  const progress = await readReplyJobProgress(jobId, id);
  if (!progress) return ApiErrors.notFound(gate.locale === 'tr' ? 'Gönderim bulunamadı.' : 'Job not found.');

  if (progress.status === 'running' && progress.pending > 0) {
    const now = new Date();
    const stale = await prisma.googleReplyJob.findFirst({
      where: { id: jobId, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      select: { id: true },
    });
    if (stale) {
      after(async () => {
        await processReplyJob(jobId, { budgetMs: 280_000 }).catch(() => undefined);
      });
    }
  }

  return NextResponse.json(progress, { headers: { 'Cache-Control': 'private, no-store' } });
}
