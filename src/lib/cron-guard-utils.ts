// Pure helpers for `withCronGuard` (src/lib/cron-guard.ts). Kept free of
// Sentry/Next imports so they can be unit-tested directly.

/** Vercel always invokes scheduled crons with this user agent. */
export function isVercelCronRequest(userAgent: string | null | undefined): boolean {
  return typeof userAgent === 'string' && userAgent.includes('vercel-cron');
}

/**
 * Status to hand back to Vercel's scheduler.
 *
 * Vercel e-mails a "cron run failed" alert for every non-2xx cron response.
 * Our crons already isolate per-row failures and capture them in Sentry, and
 * a 5xx here means the run hit an internal error that the next scheduled run
 * retries anyway — so a 5xx is downgraded to 200 and reported to Sentry
 * instead. 4xx is kept: a 401 means CRON_SECRET is misconfigured and the job
 * never ran, which must stay visible.
 */
export function cronSchedulerStatus(handlerStatus: number): number {
  return handlerStatus >= 500 ? 200 : handlerStatus;
}
