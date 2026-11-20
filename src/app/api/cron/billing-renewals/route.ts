import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { isCronAuthorized } from '@/lib/cron-auth';
import { runBillingRenewals } from '@/lib/billing/renewal-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Billing renewal engine (billing spec §8.5, §9; CLAUDE.md §44.5).
//
// Coolify Scheduled Task `billing-renewals`, hourly (`25 * * * *` UTC,
// `node scripts/cron.mjs /api/cron/billing-renewals`). The vercel.json entry
// is a daily test contract only. The engine enforces its own 240 s budget
// (maxDuration is ignored under `next start`) and is single-flighted by the
// billing_settings tick lease. Nothing runs unless the PayNKolay environment
// binding holds. This release reconciles, lapses, finishes erasure
// tombstones, runs the daily scans and retention; it never charges a card.
//
// The response carries only counters — no PII, no provider data.

async function handleCron(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const summary = await runBillingRenewals();
  const phases = ['reconcile', 'lapse', 'tombstones', 'daily_scan', 'retention'];
  if (summary.skipped === null && phases.every((p) => summary.failedPhases.includes(p))) {
    return NextResponse.json({ ok: false, ...summary }, { status: 500 });
  }
  return NextResponse.json(
    { ok: summary.failedPhases.length === 0, ...summary },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export const GET = withCronGuard('/api/cron/billing-renewals', handleCron);
