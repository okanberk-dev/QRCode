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
}
