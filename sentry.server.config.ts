import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // KVKK / GDPR: do not auto-send IP addresses, request bodies, or
    // user-identifiable headers. Capture them explicitly per-event when
    // needed and after legitimate-interest review.
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    includeLocalVariables: true,
    enableLogs: true,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}
