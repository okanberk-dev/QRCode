import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

// Sentry smoke-test endpoint. Hit this once after wiring up SENTRY_DSN or
// NEXT_PUBLIC_SENTRY_DSN to confirm server errors actually reach the dashboard.
// Disabled in production by default — set ENABLE_SENTRY_TEST=1 if you need to
// test prod, then unset after verification.
//
// Why captureException + flush instead of throw:
// On Vercel serverless, the function process exits as soon as the response
// is returned. Sentry's envelope POST is async (~1-2s); a thrown error
// triggers `onRequestError` but the buffer is dropped when the process
// dies. `await Sentry.flush(2000)` waits up to 2s for the buffer to drain,
// so the event reliably reaches the dashboard. Same pattern is now used
// across other route handlers that emit Sentry events from a serverless
// runtime — see CLAUDE.md §26 for guidance.
export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SENTRY_TEST !== '1') {
    return NextResponse.json(
      { ok: false, message: 'Sentry test endpoint disabled in production. Set ENABLE_SENTRY_TEST=1 to enable.' },
      { status: 403 },
    );
  }

  Sentry.setTag('sentry.smoketest', 'true');
  const eventId = Sentry.captureException(
    new Error('[Sentry smoke test] Synthetic error from /api/sentry-test — safe to ignore.'),
  );

  // Wait up to 5s for the buffered envelope to reach Sentry before the
  // serverless function process is torn down. 2s was insufficient on
  // Vercel cold starts — DNS + TLS + envelope POST took ~3-4s and the
  // buffer was dropped, leaving Sentry empty even though `captureException`
  // returned a real event id. 5s sits well inside Vercel's 10s function
  // gateway timeout. CLAUDE.md §26 documents the ceiling.
  const flushed = await Sentry.flush(5000);

  return NextResponse.json({ ok: true, eventId, flushed }, { status: 500 });
}
