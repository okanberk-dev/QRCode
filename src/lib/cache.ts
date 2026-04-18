/**
 * Lightweight caching layer backed by Upstash Redis (REST API).
 *
 * Why Upstash REST: serverless-safe (stateless HTTP, no TCP pool) — perfect
 * for Vercel. Falls back to a no-op when env vars are missing so local dev
 * and preview environments keep working without Redis.
 *
 * Env:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Usage:
 *   const data = await cacheOrFetch(key, 300, async () => expensiveQuery());
 *   await cacheInvalidate(keyPattern);
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

function isEnabled(): boolean {
  return !!(REDIS_URL && REDIS_TOKEN);
}

async function redisFetch(command: string[]): Promise<any> {
  if (!isEnabled()) return null;
  try {
    const res = await fetch(REDIS_URL!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      // Never let Next.js cache the HTTP response itself.
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn('[cache] Upstash error:', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json.result;
  } catch (err) {
    console.warn('[cache] Upstash fetch failed:', err);
    return null;
  }
}

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const raw = await redisFetch(['GET', key]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!isEnabled()) return;
  const payload = JSON.stringify(value);
  await redisFetch(['SET', key, payload, 'EX', String(Math.max(1, ttlSeconds))]);
}

/**
 * Delete every key matching a simple prefix, using SCAN in batches.
 * Safe for small/medium keyspaces (we only ever cache short-lived analytics).
 */
export async function cacheInvalidatePrefix(prefix: string): Promise<void> {
  if (!isEnabled()) return;
  const match = `${prefix}*`;
  let cursor = '0';
  // Loop until cursor returns to "0" or we've done enough rounds to protect
  // against pathological keyspaces.
  for (let i = 0; i < 20; i++) {
    const result = await redisFetch(['SCAN', cursor, 'MATCH', match, 'COUNT', '100']);
    if (!result || !Array.isArray(result)) return;
    cursor = String(result[0] ?? '0');
    const keys: string[] = Array.isArray(result[1]) ? result[1] : [];
    if (keys.length > 0) {
      await redisFetch(['DEL', ...keys]);
    }
    if (cursor === '0') return;
  }
}

/**
 * Fetch a cached value or compute it. On any cache error the fetcher still
 * runs — the cache is a pure optimisation, never a dependency.
 */
export async function cacheOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!isEnabled()) return fetcher();

  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;

  const value = await fetcher();
  // Fire-and-forget: don't let a slow SET block the response.
  void cacheSet(key, value, ttlSeconds).catch(() => {});
  return value;
}

export const cacheEnabled = isEnabled;
