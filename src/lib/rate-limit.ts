/**
 * Distributed rate limiter — Upstash Redis with in-memory fallback.
 *
 * On Vercel serverless every cold start gets a fresh process, so in-memory
 * Maps reset per-instance and only provide weak burst protection. This module
 * uses Upstash Ratelimit (sliding-window) when `KV_REST_API_URL` and
 * `KV_REST_API_TOKEN` are set in env (Vercel Marketplace integration auto-
 * provisions these), and falls back to the legacy in-memory Map otherwise so
 * local dev keeps working without any extra setup.
 *
 * Public API stays the same shape (`{ allowed, remaining, retryAfterSeconds }`)
 * but `rateLimit()` is now async — callers must `await` it.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import type IORedis from 'ioredis';
import { getRedis, redisReady } from './redis';
import { timed } from './server-timing';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// ── Upstash setup (only when env is configured) ─────────────────────
// Vercel Marketplace populates `KV_REST_API_URL` + `KV_REST_API_TOKEN`
// automatically. Plain `UPSTASH_REDIS_REST_URL` is also accepted so this
// module works with bare-metal Upstash projects too.
const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

/**
 * Counter store (CLAUDE.md §56), in order:
 *   1. `REDIS_URL` — the Coolify Redis next to the app (sub-millisecond);
 *   2. Upstash REST (`KV_REST_API_*`) — only when REDIS_URL is unset (kept
 *      until 2026-12-09 as the rollback path; it lives in another region);
 *   3. in-process memory.
 * Any store error falls back to memory for that call: a rate-limit outage
 * never blocks or crashes a request.
 */
const redis: Redis | null =
  !process.env.REDIS_URL && REST_URL && REST_TOKEN ? new Redis({ url: REST_URL, token: REST_TOKEN }) : null;

// Sliding window counter (the same algorithm Upstash uses): the previous
// window's count weighted by how much of it still overlaps, plus the current
// window's count. One round trip, atomic.
const SLIDING_WINDOW_LUA = `
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
local p = tonumber(redis.call('GET', KEYS[2]) or '0')
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local elapsed = tonumber(ARGV[3])
local weighted = p * ((window - elapsed) / window) + c
if weighted >= limit then return {0, c, p} end
c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], window * 2 + 1000) end
return {1, c, p}
`;

async function rateLimitRedis(
  client: IORedis,
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const elapsed = now - bucket * windowMs;
  const base = `bz:rl:${max}:${windowMs}:${key}`;
  const [allowed, current, previous] = (await client.eval(
    SLIDING_WINDOW_LUA,
    2,
    `${base}:${bucket}`,
    `${base}:${bucket - 1}`,
    max,
    windowMs,
    elapsed,
  )) as [number, number, number];
  const weighted = previous * ((windowMs - elapsed) / windowMs) + current;
  return {
    allowed: allowed === 1,
    remaining: Math.max(0, Math.floor(max - weighted)),
    retryAfterSeconds: allowed === 1 ? 0 : Math.max(1, Math.ceil((windowMs - elapsed) / 1000)),
  };
}

// Ratelimit instances are cached by `${max}:${windowMs}` so we don't pay
// the Upstash RTT for re-creating the limiter on every call.
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(max: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${max}:${windowMs}`;
  const cached = limiterCache.get(key);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis,
    // Sliding window — smoother than fixed buckets, prevents the
    // "double the limit at the boundary" exploit.
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    prefix: 'bz:rl',
    analytics: false,
    timeout: 800, // ms — fail-open: don't block the request if Redis is slow.
  });
  limiterCache.set(key, limiter);
  return limiter;
}

// ── In-memory fallback (legacy behaviour, works without Upstash) ────
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimitInMemory(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);
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

// ── Public API ──────────────────────────────────────────────────────

/**
 * Check whether a key should be allowed under a rate limit rule.
 *
 * Tries Upstash first; falls back to in-memory if Upstash is unconfigured
 * or returns an error (network blip, timeout). Fail-open: if everything
 * fails the request is allowed — defence-in-depth, not a hard gate.
 *
 * @param key  Unique identifier (e.g. "feedback:ip:1.2.3.4")
 * @param max  Maximum allowed requests in the window
 * @param windowMs  Window length in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  return timed('ratelimit', () => rateLimitImpl(key, max, windowMs));
}

async function rateLimitImpl(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  const local = getRedis();
  if (redisReady(local)) {
    try {
      return await rateLimitRedis(local, key, max, windowMs);
    } catch {
      // Slow / failed command — memory for this call (logged by lib/redis).
    }
  }
  const limiter = getLimiter(max, windowMs);
  if (limiter) {
    try {
      const { success, remaining, reset } = await limiter.limit(key);
      return {
        allowed: success,
        remaining: Math.max(0, remaining),
        retryAfterSeconds: success ? 0 : Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
      };
    } catch (err) {
      // Network/timeout/auth — log once and fall through. We prefer to
      // keep the site responsive over enforcing a hard limit during an
      // outage of the rate-limit backend.
      console.error('[rate-limit] Upstash error, falling back to in-memory:', err);
    }
  }
  return rateLimitInMemory(key, max, windowMs);
}

/**
 * Clear the in-memory bucket for a key. Used by login flow on successful
 * auth to forgive prior failed attempts. Note: only affects in-memory
 * fallback — Upstash entries expire on their own TTL.
 */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

const BLOCK_SENTINEL = Number.MAX_SAFE_INTEGER;

/**
 * Hard-block a key for the given window. Subsequent rateLimit() calls
 * for this key return allowed=false until the window expires. Used by
 * reCAPTCHA when it detects a clear bot signal.
 *
 * In-memory only — block enforcement is best-effort defense; admin login
 * (the only consumer) is low-volume so per-instance state is sufficient.
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

// Periodic cleanup to stop the in-memory Map growing unbounded on long-lived
// instances. Runs lazily: only when new keys are inserted and some have
// expired. Upstash entries expire automatically via Redis TTL — no sweep
// needed for distributed mode.
let lastSweep = 0;
export function maybeSweep(now = Date.now()) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

/**
 * Whether this process is using Upstash Redis (true) or the in-memory
 * fallback (false). Useful for diagnostics; not consumed by route logic.
 */
export const isDistributedRateLimit = Boolean(process.env.REDIS_URL) || redis !== null;
