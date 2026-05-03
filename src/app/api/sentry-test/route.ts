import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

// Sentry smoke-test endpoint. Hit this once after wiring up SENTRY_DSN or
// NEXT_PUBLIC_SENTRY_DSN to confirm server errors actually reach the dashboard.
// Disabled in production by default — set ENABLE_SENTRY_TEST=1 if you need to
// test prod, then unset after verification.
export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SENTRY_TEST !== '1') {
    return NextResponse.json(
      { ok: false, message: 'Sentry test endpoint disabled in production. Set ENABLE_SENTRY_TEST=1 to enable.' },
      { status: 403 },
    );
  }

  // Tag the event so it's easy to find in the Sentry dashboard later.
  Sentry.setTag('sentry.smoketest', 'true');
  throw new Error('[Sentry smoke test] Synthetic error from /api/sentry-test — safe to ignore.');
}
