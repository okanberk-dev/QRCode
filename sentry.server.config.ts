import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Görev A diagnostic — temporary: debug:true logs the SDK's own
// transport activity to stdout (Vercel runtime logs) so we can see
// why server-side envelope POSTs aren't reaching Sentry. The two
// suspects we removed:
//   - includeLocalVariables: true → Vercel serverless inspector may
//     not be available; SDK may fail to wire up the integration and
//     transport setup could stall as a side effect.
//   - enableLogs: true → new Sentry Logs feature changes ingest
//     payload shape; safer to disable while diagnosing.
// Once root cause is found we reinstate the production-safe shape
// and remove debug:true. CLAUDE.md §26 will record the outcome.
if (dsn) {
  Sentry.init({
    dsn,
    debug: true,
    // KVKK / GDPR: do not auto-send IP addresses, request bodies, or
    // user-identifiable headers. Capture them explicitly per-event when
    // needed and after legitimate-interest review.
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}
