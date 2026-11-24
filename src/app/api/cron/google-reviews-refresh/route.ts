import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { runGoogleReviewRefreshQueue } from '@/lib/google-review-showcase';

// Central Google review refresh queue (CLAUDE.md §53). Every tenant shares
// ONE Google Cloud project quota, so refreshes never run per page view: this
// job takes the businesses whose turn has come (each refreshes every 6–12 h,
// spread over the day), fetches them one at a time with a gap, and stops the
// run as soon as Google or the global budget reports quota pressure.
// Coolify: every 15 min (docs/SELF_HOST.md). vercel.json: test contract only.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const summary = await runGoogleReviewRefreshQueue();
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = withCronGuard('/api/cron/google-reviews-refresh', handleCron);
