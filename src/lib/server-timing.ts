/**
 * Server-Timing for panel APIs (CLAUDE.md §56).
 *
 * `withServerTiming(handler)` runs a route handler inside an AsyncLocalStorage
 * scope and adds a `Server-Timing` header to its response:
 *   auth      — getPanelActorFromRequest (JWT + session check)
 *   db        — wall-clock time with at least one Prisma query running
 *               (overlapping queries are counted once)
 *   ratelimit — rateLimit() calls
 *   google    — Google API calls (Business Profile, Places)
 *   total     — the whole handler
 * Browser DevTools (Network → Timing) shows these next to the request, so the
 * gap between "server time" and "browser time" is visible without logs.
 *
 * Outside a scope every helper is a no-op, so libraries can call them freely.
 * Values only: no names, ids or query text go into the header.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export type TimingPart = 'auth' | 'db' | 'ratelimit' | 'google';

interface Store {
  start: number;
  parts: Map<TimingPart, number>;
  dbActive: number;
  dbSince: number;
}

const als = new AsyncLocalStorage<Store>();

function add(store: Store, name: TimingPart, ms: number) {
  store.parts.set(name, (store.parts.get(name) ?? 0) + ms);
}

/** Time `fn` under `name` when a Server-Timing scope is active. */
export async function timed<T>(name: Exclude<TimingPart, 'db'>, fn: () => Promise<T>): Promise<T> {
  const store = als.getStore();
  if (!store) return fn();
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    add(store, name, performance.now() - t0);
  }
}

/** Prisma hook: wall-clock union of running queries (see lib/prisma.ts). */
export async function timedDb<T>(fn: () => Promise<T>): Promise<T> {
  const store = als.getStore();
  if (!store) return fn();
  if (store.dbActive === 0) store.dbSince = performance.now();
  store.dbActive += 1;
  try {
    return await fn();
  } finally {
    store.dbActive -= 1;
    if (store.dbActive === 0) add(store, 'db', performance.now() - store.dbSince);
  }
}

/** `auth;dur=1.2, db;dur=3.4, total;dur=6.0` (exported for tests). */
export function formatServerTiming(parts: Map<string, number>, totalMs: number): string {
  const items = [...parts.entries()].map(([k, v]) => `${k};dur=${v.toFixed(1)}`);
  items.push(`total;dur=${totalMs.toFixed(1)}`);
  return items.join(', ');
}

/** Wrap a route handler so its response carries a Server-Timing header. */
export function withServerTiming<A extends unknown[], R extends Response>(
  handler: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return (...args: A) => {
    const store: Store = { start: performance.now(), parts: new Map(), dbActive: 0, dbSince: 0 };
    return als.run(store, async () => {
      const res = await handler(...args);
      try {
        res.headers.append('Server-Timing', formatServerTiming(store.parts, performance.now() - store.start));
      } catch {
        // Immutable headers (e.g. Response.redirect) — skip the header.
      }
      return res;
    });
  };
}
