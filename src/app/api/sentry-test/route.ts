import { NextResponse, after } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Explicit Node.js runtime — verifies the instrumentation 'nodejs' branch in
// `instrumentation.ts:register()` is loaded for this route. Removes ambiguity
// Vercel might introduce when a route is implicitly edge or node based on imports.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sentry smoke-test endpoint. Hit this once after wiring up SENTRY_DSN or
// NEXT_PUBLIC_SENTRY_DSN to confirm server errors actually reach the
// dashboard. Disabled in production by default — set ENABLE_SENTRY_TEST=1
// if you need to test prod, then unset after verification.
//
// CLAUDE.md §38.8/§38.9 deep-dive context:
//
// PR #377-380 sequence proved that `await Sentry.flush(N)` does not work on
// Vercel Node runtime: 4 deploy iterations, every flush returned `false`,
// no envelope reached Sentry even when `captureException` returned a real
// event id. PR #389 then proved this with live production data — a Prisma
// outage produced 12 server-side 500s and 0 Sentry events. PR #390 wrapped
// the flush in Next.js 15 `after()` (Vercel waitUntil) — eventId returned
// (`5de5663e...`) but Sentry still received nothing.
//
// This PR (diagnostic visibility): swap `process.stderr.write` breadcrumbs
// for `console.error`. Vercel runtime log API collapses all of a request's
// `stderr` writes into a single preview row, which made the `after()`
// diagnostic blind — we could not tell whether the callback ran or what
// `flush()` returned. `console.error` is captured as separate `level=error`
// rows (proven empirically: `[recaptcha] assessment api ...` warn lines
// appear as standalone rows in Vercel runtime logs while our 4 stderr
// breadcrumbs from the same request collapsed to 1 row). Once visibility
// is restored we can finally observe the after()/flush() behaviour and
// pick the next hypothesis.
//
// We also log a fingerprint of the configured DSN (host + project id only,
// never the public key or secret) so we can prove which Sentry project the
// envelope is being shipped to. This rules out the "wrong DSN routes to a
// project we have no visibility into" hypothesis.
export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SENTRY_TEST !== '1') {
    return NextResponse.json(
      { ok: false, message: 'Sentry test endpoint disabled in production. Set ENABLE_SENTRY_TEST=1 to enable.' },
      { status: 403 },
    );
  }

  const dsnFingerprint = describeDsn(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

  console.error(
    `[sentry-smoketest] handler entered NEXT_RUNTIME=${process.env.NEXT_RUNTIME ?? 'unset'} VERCEL=${process.env.VERCEL ?? 'unset'} dsn=${dsnFingerprint}`,
  );

  Sentry.setTag('sentry.smoketest', 'true');
  Sentry.setTag('flush.pattern', 'after-waituntil');

  const eventId = Sentry.captureException(
    new Error('[Sentry smoke test] Synthetic error from /api/sentry-test — diagnostic flush via after()'),
  );

  console.error(`[sentry-smoketest] captureException returned eventId=${eventId ?? 'undefined'}`);

  // Schedule the flush via Next.js `after()`. The callback runs after the
  // response is returned; on Vercel Node runtime the function stays alive
  // via `waitUntil()` until the callback resolves. Self-hosted environments
  // without a waitUntil context fall back to running the callback inline.
  after(async () => {
    console.error('[sentry-smoketest] after() callback running, calling flush(2000)');
    let flushed = false;
    try {
      flushed = await Sentry.flush(2000);
    } catch (err) {
      console.error(`[sentry-smoketest] flush threw: ${String(err)}`);
    }
    console.error(`[sentry-smoketest] flush completed result=${flushed}`);
  });

  return NextResponse.json(
    {
      ok: true,
      eventId,
      runtime: process.env.NEXT_RUNTIME ?? 'unset',
      vercel: process.env.VERCEL === '1',
      dsn: dsnFingerprint,
      flushPattern: 'after()-wrapped',
      note: 'Flush scheduled via Next.js 15 after(). Check Vercel runtime logs for the 4 console.error breadcrumbs; check Sentry dashboard within 30s.',
    },
    { status: 500 },
  );
}

// Returns a non-secret DSN fingerprint suitable for log output: host plus
// project id only. Sentry DSNs follow `https://<publicKey>@<host>/<projectId>`;
// we strip the public key (auth-bearing) and never expose the URL whole.
function describeDsn(raw: string | undefined): string {
  if (!raw) return 'unset';
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\//, '') || 'unknown';
    return `${url.host}/${projectId}`;
  } catch {
    return 'invalid';
  }
}
