/**
 * Server-side guard rails for billed Google Places calls.
 *
 * Why Postgres and not `rateLimit()`: `src/lib/rate-limit.ts` is Upstash-backed
 * with an 800 ms fail-open timeout and falls back to a per-instance in-memory
 * Map when Upstash is unconfigured or errors — a "global" ceiling built on it
 * is neither global nor enforced on Vercel. Only the database gives a shared
 * hard ceiling, so every billed call (Place Details and Text Search) is
 * RESERVED here, before the Google request, with one atomic statement:
 *
 *   INSERT … ON CONFLICT (key) DO UPDATE SET count = count + 1
 *   WHERE count < cap RETURNING count
 *
 * Zero returned rows means the cap is reached. `rateLimit()` stays in the
 * routes only as a soft per-actor burst limiter, never as the ceiling.
 *
 * The table holds a key and a count — no Places content, no personal data.
 * Spec: scratchpad feature_google.md §4.3/§4.4/§4.7.
 */

import * as Sentry from '@sentry/nextjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { PlacesFailureInfo, PlacesReserveOutcome } from '@/lib/google-places';

export type PlacesCallKind = 'details' | 'search';

/**
 * Defaults (UTC day). Even if every cap saturates every day the worst case is
 * about 150 × $0.025 + 200 × $0.032 ≈ $10/day; realistic use is a few dollars
 * a month. Tunable per deployment with the env vars below.
 */
export const PLACES_CAP_DEFAULTS = {
  details: { global: 150, scoped: 30 },
  search: { global: 200, scoped: 20 },
} as const;

const CAP_ENV = {
  details: { global: 'PLACES_DETAILS_DAILY_CAP', scoped: 'PLACES_DETAILS_RESTAURANT_DAILY_CAP' },
  search: { global: 'PLACES_SEARCH_DAILY_CAP', scoped: 'PLACES_SEARCH_RESTAURANT_DAILY_CAP' },
} as const;

/**
 * Cap for a kind + level. Env unset or blank → the default. A value that is
 * set but not a number is treated as 0 (deny): a typo must never silently
 * remove the ceiling.
 */
export function resolvePlacesCap(
  kind: PlacesCallKind,
  level: 'global' | 'scoped',
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env[CAP_ENV[kind][level]];
  if (raw === undefined || raw.trim() === '') return PLACES_CAP_DEFAULTS[kind][level];
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

/** `g`, `r:<restaurantId>` or `a:<actorId>`. Ids are cuids / uuids. */
const SCOPE_RE = /^(?:g|[ra]:[A-Za-z0-9_-]{1,64})$/;

/** UTC calendar day, `YYYY-MM-DD`. */
export function placesUtcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Seconds until the counters roll over (next UTC midnight) — for `Retry-After`. */
export function placesSecondsUntilReset(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

export function placesUsageKey(kind: PlacesCallKind, scope: string, now: Date = new Date()): string {
  return `${kind}:${scope}:${placesUtcDay(now)}`;
}

export type PlacesReservationReason = 'cap_reached' | 'cap_disabled' | 'bad_scope' | 'db_error';

export interface PlacesReservation {
  allowed: boolean;
  /** Counter value after the reservation (0 when denied without touching it). */
  count: number;
  reason?: PlacesReservationReason;
}

/** Minimal client surface so tests can inject a fake. */
export interface PlacesBudgetDb {
  $queryRaw: (query: Prisma.Sql) => Promise<unknown>;
}

let lastDbErrorReportAt = 0;

function describeError(err: unknown): { errorName: string; errorMessage: string } {
  return {
    errorName: err instanceof Error ? err.name : typeof err,
    errorMessage: String(err instanceof Error ? err.message : err).slice(0, 200),
  };
}

/**
 * Reserve ONE billed call. Fail closed: any database error returns
 * `allowed: false` (the UI shows the global-limit copy). A cap ≤ 0 (or a
 * non-finite one) denies WITHOUT touching the database — the INSERT branch
 * has no WHERE, so it would otherwise admit the first call of a zero cap.
 * Reservation is made BEFORE the Google call; a later denial on a wider
 * scope wastes one count on the narrower one, which is acceptable.
 */
export async function reservePlacesCall(
  kind: PlacesCallKind,
  scope: string,
  cap: number,
  opts: { db?: PlacesBudgetDb; now?: Date } = {},
): Promise<PlacesReservation> {
  if (!Number.isFinite(cap) || cap <= 0) {
    return { allowed: false, count: 0, reason: 'cap_disabled' };
  }
  if (!SCOPE_RE.test(scope)) {
    return { allowed: false, count: 0, reason: 'bad_scope' };
  }

  const db: PlacesBudgetDb = opts.db ?? (prisma as unknown as PlacesBudgetDb);
  const now = opts.now ?? new Date();
  const key = placesUsageKey(kind, scope, now);
  const limit = Math.floor(cap);

  let count: number | null;
  try {
    const rows = (await db.$queryRaw(Prisma.sql`
      INSERT INTO "google_places_usage" ("key", "count", "updated_at")
      VALUES (${key}, 1, (now() AT TIME ZONE 'UTC'))
      ON CONFLICT ("key") DO UPDATE
        SET "count" = "google_places_usage"."count" + 1,
            "updated_at" = (now() AT TIME ZONE 'UTC')
        WHERE "google_places_usage"."count" < ${limit}
      RETURNING "count"
    `)) as Array<{ count: number | bigint }>;
    count = Array.isArray(rows) && rows.length > 0 ? Number(rows[0]!.count) : null;
  } catch (err) {
    console.error('[google places budget] reserve failed (denying)', { kind, scope: scope[0], ...describeError(err) });
    const nowMs = Date.now();
    if (nowMs - lastDbErrorReportAt > 10 * 60_000) {
      lastDbErrorReportAt = nowMs;
      try {
        Sentry.captureMessage('places budget database error (failing closed)', {
          level: 'error',
          tags: { integration: 'google-places', kind, reason: 'budget_db_error' },
        });
      } catch {
        // Sentry unavailable — the console line above is the fallback.
      }
    }
    return { allowed: false, count: 0, reason: 'db_error' };
  }

  if (count === null) return { allowed: false, count: limit, reason: 'cap_reached' };

  // One warning when the GLOBAL counter crosses 80 % of its cap, so the
  // operator can raise it before owners notice. `===` fires exactly once.
  if (scope === 'g' && count === Math.ceil(limit * 0.8)) {
    try {
      Sentry.captureMessage('places daily cap 80%', {
        level: 'warning',
        tags: { integration: 'google-places', kind },
      });
    } catch {
      // never let telemetry change the outcome
    }
  }
  return { allowed: true, count };
}

/**
 * Details reserver for `resolveProfileState`: restaurant counter or global
 * counter. A denial that is not "this business used its quota" (cap
 * configured as 0, database error) is flagged `systemic`.
 */
export function makeDetailsReserver(
  restaurantId: string,
  opts: { db?: PlacesBudgetDb; now?: Date } = {},
): (scope: 'restaurant' | 'global') => Promise<PlacesReserveOutcome> {
  return async (scope) => {
    const reservation =
      scope === 'restaurant'
        ? await reservePlacesCall('details', `r:${restaurantId}`, resolvePlacesCap('details', 'scoped'), opts)
        : await reservePlacesCall('details', 'g', resolvePlacesCap('details', 'global'), opts);
    return { allowed: reservation.allowed, systemic: !reservation.allowed && reservation.reason !== 'cap_reached' };
  };
}

export type PlacesBudgetResult =
  | { allowed: true }
  /** `scope`: this business / actor used its daily quota (HTTP 429 DAILY_LIMIT). `global`: platform ceiling or guard failure (HTTP 503 GOOGLE_PLACES_BUSY). */
  | { allowed: false; denied: 'scope' | 'global' };

/**
 * Reserve a Text Search call: the narrow scope first (`r:<restaurantId>` for
 * the scoped route, `a:<actorId>` for the create-business route), then the
 * global counter.
 */
export async function reservePlacesBudget(
  kind: PlacesCallKind,
  who: { restaurantId: string } | { actorId: string },
  opts: { db?: PlacesBudgetDb; now?: Date } = {},
): Promise<PlacesBudgetResult> {
  const scope = 'restaurantId' in who ? `r:${who.restaurantId}` : `a:${who.actorId}`;
  const narrow = await reservePlacesCall(kind, scope, resolvePlacesCap(kind, 'scoped'), opts);
  if (!narrow.allowed) {
    return { allowed: false, denied: narrow.reason === 'cap_reached' ? 'scope' : 'global' };
  }
  const wide = await reservePlacesCall(kind, 'g', resolvePlacesCap(kind, 'global'), opts);
  if (!wide.allowed) return { allowed: false, denied: 'global' };
  return { allowed: true };
}

/**
 * Housekeeping for the daily cron: drop counters not touched for `days`
 * (default 7). Counters are per UTC day, so anything older is dead weight.
 * Returns the number of rows removed.
 */
export async function pruneGooglePlacesUsage(
  opts: { days?: number; now?: Date } = {},
): Promise<number> {
  const days = opts.days ?? 7;
  const cutoff = new Date((opts.now ?? new Date()).getTime() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.googlePlacesUsage.deleteMany({ where: { updatedAt: { lt: cutoff } } });
  return result.count;
}

// ─────────────────────────────────────────────────────────────────────────
// Failure reporting
// ─────────────────────────────────────────────────────────────────────────

const REPORT_THROTTLE_MS = 10 * 60_000;
const lastReportedAt = new Map<string, number>();

/**
 * Report a Google Places failure to Sentry — at most once per fingerprint per
 * 10 minutes per instance, so a systemic 403/400 does not fire on every page
 * view. Carries machine codes only: no place content, no key, no Google body.
 * `FORBIDDEN` / `BAD_CONFIG` (key, billing, disabled API, wrong field mask)
 * are operator problems → error level; transient failures → warning.
 * Returns whether an event was sent (for tests).
 */
export function reportPlacesFailure(
  failure: PlacesFailureInfo,
  kind: 'details' | 'search' | 'select' = 'details',
  nowMs: number = Date.now(),
): boolean {
  const status = String(failure.status ?? 0);
  const fingerprint = ['google-places', kind, failure.code, status];
  const mapKey = fingerprint.join(':');

  const last = lastReportedAt.get(mapKey);
  if (last !== undefined && nowMs - last < REPORT_THROTTLE_MS) return false;
  if (lastReportedAt.size > 200) {
    for (const [k, t] of lastReportedAt) {
      if (nowMs - t >= REPORT_THROTTLE_MS) lastReportedAt.delete(k);
    }
  }
  lastReportedAt.set(mapKey, nowMs);

  try {
    Sentry.captureMessage('Google Places request failed', {
      level: failure.code === 'FORBIDDEN' || failure.code === 'BAD_CONFIG' ? 'error' : 'warning',
      tags: {
        integration: 'google-places',
        kind,
        code: failure.code,
        status,
        reason: failure.reason ?? 'none',
      },
      fingerprint,
    });
  } catch {
    // Sentry not configured — nothing else to do.
  }
  return true;
}

/** Test hook: clear the throttle map and the DB-error throttle. */
export function __resetPlacesReportingForTests(): void {
  lastReportedAt.clear();
  lastDbErrorReportAt = 0;
}
