import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // KVKK / GDPR — see comment in sentry.server.config.ts.
    sendDefaultPii: false,
    // Session Replay is browser-only; mirror the explicit 0 from server +
    // client configs to keep all three runtimes aligned. CLAUDE.md §26.2.
    replaysSessionSampleRate: 0,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    enableLogs: true,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  // CLAUDE.md §38.8/§38.9 follow-up — same cold-start signal as the server
  // config. Edge runtime cold starts are typically more frequent than node;
  // having a separate row distinguishes which runtime the route actually
  // ran on.
  console.error(`[sentry-init/edge] dsn=${describeDsn(dsn)} env=${process.env.VERCEL_ENV || process.env.NODE_ENV || 'unset'}`);
} else {
  console.error('[sentry-init/edge] dsn=unset — Sentry SDK not initialised on edge runtime');
}

function describeDsn(raw: string): string {
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\//, '') || 'unknown';
    return `${url.host}/${projectId}`;
  } catch {
    return 'invalid';
  }
}
