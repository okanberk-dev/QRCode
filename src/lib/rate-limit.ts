/**
 * Lightweight in-memory rate limiter.
 *
 * NOTE: On serverless platforms the Map is per-instance and resets on
 * cold starts. It still provides useful burst-protection and is sufficient
 * defence-in-depth alongside DB-level rate limiting where present.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check whether a key should be allowed under a rate limit rule.
 *
 * @param key  Unique identifier (e.g. "login:ip:1.2.3.4")
 * @param max  Maximum allowed requests in the window
 * @param windowMs  Window length in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, max - bucket.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Clear all limits for a key (e.g. on successful auth).
 */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

const BLOCK_SENTINEL = Number.MAX_SAFE_INTEGER;

/**
 * Hard-block a key for the given window. Subsequent rateLimit() calls
 * for this key return allowed=false until the window expires. Used by
 * reCAPTCHA when it detects a clear bot signal.
 */
export function blockKey(key: string, windowMs: number) {
  buckets.set(key, { count: BLOCK_SENTINEL, resetAt: Date.now() + windowMs });
}

/**
 * Returns true if the key has been hard-blocked (and the block hasn't
 * expired yet). Cheaper than rateLimit() because it doesn't increment.
 */
export function isBlocked(key: string): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= Date.now()) return false;
  return bucket.count >= BLOCK_SENTINEL;
}

/**
 * Extract a best-effort client IP from a request object.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  return headers.get('x-real-ip') || 'unknown';
}

// Periodic cleanup to stop the Map growing unbounded on long-lived instances.
// Runs lazily: only when new keys are inserted and some have expired.
let lastSweep = 0;
export function maybeSweep(now = Date.now()) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
  for (const [k, v] of failedAttempts) {
    if (v.resetAt <= now) failedAttempts.delete(k);
  }
}

// ---------------------------------------------------------------------------
// Failed-attempt counter (used by step-up reCAPTCHA gate).
//
// Different semantic from rateLimit():
//   - rateLimit() denies once a threshold is crossed.
//   - failed-attempt counter only *counts* — the route decides what to do
//     (e.g. require a captcha token from the next attempt onward).
//
// Same in-memory Map pattern; same per-instance caveat on serverless. The
// step-up is a UX optimisation, not a security boundary; rateLimit() and
// reCAPTCHA score gating remain authoritative.
// ---------------------------------------------------------------------------

const DEFAULT_FAIL_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const failedAttempts = new Map<string, Bucket>();

/**
 * Record a failed attempt against `key`. Returns the new count within the
 * current window. Window auto-resets when expired.
 */
export function recordFailedAttempt(
  key: string,
  windowMs: number = DEFAULT_FAIL_WINDOW_MS,
): { count: number } {
  const now = Date.now();
  const bucket = failedAttempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    failedAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return { count: 1 };
  }
  bucket.count += 1;
  return { count: bucket.count };
}

/** Read the current failed-attempt count without incrementing. */
export function getFailedAttemptCount(key: string): number {
  const bucket = failedAttempts.get(key);
  if (!bucket || bucket.resetAt <= Date.now()) return 0;
  return bucket.count;
}

/** Clear failed attempts for a key (call on successful auth). */
export function clearFailedAttempts(key: string): void {
  failedAttempts.delete(key);
}
