import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    // Billing secrets are runtime-only (never available at build), so their
    // validation happens here. Reports names and codes only; flags fail
    // closed regardless. Never blocks startup.
    try {
      const { checkBillingRuntime } = await import('./src/lib/billing/flags');
      checkBillingRuntime();
    } catch {
      console.error('[billing] runtime check could not run');
    }
    // Open the Coolify Redis connection at startup so the first requests
    // already use it (CLAUDE.md §56). Never blocks or fails startup.
    try {
      const { getRedis } = await import('./src/lib/redis');
      getRedis();
    } catch {
      console.error('[redis] client could not start');
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Auto-captures all unhandled server-side request errors thrown from
// route handlers, server components, server actions, and middleware.
// Requires @sentry/nextjs >= 8.28.0.
export const onRequestError = Sentry.captureRequestError;
