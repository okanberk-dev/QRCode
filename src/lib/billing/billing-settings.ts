import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { PaynkolayEnv } from '@/lib/payment/paynkolay';

/**
 * `billing_settings` singleton (billing spec §4.5, §9.0, §9.5).
 *
 * The row binds this database to one PayNKolay environment. Only
 * `scripts/billing-bind-env.ts` creates it; the app never writes
 * `provider_env`. Until it exists every billing flag is off.
 *
 * It also carries engine-wide state that must be single-flighted without
 * session advisory locks (the Supabase pooler runs in transaction mode):
 * the tick lease, the circuit breaker and the once-per-day markers. Every
 * mutation is one conditional UPDATE, so two concurrent callers can never
 * both win.
 *
 * Raw SQL passes timestamps as ISO text cast with
 * `::timestamptz AT TIME ZONE 'UTC'`, matching how Prisma stores DateTime
 * (UTC wall-clock in `timestamp(3)`) whatever the session time zone is.
 */

export interface BillingSettingsRow {
  providerEnv: PaynkolayEnv;
  breakerUntil: Date | null;
  breakerReason: string | null;
  breakerTrippedAt: Date[];
  tickLeaseId: string | null;
  tickLeaseUntil: Date | null;
  lastDailyScanOn: string | null;
  lastRetentionOn: string | null;
  referenceBackfillDoneAt: Date | null;
}

export type DailyMarkerField = 'lastDailyScanOn' | 'lastRetentionOn';

export interface BillingSettingsApi {
  /** Cached for 60 s per process unless `fresh`. Null when the binding row does not exist. */
  get(opts?: { fresh?: boolean }): Promise<BillingSettingsRow | null>;
  /** Conditional UPDATE: wins only when no unexpired lease exists. */
  acquireTickLease(now: Date, ttlMs: number, leaseId: string): Promise<boolean>;
  releaseTickLease(leaseId: string): Promise<void>;
  /** Records a trip (history pruned to 24 h), opens the breaker until now + holdMs. */
  tripBreaker(now: Date, reason: string, holdMs: number): Promise<{ trips24h: number }>;
  /** Wins once per Istanbul day per marker. */
  claimDailyMarker(field: DailyMarkerField, istanbulDay: string): Promise<boolean>;
  invalidate(): void;
}

export const SETTINGS_ID = 'singleton';
const CACHE_MS = 60_000;
const LEASE_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

type SettingsDb = Pick<PrismaClient, 'billingSettings' | '$queryRaw'>;

const SELECT = {
  providerEnv: true,
  breakerUntil: true,
  breakerReason: true,
  breakerTrippedAt: true,
  tickLeaseId: true,
  tickLeaseUntil: true,
  lastDailyScanOn: true,
  lastRetentionOn: true,
  referenceBackfillDoneAt: true,
} as const;

function utc(at: Date): Prisma.Sql {
  return Prisma.sql`(${at.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

export function createBillingSettingsApi(
  db: SettingsDb,
  opts: { cacheMs?: number; clock?: () => number } = {},
): BillingSettingsApi {
  const cacheMs = opts.cacheMs ?? CACHE_MS;
  const clock = opts.clock ?? Date.now;
  let cache: { at: number; row: BillingSettingsRow | null } | null = null;

  async function load(): Promise<BillingSettingsRow | null> {
    const row = await db.billingSettings.findUnique({ where: { id: SETTINGS_ID }, select: SELECT });
    if (!row) return null;
    // The DB CHECK allows only these two; anything else fails the binding (null).
    if (row.providerEnv !== 'live' && row.providerEnv !== 'test') return null;
    return { ...row, providerEnv: row.providerEnv, breakerTrippedAt: row.breakerTrippedAt ?? [] };
  }

  return {
    async get(getOpts) {
      const now = clock();
      if (!getOpts?.fresh && cache && now - cache.at < cacheMs) return cache.row;
      const row = await load();
      cache = { at: now, row };
      return row;
    },

    async acquireTickLease(now, ttlMs, leaseId) {
      if (!LEASE_ID_RE.test(leaseId) || !(ttlMs > 0)) throw new Error('billing settings: invalid lease');
      const res = await db.billingSettings.updateMany({
        where: { id: SETTINGS_ID, OR: [{ tickLeaseUntil: null }, { tickLeaseUntil: { lt: now } }] },
        data: { tickLeaseId: leaseId, tickLeaseUntil: new Date(now.getTime() + ttlMs) },
      });
      cache = null;
      return res.count === 1;
    },

    async releaseTickLease(leaseId) {
      if (!LEASE_ID_RE.test(leaseId)) return;
      await db.billingSettings.updateMany({
        where: { id: SETTINGS_ID, tickLeaseId: leaseId },
        data: { tickLeaseId: null, tickLeaseUntil: null },
      });
      cache = null;
    },

    async tripBreaker(now, reason, holdMs) {
      const safeReason = String(reason).replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 40) || 'unknown';
      const cutoff = new Date(now.getTime() - 24 * 60 * 60_000);
      const until = new Date(now.getTime() + Math.max(0, holdMs));
      const rows = await db.$queryRaw<{ trips: number }[]>(Prisma.sql`
        UPDATE "billing_settings"
        SET "breaker_tripped_at" = array_append(
              ARRAY(SELECT t FROM unnest(COALESCE("breaker_tripped_at", ARRAY[]::TIMESTAMP(3)[])) AS t WHERE t > ${utc(cutoff)}),
              ${utc(now)}::TIMESTAMP(3)),
            "breaker_until" = ${utc(until)},
            "breaker_reason" = ${safeReason},
            "updated_at" = ${utc(now)}
        WHERE "id" = ${SETTINGS_ID}
        RETURNING cardinality("breaker_tripped_at")::int AS "trips"`);
      cache = null;
      return { trips24h: rows[0]?.trips ?? 0 };
    },

    async claimDailyMarker(field, istanbulDay) {
      if (!DAY_RE.test(istanbulDay)) throw new Error('billing settings: invalid day');
      const res =
        field === 'lastDailyScanOn'
          ? await db.billingSettings.updateMany({
              where: { id: SETTINGS_ID, OR: [{ lastDailyScanOn: null }, { lastDailyScanOn: { not: istanbulDay } }] },
              data: { lastDailyScanOn: istanbulDay },
            })
          : await db.billingSettings.updateMany({
              where: { id: SETTINGS_ID, OR: [{ lastRetentionOn: null }, { lastRetentionOn: { not: istanbulDay } }] },
              data: { lastRetentionOn: istanbulDay },
            });
      cache = null;
      return res.count === 1;
    },

    invalidate() {
      cache = null;
    },
  };
}

/** Process-wide instance on the app's Prisma client. */
export const billingSettings: BillingSettingsApi = createBillingSettingsApi(prisma);

export function getBillingSettings(opts?: { fresh?: boolean }): Promise<BillingSettingsRow | null> {
  return billingSettings.get(opts);
}

export function acquireTickLease(now: Date, ttlMs: number, leaseId: string): Promise<boolean> {
  return billingSettings.acquireTickLease(now, ttlMs, leaseId);
}

export function releaseTickLease(leaseId: string): Promise<void> {
  return billingSettings.releaseTickLease(leaseId);
}

export function tripBreaker(now: Date, reason: string, holdMs: number): Promise<{ trips24h: number }> {
  return billingSettings.tripBreaker(now, reason, holdMs);
}

export function claimDailyMarker(field: DailyMarkerField, istanbulDay: string): Promise<boolean> {
  return billingSettings.claimDailyMarker(field, istanbulDay);
}
