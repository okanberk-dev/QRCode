import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PanelActor } from '../src/lib/auth';
import { checkoutPostCore, parseCheckoutForm, reviewPath, riskGatePasses, riskGateState, type CheckoutDeps, type CheckoutForm } from '../src/lib/billing/checkout-post';
import { cardSaveConsent, consentTextHash } from '../src/lib/billing/consent';
import { cardFlags, fakeCardProvider, testVaultDeps } from './fixtures/card-provider';
import { fakePrisma } from './fixtures/fake-prisma';
import { fixedClock, testConfig } from './fixtures/paynkolay-fakes';

// Checkout POST core (billing spec §8.4, §3.3; §15.2 billing-consent.test.ts cases 5-7 for saved cards):
// card-save consent evidence, card-testing controls, the owner_paying lock (D19) and D13.

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

function owner(id = 'u1', over: Partial<PanelActor> = {}): PanelActor {
  return { id, role: 'restaurant_owner', restaurantId: null, username: null, email: null, plan: null, source: 'user', ...over };
}

async function setup(opts: { userAgeMs?: number; score?: number | null; emailVerified?: boolean } = {}) {
  const clock = fixedClock('2026-12-10T10:00:00Z');
  const db = fakePrisma(clock);
  const provider = fakeCardProvider();
  const vault = testVaultDeps(db, provider, clock);
  await db.user.create({
    data: {
      id: 'u1',
      email: 'u1@example.test',
      createdAt: new Date(clock().getTime() - (opts.userAgeMs ?? 30 * DAY)),
      emailVerified: opts.emailVerified ?? true,
      lastLoginRiskScore: opts.score === undefined ? 0.9 : opts.score,
      lastLoginRiskAt: new Date(clock().getTime() - HOUR),
    },
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
  const limits = new Map<string, number>();
  const deps: CheckoutDeps = {
    db: db.client,
    cfg: testConfig({ env: 'live' }),
    flags: cardFlags(),
    vault,
    envCheck: async () => ({ ok: true }),
    rateLimit: async (key, max) => {
      const n = (limits.get(key) ?? 0) + 1;
      limits.set(key, n);
      return { allowed: n <= max };
    },
    isIpBlocked: () => false,
    recaptchaConfigured: true,
    siteUrl: 'https://www.buaze.com',
    now: clock,
  };
  const ctx = { actor: owner(), originOk: true, ip: '203.0.113.7', userAgent: 'Mozilla/5.0 4111111111111111' };
  return { clock, db, provider, vault, deps, ctx };
}

function form(over: Partial<CheckoutForm> = {}): CheckoutForm {
  return {
    planId: 'plan_growth',
    cycle: 'monthly',
    locale: 'tr',
    intent: 'new',
    saveCard: false,
    autoRenew: false,
    cardSaveTextHash: null,
    expectedAmountMinor: 99900,
    ...over,
  };
}

const saving = () => form({ saveCard: true, cardSaveTextHash: cardSaveConsent('tr').textHash });

describe('checkout POST core', () => {
  it('parses the form strictly', () => {
    const f = parseCheckoutForm((n) => ({ planId: 'plan_growth', cycle: 'yearly', locale: 'en', intent: 'replace_card', saveCard: 'on', expectedAmountMinor: '999000', cardSaveTextHash: 'x' })[n] ?? null);
    assert.equal(f.cycle, 'yearly');
    assert.equal(f.intent, 'replace_card');
    assert.equal(f.saveCard, true);
    assert.equal(f.cardSaveTextHash, null, 'a non-sha256 value is dropped');
    assert.equal(parseCheckoutForm((n) => (n === 'planId' ? '../x' : null)).planId, null);
    assert.equal(reviewPath(form(), 'terms_changed'), '/billing/tr/checkout?planId=plan_growth&cycle=monthly&error=terms_changed');
    assert.equal(reviewPath(form({ intent: 'renew' })), '/billing/tr/checkout?intent=renew');
  });

  it('a plain payment: hand-off page, no customer key, no consent row', async () => {
    const t = await setup();
    const out = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(out.kind, 'interstitial');
    if (out.kind !== 'interstitial') return;
    assert.match(out.html, /name="customerKey" value=""/);
    assert.doesNotMatch(out.html, /csAutoSave/);
    assert.equal(t.db.billingConsent.rows.length, 0);
    assert.equal(t.db.billingCustomer.rows.length, 0);
    const p = t.db.billingPayment.rows[0];
    assert.equal(p.amountMinor, 99900);
    assert.equal(p.saveCard, false);
    assert.equal(p.providerEnv, 'live');
    assert.equal(p.kind, 'checkout');
  });

  it('5. save card: consent row (3ds_checkout, text + hash + legal versions, IP, UA without digit runs), key only in the form', async () => {
    const t = await setup();
    const out = await checkoutPostCore(t.deps, t.ctx, saving());
    assert.equal(out.kind, 'interstitial');
    if (out.kind !== 'interstitial') return;
    const consent = t.db.billingConsent.rows[0];
    assert.equal(consent.kind, 'card_save');
    assert.equal(consent.authMethod, '3ds_checkout');
    assert.equal(consent.textVersion, 'cs-2026-12-v1');
    assert.equal(consent.textHash, consentTextHash(String(consent.textRendered)));
    assert.equal(consent.paymentId, out.paymentId);
    assert.equal(consent.ipAddress, '203.0.113.7');
    assert.doesNotMatch(String(consent.userAgent), /\d{12,}/);
    assert.ok(consent.legalDocVersions && typeof consent.legalDocVersions === 'object');
    assert.equal(consent.effectiveAt, null);
    const payment = t.db.billingPayment.rows[0];
    assert.equal(payment.saveCard, true);
    assert.equal(payment.cardSaveResult, 'pending');
    assert.match(String(payment.cardAlias), /^Buaze-[A-Z0-9]{1,6}$/);
    const key = (await import('../src/lib/billing/card-vault')).getCustomerKey;
    const ck = (await key(t.vault, 'u1'))!.reveal();
    assert.equal(out.html.split(ck).length - 1, 1, 'the customer key appears exactly once');
    assert.match(out.html, new RegExp(`name="customerKey" value="${ck}"`));
    assert.match(out.html, /name="csAutoSave" value="true"/);
  });

  it('5b. consent and terms: missing / wrong text hash, stale amount, auto-renew (not in this release)', async () => {
    const t = await setup();
    const err = async (f: CheckoutForm) => {
      const out = await checkoutPostCore(t.deps, t.ctx, f);
      return out.kind === 'redirect' ? out.error : 'interstitial';
    };
    assert.equal(await err(form({ saveCard: true })), 'consent_required');
    assert.equal(await err(form({ saveCard: true, cardSaveTextHash: 'a'.repeat(64) })), 'terms_changed');
    assert.equal(await err(form({ expectedAmountMinor: 50000 })), 'terms_changed');
    assert.equal(await err(form({ autoRenew: true, saveCard: true, cardSaveTextHash: cardSaveConsent('tr').textHash })), 'unavailable');
    assert.equal(await err(form({ intent: 'replace_card' })), 'unavailable', 'replace needs a card subscription');
    assert.equal(t.db.billingPayment.rows.length, 0, 'no row is written before the checks pass');
  });

  it('6. card-testing controls: sign-in score, young-account cap, save only for verified 24 h old accounts, IP block', async () => {
    let t = await setup({ score: 0.2 });
    let out = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(out.kind === 'redirect' && out.error, 'verification_required');
    t = await setup({ score: null });
    out = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(out.kind === 'redirect' && out.error, 'verification_required');
    assert.equal(riskGatePasses(false, { lastLoginRiskScore: null, lastLoginRiskAt: null }, new Date()), true, 'no reCAPTCHA configured → no gate');
    assert.equal(riskGatePasses(true, { lastLoginRiskScore: 0.9, lastLoginRiskAt: new Date(Date.now() - 25 * HOUR) }, new Date()), false);
    // The review page names the reason before the pay button (UX-02).
    const at = new Date();
    assert.equal(riskGateState(true, { lastLoginRiskScore: 0.9, lastLoginRiskAt: new Date(at.getTime() - 25 * HOUR) }, at), 'stale');
    assert.equal(riskGateState(true, { lastLoginRiskScore: null, lastLoginRiskAt: null }, at), 'stale');
    assert.equal(riskGateState(true, { lastLoginRiskScore: null, lastLoginRiskAt: at }, at), 'no_score');
    assert.equal(riskGateState(true, { lastLoginRiskScore: 0.3, lastLoginRiskAt: at }, at), 'low_score');
    assert.equal(riskGateState(true, { lastLoginRiskScore: 0.5, lastLoginRiskAt: at }, at), null);

    t = await setup({ userAgeMs: 3 * DAY });
    for (let i = 0; i < 3; i++) assert.equal((await checkoutPostCore(t.deps, t.ctx, form())).kind, 'interstitial');
    out = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(out.kind === 'redirect' && out.error, 'rate_limited', '4th POST in 24 h for a 3-day-old account');

    t = await setup({ userAgeMs: 2 * HOUR });
    out = await checkoutPostCore(t.deps, t.ctx, saving());
    assert.equal(out.kind === 'redirect' && out.error, 'save_not_allowed');
    t = await setup({ emailVerified: false });
    out = await checkoutPostCore(t.deps, t.ctx, saving());
    assert.equal(out.kind === 'redirect' && out.error, 'save_not_allowed');

    t = await setup();
    out = await checkoutPostCore({ ...t.deps, isIpBlocked: () => true }, t.ctx, form());
    assert.equal(out.kind === 'redirect' && out.error, 'rate_limited');
    t = await setup();
    for (let i = 0; i < 3; i++) {
      await t.db.billingPayment.create({ data: { userId: 'u1', amountMinor: 1, billingCycle: 'monthly', status: 'failed', kind: 'checkout' } });
    }
    out = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(out.kind === 'redirect' && out.error, 'rate_limited', '3 failed hosted payments in 24 h');
  });

  it('WEBSEC-4: the per-IP failed-payment cap is counted in the database (every instance, failures found by reconcile)', async () => {
    const t = await setup();
    const first = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(first.kind, 'interstitial');
    const fp = String(t.db.billingPayment.rows[0].clientIpFp);
    assert.match(fp, /^ip1_[A-Za-z0-9_-]{22}$/, 'an HMAC fingerprint is stored');
    assert.ok(!fp.includes('203.0.113'), 'never the IP itself');
    // Five hosted payments from this IP failed (other accounts, marked failed by reconciliation; no in-memory block).
    for (let i = 0; i < 5; i++) {
      await t.db.billingPayment.create({
        data: { userId: `other${i}`, amountMinor: 1, billingCycle: 'monthly', status: 'failed', kind: 'checkout', clientIpFp: fp },
      });
    }
    const out = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(out.kind === 'redirect' && out.error, 'rate_limited');
    const elsewhere = await checkoutPostCore(t.deps, { ...t.ctx, ip: '198.51.100.9' }, form());
    assert.equal(elsewhere.kind, 'interstitial', 'another IP is not affected');
  });

  it('7. origin, owner and environment guards answer before anything else', async () => {
    const t = await setup();
    let out = await checkoutPostCore(t.deps, { ...t.ctx, originOk: false }, form());
    assert.equal(out.kind === 'redirect' && out.error, 'origin_mismatch');
    out = await checkoutPostCore(t.deps, { ...t.ctx, actor: null }, form());
    assert.equal(out.kind, 'redirect');
    assert.match(out.kind === 'redirect' ? out.location : '', /^\/tr\/auth\/login\?redirect=%2Fbilling%2Ftr%2Fcheckout/);
    out = await checkoutPostCore(t.deps, { ...t.ctx, actor: owner('u1', { role: 'team_member' }) }, form());
    assert.equal(out.kind === 'redirect' && out.error, 'owner_only');
    out = await checkoutPostCore(t.deps, { ...t.ctx, actor: owner('u1', { realAdminId: 'a1' }) }, form());
    assert.equal(out.kind === 'redirect' && out.error, 'impersonation_blocked');
    out = await checkoutPostCore({ ...t.deps, envCheck: async () => ({ ok: false, reason: 'test_on_live_db' }) }, t.ctx, form());
    assert.equal(out.kind === 'redirect' && out.error, 'unavailable');
    out = await checkoutPostCore({ ...t.deps, flags: cardFlags({ cardStorage: false }), vault: null }, t.ctx, saving());
    assert.equal(out.kind === 'redirect' && out.error, 'unavailable', 'no saving while card storage is off');
    assert.equal(t.db.billingPayment.rows.length, 0);
  });

  it('D19: paying for an open renewal holds it (owner_paying); paying again supersedes the owner\'s own pending payment', async () => {
    const t = await setup();
    const E = new Date('2026-12-14T09:00:00Z');
    await t.db.billingSubscription.create({
      data: { userId: 'u1', source: 'paynkolay', status: 'active', subscriptionPlanId: 'plan_growth', billingCycle: 'monthly', renewsAt: E },
    });
    await t.db.billingRenewal.create({ data: { id: 'r1', userId: 'u1', periodEnd: E, state: 'scheduled', providerEnv: 'live', billingCycle: 'monthly' } });
    const out = await checkoutPostCore(t.deps, t.ctx, form({ intent: 'renew', planId: null }));
    assert.equal(out.kind, 'interstitial');
    const renewal = t.db.billingRenewal.rows[0];
    assert.equal(renewal.state, 'owner_paying');
    assert.equal(renewal.ownerPrevState, 'scheduled');
    assert.equal(renewal.ownerPaymentId, out.kind === 'interstitial' ? out.paymentId : null);
    const payment = t.db.billingPayment.rows[0];
    assert.equal(payment.kind, 'renewal_link');
    assert.equal(payment.renewalId, 'r1');
    // §12.5: the owner backed out of PayNKolay's page and pays again — the new payment takes over the lock
    // at once (no 45-105 min wait); the abandoned one stays pending for reconcile, and if both succeed the
    // second is settled as duplicate_period and refunded.
    const second = await checkoutPostCore(t.deps, t.ctx, form({ intent: 'renew', planId: null }));
    assert.equal(second.kind, 'interstitial');
    const after = t.db.billingRenewal.rows[0];
    assert.equal(after.state, 'owner_paying');
    assert.equal(after.ownerPaymentId, second.kind === 'interstitial' ? second.paymentId : null);
    assert.equal(after.ownerPrevState, 'scheduled', 'the state to return to is kept');
    assert.equal(t.db.billingPayment.rows.length, 2);
    assert.equal(t.db.billingPayment.rows[0].status, 'pending', 'the abandoned payment is left to reconcile');
    // A pending payment that is not this owner's own hosted payment still blocks.
    await t.db.billingPayment.updateMany({ where: { id: after.ownerPaymentId }, data: { kind: 'renewal_auto' } });
    const blocked = await checkoutPostCore(t.deps, t.ctx, form({ intent: 'renew', planId: null }));
    assert.equal(blocked.kind === 'redirect' && blocked.error, 'renewal_in_progress');
    // A charge in flight blocks too.
    await t.db.billingRenewal.updateMany({ where: { id: 'r1' }, data: { state: 'awaiting_confirmation' } });
    const third = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(third.kind === 'redirect' && third.error, 'renewal_in_progress');
  });

  it('plan too small for the businesses on the account', async () => {
    const t = await setup();
    for (let i = 0; i < 4; i++) await t.db.restaurant.create({ data: { userId: 'u1' } });
    const out = await checkoutPostCore(t.deps, t.ctx, form());
    assert.equal(out.kind === 'redirect' && out.error, 'plan_too_small');
  });
});
