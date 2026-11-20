import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { deleteCardCore } from '../src/lib/billing/card-api';
import { getOrCreateCustomerKey, reconcileCardsAfterSave, refreshCards, retryCardCleanup } from '../src/lib/billing/card-vault';
import { loadCheckoutReview } from '../src/lib/billing/checkout-review';
import { summaryPaymentMethod } from '../src/lib/billing/owner-guard';
import { runRenewalTick, type RenewalDeps, type RenewalMailer } from '../src/lib/billing/renewal-engine';
import { createPrismaRenewalStore } from '../src/lib/billing/renewal-store-prisma';
import { loadResultModel } from '../src/lib/billing/result-model';
import { renderBillingCardRetention, retentionCardPhrase } from '../src/lib/email/templates/billing-card-retention';
import { cardFlags, fakeCardProvider, testVaultDeps } from './fixtures/card-provider';
import { fakePrisma } from './fixtures/fake-prisma';
import { fakeSettings, fakeTransport, fixedClock, testConfig } from './fixtures/paynkolay-fakes';
import { fakeSettle, makeRenewal, memoryRenewalStore, paymentListHandler } from './fixtures/renewal-fakes';

// Regression tests for the PR 2 (saved cards) review findings: D10 for retention mail, queued and reminder
// mails re-checked at send time, D1 clean-up retried, verified owner deletes, a save is not "not saved" on one
// list, team members get no card data, and the review / result pages lead somewhere that works.

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const E = new Date('2026-12-17T09:00:00Z'); // 12:00 Istanbul

function engine(start: string) {
  const clock = fixedClock(start);
  const store = memoryRenewalStore(clock);
  const fake = fakeTransport({ PaymentList: paymentListHandler(new Map()) });
  const sent: string[] = [];
  const mailer: RenewalMailer = {
    async upcoming(_to, v) {
      sent.push(v.variant);
      return true;
    },
    async periodEnded() {
      sent.push('period_ended');
      return true;
    },
  };
  const retentionRuns: string[] = [];
  store.subscriptions.set('u1', { status: 'active', renewsAt: E, autoRenew: false });
  store.owners.set('u1', { email: 'u1@example.test', locale: 'tr' });
  const deps: RenewalDeps = {
    store,
    cfg: testConfig({ env: 'live' }),
    transport: fake.transport,
    flags: cardFlags(),
    settings: fakeSettings({ providerEnv: 'live' }),
    clock,
    settle: fakeSettle(store),
    postSettle: async () => {},
    expireLapsed: async () => 0,
    retention: async (now) => void retentionRuns.push(now.toISOString()),
    vault: null,
    captureMessage: () => {},
    captureException: () => {},
    runId: 'run1',
    mailer,
    siteUrl: 'https://www.buaze.com',
  };
  return { clock, store, deps, sent, retentionRuns };
}

describe('renewal engine — review fixes', () => {
  it('CARD-01: retention (which mails the card notice) never runs at 00:25 Istanbul; the first tick in the window runs it once', async () => {
    const t = engine('2026-12-16T21:25:00Z'); // 00:25 Istanbul
    await runRenewalTick(t.deps);
    assert.deepEqual(t.retentionRuns, [], 'D10: no customer mail outside 09:00–21:00');
    t.clock.set('2026-12-17T05:25:00Z'); // 08:25
    await runRenewalTick(t.deps);
    assert.deepEqual(t.retentionRuns, []);
    t.clock.set('2026-12-17T06:25:00Z'); // 09:25
    await runRenewalTick(t.deps);
    assert.deepEqual(t.retentionRuns, ['2026-12-17T06:25:00.000Z']);
    t.clock.set('2026-12-17T07:25:00Z');
    await runRenewalTick(t.deps);
    assert.equal(t.retentionRuns.length, 1, 'once per Istanbul day');
  });

  it('CARD-06: a queued "period ended" mail is dropped when the owner has renewed since', async () => {
    const t = engine('2026-12-18T06:35:00Z'); // 09:35 Istanbul, the morning after a 22:35 lapse
    t.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, state: 'lapsed', pendingMail: 'period_ended' }));
    t.store.subscriptions.set('u1', { status: 'active', renewsAt: new Date(E.getTime() + 31 * DAY), autoRenew: false });
    await runRenewalTick(t.deps);
    assert.deepEqual(t.sent, []);
    assert.equal(t.store.renewals[0].pendingMail, null, 'cleared without sending');

    const lapsed = engine('2026-12-18T06:35:00Z');
    lapsed.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, state: 'lapsed', pendingMail: 'period_ended' }));
    lapsed.store.subscriptions.set('u1', { status: 'canceled', renewsAt: E, autoRenew: false });
    await runRenewalTick(lapsed.deps);
    assert.deepEqual(lapsed.sent, ['period_ended'], 'still sent when the plan really ended');
  });

  it('CARD-07: a reminder is re-checked at send time; a canceled or manually invoiced subscription gets none and the row closes', async () => {
    for (const [sub, reason] of [
      [{ status: 'canceled', renewsAt: E, autoRenew: false }, 'subscription_inactive'],
      [{ status: 'active', renewsAt: E, autoRenew: false, source: 'manual' }, 'not_card_subscription'],
      [{ status: 'active', renewsAt: E, autoRenew: false, cancelAtPeriodEnd: true }, 'cancel_at_period_end'],
    ] as const) {
      const t = engine('2026-12-16T12:00:00Z'); // E − 21 h, 15:00 Istanbul
      t.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, noticeClaimedAt: E }));
      t.store.subscriptions.set('u1', { ...sub });
      await runRenewalTick(t.deps);
      assert.deepEqual(t.sent, [], reason);
      assert.equal(t.store.renewals[0].state, 'canceled', reason);
      assert.equal(t.store.renewals[0].endReason, reason);
    }
    const ok = engine('2026-12-16T12:00:00Z');
    ok.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, noticeClaimedAt: E }));
    await runRenewalTick(ok.deps);
    assert.deepEqual(ok.sent, ['reminder_1'], 'an eligible owner still gets the last call');
  });

  it('CARD-03: owed D1 clean-ups are retried by the reconcile phase', async () => {
    const t = engine('2026-12-10T10:00:00Z');
    t.store.cardCleanupsOwed.push('pay_1');
    const seen: string[] = [];
    await runRenewalTick({ ...t.deps, cardCleanup: async (id) => void seen.push(id) });
    assert.deepEqual(seen, ['pay_1']);
  });
});

async function vaultSetup() {
  const clock = fixedClock('2026-12-10T10:00:00Z');
  const db = fakePrisma(clock);
  const provider = fakeCardProvider();
  const vault = testVaultDeps(db, provider, clock);
  await db.user.create({ data: { id: 'u1', email: 'u1@example.test' } });
  const key = (await getOrCreateCustomerKey(vault, 'u1')).reveal();
  return { clock, db, provider, vault, key };
}

async function savingPayment(t: Awaited<ReturnType<typeof vaultSetup>>, id: string, alias: string) {
  await t.db.billingPayment.create({
    data: {
      id,
      userId: 'u1',
      amountMinor: 99900,
      billingCycle: 'monthly',
      status: 'succeeded',
      kind: 'checkout',
      saveCard: true,
      cardAlias: alias,
      cardSaveResult: 'pending',
      providerEnv: 'live',
      completedAt: t.clock(),
    },
  });
  await t.db.billingConsent.create({ data: { userId: 'u1', kind: 'card_save', actor: 'owner', paymentId: id } });
}

describe('card vault — review fixes', () => {
  it('CARD-02: a card one list does not show is not reported deleted: 404, no provider delete, no consent row, mirror kept', async () => {
    const t = await vaultSetup();
    t.provider.seed(t.key, { Token: 'TOK1', CARD_ALIACE: 'Buaze-AAAAAA', Maskedpan: '411111******1111' });
    const [card] = await refreshCards(t.vault, 'u1');
    t.provider.cards.set(t.key, []); // one-off "02 Gecerli Kart Yok"
    const res = await deleteCardCore(
      {
        db: t.db.client as unknown as PrismaClient,
        flags: cardFlags(),
        vault: t.vault,
        store: { disableAutoRenew: async () => ({ changed: false, chargeInProgress: false }) } as never,
        now: t.clock,
        rateLimit: async () => ({ allowed: true }),
      },
      { userId: 'u1', canManage: true },
      card.handle,
    );
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'card_not_found' });
    assert.equal(t.provider.deletes().length, 0);
    assert.equal(t.db.billingConsent.rows.filter((c) => c.kind === 'card_delete').length, 0, 'no card_delete evidence');
    assert.equal(t.db.billingCard.rows[0].deletedAt, null, 'the mirror keeps the card (two misses ≥ 24 h rule)');
    assert.ok(t.db.billingCard.rows[0].missingSince instanceof Date);
    // The card is back in the next list: it was never gone.
    t.provider.seed(t.key, { Token: 'TOK1', CARD_ALIACE: 'Buaze-AAAAAA', Maskedpan: '411111******1111' });
    assert.equal((await refreshCards(t.vault, 'u1')).length, 1);
  });

  it('CARD-05: a save the list does not show yet stays pending for an hour, then becomes not_saved', async () => {
    const t = await vaultSetup();
    await savingPayment(t, 'pay_aaaaaa', 'Buaze-AAAAAA');
    t.provider.cards.set(t.key, []);
    assert.equal(await reconcileCardsAfterSave(t.vault, 'pay_aaaaaa'), 'pending');
    assert.equal(t.db.billingPayment.rows[0].cardSaveResult, 'pending', 'the engine retries pending saves');
    t.clock.advance(20 * 60_000);
    t.provider.seed(t.key, { Token: 'NEW', CARD_ALIACE: 'Buaze-AAAAAA' });
    assert.equal(await reconcileCardsAfterSave(t.vault, 'pay_aaaaaa'), 'saved', 'listed on a later try → verified');

    const late = await vaultSetup();
    await savingPayment(late, 'pay_bbbbbb', 'Buaze-BBBBBB');
    assert.equal(await reconcileCardsAfterSave(late.vault, 'pay_bbbbbb'), 'pending');
    late.clock.advance(2 * HOUR);
    assert.equal(await reconcileCardsAfterSave(late.vault, 'pay_bbbbbb'), 'not_saved');
  });

  it('CARD-03: an unverified D1 delete keeps the old card (not "replaced") and is owed; the retry deletes it', async () => {
    const t = await vaultSetup();
    t.provider.seed(t.key, { Token: 'OLD', CARD_ALIACE: 'Buaze-OLD001', Maskedpan: '411111******1111' });
    await refreshCards(t.vault, 'u1');
    await savingPayment(t, 'pay_cccccc', 'Buaze-CCCCCC');
    t.provider.seed(t.key, { Token: 'NEW', CARD_ALIACE: 'Buaze-CCCCCC', Maskedpan: '545616******5454' });
    t.provider.state.stickyDelete = true;
    assert.equal(await reconcileCardsAfterSave(t.vault, 'pay_cccccc'), 'saved', 'the save itself is verified');
    const old = () => t.db.billingCard.rows.find((r) => r.last4 === '1111');
    assert.equal(old()?.deletedAt, null, 'never marked replaced while PayNKolay still lists it');

    const store = createPrismaRenewalStore(t.db.client as unknown as PrismaClient);
    assert.deepEqual(await store.listCardCleanupsOwed('live', t.clock(), 10), [{ id: 'pay_cccccc' }]);
    assert.equal(await retryCardCleanup(t.vault, 'pay_cccccc'), false, 'still sticky');
    t.provider.state.stickyDelete = false;
    assert.equal(await retryCardCleanup(t.vault, 'pay_cccccc'), true);
    assert.equal(old()?.deleteReason, 'replaced');
    assert.deepEqual(t.provider.cards.get(t.key)?.map((c) => c.Token), ['NEW']);
    assert.deepEqual(await store.listCardCleanupsOwed('live', t.clock(), 10), [], 'nothing owed any more');

    // A list without the saved card is not a real answer: nothing is deleted on it.
    t.provider.seed(t.key, { Token: 'X', CARD_ALIACE: 'Buaze-X00001' });
    await refreshCards(t.vault, 'u1');
    const saved = t.provider.cards.get(t.key)?.filter((c) => c.Token === 'X') ?? [];
    t.provider.cards.set(t.key, saved);
    const before = t.provider.deletes().length;
    assert.equal(await retryCardCleanup(t.vault, 'pay_cccccc'), false);
    assert.equal(t.provider.deletes().length, before);
  });
});

describe('owner surfaces — review fixes', () => {
  it('WEBSEC-2: the summary carries the admin-entered card label for the owner only (D9)', () => {
    const sub = { paymentBrand: 'visa', paymentLast4: '4242' };
    assert.deepEqual(summaryPaymentMethod(sub, true), { brand: 'visa', last4: '4242' });
    assert.equal(summaryPaymentMethod(sub, false), null, 'team member: no brand, no last4');
    assert.equal(summaryPaymentMethod({ paymentBrand: null, paymentLast4: '4242' }, true), null);
  });

  it('UX-14 / UX-08: the retention mail names the card as one phrase and links to the saved-card page', async () => {
    assert.equal(retentionCardPhrase('4242', 'tr'), '•••• 4242 ile biten kartınız');
    assert.equal(retentionCardPhrase(null, 'tr'), 'kartınız');
    assert.equal(retentionCardPhrase('4242', 'en'), 'your card ending in 4242');
    const mail = await renderBillingCardRetention(
      { last4: '4242', deleteOn: new Date('2026-12-19T09:00:00Z'), accountUrl: 'https://www.buaze.com/billing/tr/card' },
      'tr',
    );
    assert.match(mail.text, /PayNKolay'da saklanan •••• 4242 ile biten kartınız 19 Ara 2026 tarihinde silinecek/);
    assert.match(mail.text, /https:\/\/www\.buaze\.com\/billing\/tr\/card/);
    assert.doesNotMatch(mail.text, /4242 19/);
  });

  it('UX-06: "try again" after a failed card replacement opens the replacement; without the payment there is no dead-end link', async () => {
    const clock = fixedClock('2026-12-10T10:00:00Z');
    const db = fakePrisma(clock);
    await db.billingSubscription.create({
      data: { userId: 'u1', source: 'paynkolay', status: 'active', subscriptionPlanId: 'plan_growth', billingCycle: 'monthly', renewsAt: E },
    });
    await db.billingPayment.create({
      data: { id: 'cpay00000001', userId: 'u1', amountMinor: 99900, billingCycle: 'monthly', status: 'failed', kind: 'checkout', saveCard: true, subscriptionPlanId: 'plan_growth' },
    });
    await db.billingPayment.create({
      data: { id: 'cpay00000002', userId: 'u1', amountMinor: 99900, billingCycle: 'yearly', status: 'failed', kind: 'checkout', saveCard: false, subscriptionPlanId: 'plan_big' },
    });
    const client = db.client as unknown as PrismaClient;
    const replace = await loadResultModel({ db: client, locale: 'tr', query: 'failed', paymentId: 'cpay00000001', viewerUserId: 'u1' });
    assert.equal(replace.retryPath, '/billing/tr/checkout?intent=replace_card');
    const other = await loadResultModel({ db: client, locale: 'tr', query: 'failed', paymentId: 'cpay00000002', viewerUserId: 'u1' });
    assert.equal(other.retryPath, '/billing/tr/checkout?planId=plan_big&cycle=yearly');
    const generic = await loadResultModel({ db: client, locale: 'tr', query: 'failed', paymentId: null, viewerUserId: null });
    assert.equal(generic.retryPath, null);
  });

  it('UX-04: the renew link after the period ended offers the same plan as a new payment; UX-02: the gate is shown up front', async () => {
    const clock = fixedClock('2026-12-18T10:00:00Z');
    const db = fakePrisma(clock);
    await db.user.create({
      data: { id: 'u1', email: 'u1@example.test', emailVerified: true, createdAt: new Date('2026-01-01T00:00:00Z'), lastLoginRiskScore: null, lastLoginRiskAt: clock() },
    });
    await db.subscriptionPlan.create({
      data: {
        id: 'plan_growth',
        nameTr: 'Büyüme',
        nameEn: 'Growth',
        descriptionTr: '-',
        descriptionEn: '-',
        priceTry: 999,
        priceUsd: 29,
        priceYearlyTry: 9990,
        period: 'month',
        featuresTr: [],
        featuresEn: [],
        buttonTextTr: '',
        buttonTextEn: '',
        buttonHref: '',
        isActive: true,
        isFeatured: false,
        sortOrder: 1,
        discountActive: false,
        discountType: null,
        discountValue: null,
        discountLabelTr: null,
        discountLabelEn: null,
        paymentProvider: 'paynkolay',
        maxBusinesses: 3,
        updatedAt: clock(),
      },
    });
    await db.billingSubscription.create({
      data: { userId: 'u1', source: 'paynkolay', status: 'canceled', subscriptionPlanId: 'plan_growth', billingCycle: 'monthly', renewsAt: E },
    });
    const base = {
      db: db.client as unknown as PrismaClient,
      flags: { cardStorage: true, hostedCardSelect: false },
      configured: true,
      userId: 'u1',
      locale: 'tr' as const,
      planId: null,
      cycle: 'monthly' as const,
      error: null,
      recaptchaConfigured: true,
      now: clock(),
    };
    const model = await loadCheckoutReview({ ...base, intent: 'renew' });
    assert.equal(model.blocked, null, 'not "try again later"');
    assert.equal(model.intent, 'new');
    assert.equal(model.plan?.id, 'plan_growth');
    assert.equal(model.period?.from, E.toISOString(), 'anchored to the old period end (§11.2 e)');
    assert.equal(model.verification, 'no_score', 'the sign-in gate is explained before the pay button');

    await db.subscriptionPlan.updateMany({ where: { id: 'plan_growth' }, data: { isActive: false } });
    assert.equal((await loadCheckoutReview({ ...base, intent: 'renew' })).blocked, 'expired');
    assert.equal((await loadCheckoutReview({ ...base, intent: 'replace_card' })).blocked, 'expired');
  });
});
