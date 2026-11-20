// Replaces raw PayNKolay REFERENCE_CODE values by HMAC fingerprints
// (billing spec §4.3, D7).
//
// Every `billing_payments.reference_code` and every `billing_invoices.provider_ref`
// with source 'paynkolay' that is not already `rf1_<22>` or `paynkolay:<id>` is
// replaced by `referenceFingerprint(raw)` (keyed by BILLING_HMAC_KEY), in
// batches of 500 with optimistic updates. When nothing raw is left it sets
// `billing_settings.reference_backfill_done_at`.
//
// Order (gate G0):
//   1. deploy the release that writes only fingerprinted references;
//   2. bind the database: scripts/billing-bind-env.ts --env live;
//   3. run this script until it reports remaining 0 and "done";
//   4. only then move prisma/migrations-gated/20261201000000_billing_reference_fingerprint_check
//      into prisma/migrations and deploy it.
//
// Usage:
//   DATABASE_URL=... BILLING_HMAC_KEY=... npx tsx scripts/backfill-reference-fingerprints.ts [--dry-run]
//
// Idempotent. Needs BILLING_HMAC_KEY (fails closed without it). Prints counts
// only — never a reference value.

import { PrismaClient } from '@prisma/client';
import { backfillReferenceFingerprints } from '../src/lib/billing/reference-backfill';
import { loadHmacKeys } from '../src/lib/billing/vault-crypto';

async function main(): Promise<number> {
  const dryRun = process.argv.includes('--dry-run');
  const hk = loadHmacKeys();
  const prisma = new PrismaClient();
  try {
    const result = await backfillReferenceFingerprints(prisma, hk, { dryRun, batchSize: 500 });
    console.log(
      `[backfill-reference-fingerprints] ${dryRun ? 'dry run: ' : ''}payments updated=${result.payments.updated} ` +
        `conflicts=${result.payments.conflicts} remaining=${result.payments.remaining}; invoices updated=${result.invoices.updated} ` +
        `conflicts=${result.invoices.conflicts} remaining=${result.invoices.remaining}`,
    );
    if (result.problem === 'no_binding_row') {
      console.error('[backfill-reference-fingerprints] billing_settings row missing: run scripts/billing-bind-env.ts first');
      return 2;
    }
    if (dryRun) return 0;
    if (!result.doneMarked) {
      console.error('[backfill-reference-fingerprints] raw references remain (conflicts or concurrent writes); not marked done');
      return 3;
    }
    console.log('[backfill-reference-fingerprints] done: reference_backfill_done_at set');
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
    console.error('[backfill-reference-fingerprints] failed:', err instanceof Error ? err.name : 'Error', code);
    process.exit(1);
  });
