import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { runBirthdayNotices } from '@/lib/loyalty-push';
import { runWinbackMails } from '@/lib/loyalty-winback';
import { resolveDisplayTimeZone } from '@/lib/timezone';

// Loyalty card daily run (CLAUDE.md §61): birthday notifications to cards
// with notifications on, then win-back e-mails of the programs that turned
// them on. Both are idempotent per member (birthday once a year, win-back
// once per 90 days), so a retry or a second run sends nothing twice.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function handleCron(req: NextRequest) {
  // CRON_SECRET fail-closed guard (CLAUDE.md §37.2 H)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const now = new Date();
    const birthdays = await runBirthdayNotices(now, resolveDisplayTimeZone());
    const winback = await runWinbackMails(now);
    return NextResponse.json({ ok: true, birthdays, winback });
  } catch (err) {
    console.error('[Cron] loyalty-daily failed', { error: err instanceof Error ? err.name : 'unknown' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/loyalty-daily', handleCron);
