/**
 * Retention and data minimisation (billing spec §4.4, §15.2
 * `billing-retention.test.ts`). The IP truncation is pure; the rest needs a
 * scratch PostgreSQL (skipped unless TEST_DATABASE_URL is set; refuses a URL
 * containing BILLING_LIVE_DB_REF). The provider is a fake transport.
 */

import { after, before, describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import type { VaultDeps } from '../src/lib/billing/card-vault';
import { RETENTION, runRetention, truncateIp, type RetentionMailer } from '../src/lib/billing/retention';
import { sensitive } from '../src/lib/billing/sensitive';
import { clientIpFingerprint, customerKeyFingerprint, loadHmacKeys, loadVaultKeys, sealCustomerKey } from '../src/lib/billing/vault-crypto';
import { cardListBody, fakeTransport, randomTestKey, testConfig } from './fixtures/paynkolay-fakes';

const url = process.env.TEST_DATABASE_URL?.trim();
const liveRef = process.env.BILLING_LIVE_DB_REF?.trim();
const skip = !url ? 'TEST_DATABASE_URL not set' : liveRef && url.includes(liveRef) ? 'refusing the production database' : false;
const DAY = 24 * 3600_000;

test('truncateIp: IPv4 /24, IPv6 /48, mapped IPv4, garbage → null', () => {
  assert.equal(truncateIp('203.0.113.77'), '203.0.113.0');
  assert.equal(truncateIp('2001:db8:abcd:12::1'), '2001:db8:abcd::');
  assert.equal(truncateIp('2001:0db8:0000:0012:0000:0000:0000:0001'), '2001:db8:0::');
  assert.equal(truncateIp('::1'), '0:0:0::');
  assert.equal(truncateIp('::ffff:10.1.2.3'), '10.1.2.0');
  assert.equal(truncateIp('not-an-ip'), null);
  assert.equal(truncateIp(null), null);
});

describe('retention against PostgreSQL', { skip }, () => {
  let db: PrismaClient;
  const suffix = Math.random().toString(36).slice(2, 10);
  const keys = loadVaultKeys({ BILLING_VAULT_KEY: randomTestKey() });
  const hmac = loadHmacKeys({ BILLING_HMAC_KEY: randomTestKey() });
  const users: string[] = [];
  const now = new Date('2028-06-01T09:00:00Z');

  async function owner(sub: { status: string; renewsAt: Date; autoRenew?: boolean } | null): Promise<string> {
    const u = await db.user.create({ data: { email: `ret-${suffix}-${users.length}@example.invalid`, passwordHash: 'x' }, select: { id: true } });
    users.push(u.id);
    if (sub) {
      await db.billingSubscription.create({
        data: { userId: u.id, plan: 'monthly', source: 'paynkolay', billingCycle: 'monthly', status: sub.status, renewsAt: sub.renewsAt, autoRenew: sub.autoRenew ?? false },
      });
    }
    return u.id;
  }

  async function customer(userId: string, key: string, noticeAt: Date | null = null): Promise<void> {
    const ck = sensitive(key);
    await db.billingCustomer.create({
      data: { userId, providerEnv: 'live', customerKeyEnc: sealCustomerKey(ck, userId, keys), customerKeyFp: customerKeyFingerprint(ck, hmac), retentionNoticeAt: noticeAt },
    });
    await db.billingCard.create({ data: { userId, handle: `cd_${key}${suffix}`.padEnd(25, 'z').slice(0, 25), last4: '4242' } });
  }

  before(() => {
    db = new PrismaClient({ datasources: { db: { url } } });
  });

  after(async () => {
    if (!db) return;
    await db.billingVaultTombstone.deleteMany({ where: { aadUserId: { in: users } } });
    await db.billingConsent.deleteMany({ where: { userId: { in: users } } });
    await db.billingRenewal.deleteMany({ where: { userId: { in: users } } });
    await db.billingCard.deleteMany({ where: { userId: { in: users } } });
    await db.billingCustomer.deleteMany({ where: { userId: { in: users } } });
    await db.billingSubscription.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });

  it('truncates consent IPs past ip_purge_after, schedules and deletes consent rows, prunes card and renewal history', async () => {
    const ended = await owner({ status: 'canceled', renewsAt: new Date('2027-01-01T00:00:00Z') });
    const active = await owner({ status: 'active', renewsAt: new Date('2028-07-01T00:00:00Z') });
    const old = await db.billingConsent.create({
      data: { userId: ended, kind: 'card_save', actor: 'owner', ipAddress: '198.51.100.23', userAgent: 'Mozilla', ipPurgeAfter: new Date(now.getTime() - DAY) },
      select: { id: true },
    });
    const recent = await db.billingConsent.create({
      data: { userId: active, kind: 'card_save', actor: 'owner', ipAddress: '198.51.100.24', userAgent: 'Mozilla', ipPurgeAfter: new Date(now.getTime() + DAY), purgeAfter: new Date('2030-01-01T00:00:00Z') },
      select: { id: true },
    });
    const expired = await db.billingConsent.create({
      data: { userId: active, kind: 'auto_renew_off', actor: 'owner', purgeAfter: new Date(now.getTime() - DAY) },
      select: { id: true },
    });
    await db.billingCard.create({ data: { userId: ended, handle: `cd_old${suffix}`.padEnd(25, 'o'), deletedAt: new Date(now.getTime() - 31 * DAY) } });
    await db.billingCard.create({ data: { userId: ended, handle: `cd_new${suffix}`.padEnd(25, 'n'), deletedAt: new Date(now.getTime() - 29 * DAY) } });
    await db.billingRenewal.create({
      data: { userId: ended, providerEnv: 'live', periodEnd: new Date('2026-01-01T00:00:00Z'), billingCycle: 'monthly', mode: 'reminder', state: 'lapsed', endedAt: new Date('2026-05-01T00:00:00Z') },
    });
    await db.billingRenewal.create({
      data: { userId: ended, providerEnv: 'live', periodEnd: new Date('2027-01-01T00:00:00Z'), billingCycle: 'monthly', mode: 'reminder', state: 'lapsed', endedAt: new Date('2027-01-02T00:00:00Z') },
    });

    const summary = await runRetention({ db, env: 'live', vault: null, mailer: null }, now);
    const o = await db.billingConsent.findUnique({ where: { id: old.id }, select: { ipAddress: true, userAgent: true, ipTruncatedAt: true, purgeAfter: true } });
    assert.equal(o?.ipAddress, '198.51.100.0');
    assert.equal(o?.userAgent, null);
    assert.ok(o?.ipTruncatedAt);
    assert.equal(o?.purgeAfter?.toISOString(), '2037-01-01T00:00:00.000Z'); // contract end + 10 years
    const r = await db.billingConsent.findUnique({ where: { id: recent.id }, select: { ipAddress: true, purgeAfter: true } });
    assert.equal(r?.ipAddress, '198.51.100.24');
    assert.equal(r?.purgeAfter, null); // the subscription is active again
    assert.equal(await db.billingConsent.count({ where: { id: expired.id } }), 0);
    assert.equal(await db.billingCard.count({ where: { userId: ended } }), 1);
    assert.equal(await db.billingRenewal.count({ where: { userId: ended } }), 1);
    assert.ok(summary.ipsTruncated >= 1);
  });

  it('stored cards: notice at end + 166 d, provider purge at end + 180 d, tombstone when the purge is not verified', async () => {
    const noticeOwner = await owner({ status: 'canceled', renewsAt: new Date(now.getTime() - 170 * DAY) });
    await customer(noticeOwner, 'NOTICE00001');
    const purgeOwner = await owner({ status: 'canceled', renewsAt: new Date(now.getTime() - 181 * DAY) });
    await customer(purgeOwner, 'PURGE000001', new Date(now.getTime() - 15 * DAY));
    const stuckOwner = await owner({ status: 'canceled', renewsAt: new Date(now.getTime() - 200 * DAY) });
    await customer(stuckOwner, 'STUCK000001');
    const keepOwner = await owner({ status: 'canceled', renewsAt: new Date(now.getTime() - 181 * DAY), autoRenew: true });
    await customer(keepOwner, 'KEEP0000001');

    const cards = new Map<string, { Token: string }[]>([
      ['PURGE000001', [{ Token: 'T-P' }]],
      ['STUCK000001', [{ Token: 'T-S' }]],
    ]);
    const fake = fakeTransport({
      CardStorageCardList: (form) => ({ body: cardListBody(cards.get(form.customerKey) ?? []) }),
      CardStorageCardDelete: (form) => {
        if (form.customerKey === 'PURGE000001') cards.set(form.customerKey, []);
        return { body: { ProcReturnCode: '00' } };
      },
    });
    const vault: VaultDeps = { db, cfg: testConfig({ env: 'live' }), transport: fake.transport, keys, hmac, now: () => now };
    const mailed: { email: string; deleteOn: Date }[] = [];
    const mailer: RetentionMailer = {
      async cardRetention(to, v) {
        mailed.push({ email: to.email, deleteOn: v.deleteOn });
        return true;
      },
    };
    const summary = await runRetention({ db, env: 'live', vault, mailer }, now);
    assert.equal(summary.retentionNotices, 1);
    assert.equal(mailed.length, 1);
    assert.ok((await db.billingCustomer.findUnique({ where: { userId: noticeOwner }, select: { retentionNoticeAt: true } }))?.retentionNoticeAt);

    assert.equal(await db.billingCustomer.count({ where: { userId: purgeOwner } }), 0);
    const card = await db.billingCard.findFirst({ where: { userId: purgeOwner }, select: { deletedAt: true, deleteReason: true } });
    assert.equal(card?.deleteReason, 'retention');

    // 200 days without a notice: purged anyway; the provider still lists the card → tombstone
    assert.equal(await db.billingCustomer.count({ where: { userId: stuckOwner } }), 0);
    assert.equal(await db.billingVaultTombstone.count({ where: { aadUserId: stuckOwner } }), 1);
    assert.equal(summary.providerPurged, 1);
    assert.equal(summary.providerTombstoned, 1);

    // auto-renew still on: never treated as ended
    assert.equal(await db.billingCustomer.count({ where: { userId: keepOwner } }), 1);
    assert.equal(RETENTION.cardPurgeDays, 180);
  });

  it('without config/binding/keys only the DB steps run', async () => {
    const u = await owner({ status: 'canceled', renewsAt: new Date(now.getTime() - 300 * DAY) });
    await customer(u, 'NOVAULT0001');
    const summary = await runRetention({ db, env: 'live', vault: null, mailer: null }, now);
    assert.ok(summary.providerSkipped >= 1);
    assert.equal(await db.billingCustomer.count({ where: { userId: u } }), 1);
  });

  it('client-IP fingerprints of payments are nulled 2 days after the payment; a raw IP is refused by the DB', async () => {
    const u = await owner(null);
    const fp = clientIpFingerprint('203.0.113.7', hmac);
    const old = await db.billingPayment.create({
      data: { userId: u, amountMinor: 100, billingCycle: 'monthly', kind: 'checkout', clientIpFp: fp, createdAt: new Date(now.getTime() - 3 * DAY) },
      select: { id: true },
    });
    const fresh = await db.billingPayment.create({
      data: { userId: u, amountMinor: 100, billingCycle: 'monthly', kind: 'checkout', clientIpFp: fp, createdAt: new Date(now.getTime() - DAY) },
      select: { id: true },
    });
    const summary = await runRetention({ db, env: 'live', vault: null, mailer: null }, now);
    assert.ok(summary.ipFingerprintsCleared >= 1);
    const rows = await db.billingPayment.findMany({ where: { id: { in: [old.id, fresh.id] } }, select: { id: true, clientIpFp: true } });
    assert.equal(rows.find((r) => r.id === old.id)?.clientIpFp, null);
    assert.equal(rows.find((r) => r.id === fresh.id)?.clientIpFp, fp, 'still inside the 24 h cap window (+1 day margin)');
    await assert.rejects(() =>
      db.billingPayment.create({ data: { userId: u, amountMinor: 1, billingCycle: 'monthly', clientIpFp: '203.0.113.7' }, select: { id: true } }),
    );
    await db.billingPayment.deleteMany({ where: { userId: u } });
  });
});
