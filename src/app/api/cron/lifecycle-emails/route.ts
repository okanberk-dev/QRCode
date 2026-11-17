import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { runLifecycleEmails } from '@/lib/lifecycle-email-rules';
import { runTrialReminders } from '@/lib/trial-reminders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Daily owner mail cron (CLAUDE.md §21.34 + §21.11), `0 8 * * *` UTC.
//
// One invocation runs both owner-facing daily mail jobs:
//   1. lifecycle rules — qr_not_downloaded (lifetime), first_feedback_tips
//      (lifetime), upgrade_suggestion (30-day cooldown); idempotent through
//      LifecycleEmailLog
//   2. trial reminders — 3 days and 1 day before the trial ends
// The trial reminders used to be a separate cron an hour later.
//
// Each job is isolated: if one throws, the other still runs and the error is
// reported in the response (withCronGuard turns a 5xx into 200 + Sentry so
// Vercel does not send "cron run failed" mail, §21.12).

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const errors: string[] = [];
  const lifecycle = await runLifecycleEmails().catch((err) => {
    console.error('[lifecycle-emails cron] lifecycle failed', err);
    errors.push('lifecycle');
    return null;
  });
  const trialReminders = await runTrialReminders().catch((err) => {
    console.error('[lifecycle-emails cron] trial reminders failed', err);
    errors.push('trial_reminders');
    return null;
  });

  if (errors.length === 2) {
    return NextResponse.json({ error: 'cron_failed', failed: errors }, { status: 500 });
  }
  return NextResponse.json({ ok: errors.length === 0, lifecycle, trialReminders, failed: errors });
}

export const GET = withCronGuard('/api/cron/lifecycle-emails', handleCron);
