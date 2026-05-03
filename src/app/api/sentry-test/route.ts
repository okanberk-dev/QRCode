import { NextResponse, after } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Hypothesis (c) — explicit Node.js runtime declaration. Verifies the
// instrumentation 'nodejs' branch in `instrumentation.ts:register()` is
// actually loaded for this route. CLAUDE.md §38.8 documents the suspected
// runtime mix as one of four hypotheses. Setting this explicitly removes
// any ambiguity Vercel might introduce when a route is implicitly edge or
// node based on imports.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sentry smoke-test endpoint. Hit this once after wiring up SENTRY_DSN or
// NEXT_PUBLIC_SENTRY_DSN to confirm server errors actually reach the
// dashboard. Disabled in production by default — set ENABLE_SENTRY_TEST=1
// if you need to test prod, then unset after verification.
//
// CLAUDE.md §38.8 deep-dive context:
//
// PR #377-380 sequence proved that `await Sentry.flush(N)` does not work on
// Vercel Node runtime: 4 deploy iterations, every flush returned `false`,
// no envelope reached Sentry even when `captureException` returned a real
// event id. PR #389 then proved this with live production data — a Prisma
// outage produced 12 server-side 500s and 0 Sentry events.
//
// Root cause (research, this PR): Sentry's internal `vercelWaitUntil`
// helper from `@sentry/core` only works in the Edge Runtime. In Node
// runtime it returns early and the SDK relies on `process.on('SIGTERM')`
// for the envelope POST to drain — but Vercel does not always send SIGTERM
// to Node functions before tear-down. So both `await Sentry.flush()` AND
// the auto-flush inside `Sentry.captureRequestError` (the `onRequestError`
// hook in `instrumentation.ts`) drop envelopes silently on Node.
//
// Fix tested here: schedule the flush via Next.js 15's `after()` helper,
// which wires into Vercel's `waitUntil()` primitive (GA for Node runtime
// since May 2024). The serverless function stays alive until the after()
// callback resolves, even after the response is returned.
//
// Diagnostic add-ons in this PR:
//   - process.stderr.write breadcrumbs verify the handler reached each
//     stage even if `console.*` output is filtered by Vercel runtime logs
//     (Hypothesis b in §38.8).
//   - Response payload echoes runtime + flush pattern so an ops engineer
//     can see at a glance which code path ran in production.
export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SENTRY_TEST !== '1') {
    return NextResponse.json(
      { ok: false, message: 'Sentry test endpoint disabled in production. Set ENABLE_SENTRY_TEST=1 to enable.' },
      { status: 403 },
    );
  }

  // Hypothesis (b) — direct stderr write. `console.error` / `console.log`
  // are sometimes dropped by Vercel runtime log capture; `process.stderr`
  // is captured reliably. These breadcrumbs let us correlate the request
  // with what the handler actually did even if Sentry never sees it.
  process.stderr.write(
    `[sentry-smoketest] handler entered, NEXT_RUNTIME=${process.env.NEXT_RUNTIME ?? 'unset'}, VERCEL=${process.env.VERCEL ?? 'unset'}\n`,
  );

  Sentry.setTag('sentry.smoketest', 'true');
  Sentry.setTag('flush.pattern', 'after-waituntil');

  const eventId = Sentry.captureException(
    new Error('[Sentry smoke test] Synthetic error from /api/sentry-test — diagnostic flush via after()'),
  );

  process.stderr.write(`[sentry-smoketest] captureException returned eventId=${eventId ?? 'undefined'}\n`);

  // Hypothesis (a) — schedule the flush via Next.js `after()`. This runs
  // the callback after the response is returned, but Vercel keeps the
  // function alive (via waitUntil) until the callback resolves. In
  // self-hosted environments without a waitUntil context, `after()` falls
  // back to running the callback inline — still safe, just blocks the
  // response. On Vercel Node runtime this is the documented canonical
  // pattern (Vercel + Next.js docs both recommend after() for post-
  // response work as of Next 15.1).
  after(async () => {
    process.stderr.write('[sentry-smoketest] after() callback running, calling flush(2000)\n');
    let flushed = false;
    try {
      flushed = await Sentry.flush(2000);
    } catch (err) {
      process.stderr.write(`[sentry-smoketest] flush threw: ${String(err)}\n`);
    }
    process.stderr.write(`[sentry-smoketest] flush completed, result=${flushed}\n`);
  });

  return NextResponse.json(
    {
      ok: true,
      eventId,
      runtime: process.env.NEXT_RUNTIME ?? 'unset',
      vercel: process.env.VERCEL === '1',
      flushPattern: 'after()-wrapped',
      note: 'Flush scheduled via Next.js 15 after(). Check Sentry dashboard within 30s.',
    },
    { status: 500 },
  );
}
