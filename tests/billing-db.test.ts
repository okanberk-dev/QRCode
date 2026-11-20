/**
 * Optional database integration for the saved-cards foundation (billing spec
 * §15.2 "Optional DB integration"). Skipped unless TEST_DATABASE_URL points
 * at a scratch PostgreSQL database that `prisma migrate deploy` has migrated;
 * refuses a URL containing BILLING_LIVE_DB_REF. It proves:
 *  - the CHECK constraints (no plaintext customer key, no PAN-like digit
 *    runs, enum values, singleton) and the idempotency unique keys;
 *  - the billing_settings lease / breaker / daily marker are single-winner;
 *  - scripts/billing-bind-env.ts core rules;
 *  - the reference back-fill, then the gated CHECK migration (refuses to run
 *    before the back-fill, rejects raw references after it).
 *
 * Run: TEST_DATABASE_URL=postgresql://…/billing_scratch npm test
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';

import { createBillingSettingsApi } from '../src/lib/billing/billing-settings';
import { bindBillingEnv } from '../src/lib/billing/bind-env';
import { backfillReferenceFingerprints } from '../src/lib/billing/reference-backfill';
import { sensitive } from '../src/lib/billing/sensitive';
import {
  cardHandle,
  customerKeyFingerprint,
  loadHmacKeys,
  loadVaultKeys,
  referenceFingerprint,
  sealCustomerKey,
} from '../src/lib/billing/vault-crypto';
import { randomTestKey } from './fixtures/paynkolay-fakes';

const url = process.env.TEST_DATABASE_URL?.trim();
const liveRef = process.env.BILLING_LIVE_DB_REF?.trim();
const skip = !url ? 'TEST_DATABASE_URL not set' : liveRef && url.includes(liveRef) ? 'refusing the production database' : false;

const GATED_SQL = join(
  __dirname,
  '..',
  'prisma',
  'migrations-gated',
  '20261201000000_billing_reference_fingerprint_check',
  'migration.sql',
);

/** Splits a migration into statements, keeping `$$ … $$` bodies intact and dropping `--` comments. */
function statements(sql: string): string[] {
  const body = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const out: string[] = [];
  let current = '';
  let inDollar = false;
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith('$$', i)) {
      inDollar = !inDollar;
      current += '$$';
      i++;
      continue;
    }
    if (body[i] === ';' && !inDollar) {
      if (current.trim()) out.push(current.trim());
      current = '';
      continue;
    }
    current += body[i];
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

describe('billing database constraints and helpers', { skip }, () => {
  let db: PrismaClient;
  const suffix = Math.random().toString(36).slice(2, 10);
  let userId = '';
  const vault = loadVaultKeys({ BILLING_VAULT_KEY: randomTestKey() });
  const hk = loadHmacKeys({ BILLING_HMAC_KEY: randomTestKey() });

  async function rejects(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
    await assert.rejects(promise, (err: unknown) => {
      const text = err instanceof Error ? `${err.message} ${JSON.stringify((err as { meta?: unknown }).meta ?? {})}` : String(err);
      assert.match(text, pattern);
      return true;
    });
  }

  before(async () => {
    db = new PrismaClient({ datasources: { db: { url } } });
    await db.$executeRawUnsafe('DELETE FROM "billing_settings"');
    const user = await db.user.create({
      data: { email: `billing-db-${suffix}@example.invalid`, passwordHash: 'x' },
      select: { id: true },
    });
    userId = user.id;
  });

  after(async () => {
    if (!db) return;
    await db.billingCard.deleteMany({ where: { userId } });
    await db.billingCustomer.deleteMany({ where: { userId } });
    await db.billingRenewal.deleteMany({ where: { userId } });
    await db.billingConsent.deleteMany({ where: { userId } });
    await db.billingPayment.deleteMany({ where: { userId } });
    await db.billingInvoice.deleteMany({ where: { userId } });
    await db.billingVaultTombstone.deleteMany({ where: { aadUserId: userId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });

  it('billing_customers stores only a sealed key with a well-formed fingerprint', async () => {
    const ck = sensitive('ABCDEFGHJK1');
    await rejects(
      db.billingCustomer.create({
        data: { userId, providerEnv: 'live', customerKeyEnc: 'ABCDEFGHJK1', customerKeyFp: customerKeyFingerprint(ck, hk) },
      }),
      /billing_customers_key_sealed/,
    );
    await rejects(
      db.billingCustomer.create({
        data: { userId, providerEnv: 'live', customerKeyEnc: sealCustomerKey(ck, userId, vault), customerKeyFp: 'plain' },
      }),
      /billing_customers_fp_format/,
    );
    await rejects(
      db.billingCustomer.create({
        data: {
          userId,
          providerEnv: 'prod',
          customerKeyEnc: sealCustomerKey(ck, userId, vault),
          customerKeyFp: customerKeyFingerprint(ck, hk),
        },
      }),
      /billing_customers_env_valid/,
    );
    await db.billingCustomer.create({
      data: {
        userId,
        providerEnv: 'live',
        customerKeyEnc: sealCustomerKey(ck, userId, vault),
        customerKeyFp: customerKeyFingerprint(ck, hk),
      },
      select: { userId: true },
    });
    // RESTRICT: the owner row cannot be deleted while a customer key exists.
    await rejects(db.user.delete({ where: { id: userId } }), /billing_customers_user_id_fkey|Foreign key|P2003/);
  });

  it('billing_cards rejects PAN-like values and malformed handles', async () => {
    const handle = cardHandle(userId, sensitive('alias|5454|082028|T1'), hk);
    const base = { userId, handle };
    await rejects(db.billingCard.create({ data: { ...base, last4: '41111111' as string } }), /too long|billing_cards_last4_digits/);
    await rejects(db.billingCard.create({ data: { ...base, last4: '54a4' } }), /billing_cards_last4_digits/);
    await rejects(db.billingCard.create({ data: { ...base, issuer: 'Bank 4111111111111111' } }), /billing_cards_no_pan_issuer/);
    await rejects(db.billingCard.create({ data: { ...base, alias: '4111111111111111' } }), /billing_cards_no_pan_alias/);
    await rejects(db.billingCard.create({ data: { ...base, brand: '411111111111' } }), /billing_cards_no_pan_brand/);
    await rejects(db.billingCard.create({ data: { ...base, cardType: '4111111111111' } }), /billing_cards_no_pan_type/);
    await rejects(db.billingCard.create({ data: { userId, handle: 'cd_short' } }), /billing_cards_handle_format/);
    await db.billingCard.create({ data: { ...base, last4: '5454', brand: 'MASTERCARD', alias: 'Buaze-7K2Q9X' }, select: { id: true } });
    await rejects(db.billingCard.create({ data: { ...base, last4: '1111' } }), /Unique constraint|P2002/);
  });

  it('consents, renewals, payments and tombstones enforce their CHECKs and unique keys', async () => {
    await rejects(
      db.billingConsent.create({ data: { userId, kind: 'card_save', actor: 'owner', userAgent: 'UA 4111111111111111' } }),
      /billing_consents_no_pan_ua/,
    );
    const periodEnd = new Date('2027-01-31T21:00:00.000Z');
    const renewal = { userId, providerEnv: 'live', periodEnd, billingCycle: 'monthly', mode: 'auto' };
    await rejects(db.billingRenewal.create({ data: { ...renewal, state: 'paid' } }), /billing_renewals_state_valid/);
    await rejects(db.billingRenewal.create({ data: { ...renewal, mode: 'magic' } }), /billing_renewals_mode_valid/);
    await rejects(db.billingRenewal.create({ data: { ...renewal, attempts: 4 } }), /billing_renewals_attempts_bound/);
    const created = await db.billingRenewal.create({ data: renewal, select: { id: true } });
    await rejects(db.billingRenewal.create({ data: renewal }), /Unique constraint|P2002/);

    const payment = { userId, billingCycle: 'monthly', amountMinor: 49_900 };
    await rejects(db.billingPayment.create({ data: { ...payment, kind: 'gift' } }), /billing_payments_kind_valid/);
    await rejects(db.billingPayment.create({ data: { ...payment, providerEnv: 'prod' } }), /billing_payments_env_valid/);
    await rejects(db.billingPayment.create({ data: { ...payment, refundState: 'maybe' } }), /billing_payments_refund_state_valid/);
    // NULL renewal/attempt never collide (ordinary checkout rows).
    await db.billingPayment.create({ data: payment, select: { id: true } });
    await db.billingPayment.create({ data: payment, select: { id: true } });
    const attempt = { ...payment, kind: 'renewal_auto', renewalId: created.id, attemptNo: 1, providerEnv: 'live' };
    await db.billingPayment.create({ data: attempt, select: { id: true } });
    await rejects(db.billingPayment.create({ data: attempt }), /Unique constraint|P2002/);

    await rejects(
      db.billingVaultTombstone.create({ data: { id: `tb_${suffix}`, providerEnv: 'live', customerKeyEnc: 'ABCDEFGHJK1', aadUserId: userId } }),
      /billing_vault_tombstones_key_sealed/,
    );
    await db.billingVaultTombstone.create({
      data: { id: `tb_${suffix}`, providerEnv: 'live', customerKeyEnc: sealCustomerKey(sensitive('ABCDEFGHJK1'), userId, vault), aadUserId: userId },
      select: { id: true },
    });
  });

  it('billing-bind-env: inserts once, never silently changes the binding, refuses test on the live DB', async () => {
    const input = { rebind: false, confirmHost: null, databaseUrl: url, liveDbRef: undefined };
    assert.equal((await bindBillingEnv(db, { ...input, env: 'staging' })).status, 'refused');
    const liveDb = await bindBillingEnv(db, { ...input, env: 'test', liveDbRef: new URL(url as string).pathname.slice(1) });
    assert.deepEqual(liveDb, { status: 'refused', reason: 'test_on_live_db' });
    assert.equal((await bindBillingEnv(db, { ...input, env: 'live' })).status, 'created');
    assert.equal((await bindBillingEnv(db, { ...input, env: 'live' })).status, 'unchanged');
    assert.deepEqual(await bindBillingEnv(db, { ...input, env: 'test' }), { status: 'refused', reason: 'already_bound', boundEnv: 'live' });
    assert.equal((await bindBillingEnv(db, { ...input, env: 'test', rebind: true, confirmHost: 'wrong' })).status, 'refused');
    const host = new URL(url as string).hostname;
    assert.equal((await bindBillingEnv(db, { ...input, env: 'test', rebind: true, confirmHost: host })).status, 'rebound');
    assert.equal((await bindBillingEnv(db, { ...input, env: 'live', rebind: true, confirmHost: host })).status, 'rebound');
    await rejects(db.$executeRawUnsafe(`INSERT INTO "billing_settings" ("id","provider_env","updated_at") VALUES ('other','live',now())`), /billing_settings_singleton/);
  });

  it('billing_settings: one lease winner, breaker pruned to 24 h, one daily marker per day', async () => {
    const api = createBillingSettingsApi(db, { cacheMs: 0 });
    const now = new Date('2027-03-01T08:00:00.000Z');
    const results = await Promise.all([
      api.acquireTickLease(now, 330_000, 'leaseA'),
      api.acquireTickLease(now, 330_000, 'leaseB'),
      api.acquireTickLease(now, 330_000, 'leaseC'),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await api.acquireTickLease(new Date(now.getTime() + 60_000), 330_000, 'leaseD'), false);
    assert.equal(await api.acquireTickLease(new Date(now.getTime() + 331_000), 330_000, 'leaseE'), true);
    await api.releaseTickLease('leaseE');
    assert.equal((await api.get({ fresh: true }))?.tickLeaseId, null);

    const t0 = new Date('2027-03-01T00:00:00.000Z');
    assert.deepEqual(await api.tripBreaker(t0, 'unknown_outcomes', 6 * 3600_000), { trips24h: 1 });
    assert.deepEqual(await api.tripBreaker(new Date(t0.getTime() + 3600_000), 'html', 6 * 3600_000), { trips24h: 2 });
    // 24.5 h after t0: the t0 trip has aged out, the t0+1h trip is still inside the window.
    const t3 = new Date(t0.getTime() + 24.5 * 3600_000);
    assert.deepEqual(await api.tripBreaker(t3, 'html', 6 * 3600_000), { trips24h: 2 });
    const row = await api.get({ fresh: true });
    assert.equal(row?.breakerReason, 'html');
    assert.equal(row?.breakerUntil?.toISOString(), new Date(t3.getTime() + 6 * 3600_000).toISOString());
    assert.deepEqual(
      row?.breakerTrippedAt.map((d) => d.toISOString()),
      [new Date(t0.getTime() + 3600_000).toISOString(), t3.toISOString()],
    );

    const claims = await Promise.all([api.claimDailyMarker('lastDailyScanOn', '2027-03-01'), api.claimDailyMarker('lastDailyScanOn', '2027-03-01')]);
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(await api.claimDailyMarker('lastDailyScanOn', '2027-03-02'), true);
    assert.equal(await api.claimDailyMarker('lastRetentionOn', '2027-03-02'), true);
  });

  it('reference back-fill, then the gated CHECK migration', async () => {
    const raw = [`R${suffix}A1`, `R${suffix}B2`];
    const p1 = await db.billingPayment.create({ data: { userId, billingCycle: 'monthly', amountMinor: 100, referenceCode: raw[0] }, select: { id: true } });
    const p2 = await db.billingPayment.create({
      data: { userId, billingCycle: 'monthly', amountMinor: 100, referenceCode: `paynkolay:${suffix}` },
      select: { id: true },
    });
    const inv = await db.billingInvoice.create({ data: { userId, amount: 1, source: 'paynkolay', providerRef: raw[1] }, select: { id: true } });
    const manual = await db.billingInvoice.create({ data: { userId, amount: 1, source: 'manual', providerRef: `MANUAL ${suffix}` }, select: { id: true } });
    await db.billingSettings.update({ where: { id: 'singleton' }, data: { referenceBackfillDoneAt: null } });

    // Gated migration refuses to run before the back-fill.
    const gated = statements(readFileSync(GATED_SQL, 'utf8'));
    await rejects(db.$executeRawUnsafe(gated[0]), /back-fill has not run/);

    const dry = await backfillReferenceFingerprints(db, hk, { dryRun: true });
    assert.ok(dry.payments.remaining >= 1 && dry.invoices.remaining >= 1);
    assert.equal(dry.doneMarked, false);
    const res = await backfillReferenceFingerprints(db, hk, { batchSize: 1 });
    assert.equal(res.payments.remaining, 0);
    assert.equal(res.invoices.remaining, 0);
    assert.equal(res.doneMarked, true);
    const again = await backfillReferenceFingerprints(db, hk);
    assert.deepEqual([again.payments.updated, again.invoices.updated], [0, 0]);

    const rows = await db.billingPayment.findMany({ where: { id: { in: [p1.id, p2.id] } }, select: { id: true, referenceCode: true } });
    const byId = new Map(rows.map((r) => [r.id, r.referenceCode]));
    assert.equal(byId.get(p1.id), referenceFingerprint(raw[0], hk));
    assert.equal(byId.get(p2.id), `paynkolay:${suffix}`);
    const invoice = await db.billingInvoice.findUnique({ where: { id: inv.id }, select: { providerRef: true } });
    assert.equal(invoice?.providerRef, referenceFingerprint(raw[1], hk));
    const manualRow = await db.billingInvoice.findUnique({ where: { id: manual.id }, select: { providerRef: true } });
    assert.equal(manualRow?.providerRef, `MANUAL ${suffix}`, 'manual invoices keep their reference');

    for (const statement of gated) await db.$executeRawUnsafe(statement);
    try {
      await rejects(
        db.billingPayment.create({ data: { userId, billingCycle: 'monthly', amountMinor: 1, referenceCode: `RAW${suffix}` } }),
        /billing_payments_reference_fingerprinted/,
      );
      await rejects(
        db.billingInvoice.create({ data: { userId, amount: 1, source: 'paynkolay', providerRef: `RAW${suffix}` } }),
        /billing_invoices_provider_ref_fingerprinted/,
      );
      await db.billingPayment.create({
        data: { userId, billingCycle: 'monthly', amountMinor: 1, referenceCode: referenceFingerprint(`NEW${suffix}`, hk) },
        select: { id: true },
      });
    } finally {
      // Leave the scratch database as `prisma migrate deploy` produced it.
      await db.$executeRaw(Prisma.sql`ALTER TABLE "billing_payments" DROP CONSTRAINT IF EXISTS "billing_payments_reference_fingerprinted"`);
      await db.$executeRaw(Prisma.sql`ALTER TABLE "billing_invoices" DROP CONSTRAINT IF EXISTS "billing_invoices_provider_ref_fingerprinted"`);
    }
  });
});
