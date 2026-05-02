import { NextResponse } from 'next/server';

// Lightweight uptime probe. Deliberately kept synchronous + DB-free so a
// monitoring service (Vercel Monitor, UptimeRobot, BetterStack) can hit
// it on a tight cadence without consuming Postgres connections or burning
// Upstash budget.
//
// `runtime: 'edge'` would shave ~100ms cold-start but introduces a
// runtime-environment difference from the rest of the app — staying on
// the default Node runtime keeps the probe representative.
//
// Response intentionally minimal:
//   - `ok: true`        constant the monitor can string-match on
//   - `ts: <ms>`        helps debug clock drift / cache freshness
//   - `commit: <sha>`   the deployed commit, if Vercel injected it
//
// No request body / query params are parsed — no validation surface, no
// rate-limit needed (cheaper than the rate-limit check itself).
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ts: Date.now(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    {
      // Never let a monitor hit the CDN — every probe must reach the origin.
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    },
  );
}
