import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { notifyPendingGoogleReviews } from '@/lib/google-review-alerts';

// Google review alert safety net (CLAUDE.md §54). New Google reviews are
// mailed when a sync stores them (`notifyNewGoogleReviews`: central queue
// every 15 min, owner opening the Google Reviews page, manual/admin sync);
// this hourly run only retries rows a sync left unhandled (failed send,
// missing address, a request that ended early). It never calls Google — the
// old version listed every location's reviews here and burned the shared
// project quota a second time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/** Shared helper (§21.13) — the cron and a future admin trigger call it directly. */
export async function runGoogleReviewsAlert() {
  const summary = await notifyPendingGoogleReviews();
  return { ok: true, ...summary };
}

async function handleCron(req: NextRequest) {
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
    console.error('[Cron] Google reviews alert failed', { error: err instanceof Error ? err.name : 'unknown' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/google-reviews-alert', handleCron);
