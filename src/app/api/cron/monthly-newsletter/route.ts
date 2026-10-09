import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { runMonthlyNewsletter } from '@/lib/monthly-newsletter';

// CRITICAL — Vercel Pro defaults function timeout to 60s when these are
// unset. The monthly newsletter iterates every active subscriber (Resend
// HTTP layer + 120ms throttle to stay under the 10/sec rate limit), so a
// 1000-subscriber send takes ~120s and was silently timing out → cron
// silently succeeded with partial sends. CLAUDE.md §38.11 cron checklist.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Monthly newsletter cron.
 *
 * Schedule: 0 9 1 * * (Vercel Cron, see vercel.json) — first of every month.
 * Auth: Bearer CRON_SECRET (Vercel Cron sets this header automatically).
 */
async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runMonthlyNewsletter();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[MONTHLY_NEWSLETTER]', error);
    return NextResponse.json(
      { error: 'newsletter_failed', message: (error as Error).message },
      { status: 500 },
    );
  }
}

export const GET = withCronGuard('/api/cron/monthly-newsletter', handleCron);
