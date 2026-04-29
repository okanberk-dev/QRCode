import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyNewsletter } from '@/lib/monthly-newsletter';

/**
 * Monthly newsletter cron.
 *
 * Schedule: 0 9 1 * * (Vercel Cron, see vercel.json) — first of every month.
 * Auth: Bearer CRON_SECRET (Vercel Cron sets this header automatically).
 */
export async function GET(req: NextRequest) {
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
