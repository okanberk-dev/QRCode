import { NextResponse, after } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { postSentryEnvelopeManually } from '@/lib/sentry-manual-envelope';

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

  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  const dsnFingerprint = describeDsn(dsn);

  console.error(
    `[sentry-smoketest] handler entered NEXT_RUNTIME=${process.env.NEXT_RUNTIME ?? 'unset'} VERCEL=${process.env.VERCEL ?? 'unset'} dsn=${dsnFingerprint}`,
  );

  Sentry.setTag('sentry.smoketest', 'true');
  Sentry.setTag('flush.pattern', 'after-waituntil');

  const eventId = Sentry.captureException(
    new Error('[Sentry smoke test] Synthetic error from /api/sentry-test — diagnostic flush via after()'),
  );

  console.error(`[sentry-smoketest] captureException returned eventId=${eventId ?? 'undefined'}`);

  // Stage 17 §38.88 — manual envelope POST diagnostic. SDK akışına dokunmaz,
  // yan yana ikinci bir capture yapar (farklı eventId, farklı yol). Bu
  // sayede SDK transport bug mı (manual ulaşıyor, SDK ulaşmıyor) yoksa
  // egress firewall mı (ikisi de ulaşmıyor) net görülür.
  const manualEventId = randomEventId();
  const manualResult = await postSentryEnvelopeManually({
    dsn,
    eventId: manualEventId,
    message:
      '[Sentry manual transport] Synthetic event from /api/sentry-test — bypasses @sentry/nextjs SDK to disambiguate transport vs egress.',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  console.error(
    `[sentry-manual-transport] eventId=${manualEventId} ok=${manualResult.ok} ` +
      `status=${manualResult.status} statusText=${manualResult.statusText || 'n/a'} ` +
      `host=${manualResult.endpointHost} durationMs=${manualResult.durationMs} ` +
      `error=${manualResult.error ?? 'none'} body=${manualResult.bodyPreview ?? 'null'}`,
  );

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
      sdk: {
        eventId,
        flushPattern: 'after()-wrapped',
      },
      manualTransport: {
        eventId: manualEventId,
        ok: manualResult.ok,
        status: manualResult.status,
        statusText: manualResult.statusText,
        host: manualResult.endpointHost,
        durationMs: manualResult.durationMs,
        error: manualResult.error ?? null,
        bodyPreview: manualResult.bodyPreview,
      },
      runtime: process.env.NEXT_RUNTIME ?? 'unset',
      vercel: process.env.VERCEL === '1',
      dsn: dsnFingerprint,
      note:
        'Two parallel capture paths — SDK (after()-flushed) and manual envelope POST (SDK bypassed). ' +
        'Compare Sentry dashboard: if only manualTransport.eventId appears → SDK transport bug. ' +
        'If neither → likely Vercel egress restriction. If both → flush race resolved.',
    },
    { status: 500 },
  );
}

// Sentry event id format: 32 lowercase hex characters. crypto.randomUUID
// returns canonical 8-4-4-4-12 — strip dashes so the id matches what the
// dashboard accepts.
function randomEventId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, '');
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
