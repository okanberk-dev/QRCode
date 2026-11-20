import { Prisma, type PrismaClient } from '@prisma/client';
import { SETTINGS_ID } from './billing-settings';
import { referenceFingerprint, type HmacKeys } from './vault-crypto';

/**
 * Core of `scripts/backfill-reference-fingerprints.ts` (billing spec §4.3, D7).
 *
 * PayNKolay's REFERENCE_CODE may work as a charge handle (`csTranId`, Q-5), so
 * it is stored only as `rf1_<HMAC>` (or the synthetic `paynkolay:<paymentId>`).
 * This replaces every older raw value in `billing_payments.reference_code`
 * and in `billing_invoices.provider_ref` (source 'paynkolay') by its
 * fingerprint, in batches, with optimistic updates (`WHERE value = raw`), and
 * finally stamps `billing_settings.reference_backfill_done_at`. Idempotent:
 * already-fingerprinted values are never selected again.
 *
 * Only then may the gated CHECK migration
 * (`prisma/migrations-gated/20261201000000_billing_reference_fingerprint_check`)
 * be moved into `prisma/migrations` and deployed.
 */

/** The exact pattern the gated CHECK constraint enforces. */
export const FINGERPRINTED_REFERENCE_PATTERN = '^(rf1_[A-Za-z0-9_-]{22}|paynkolay:[A-Za-z0-9_-]{1,64})$';
export const FINGERPRINTED_REFERENCE_RE = new RegExp(FINGERPRINTED_REFERENCE_PATTERN);

export interface BackfillCounts {
  updated: number;
  conflicts: number;
  remaining: number;
}

export interface BackfillResult {
  dryRun: boolean;
  payments: BackfillCounts;
  invoices: BackfillCounts;
  /** True when nothing raw is left and the settings row was stamped. */
  doneMarked: boolean;
  /** Null when the settings row exists; 'no_binding_row' when it does not. */
  problem: null | 'no_binding_row';
}

type BackfillDb = Pick<PrismaClient, '$queryRaw' | 'billingPayment' | 'billingInvoice' | 'billingSettings'>;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function countRawPayments(db: BackfillDb): Promise<number> {
  const rows = await db.$queryRaw<{ n: number }[]>(Prisma.sql`
    SELECT count(*)::int AS "n" FROM "billing_payments"
    WHERE "reference_code" IS NOT NULL AND "reference_code" !~ ${FINGERPRINTED_REFERENCE_PATTERN}`);
  return rows[0]?.n ?? 0;
}

async function countRawInvoices(db: BackfillDb): Promise<number> {
  const rows = await db.$queryRaw<{ n: number }[]>(Prisma.sql`
    SELECT count(*)::int AS "n" FROM "billing_invoices"
    WHERE "source" = 'paynkolay' AND "provider_ref" IS NOT NULL AND "provider_ref" !~ ${FINGERPRINTED_REFERENCE_PATTERN}`);
  return rows[0]?.n ?? 0;
}

export async function backfillReferenceFingerprints(
  db: BackfillDb,
  hk: HmacKeys,
  opts: { batchSize?: number; dryRun?: boolean; now?: () => Date } = {},
): Promise<BackfillResult> {
  const batchSize = Math.max(1, Math.min(opts.batchSize ?? 500, 5000));
  const dryRun = opts.dryRun === true;
  const now = opts.now ?? (() => new Date());
  const payments: BackfillCounts = { updated: 0, conflicts: 0, remaining: 0 };
  const invoices: BackfillCounts = { updated: 0, conflicts: 0, remaining: 0 };

  if (!dryRun) {
    const skipped: string[] = [];
    for (;;) {
      const rows = await db.$queryRaw<{ id: string; ref: string }[]>(Prisma.sql`
        SELECT "id", "reference_code" AS "ref" FROM "billing_payments"
        WHERE "reference_code" IS NOT NULL AND "reference_code" !~ ${FINGERPRINTED_REFERENCE_PATTERN}
          AND NOT ("id" = ANY(${skipped}::text[]))
        ORDER BY "id" LIMIT ${batchSize}`);
      if (rows.length === 0) break;
      for (const row of rows) {
        try {
          const res = await db.billingPayment.updateMany({
            where: { id: row.id, referenceCode: row.ref },
            data: { referenceCode: referenceFingerprint(row.ref, hk) },
          });
          payments.updated += res.count;
          if (res.count === 0) skipped.push(row.id);
        } catch (err) {
          if (!isUniqueViolation(err)) throw err;
          payments.conflicts += 1;
          skipped.push(row.id);
        }
      }
    }

    const skippedInvoices: string[] = [];
    for (;;) {
      const rows = await db.$queryRaw<{ id: string; ref: string }[]>(Prisma.sql`
        SELECT "id", "provider_ref" AS "ref" FROM "billing_invoices"
        WHERE "source" = 'paynkolay' AND "provider_ref" IS NOT NULL AND "provider_ref" !~ ${FINGERPRINTED_REFERENCE_PATTERN}
          AND NOT ("id" = ANY(${skippedInvoices}::text[]))
        ORDER BY "id" LIMIT ${batchSize}`);
      if (rows.length === 0) break;
      for (const row of rows) {
        try {
          const res = await db.billingInvoice.updateMany({
            where: { id: row.id, providerRef: row.ref },
            data: { providerRef: referenceFingerprint(row.ref, hk) },
          });
          invoices.updated += res.count;
          if (res.count === 0) skippedInvoices.push(row.id);
        } catch (err) {
          if (!isUniqueViolation(err)) throw err;
          invoices.conflicts += 1;
          skippedInvoices.push(row.id);
        }
      }
    }
  }

  payments.remaining = await countRawPayments(db);
  invoices.remaining = await countRawInvoices(db);

  const settings = await db.billingSettings.findUnique({ where: { id: SETTINGS_ID }, select: { id: true } });
  if (!settings) return { dryRun, payments, invoices, doneMarked: false, problem: 'no_binding_row' };
  let doneMarked = false;
  if (!dryRun && payments.remaining === 0 && invoices.remaining === 0) {
    const res = await db.billingSettings.updateMany({
      where: { id: SETTINGS_ID },
      data: { referenceBackfillDoneAt: now() },
    });
    doneMarked = res.count === 1;
  }
  return { dryRun, payments, invoices, doneMarked, problem: null };
}
