/**
 * Settlement, expiry, post-settle effects, the Prisma renewal store and the
 * refund queue against a real PostgreSQL (billing spec §11, §15.2 "Optional
 * DB integration"). Skipped unless TEST_DATABASE_URL points at a scratch
 * database migrated with `prisma migrate deploy`; refuses a URL containing
 * BILLING_LIVE_DB_REF.
 *
 * Run: TEST_DATABASE_URL=postgresql://…/billing_scratch npm test
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  applyPostSettleEffects,
  expireLapsedPaynkolayPeriods,
  settlePaynkolayPayment,
  type SettleDeps,
} from '../src/lib/billing/paynkolay-billing';
import { listRefundQueue, markRefund } from '../src/lib/billing/refund-queue';
import { addPeriod, istanbulYearMonth } from '../src/lib/billing/renewal-policy';
import { createPrismaRenewalStore } from '../src/lib/billing/renewal-store-prisma';
import { loadHmacKeys, referenceFingerprint } from '../src/lib/billing/vault-crypto';
import { randomTestKey } from './fixtures/paynkolay-fakes';

const url = process.env.TEST_DATABASE_URL?.trim();
const liveRef = process.env.BILLING_LIVE_DB_REF?.trim();
const skip = !url ? 'TEST_DATABASE_URL not set' : liveRef && url.includes(liveRef) ? 'refusing the production database' : false;

const DAY = 24 * 3600_000;
const ok = (ref: string | null = null) => ({ kind: 'succeeded' as const, referenceCode: ref, amountMinor: 99900 });

describe('billing settlement against PostgreSQL', { skip }, () => {
  let db: PrismaClient;
  const suffix = Math.random().toString(36).slice(2, 10);
  const hmac = loadHmacKeys({ BILLING_HMAC_KEY: randomTestKey() });
  const users: string[] = [];
  let planId = '';
  let otherPlanId = '';
  const captured: string[] = [];

  const deps = (now: Date, over: Partial<SettleDeps> = {}): Partial<SettleDeps> => ({
    db,
    hmac,
    backfillDone: true,
    now: () => now,
    capture: (_m, fp) => {
      captured.push(fp);
    },
    applyPlanModules: async () => 0,
    ...over,
  });

  async function user(): Promise<string> {
    const u = await db.user.create({
      data: { email: `settle-${suffix}-${users.length}@example.invalid`, passwordHash: 'x', plan: 'trial' },
      select: { id: true },
    });
    users.push(u.id);
    return u.id;
  }

  async function payment(userId: string, over: Record<string, unknown> = {}): Promise<string> {
    const p = await db.billingPayment.create({
      data: { userId, subscriptionPlanId: planId, billingCycle: 'monthly', amountMinor: 99900, providerEnv: 'live', ...over },
      select: { id: true },
    });
    return p.id;
  }

  async function sub(userId: string, data: Record<string, unknown>): Promise<void> {
    await db.billingSubscription.create({
      data: { userId, plan: 'monthly', status: 'active', source: 'paynkolay', subscriptionPlanId: planId, billingCycle: 'monthly', ...data },
    });
  }

  const subOf = (userId: string) =>
    db.billingSubscription.findUnique({
      where: { userId },
      select: { renewsAt: true, status: true, billingAnchorDay: true, plan: true, autoRenew: true, cancelAtPeriodEnd: true },
    });
  const payOf = (id: string) =>
    db.billingPayment.findUnique({ where: { id }, select: { status: true, referenceCode: true, refundState: true, refundReason: true, failureReason: true } });

  before(async () => {
    db = new PrismaClient({ datasources: { db: { url } } });
    const plan = (name: string) =>
      db.subscriptionPlan.create({
        data: { nameTr: name, nameEn: name, descriptionTr: '-', descriptionEn: '-', priceTry: 999, featuresTr: [], featuresEn: [], paymentProvider: 'paynkolay' },
        select: { id: true },
      });
    planId = (await plan(`settle-${suffix}`)).id;
    otherPlanId = (await plan(`settle-other-${suffix}`)).id;
  });

  after(async () => {
    if (!db) return;
    const pseudo = await db.billingPayment.findMany({ where: { userId: { startsWith: 'del_t' } }, select: { id: true } });
    await db.billingPayment.deleteMany({ where: { OR: [{ userId: { in: users } }, { id: { in: pseudo.map((p) => p.id) } }] } });
    await db.billingInvoice.deleteMany({ where: { userId: { in: users } } });
    await db.billingRenewal.deleteMany({ where: { userId: { in: users } } });
    await db.billingConsent.deleteMany({ where: { userId: { in: users } } });
    await db.billingCard.deleteMany({ where: { userId: { in: users } } });
    await db.billingSubscription.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.subscriptionPlan.deleteMany({ where: { id: { in: [planId, otherPlanId] } } });
    await db.$disconnect();
  });

  it('a first checkout opens an Istanbul-anchored period, fingerprints the reference and is idempotent', async () => {
    const u = await user();
    const p = await payment(u);
    const now = new Date('2027-01-31T09:00:00Z');
    assert.equal(await settlePaynkolayPayment(p, ok('REF-1'), deps(now)), 'succeeded');
    assert.equal(await settlePaynkolayPayment(p, ok('REF-1'), deps(now)), 'already');
    const s = await subOf(u);
    assert.equal(s?.renewsAt?.toISOString(), '2027-02-28T09:00:00.000Z'); // not 3 March
    assert.equal(s?.billingAnchorDay, 31);
    assert.equal((await payOf(p))?.referenceCode, referenceFingerprint('REF-1', hmac));
    const invoices = await db.billingInvoice.findMany({ where: { userId: u }, select: { invoiceNumber: true, providerRef: true } });
    assert.equal(invoices.length, 1);
    assert.equal(invoices[0].invoiceNumber, `PNK-${istanbulYearMonth(now)}-${p.slice(-8).toUpperCase()}`);
    assert.match(invoices[0].providerRef ?? '', /^rf1_/);
    assert.equal((await db.user.findUnique({ where: { id: u }, select: { plan: true } }))?.plan, 'monthly');
    // the anchor brings the next period back to the 31st
    const p2 = await payment(u);
    await settlePaynkolayPayment(p2, ok('REF-1b'), deps(new Date('2027-02-20T09:00:00Z')));
    assert.equal((await subOf(u))?.renewsAt?.toISOString(), '2027-03-31T09:00:00.000Z');
  });

  it('two payments settling at once both count (FOR UPDATE); one payment twice settles once', async () => {
    const u = await user();
    const E = new Date('2027-03-10T09:00:00Z');
    await sub(u, { renewsAt: E, billingAnchorDay: 10 });
    const a = await payment(u);
    const b = await payment(u);
    const now = new Date('2027-03-01T09:00:00Z');
    const results = await Promise.all([settlePaynkolayPayment(a, ok('REF-A'), deps(now)), settlePaynkolayPayment(b, ok('REF-B'), deps(now))]);
    assert.deepEqual(results, ['succeeded', 'succeeded']);
    assert.equal((await subOf(u))?.renewsAt?.toISOString(), addPeriod('monthly', addPeriod('monthly', E, 10), 10).toISOString());
    const c = await payment(u);
    const twice = await Promise.all([settlePaynkolayPayment(c, ok('REF-C'), deps(now)), settlePaynkolayPayment(c, ok('REF-C'), deps(now))]);
    assert.deepEqual(twice.sort(), ['already', 'succeeded']);
    assert.equal(await db.billingInvoice.count({ where: { userId: u } }), 3);
  });

  it('grace days are paid for: past_due and a recent lapse are anchored to E (E-17)', async () => {
    const pastDue = await user();
    const E = new Date('2027-04-10T09:00:00Z');
    await sub(pastDue, { status: 'past_due', renewsAt: E });
    await settlePaynkolayPayment(await payment(pastDue), ok('REF-PD'), deps(new Date('2027-04-12T09:00:00Z')));
    assert.equal((await subOf(pastDue))?.renewsAt?.toISOString(), '2027-05-10T09:00:00.000Z');

    const lapsed = await user();
    await sub(lapsed, { status: 'canceled', plan: 'expired', renewsAt: E });
    await settlePaynkolayPayment(await payment(lapsed), ok('REF-LP'), deps(new Date('2027-04-15T09:00:00Z')));
    const s = await subOf(lapsed);
    assert.equal(s?.renewsAt?.toISOString(), '2027-05-10T09:00:00.000Z');
    assert.equal(s?.status, 'active');

    // another plan restarts from now
    const changed = await user();
    await sub(changed, { status: 'past_due', renewsAt: E });
    await settlePaynkolayPayment(await payment(changed, { subscriptionPlanId: otherPlanId }), ok('REF-CH'), deps(new Date('2027-04-12T09:00:00Z')));
    assert.equal((await subOf(changed))?.renewsAt?.toISOString(), '2027-05-12T09:00:00.000Z');
  });

  it('a renewal payment is anchored to E and closes the renewal; a second payment for it is duplicate_period', async () => {
    const u = await user();
    const E = new Date('2027-06-15T09:00:00Z');
    await sub(u, { renewsAt: E, billingAnchorDay: 15 });
    const r = await db.billingRenewal.create({
      data: { userId: u, providerEnv: 'live', periodEnd: E, subscriptionPlanId: planId, billingCycle: 'monthly', mode: 'reminder', state: 'owner_paying', ownerPrevState: 'scheduled' },
      select: { id: true },
    });
    const first = await payment(u, { kind: 'renewal_link', renewalId: r.id });
    await db.billingRenewal.update({ where: { id: r.id }, data: { ownerPaymentId: first } });
    assert.equal(await settlePaynkolayPayment(first, ok('REF-R1'), deps(new Date('2027-06-16T09:00:00Z'))), 'succeeded');
    const renewal = await db.billingRenewal.findUnique({ where: { id: r.id }, select: { state: true, succeededPaymentId: true } });
    assert.deepEqual(renewal, { state: 'succeeded', succeededPaymentId: first });
    assert.equal((await subOf(u))?.renewsAt?.toISOString(), '2027-07-15T09:00:00.000Z');

    const second = await payment(u, { kind: 'renewal_link', renewalId: r.id });
    captured.length = 0;
    assert.equal(await settlePaynkolayPayment(second, ok('REF-R2'), deps(new Date('2027-06-16T10:00:00Z'))), 'duplicate_period');
    assert.equal((await subOf(u))?.renewsAt?.toISOString(), '2027-07-15T09:00:00.000Z'); // never stacked
    const p = await payOf(second);
    assert.equal(p?.status, 'succeeded');
    assert.equal(p?.refundState, 'required');
    assert.equal(p?.refundReason, 'duplicate_period');
    assert.ok(captured.includes('billing-duplicate-charge'));
    const queue = await listRefundQueue(db);
    assert.ok(queue.some((e) => e.paymentId === second && e.reason === 'duplicate_period'));
    assert.equal(await markRefund(db, second, 'refunded', 'PNL-123'), 'marked');
    assert.equal(await markRefund(db, second, 'refunded', 'PNL-123'), 'not_in_queue');
    assert.equal(await markRefund(db, first, 'refunded', 'bad ref with spaces'), 'invalid_ref');
    const inv = await db.billingInvoice.findFirst({ where: { invoiceNumber: { endsWith: second.slice(-8).toUpperCase() } }, select: { status: true } });
    assert.equal(inv?.status, 'refunded');
  });

  it('refund on success: no period, refund queued; a late automatic success after a lapse reactivates from now', async () => {
    const u = await user();
    const E = new Date('2027-08-01T09:00:00Z');
    await sub(u, { renewsAt: E });
    const r = await db.billingRenewal.create({
      data: { userId: u, providerEnv: 'live', periodEnd: E, billingCycle: 'monthly', subscriptionPlanId: planId, mode: 'auto', state: 'awaiting_confirmation', attempts: 1 },
      select: { id: true },
    });
    const auto = await payment(u, { kind: 'renewal_auto', renewalId: r.id, attemptNo: 1, refundOnSuccess: true, refundReason: 'owner_opt_out' });
    assert.equal(await settlePaynkolayPayment(auto, ok('REF-OO'), deps(new Date('2027-08-01T10:00:00Z'))), 'refund_pending');
    assert.equal((await subOf(u))?.renewsAt?.toISOString(), E.toISOString());
    assert.equal((await db.billingRenewal.findUnique({ where: { id: r.id }, select: { state: true } }))?.state, 'needs_action');
    assert.equal((await payOf(auto))?.refundState, 'required');

    const v = await user();
    await sub(v, { status: 'canceled', plan: 'expired', renewsAt: E });
    const lapsed = await db.billingRenewal.create({
      data: { userId: v, providerEnv: 'live', periodEnd: E, billingCycle: 'monthly', subscriptionPlanId: planId, mode: 'auto', state: 'lapsed', attempts: 1 },
      select: { id: true },
    });
    const late = await payment(v, { kind: 'renewal_auto', renewalId: lapsed.id, attemptNo: 1, status: 'failed', failureReason: 'no_transaction' });
    const now = new Date('2027-08-20T09:00:00Z');
    captured.length = 0;
    assert.equal(await settlePaynkolayPayment(late, ok('REF-LATE'), deps(now)), 'late_success');
    assert.equal((await subOf(v))?.renewsAt?.toISOString(), addPeriod('monthly', now).toISOString());
    assert.equal((await db.billingRenewal.findUnique({ where: { id: lapsed.id }, select: { state: true } }))?.state, 'lapsed');
    assert.ok(captured.includes('billing-late-success'));
  });

  it('erased owners and reused references are held for review, never granted', async () => {
    const pseud = await payment('del_t' + suffix.padEnd(18, 'x'));
    captured.length = 0;
    assert.equal(await settlePaynkolayPayment(pseud, ok('REF-DEL'), deps(new Date())), 'review');
    const p = await payOf(pseud);
    assert.deepEqual([p?.status, p?.refundReason], ['needs_review', 'erased_user']);
    assert.ok(captured.includes('billing-refund-required'));

    const u = await user();
    const first = await payment(u);
    await settlePaynkolayPayment(first, ok('REF-SAME'), deps(new Date()));
    const again = await payment(u);
    assert.equal(await settlePaynkolayPayment(again, ok('REF-SAME'), deps(new Date())), 'review');
    assert.equal((await payOf(again))?.failureReason, 'reference_reused');
    // before the back-fill a raw legacy value also blocks reuse
    const legacy = await payment(u, { status: 'succeeded', referenceCode: 'RAW-LEGACY' });
    void legacy;
    const third = await payment(u);
    assert.equal(await settlePaynkolayPayment(third, ok('RAW-LEGACY'), deps(new Date(), { backfillDone: false })), 'review');
    // without the HMAC key nothing raw is stored
    const fourth = await payment(u);
    await settlePaynkolayPayment(fourth, ok('REF-NOKEY'), deps(new Date(), { hmac: null }));
    assert.equal((await payOf(fourth))?.referenceCode, null);
    assert.equal(await db.billingInvoice.count({ where: { providerRef: `paynkolay:${fourth}` } }), 1);
  });

  it('expiry: past_due expires, consented grace and in-flight payments are respected, a settle in between wins', async () => {
    const now = new Date('2027-09-10T09:00:00Z');
    const E = new Date('2027-09-09T09:00:00Z');
    const pastDue = await user();
    await sub(pastDue, { status: 'past_due', renewsAt: E });
    const grace = await user();
    await sub(grace, { renewsAt: E });
    await db.billingRenewal.create({
      data: { userId: grace, providerEnv: 'live', periodEnd: E, billingCycle: 'monthly', mode: 'reminder', modeReason: 'dry_run', state: 'scheduled', graceEndsAt: new Date(E.getTime() + 5 * DAY) },
    });
    const inFlight = await user();
    await sub(inFlight, { renewsAt: E });
    await db.billingRenewal.create({
      data: { userId: inFlight, providerEnv: 'live', periodEnd: E, billingCycle: 'monthly', mode: 'auto', state: 'awaiting_confirmation', attempts: 1 },
    });
    const plain = await user();
    await sub(plain, { renewsAt: E });
    const plainRenewal = await db.billingRenewal.create({
      data: { userId: plain, providerEnv: 'live', periodEnd: E, billingCycle: 'monthly', mode: 'reminder', state: 'scheduled' },
      select: { id: true },
    });
    await expireLapsedPaynkolayPeriods(now, db);
    assert.equal((await subOf(pastDue))?.status, 'canceled');
    assert.equal((await subOf(pastDue))?.plan, 'expired');
    assert.equal((await db.user.findUnique({ where: { id: pastDue }, select: { plan: true } }))?.plan, 'expired');
    assert.equal((await subOf(grace))?.status, 'active');
    assert.equal((await subOf(inFlight))?.status, 'active');
    assert.equal((await subOf(plain))?.status, 'canceled');
    assert.equal((await db.billingRenewal.findUnique({ where: { id: plainRenewal.id }, select: { state: true } }))?.state, 'lapsed');
    // after graceEnd the consented one lapses too
    await expireLapsedPaynkolayPeriods(new Date(E.getTime() + 5 * DAY + 1000), db);
    assert.equal((await subOf(grace))?.status, 'canceled');

    // a settle and the expiry racing on the same row: the paid period is never lost
    const racer = await user();
    await sub(racer, { renewsAt: E });
    const pay = await payment(racer);
    await Promise.all([settlePaynkolayPayment(pay, ok('REF-RACE'), deps(now)), expireLapsedPaynkolayPeriods(now, db)]);
    const s = await subOf(racer);
    assert.equal(s?.status, 'active');
    assert.ok((s?.renewsAt?.getTime() ?? 0) > now.getTime());
  });

  it('post-settle: other open renewals are superseded, consent IP retention extended, a plan change turns auto-renew off', async () => {
    const u = await user();
    const store = createPrismaRenewalStore(db);
    const oldE = new Date('2027-10-01T09:00:00Z');
    await sub(u, { renewsAt: oldE, autoRenew: true });
    const consent = await db.billingConsent.create({
      data: { userId: u, kind: 'auto_renew_on', actor: 'owner', subscriptionPlanId: planId, billingCycle: 'monthly', amountMinor: 99900, ipAddress: '203.0.113.9', ipPurgeAfter: new Date('2027-01-01T00:00:00Z') },
      select: { id: true },
    });
    await db.billingSubscription.update({ where: { userId: u }, data: { autoRenewConsentId: consent.id } });
    const card = await db.billingCard.create({
      data: { userId: u, handle: `cd_${'a'.repeat(14)}${suffix}`.slice(0, 25).padEnd(25, 'a'), boundConsentId: consent.id },
      select: { id: true },
    });
    const old = await db.billingRenewal.create({
      data: { userId: u, providerEnv: 'live', periodEnd: oldE, billingCycle: 'monthly', mode: 'auto', state: 'scheduled', graceEndsAt: new Date(oldE.getTime() + 5 * DAY) },
      select: { id: true },
    });
    // a checkout for another plan, without a new consent
    const p = await payment(u, { subscriptionPlanId: otherPlanId });
    const now = new Date('2027-09-20T09:00:00Z');
    await settlePaynkolayPayment(p, ok('REF-PC'), deps(now));
    await applyPostSettleEffects(p, { db, store, now: () => now });
    const s = await subOf(u);
    assert.equal(s?.autoRenew, false);
    assert.equal((await db.billingCard.findUnique({ where: { id: card.id }, select: { boundConsentId: true } }))?.boundConsentId, null);
    assert.equal(await db.billingConsent.count({ where: { userId: u, kind: 'auto_renew_off', reason: 'plan_changed' } }), 1);
    const oldRow = await db.billingRenewal.findUnique({ where: { id: old.id }, select: { state: true, endReason: true } });
    assert.deepEqual(oldRow, { state: 'canceled', endReason: 'superseded' });
    const c = await db.billingConsent.findUnique({ where: { id: consent.id }, select: { ipPurgeAfter: true } });
    assert.ok((c?.ipPurgeAfter?.getTime() ?? 0) >= now.getTime() + 539 * DAY);
  });

  it('Prisma store: environment scoping (NULL = live), conditional fail, transition guard', async () => {
    const store = createPrismaRenewalStore(db);
    const u = await user();
    const created = new Date(Date.now() - 2 * 3600_000);
    const legacy = await payment(u, { providerEnv: null, createdAt: created });
    const testRow = await payment(u, { providerEnv: 'test', createdAt: created });
    const live = (await store.listPaymentsToConfirm('live', new Date(), 500)).map((p) => p.id);
    assert.ok(live.includes(legacy));
    assert.ok(!live.includes(testRow));
    assert.ok((await store.listPaymentsToConfirm('test', new Date(), 500)).some((p) => p.id === testRow));
    assert.equal(await store.markPaymentFailed(legacy, 'no_transaction', new Date()), true);
    assert.equal(await store.markPaymentFailed(legacy, 'no_transaction', new Date()), false);
    assert.ok((await store.listFailedToRecheck('live', new Date(Date.now() + 7 * 3600_000), 500)).some((p) => p.id === legacy));
    const r = await db.billingRenewal.create({
      data: { userId: u, providerEnv: 'live', periodEnd: new Date('2027-11-01T09:00:00Z'), billingCycle: 'monthly', mode: 'reminder', state: 'lapsed' },
      select: { id: true },
    });
    assert.equal(await store.transition(r.id, ['lapsed'], { state: 'succeeded' }), false);
    assert.equal(await store.transition(r.id, ['lapsed'], { pendingMail: 'x' }), false);
  });
});
