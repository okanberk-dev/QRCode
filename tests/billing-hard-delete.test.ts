/**
 * Account erasure and saved-card billing (billing spec §11.6, §15.2
 * `billing-hard-delete.test.ts`). Needs a scratch PostgreSQL: skipped unless
 * TEST_DATABASE_URL is set; refuses a URL containing BILLING_LIVE_DB_REF.
 * The provider is a fake transport — no network.
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import type { VaultDeps } from '../src/lib/billing/card-vault';
import { settlePaynkolayPayment } from '../src/lib/billing/paynkolay-billing';
import { sensitive } from '../src/lib/billing/sensitive';
import { customerKeyFingerprint, loadHmacKeys, loadVaultKeys, sealCustomerKey, userPseudonym } from '../src/lib/billing/vault-crypto';
import { executeUserHardDelete, isHardDeleteDeferred } from '../src/lib/user-hard-delete';
import { cardListBody, fakeTransport, randomTestKey, testConfig } from './fixtures/paynkolay-fakes';

const url = process.env.TEST_DATABASE_URL?.trim();
const liveRef = process.env.BILLING_LIVE_DB_REF?.trim();
const skip = !url ? 'TEST_DATABASE_URL not set' : liveRef && url.includes(liveRef) ? 'refusing the production database' : false;

const DAY = 24 * 3600_000;
const actor = { id: null, source: 'cron' as const, action: 'test.hard_delete' };

describe('account erasure with saved-card billing', { skip }, () => {
  let db: PrismaClient;
  const suffix = Math.random().toString(36).slice(2, 10);
  const keys = loadVaultKeys({ BILLING_VAULT_KEY: randomTestKey() });
  const hmac = loadHmacKeys({ BILLING_HMAC_KEY: randomTestKey() });
  const pseudonyms: string[] = [];
  const tombstoneUsers: string[] = [];
  let n = 0;

  async function owner(): Promise<{ id: string; email: string }> {
    const email = `erase-${suffix}-${n++}@example.invalid`;
    const u = await db.user.create({ data: { email, passwordHash: 'x' }, select: { id: true } });
    pseudonyms.push(userPseudonym(u.id, hmac));
    tombstoneUsers.push(u.id);
    return { id: u.id, email };
  }

  async function withCustomer(userId: string, key = 'ABCDEFGHJK1'): Promise<string> {
    const ck = sensitive(key);
    const blob = sealCustomerKey(ck, userId, keys);
    await db.billingCustomer.create({
      data: { userId, providerEnv: 'live', customerKeyEnc: blob, customerKeyFp: customerKeyFingerprint(ck, hmac) },
    });
    return blob;
  }

  before(() => {
    db = new PrismaClient({ datasources: { db: { url } } });
  });

  after(async () => {
    if (!db) return;
    await db.billingConsent.deleteMany({ where: { userId: { in: pseudonyms } } });
    await db.billingPayment.deleteMany({ where: { userId: { in: [...pseudonyms, ...tombstoneUsers] } } });
    await db.billingVaultTombstone.deleteMany({ where: { aadUserId: { in: tombstoneUsers } } });
    await db.billingRenewal.deleteMany({ where: { userId: { in: tombstoneUsers } } });
    await db.billingCard.deleteMany({ where: { userId: { in: tombstoneUsers } } });
    await db.billingCustomer.deleteMany({ where: { userId: { in: tombstoneUsers } } });
    await db.user.deleteMany({ where: { id: { in: tombstoneUsers } } });
    await db.$disconnect();
  });

  it('flags off and no vault key: a tombstone keeps the verbatim sealed key; erasure is not blocked', async () => {
    const u = await owner();
    const blob = await withCustomer(u.id);
    await db.billingCard.create({ data: { userId: u.id, handle: `cd_${suffix}${'b'.repeat(14)}`, last4: '4242' } });
    await db.billingConsent.create({ data: { userId: u.id, kind: 'card_save', actor: 'owner', ipAddress: '203.0.113.5' } });
    const pay = await db.billingPayment.create({
      data: { userId: u.id, billingCycle: 'monthly', amountMinor: 99900, status: 'failed', createdAt: new Date(Date.now() - 2 * DAY) },
      select: { id: true },
    });
    const result = await executeUserHardDelete(u.id, u.email, actor, { db, vault: async () => null, hmac: () => hmac });
    assert.ok(!isHardDeleteDeferred(result));
    if (isHardDeleteDeferred(result)) return;
    assert.equal(result.billingTombstoned, true);
    assert.equal(result.billingVaultPurged, false);
    assert.equal(result.consentsPseudonymised, 1);
    assert.equal(result.paymentsPseudonymised, 1);
    const tomb = await db.billingVaultTombstone.findFirst({ where: { aadUserId: u.id }, select: { customerKeyEnc: true, providerEnv: true, id: true } });
    assert.equal(tomb?.customerKeyEnc, blob); // verbatim, no re-seal
    assert.match(tomb?.id ?? '', /^tb_/);
    assert.equal(await db.billingCustomer.count({ where: { userId: u.id } }), 0);
    assert.equal(await db.billingCard.count({ where: { userId: u.id } }), 0);
    assert.equal(await db.user.count({ where: { id: u.id } }), 0);
    const pseud = userPseudonym(u.id, hmac);
    assert.equal((await db.billingPayment.findUnique({ where: { id: pay.id }, select: { userId: true } }))?.userId, pseud);
    const consent = await db.billingConsent.findFirst({ where: { userId: pseud }, select: { purgeAfter: true } });
    assert.ok((consent?.purgeAfter?.getTime() ?? 0) > Date.now() + 9 * 365 * DAY);
    // nothing plaintext anywhere
    const dump = JSON.stringify(await db.billingVaultTombstone.findMany({ where: { aadUserId: u.id } }));
    assert.equal(dump.includes('ABCDEFGHJK1'), false);
  });

  it('a pending payment defers the erasure for at most 7 days; a later success becomes a refund', async () => {
    const u = await owner();
    const pending = await db.billingPayment.create({
      data: { userId: u.id, billingCycle: 'monthly', amountMinor: 99900, status: 'pending' },
      select: { id: true },
    });
    const deferred = await executeUserHardDelete(u.id, u.email, actor, { db, vault: async () => null, hmac: () => hmac });
    assert.deepEqual(deferred, { deferred: 'billing_in_flight' });
    assert.equal(await db.user.count({ where: { id: u.id } }), 1);

    const later = new Date(Date.now() + 8 * DAY);
    const done = await executeUserHardDelete(u.id, u.email, actor, { db, now: () => later, vault: async () => null, hmac: () => hmac });
    assert.ok(!isHardDeleteDeferred(done));
    const pseud = userPseudonym(u.id, hmac);
    assert.equal((await db.billingPayment.findUnique({ where: { id: pending.id }, select: { userId: true } }))?.userId, pseud);
    const result = await settlePaynkolayPayment(
      pending.id,
      { kind: 'succeeded', referenceCode: null, amountMinor: 99900 },
      { db, hmac, backfillDone: true, binding: null, capture: () => undefined, applyPlanModules: async () => 0 },
    );
    assert.equal(result, 'review');
    const p = await db.billingPayment.findUnique({ where: { id: pending.id }, select: { status: true, refundState: true, refundReason: true } });
    assert.deepEqual(p, { status: 'needs_review', refundState: 'required', refundReason: 'erased_user' });
    assert.equal(await db.billingSubscription.count({ where: { userId: pseud } }), 0);
  });

  it('an in-flight automatic charge defers too', async () => {
    const u = await owner();
    await db.billingRenewal.create({
      data: { userId: u.id, providerEnv: 'live', periodEnd: new Date(), billingCycle: 'monthly', mode: 'auto', state: 'awaiting_confirmation', attempts: 1 },
    });
    assert.deepEqual(await executeUserHardDelete(u.id, u.email, actor, { db, vault: async () => null, hmac: () => hmac }), { deferred: 'billing_in_flight' });
  });

  it('with config, binding and keys the cards are purged at PayNKolay first (verified by re-list)', async () => {
    const u = await owner();
    await withCustomer(u.id, 'ZYXWVUTSRQ9');
    let stored = [{ Token: 'TOKEN-9', TranId: 'TRAN-9', Maskedpan: '545616******5454' }];
    const fake = fakeTransport({
      CardStorageCardList: () => ({ body: cardListBody(stored) }),
      CardStorageCardDelete: () => {
        stored = [];
        return { body: { ProcReturnCode: '00' } };
      },
    });
    const vault: VaultDeps = { db, cfg: testConfig({ env: 'live' }), transport: fake.transport, keys, hmac, now: () => new Date() };
    const result = await executeUserHardDelete(u.id, u.email, actor, { db, vault: async () => vault, hmac: () => hmac });
    assert.ok(!isHardDeleteDeferred(result));
    if (isHardDeleteDeferred(result)) return;
    assert.equal(result.billingVaultPurged, true);
    assert.equal(result.billingTombstoned, false);
    assert.equal(await db.billingVaultTombstone.count({ where: { aadUserId: u.id } }), 0);
    assert.deepEqual(
      fake.calls.map((c) => c.url.split('/').pop()),
      ['CardStorageCardList', 'CardStorageCardDelete', 'CardStorageCardList'],
    );
    assert.equal(fake.calls[0].form.customerKey, 'ZYXWVUTSRQ9');
  });
});
