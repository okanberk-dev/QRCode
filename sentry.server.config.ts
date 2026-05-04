import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // KVKK / GDPR: do not auto-send IP addresses, request bodies, or
    // user-identifiable headers. Capture them explicitly per-event when
    // needed and after legitimate-interest review.
    sendDefaultPii: false,
    // Session Replay is browser-only; the Node SDK ignores this option.
    // Setting it explicitly here keeps the server config in lock-step with
    // the client config (see instrumentation-client.ts) so a future SDK
    // bump cannot quietly enable a server replay path. CLAUDE.md §26.2
    // documents the canonical 0 / 1.0 (off / on-error) split.
    replaysSessionSampleRate: 0,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    includeLocalVariables: true,
    enableLogs: true,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}
