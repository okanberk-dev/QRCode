import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // KVKK / GDPR: do not auto-send IP addresses or user-identifiable
    // headers. Replay still masks all text + blocks media (defaults).
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    // No background session replay — only capture replays when an error
    // fires. Reduces Sentry quota burn and customer privacy footprint.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    integrations: [Sentry.replayIntegration()],
  });
}

// Required for Next.js 15 router transition tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
