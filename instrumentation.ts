import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Auto-captures all unhandled server-side request errors thrown from
// route handlers, server components, server actions, and middleware.
// Requires @sentry/nextjs >= 8.28.0.
export const onRequestError = Sentry.captureRequestError;
