/**
 * Auto-renew in the owner panel (billing spec §8.3, §8.7, §8.8, D6, D14).
 *
 * Pure part (always runs): the step-up cookie (issue / read / tamper /
 * expiry / session binding) and the proof check per method.
 *
 * Database part (runs when TEST_DATABASE_URL points at a migrated scratch
 * PostgreSQL; refuses BILLING_LIVE_DB_REF): enabling under the subscription
 * lock (consent row with the exact text, card binding, the open renewal
 * moving to auto with grace, the `on` mail counting as the notice), terms
 * changes, step-up required, dry run, disabling, the D6 card-change
 * amendment and the needs_action → retry_wait resume after an unbound card
 * is removed. No network: the mailer and card lister are fakes.
 *
 * Run: TEST_DATABASE_URL=postgresql://…/billing_scratch npm test
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

import {
  clearStepUpCookie,
  issueStepUpCookie,
  readStepUp,
  stepUpMethodFor,
  verifyStepUpProof,
  type StepUpUser,
} from '../src/lib/billing/step-up';
import { UNUSABLE_PASSWORD_BCRYPT_COST } from '../src/lib/bcrypt-config';
import type { PublicSavedCard } from '../src/lib/billing/card-types';

const SECRET = new TextEncoder().encode('test-secret-for-step-up-cookies-0123456789');
const NOW = new Date('2026-12-10T10:00:00Z');

describe('billing step-up (D14)', () => {
  it('a cookie is valid only for the same user, the same session and 5 minutes', () => {
    const cookie = issueStepUpCookie({ userId: 'u1', sessionKey: 's1', method: 'password', now: NOW }, SECRET);
    assert.deepEqual(readStepUp(cookie, { userId: 'u1', sessionKey: 's1', now: NOW }, SECRET), { method: 'password' });
    assert.deepEqual(readStepUp(cookie, { userId: 'u1', sessionKey: 's1', now: new Date(NOW.getTime() + 299_000) }, SECRET), { method: 'password' });
    assert.equal(readStepUp(cookie, { userId: 'u1', sessionKey: 's1', now: new Date(NOW.getTime() + 301_000) }, SECRET), null, 'expired');
    assert.equal(readStepUp(cookie, { userId: 'u2', sessionKey: 's1', now: NOW }, SECRET), null, 'other user');
    assert.equal(readStepUp(cookie, { userId: 'u1', sessionKey: 's2', now: NOW }, SECRET), null, 'other session');
    assert.equal(readStepUp(cookie, { userId: 'u1', sessionKey: 's1', now: NOW }, new TextEncoder().encode('another-secret-0123456789-abcdef')), null);
  });

  it('a tampered cookie is rejected', () => {
    const cookie = issueStepUpCookie({ userId: 'u1', sessionKey: 's1', method: 'totp', now: NOW }, SECRET);
    const [payload, mac] = cookie.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'u1', s: 's1', m: 'totp', t: Math.floor(NOW.getTime() / 1000) + 3600 })).toString('base64url');
    assert.equal(readStepUp(`${forged}.${mac}`, { userId: 'u1', sessionKey: 's1', now: NOW }, SECRET), null);
    assert.equal(readStepUp(`${payload}.${mac.slice(0, -2)}AA`, { userId: 'u1', sessionKey: 's1', now: NOW }, SECRET), null);
    assert.equal(readStepUp(`${payload}`, { userId: 'u1', sessionKey: 's1', now: NOW }, SECRET), null);
    assert.equal(readStepUp('', { userId: 'u1', sessionKey: 's1', now: NOW }, SECRET), null);
    assert.match(clearStepUpCookie(true), /^bz_bsu=; Path=\/api\/billing; Max-Age=0; HttpOnly; SameSite=Strict; Secure$/);
  });

  it('exactly one method is offered: totp, else a usable password, else Google', async () => {
    const real = await bcrypt.hash('correct horse', 4 + 1);
    const unusable = await bcrypt.hash('random', UNUSABLE_PASSWORD_BCRYPT_COST);
    assert.equal(stepUpMethodFor({ twoFactorEnabled: true, totpSecret: 'JBSWY3DPEHPK3PXP', passwordHash: real }), 'totp');
    assert.equal(stepUpMethodFor({ twoFactorEnabled: true, totpSecret: null, passwordHash: real }), 'password');
    assert.equal(stepUpMethodFor({ twoFactorEnabled: false, totpSecret: null, passwordHash: real }), 'password');
    assert.equal(stepUpMethodFor({ twoFactorEnabled: false, totpSecret: null, passwordHash: unusable }), 'google');
  });

  it('proofs: wrong method, wrong password, stale or foreign Google sign-in all fail', async () => {
    const user: StepUpUser = { id: 'u1', email: 'Owner@Example.test', twoFactorEnabled: false, totpSecret: null, passwordHash: await bcrypt.hash('correct horse', 5) };
    const verifiers = { verifyTotp: () => true, verifyFirebase: async () => null };
    assert.deepEqual(await verifyStepUpProof(user, { method: 'totp', code: '123456' }, verifiers, NOW), { ok: false, error: 'method_mismatch' });
    assert.deepEqual(await verifyStepUpProof(user, { method: 'password', password: 'wrong' }, verifiers, NOW), { ok: false, error: 'invalid_proof' });
    assert.deepEqual(await verifyStepUpProof(user, { method: 'password', password: 'correct horse' }, verifiers, NOW), { ok: true, method: 'password' });

    const google: StepUpUser = { ...user, passwordHash: await bcrypt.hash('x', UNUSABLE_PASSWORD_BCRYPT_COST) };
    const t = Math.floor(NOW.getTime() / 1000);
    const claims = (over: object) => ({ verifyTotp: () => false, verifyFirebase: async () => ({ email: 'owner@example.test', email_verified: true, auth_time: t - 60, firebase: { sign_in_provider: 'google.com' }, ...over }) });
    assert.equal((await verifyStepUpProof(google, { method: 'google', idToken: 'x' }, claims({}), NOW)).ok, true);
    assert.equal((await verifyStepUpProof(google, { method: 'google', idToken: 'x' }, claims({ auth_time: t - 600 }), NOW)).ok, false, 'sign-in too old');
    assert.equal((await verifyStepUpProof(google, { method: 'google', idToken: 'x' }, claims({ email: 'other@example.test' }), NOW)).ok, false, 'other account');
    assert.equal((await verifyStepUpProof(google, { method: 'google', idToken: 'x' }, claims({ email_verified: false }), NOW)).ok, false, 'unverified e-mail');
    assert.equal((await verifyStepUpProof(google, { method: 'google', idToken: 'x' }, claims({ firebase: { sign_in_provider: 'password' } }), NOW)).ok, false, 'not a Google sign-in');
    assert.equal((await verifyStepUpProof(google, { method: 'google', idToken: 'x' }, claims({ auth_time: undefined }), NOW)).ok, false, 'no auth_time');

    const totp: StepUpUser = { ...user, twoFactorEnabled: true, totpSecret: 'JBSWY3DPEHPK3PXP' };
    assert.equal((await verifyStepUpProof(totp, { method: 'totp', code: '12345' }, { verifyTotp: () => true, verifyFirebase: async () => null }, NOW)).ok, false, 'not 6 digits');
    assert.equal((await verifyStepUpProof(totp, { method: 'totp', code: '123456' }, { verifyTotp: () => false, verifyFirebase: async () => null }, NOW)).ok, false);
    assert.equal((await verifyStepUpProof(totp, { method: 'totp', code: '123456' }, { verifyTotp: () => true, verifyFirebase: async () => null }, NOW)).ok, true);
  });
});

// ── Database ───────────────────────────────────────────────────────────────

const url = process.env.TEST_DATABASE_URL?.trim();
const liveRef = process.env.BILLING_LIVE_DB_REF?.trim();
const skip = !url ? 'TEST_DATABASE_URL not set' : liveRef && url.includes(liveRef) ? 'refusing the production database' : false;

describe('auto-renew enable / disable / card change (database)', { skip }, () => {
  let db: PrismaClient;
  let mod: typeof import('../src/lib/billing/auto-renew');
  let storeMod: typeof import('../src/lib/billing/renewal-store-prisma');
  let cardApi: typeof import('../src/lib/billing/card-api');
  const suffix = Math.random().toString(36).slice(2, 10);
  const created: { users: string[]; plans: string[] } = { users: [], plans: [] };
  const DAY = 24 * 3600_000;

  before(async () => {
    db = new PrismaClient({ datasources: { db: { url: url! } } });
    mod = await import('../src/lib/billing/auto-renew');
    storeMod = await import('../src/lib/billing/renewal-store-prisma');
    cardApi = await import('../src/lib/billing/card-api');
  });

  after(async () => {
    for (const userId of created.users) {
      await db.billingRenewal.deleteMany({ where: { userId } });
      await db.billingConsent.deleteMany({ where: { userId } });
      await db.billingCard.deleteMany({ where: { userId } });
      await db.billingPayment.deleteMany({ where: { userId } });
      await db.billingSubscription.deleteMany({ where: { userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
    await db.subscriptionPlan.deleteMany({ where: { id: { in: created.plans } } });
    await db.$disconnect();
  });

  /** A paying monthly owner with one verified saved card and the period ending at `renewsAt`. */
  async function owner(label: string, renewsAt: Date, opts: { cycle?: 'monthly' | 'yearly'; withRenewal?: boolean } = {}) {
    const plan = await db.subscriptionPlan.create({
      data: {
        nameTr: 'Büyüme',
        nameEn: 'Growth',
        descriptionTr: '-',
        descriptionEn: '-',
        priceTry: 999,
        priceYearlyTry: 9990,
        featuresTr: [],
        featuresEn: [],
        paymentProvider: 'paynkolay',
      },
      select: { id: true },
    });
    created.plans.push(plan.id);
    const user = await db.user.create({
      data: { email: `ar-${label}-${suffix}@example.test`, passwordHash: 'x', role: 'restaurant_owner', locale: 'tr', emailVerified: true },
      select: { id: true },
    });
    created.users.push(user.id);
    const cycle = opts.cycle ?? 'monthly';
    await db.billingSubscription.create({
      data: { userId: user.id, plan: cycle, status: 'active', source: 'paynkolay', subscriptionPlanId: plan.id, billingCycle: cycle, renewsAt },
    });
    const payment = await db.billingPayment.create({
      data: { userId: user.id, subscriptionPlanId: plan.id, billingCycle: cycle, amountMinor: 99900, kind: 'checkout', status: 'succeeded', saveCard: true, cardSaveResult: 'saved', providerEnv: 'test' },
      select: { id: true },
    });
    const card = await db.billingCard.create({
      data: { userId: user.id, handle: `cd_${(label + suffix).padEnd(22, 'x').slice(0, 22)}`, last4: '4242', brand: 'VISA', expMonth: 12, expYear: 2030, savedByPaymentId: payment.id },
      select: { id: true, handle: true },
    });
    let renewalId: string | null = null;
    if (opts.withRenewal !== false) {
      const r = await db.billingRenewal.create({
        data: { userId: user.id, providerEnv: 'test', periodEnd: renewsAt, subscriptionPlanId: plan.id, billingCycle: cycle, mode: 'reminder', modeReason: 'auto_renew_off', state: 'scheduled' },
        select: { id: true },
      });
      renewalId = r.id;
    }
    return { userId: user.id, planId: plan.id, card, renewalId };
  }

  function publicCard(handle: string): PublicSavedCard {
    return { handle, last4: '4242', brand: 'VISA', issuer: null, expMonth: 12, expYear: 2030, expired: false, expiresBeforeNextCharge: false, bound: false, verified: true };
  }

  function deps(now: Date, over: { dryRun?: boolean; mailOk?: boolean; cards?: PublicSavedCard[] } = {}) {
    const mails: Array<{ kind: string; v: unknown }> = [];
    const store = storeMod.createPrismaRenewalStore(db);
    const d: import('../src/lib/billing/auto-renew').AutoRenewDeps = {
      db,
      flags: { autoCharge: true, dryRun: over.dryRun ?? false, non3dLimitMinor: 500_000 },
      store,
      listCards: over.cards ? async () => over.cards! : null,
      now: () => now,
      offLink: (consentId) => `https://example.test/off?c=${consentId}`,
      mail: {
        on: async (_to, v) => {
          mails.push({ kind: 'on', v });
          return over.mailOk ?? true;
        },
        off: async (_to, v) => {
          mails.push({ kind: 'off', v });
          return true;
        },
      },
    };
    return { d, mails, store };
  }

  async function offerFor(userId: string, handle: string, now: Date, d: import('../src/lib/billing/auto-renew').AutoRenewDeps) {
    const res = await mod.buildOwnerOffer(d, userId, [publicCard(handle)], 'tr', now);
    assert.ok(res.offer, `offer expected, got reason ${res.reason}`);
    return res.offer!;
  }

  function body(offer: import('../src/lib/billing/consent').AutoRenewOffer) {
    return {
      consent: { textVersion: offer.textVersion, textHash: offer.textHash },
      expected: { amountMinor: offer.terms.amountMinor, planId: offer.terms.planId, cardHandle: offer.cardHandle, firstChargeDate: offer.terms.firstChargeDate },
    };
  }

  it('step-up is required before anything is written', async () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const o = await owner('stepup', new Date(now.getTime() + 3 * DAY));
    const { d } = deps(now, { cards: [publicCard(o.card.handle)] });
    const offer = await offerFor(o.userId, o.card.handle, now, d);
    const res = await mod.enableAutoRenew(d, { userId: o.userId, stepUp: null, ip: null, ua: null }, body(offer));
    assert.equal(res.status, 403);
    assert.equal((res.body as { method: string }).method, 'password');
    assert.equal(await db.billingConsent.count({ where: { userId: o.userId } }), 0);
  });

  it('enable: consent with the exact text, the card bound, the open renewal auto with grace, the on mail is the notice', async () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const renewsAt = new Date(now.getTime() + 3 * DAY);
    const o = await owner('enable', renewsAt);
    const { d, mails } = deps(now, { cards: [publicCard(o.card.handle)] });
    const offer = await offerFor(o.userId, o.card.handle, now, d);
    // The first charge is never before E and never sooner than 72 h from now.
    assert.ok(new Date(offer.terms.firstChargeDate).getTime() >= renewsAt.getTime());
    const res = await mod.enableAutoRenew(d, { userId: o.userId, stepUp: { method: 'password' }, ip: '203.0.113.7', ua: 'Test/1.0' }, body(offer));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((res.body as { state: string }).state, 'on');

    const consent = await db.billingConsent.findFirstOrThrow({ where: { userId: o.userId, kind: 'auto_renew_on' } });
    assert.equal(consent.textRendered, offer.text);
    assert.equal(consent.textHash, offer.textHash);
    assert.equal(consent.authMethod, 'stepup_password');
    assert.equal(consent.amountMinor, 99900);
    assert.equal(consent.cardId, o.card.id);
    assert.ok(consent.effectiveAt);
    assert.ok(consent.confirmationSentAt, 'the delivered on mail is the durable confirmation');

    const sub = await db.billingSubscription.findUniqueOrThrow({ where: { userId: o.userId } });
    assert.equal(sub.autoRenew, true);
    assert.equal(sub.autoRenewConsentId, consent.id);
    const card = await db.billingCard.findUniqueOrThrow({ where: { id: o.card.id } });
    assert.equal(card.boundConsentId, consent.id);

    const r = await db.billingRenewal.findUniqueOrThrow({ where: { id: o.renewalId! } });
    assert.equal(r.mode, 'auto');
    assert.equal(r.consentId, consent.id);
    assert.equal(r.chargeCardId, o.card.id);
    assert.equal(r.graceEndsAt?.getTime(), renewsAt.getTime() + 120 * 3600_000);
    assert.ok(r.noticeDeliveredAt, 'the on mail counts as the pre-charge notice');
    assert.equal(r.quotedAmountMinor, 99900);
    assert.ok(r.nextAttemptAt && r.nextAttemptAt.getTime() >= r.noticeDeliveredAt!.getTime() + 72 * 3600_000);

    assert.equal(mails.length, 1);
    assert.equal(mails[0].kind, 'on');
    assert.equal((mails[0].v as { consentText: string }).consentText, offer.text);

    // A second enable is idempotent.
    const again = await mod.enableAutoRenew(d, { userId: o.userId, stepUp: { method: 'password' }, ip: null, ua: null }, body(offer));
    assert.equal(again.status, 200);
    assert.equal(await db.billingConsent.count({ where: { userId: o.userId, kind: 'auto_renew_on' } }), 1);
  });

  it('a mail that was not accepted leaves the notice to the engine', async () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const o = await owner('nomail', new Date(now.getTime() + 3 * DAY));
    const { d } = deps(now, { cards: [publicCard(o.card.handle)], mailOk: false });
    const offer = await offerFor(o.userId, o.card.handle, now, d);
    const res = await mod.enableAutoRenew(d, { userId: o.userId, stepUp: { method: 'password' }, ip: null, ua: null }, body(offer));
    assert.equal(res.status, 200);
    const r = await db.billingRenewal.findUniqueOrThrow({ where: { id: o.renewalId! } });
    assert.equal(r.mode, 'auto');
    assert.equal(r.noticeDeliveredAt, null);
    const consent = await db.billingConsent.findFirstOrThrow({ where: { userId: o.userId, kind: 'auto_renew_on' } });
    assert.equal(consent.confirmationSentAt, null);
  });

  it('changed terms → 409 terms_changed with the new offer, nothing written', async () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const o = await owner('terms', new Date(now.getTime() + 10 * DAY), { withRenewal: false });
    const { d } = deps(now, { cards: [publicCard(o.card.handle)] });
    const offer = await offerFor(o.userId, o.card.handle, now, d);
    const tampered = body(offer);
    tampered.expected.amountMinor = 100;
    const res = await mod.enableAutoRenew(d, { userId: o.userId, stepUp: { method: 'password' }, ip: null, ua: null }, tampered);
    assert.equal(res.status, 409);
    assert.equal((res.body as { error: string }).error, 'terms_changed');
    assert.equal(await db.billingConsent.count({ where: { userId: o.userId } }), 0);

    const wrongText = body(offer);
    wrongText.consent.textHash = 'a'.repeat(64);
    const res2 = await mod.enableAutoRenew(d, { userId: o.userId, stepUp: { method: 'password' }, ip: null, ua: null }, wrongText);
    assert.equal((res2.body as { error: string }).error, 'terms_changed');
  });

  it('yearly subscriptions and missing cards are not eligible', async () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const yearly = await owner('yearly', new Date(now.getTime() + 10 * DAY), { cycle: 'yearly', withRenewal: false });
    const { d } = deps(now);
    const r1 = await mod.buildOwnerOffer(d, yearly.userId, [publicCard(yearly.card.handle)], 'tr', now);
    assert.equal(r1.offer, null);
    assert.equal(r1.reason, 'yearly_cycle');
    const nocard = await owner('nocard', new Date(now.getTime() + 10 * DAY), { withRenewal: false });
    const r2 = await mod.buildOwnerOffer(d, nocard.userId, [], 'tr', now);
    assert.equal(r2.reason, 'no_card');
  });

  it('dry run: the instruction is saved, the renewal stays in reminder mode with grace (paused)', async () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const renewsAt = new Date(now.getTime() + 3 * DAY);
    const o = await owner('dry', renewsAt);
    const { d } = deps(now, { cards: [publicCard(o.card.handle)], dryRun: true });
    const offer = await offerFor(o.userId, o.card.handle, now, d);
    const res = await mod.enableAutoRenew(d, { userId: o.userId, stepUp: { method: 'password' }, ip: null, ua: null }, body(offer));
    assert.equal((res.body as { state: string }).state, 'paused');
    const r = await db.billingRenewal.findUniqueOrThrow({ where: { id: o.renewalId! } });
    assert.equal(r.mode, 'reminder');
    assert.equal(r.modeReason, 'dry_run');
    assert.equal(r.nextAttemptAt, null);
    assert.equal(r.graceEndsAt?.getTime(), renewsAt.getTime() + 120 * 3600_000);
  });

  it('disable: one click, consent off row, card unbound, renewal back to reminder, off mail', async () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const o = await owner('disable', new Date(now.getTime() + 3 * DAY));
    const { d, mails } = deps(now, { cards: [publicCard(o.card.handle)] });
    const offer = await offerFor(o.userId, o.card.handle, now, d);
    await mod.enableAutoRenew(d, { userId: o.userId, stepUp: { method: 'password' }, ip: null, ua: null }, body(offer));
    const res = await mod.disableAutoRenew(d, { userId: o.userId, authMethod: 'session', ip: null, ua: null });
    assert.equal(res.changed, true);
    assert.equal(res.chargeInProgress, false);
    const sub = await db.billingSubscription.findUniqueOrThrow({ where: { userId: o.userId } });
    assert.equal(sub.autoRenew, false);
    assert.equal((await db.billingCard.findUniqueOrThrow({ where: { id: o.card.id } })).boundConsentId, null);
    const r = await db.billingRenewal.findUniqueOrThrow({ where: { id: o.renewalId! } });
    assert.equal(r.mode, 'reminder');
    assert.equal(r.graceEndsAt, null, 'turned off before E: no grace for this period (D4)');
    assert.equal(await db.billingConsent.count({ where: { userId: o.userId, kind: 'auto_renew_off' } }), 1);
    assert.deepEqual(mails.map((m) => m.kind), ['on', 'off']);
    const again = await mod.disableAutoRenew(d, { userId: o.userId, authMethod: 'session', ip: null, ua: null });
    assert.equal(again.changed, false);
    assert.equal(mails.length, 2, 'no second off mail');
  });

  it('D6: a verified replacement card becomes the chargeable card through an amendment', async () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const renewsAt = new Date(now.getTime() + 3 * DAY);
    const o = await owner('d6', renewsAt);
    const { d } = deps(now, { cards: [publicCard(o.card.handle)] });
    const offer = await offerFor(o.userId, o.card.handle, now, d);
    await mod.enableAutoRenew(d, { userId: o.userId, stepUp: { method: 'password' }, ip: null, ua: null }, body(offer));
    const pay = await db.billingPayment.create({
      data: { userId: o.userId, subscriptionPlanId: o.planId, billingCycle: 'monthly', amountMinor: 99900, kind: 'checkout', status: 'succeeded', saveCard: true, providerEnv: 'test' },
      select: { id: true },
    });
    const newCard = await db.billingCard.create({
      data: { userId: o.userId, handle: `cd_${('new' + suffix).padEnd(22, 'y').slice(0, 22)}`, last4: '1881', savedByPaymentId: pay.id },
      select: { id: true },
    });
    const later = new Date(now.getTime() + 3600_000);
    const amendment = await mod.applyCardChangeAmendment(db, { userId: o.userId, newCardId: newCard.id, paymentId: pay.id, now: later });
    assert.ok(amendment);
    assert.equal(amendment!.last4, '1881');
    const sub = await db.billingSubscription.findUniqueOrThrow({ where: { userId: o.userId } });
    assert.equal(sub.autoRenewConsentId, amendment!.consentId);
    const row = await db.billingConsent.findUniqueOrThrow({ where: { id: amendment!.consentId } });
    assert.equal(row.kind, 'auto_renew_card_change');
    assert.match(row.textRendered ?? '', /1881 ile biten kart/);
    assert.equal((await db.billingCard.findUniqueOrThrow({ where: { id: newCard.id } })).boundConsentId, amendment!.consentId);
    assert.equal((await db.billingCard.findUniqueOrThrow({ where: { id: o.card.id } })).boundConsentId, null);
    const r = await db.billingRenewal.findUniqueOrThrow({ where: { id: o.renewalId! } });
    assert.equal(r.consentId, amendment!.consentId);
    assert.equal(r.chargeCardId, newCard.id);
    assert.equal(r.noticeDeliveredAt, null, 'the new card is never charged without a notice naming it');
    assert.ok(amendment!.chargeDate.getTime() >= later.getTime() + 72 * 3600_000);

    await mod.markCardReplacedNotice(db, amendment!, newCard.id, later);
    const r2 = await db.billingRenewal.findUniqueOrThrow({ where: { id: o.renewalId! } });
    assert.ok(r2.noticeDeliveredAt);
    assert.equal(r2.noticeCardId, newCard.id);
    assert.ok(r2.nextAttemptAt!.getTime() >= later.getTime() + 72 * 3600_000);

    // Same card again: nothing changes.
    assert.equal(await mod.applyCardChangeAmendment(db, { userId: o.userId, newCardId: newCard.id, paymentId: pay.id, now: later }), null);
  });

  it('blocks a new instruction for an unverified e-mail and for 7 days after an e-mail change', async () => {
    const now = new Date('2026-12-14T10:00:00Z');
    const o = await owner('block', new Date('2026-12-20T09:00:00Z'), { withRenewal: false });
    assert.equal(await mod.instructionBlockReason(db, o.userId, now), null);
    await db.adminAuditLog.create({
      data: { actorId: o.userId, actorSource: 'user', action: 'owner.account.security_update', targetId: o.userId, payload: { passwordChanged: false, emailChanged: true }, createdAt: new Date('2026-12-10T10:00:00Z') },
    });
    assert.equal(await mod.instructionBlockReason(db, o.userId, now), 'email_recently_changed');
    assert.equal(await mod.instructionBlockReason(db, o.userId, new Date('2026-12-18T10:00:00Z')), null);
    await db.user.update({ where: { id: o.userId }, data: { emailVerified: false } });
    assert.equal(await mod.instructionBlockReason(db, o.userId, now), 'email_unverified');
  });

  it('needs_action because of an unbound card resumes to retry_wait once that card is removed', async () => {
    const now = new Date('2026-12-14T10:00:00Z');
    const renewsAt = new Date('2026-12-13T09:00:00Z');
    const o = await owner('resume', renewsAt, { withRenewal: false });
    const consent = await db.billingConsent.create({
      data: { userId: o.userId, kind: 'auto_renew_on', actor: 'owner', amountMinor: 99900, subscriptionPlanId: o.planId, billingCycle: 'monthly', cardId: o.card.id, effectiveAt: new Date('2026-12-01T10:00:00Z'), terms: { firstChargeDate: renewsAt.toISOString() } },
      select: { id: true },
    });
    await db.billingCard.update({ where: { id: o.card.id }, data: { boundConsentId: consent.id } });
    await db.billingSubscription.update({ where: { userId: o.userId }, data: { autoRenew: true, autoRenewConsentId: consent.id } });
    const r = await db.billingRenewal.create({
      data: {
        userId: o.userId, providerEnv: 'test', periodEnd: renewsAt, subscriptionPlanId: o.planId, billingCycle: 'monthly', mode: 'auto', modeReason: 'unbound_card',
        state: 'needs_action', attempts: 0, lastFailureCode: 'unbound_card', consentId: consent.id, graceEndsAt: new Date(renewsAt.getTime() + 120 * 3600_000),
        noticeDeliveredAt: new Date('2026-12-09T10:00:00Z'),
      },
      select: { id: true },
    });
    // The unbound card is still there: no resume.
    const stray = await db.billingCard.create({ data: { userId: o.userId, handle: `cd_${('stray' + suffix).padEnd(22, 'z').slice(0, 22)}`, last4: '0005' }, select: { id: true } });
    assert.equal(await cardApi.resumeAfterUnboundRemoved(db, o.userId, now), false);
    await db.billingCard.update({ where: { id: stray.id }, data: { deletedAt: now } });
    assert.equal(await cardApi.resumeAfterUnboundRemoved(db, o.userId, now), true);
    const after = await db.billingRenewal.findUniqueOrThrow({ where: { id: r.id } });
    // The announced slot has passed: no charge without a fresh notice. The engine sends one, then charges.
    assert.equal(after.state, 'retry_wait');
    assert.equal(after.nextAttemptAt, null);
    assert.equal(after.noticeDeliveredAt, null);
    assert.equal(after.modeReason, null);
  });
});
