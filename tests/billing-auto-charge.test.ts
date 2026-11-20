import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BillingFlags } from '../src/lib/billing/flags';
import type { ChargeableCard } from '../src/lib/billing/card-vault';
import { runRenewalTick, type RenewalDeps, type RenewalMailer } from '../src/lib/billing/renewal-engine';
import { sensitive } from '../src/lib/billing/sensitive';
import { fakeSettings, fakeTransport, fixedClock, testConfig, type FakeReply } from './fixtures/paynkolay-fakes';
import { fakeSettle, makePayment, makeRenewal, memoryRenewalStore, paymentListHandler, successRow, type PaymentListRow } from './fixtures/renewal-fakes';

// Auto-charge (billing spec §9.2 phase 4, §9.4 invariants, §9.5 breaker, §9.6 dry run, §10 state machine, §15.2
// billing-renewal-engine cases 1-23). In-memory store, fake transport (no network), fake mailer, fixed clock.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const E = new Date('2026-12-17T09:00:00Z'); // 12:00 Istanbul
const CHARGE = '/Vpos/v1/Payment';

type ChargeMode = 'approve' | 'decline51' | 'decline54' | 'three_d' | 'timeout' | 'html200' | 'html502' | 'json500' | 'pending';

function liveFlags(over: Partial<BillingFlags> = {}): BillingFlags {
  return {
    binding: { ok: true, env: 'live', reason: null },
    cardStorageIntent: true,
    cardStorage: true,
    hostedCardSelect: false,
    autoCharge: true,
    dryRun: false,
    non3dLimitMinor: 500_000,
    mitCardholderIp: '203.0.113.5',
    mitPath: 'mit_terminal',
    unknownValues: [],
    ...over,
  };
}

interface Owner {
  id: string;
  consentId: string;
}

function setup(opts: { start?: string; flags?: Partial<BillingFlags>; owners?: Owner[]; failNotice?: boolean } = {}) {
  const clock = fixedClock(opts.start ?? '2026-12-09T09:00:00Z');
  const store = memoryRenewalStore(clock);
  const rows = new Map<string, PaymentListRow[]>();
  const state = { mode: 'approve' as ChargeMode, recordSuccess: true, failNotice: opts.failNotice ?? false, delayMs: 0 };
  const chargeReply = (form: Record<string, string>): FakeReply => {
    const ref = form.clientRefCode;
    const add = (status: string) => rows.set(ref, [...(rows.get(ref) ?? []), successRow(ref, form.amount, { STATUS: status })]);
    const delayMs = state.delayMs;
    switch (state.mode) {
      case 'approve':
        if (state.recordSuccess) add('SUCCESS');
        return { body: { RESPONSE_CODE: 2, REFERENCE_CODE: `R-${ref}` }, delayMs };
      case 'decline51':
        return { body: { RESPONSE_CODE: 0, ERROR_CODE: '51', ERROR_MESSAGE: 'Yetersiz bakiye' }, delayMs };
      case 'decline54':
        add('FAILED');
        return { body: { RESPONSE_CODE: 0, ERROR_CODE: '54', ERROR_MESSAGE: 'Süresi dolmuş kart' }, delayMs };
      case 'three_d':
        return { body: { USE_3D: 'true' }, delayMs };
      case 'timeout':
        return { timeout: true };
      case 'html200':
        return { status: 200, contentType: 'text/html', text: '<html>ok?</html>' };
      case 'html502':
        return { status: 502, contentType: 'text/html', text: '<html>bad gateway</html>' };
      case 'json500':
        return { status: 500, body: { error: 'x' } };
      case 'pending':
        add('PENDING');
        return { body: { RESPONSE_CODE: 2 } };
    }
  };
  const fake = fakeTransport({ [CHARGE]: chargeReply, PaymentList: paymentListHandler(rows) });
  const mails: { variant: string; to: string; chargeDate?: Date; retryDates?: Date[]; amountMinor?: number | null }[] = [];
  const mailer: RenewalMailer = {
    async upcoming(to, v) {
      mails.push({ variant: v.variant, to: to.email });
      return true;
    },
    async periodEnded(to) {
      mails.push({ variant: 'period_ended', to: to.email });
      return true;
    },
    async autoNotice(to, v) {
      if (state.failNotice) return false;
      mails.push({ variant: 'auto_notice', to: to.email, chargeDate: v.chargeDate, retryDates: v.retryDates, amountMinor: v.amountMinor });
      return true;
    },
    async chargeResult(to, v) {
      mails.push({ variant: v.variant, to: to.email });
      return true;
    },
    async autoRenewChanged(to, v) {
      mails.push({ variant: v.variant, to: to.email });
      return true;
    },
  };
  const cards = new Map<string, ChargeableCard>();
  const owners = opts.owners ?? [{ id: 'u1', consentId: 'c1' }];
  for (const o of owners) {
    store.subscriptions.set(o.id, { status: 'active', renewsAt: E, autoRenew: true, autoRenewConsentId: o.consentId });
    store.owners.set(o.id, {
      email: `${o.id}@example.test`,
      locale: 'tr',
      consent: { id: o.consentId, amountMinor: 99_900, subscriptionPlanId: 'plan_1', billingCycle: 'monthly', cardId: `card_${o.id}`, firstChargeDate: null },
      boundCard: { id: `card_${o.id}`, last4: '4242' },
    });
    cards.set(o.id, { ok: true, customerKey: sensitive('ABCDEFGHJK1'), token: sensitive(`TOK_${o.id}`), cardId: `card_${o.id}`, last4: '4242' });
  }
  const captured: string[] = [];
  const settings = fakeSettings({ providerEnv: 'live' });
  const settle = fakeSettle(store);
  const deps: RenewalDeps = {
    store,
    cfg: testConfig({ env: 'live', mit: { sx: 'MITSX', secret: 'MITSECRET' } }),
    transport: fake.transport,
    flags: liveFlags(opts.flags),
    settings,
    clock,
    settle,
    postSettle: async () => {},
    expireLapsed: async () => 0,
    retention: null,
    vault: null,
    captureMessage: (_m, fp) => void captured.push(fp),
    captureException: () => {},
    runId: 'run1',
    mailer,
    siteUrl: 'https://www.buaze.com',
    chargeCard: async (userId) => cards.get(userId) ?? { ok: false, reason: 'no_customer' },
    offLink: (consentId) => `https://www.buaze.com/billing/tr/auto-renew-off?t=${consentId}`,
    sleep: async () => {},
  };
  const charges = () => fake.calls.filter((c) => c.url.endsWith(CHARGE));
  async function tickUntil(iso: string, stepMs = HOUR, d: RenewalDeps = deps) {
    const end = new Date(iso).getTime();
    while (clock().getTime() <= end) {
      await runRenewalTick(d);
      clock.advance(stepMs);
    }
  }
  return { clock, store, deps, state, rows, mails, captured, settings, settle, cards, charges, calls: fake.calls, tickUntil };
}

describe('auto-charge — switches and dry run', () => {
  it('flags off, auto-charge off or dry run ⇒ zero charge requests over a full timeline; consented owners keep grace', async () => {
    for (const flags of [{ cardStorage: false, cardStorageIntent: false, autoCharge: false }, { autoCharge: false }, { dryRun: true }]) {
      const t = setup({ flags });
      await t.tickUntil('2026-12-22T08:00:00Z'); // E−8d … just before graceEnd (E+120h)
      assert.equal(t.charges().length, 0, JSON.stringify(flags));
      if (flags.cardStorage === false) {
        assert.equal(t.calls.filter((c) => c.url.includes('CardStorage')).length, 0);
        continue;
      }
      const r = t.store.renewals[0];
      assert.equal(r.mode, 'reminder');
      assert.equal(r.graceEndsAt?.getTime(), E.getTime() + 120 * HOUR, 'paused auto-renew keeps grace (D4)');
      assert.equal(r.state, 'scheduled', 'not lapsed before E+120h');
      assert.ok(t.mails.some((m) => m.variant === 'reminder_7') && t.mails.some((m) => m.variant === 'reminder_1'));
      assert.ok(!t.mails.some((m) => m.variant === 'auto_notice' || m.variant === 'paid'));
    }
  });

  it('dry run counts the would-charge renewal once, consumes no attempt and sends no charge mail', async () => {
    const t = setup({ flags: { dryRun: true } });
    let would = 0;
    const end = new Date('2026-12-18T09:00:00Z').getTime();
    while (t.clock().getTime() <= end) {
      would += (await runRenewalTick(t.deps)).dryRunWouldCharge;
      t.clock.advance(HOUR);
    }
    assert.equal(would, 1);
    assert.equal(t.store.renewals[0].attempts, 0);
    assert.equal(t.store.renewals[0].modeReason, 'dry_run');
    assert.equal(t.charges().length, 0);
  });

  it('kill switch: turning auto-charge off moves an auto renewal to reminder mode with its grace', async () => {
    const t = setup();
    await t.tickUntil('2026-12-14T09:00:00Z');
    assert.equal(t.store.renewals[0].mode, 'auto');
    await runRenewalTick({ ...t.deps, flags: liveFlags({ autoCharge: false }) });
    assert.equal(t.store.renewals[0].mode, 'reminder');
    assert.equal(t.store.renewals[0].modeReason, 'flag_off');
    assert.ok(t.store.renewals[0].graceEndsAt);
  });
});

describe('auto-charge — happy path and notice gate', () => {
  it('notice at the first window slot ≥ E−96h naming A1-A3; one charge at A1 = E for the DB amount; settled; paid mail', async () => {
    const t = setup();
    await t.tickUntil('2026-12-19T09:00:00Z');
    const notice = t.mails.find((m) => m.variant === 'auto_notice');
    assert.ok(notice, 'notice sent');
    assert.equal(notice.chargeDate?.getTime(), E.getTime(), 'A1 = E (notice delivered at E−96h, ≥ 72 h before)');
    assert.equal(notice.retryDates?.length, 2);
    assert.equal(notice.amountMinor, 99_900);
    const c = t.charges();
    assert.equal(c.length, 1, 'exactly one charge');
    assert.equal(c[0].form.amount, '999.00');
    assert.equal(c[0].form.sx, 'MITSX', 'MIT terminal (D15)');
    assert.equal(c[0].form.use3D, 'false');
    assert.equal(c[0].form.cardHolderIP, '203.0.113.5');
    assert.ok(!('cardNumber' in c[0].form) && !('cvv' in c[0].form));
    const payment = t.store.payments[0];
    assert.equal(payment.kind, 'renewal_auto');
    assert.equal(c[0].form.clientRefCode, payment.id, 'clientRefCode = payment id (row committed first)');
    assert.ok(payment.createdAt.getTime() >= E.getTime(), 'never before E (D4)');
    assert.equal(payment.status, 'succeeded');
    assert.equal(t.store.renewals[0].state, 'succeeded');
    assert.ok(t.mails.some((m) => m.variant === 'paid'));
  });

  it('an undelivered notice blocks the charge; once delivered at T, the charge waits for the first slot ≥ T+72h', async () => {
    const t = setup({ failNotice: true });
    await t.tickUntil('2026-12-15T09:00:00Z');
    assert.equal(t.store.renewals[0].noticeDeliveredAt, null);
    assert.ok(t.captured.includes('billing-notice-undelivered'));
    t.state.failNotice = false;
    await runRenewalTick(t.deps);
    const delivered = t.store.renewals[0].noticeDeliveredAt!;
    assert.ok(delivered);
    await t.tickUntil('2026-12-20T09:00:00Z');
    const c = t.charges();
    assert.equal(c.length, 1);
    assert.ok(t.store.payments[0].createdAt.getTime() >= delivered.getTime() + 72 * HOUR);
  });

  it('a notice delivered too late for any slot before graceEnd → reminder mode notice_late, never a charge', async () => {
    const t = setup({ start: '2026-12-15T09:00:00Z', failNotice: true });
    await t.tickUntil('2026-12-19T09:00:00Z');
    t.state.failNotice = false;
    await t.tickUntil('2026-12-23T09:00:00Z');
    assert.equal(t.charges().length, 0);
    assert.equal(t.store.renewals[0].modeReason, 'notice_late');
  });
});

describe('auto-charge — concurrency and crashes (§9.4)', () => {
  it('two concurrent ticks: one is busy, exactly one charge request', async () => {
    const t = setup();
    await t.tickUntil('2026-12-17T08:00:00Z');
    t.clock.set('2026-12-17T09:00:00Z');
    t.state.delayMs = 50;
    const [a, b] = await Promise.all([runRenewalTick(t.deps), runRenewalTick(t.deps)]);
    assert.ok(a.skipped === 'busy' || b.skipped === 'busy');
    assert.equal(t.charges().length, 1);
  });

  it('createRenewalPayment twice for one attempt answers duplicate: no second HTTP call', async () => {
    const t = setup();
    t.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, mode: 'auto', state: 'charging', attempts: 1, leaseId: 'L', consentId: 'c1' }));
    const row = { userId: 'u1', renewalId: 'r1', leaseId: 'L', attemptNo: 1, consentId: 'c1', periodEnd: E, subscriptionPlanId: 'plan_1', billingCycle: 'monthly', amountMinor: 99_900, chargeCardId: 'card_u1', providerEnv: 'live' as const, locale: 'tr' as const };
    const first = await t.store.createRenewalPayment(row);
    assert.ok(typeof first === 'object' && 'id' in first);
    assert.equal(await t.store.createRenewalPayment(row), 'duplicate');
  });

  it('crash between claim and payment row: the stale lease gives the attempt back and the next tick charges once', async () => {
    const t = setup();
    await t.tickUntil('2026-12-17T08:00:00Z');
    t.clock.set('2026-12-17T09:00:00Z');
    t.store.hooks.beforeCreatePayment = () => {
      throw new Error('crash');
    };
    const s = await runRenewalTick(t.deps);
    assert.ok(s.failedPhases.includes('charge'));
    assert.equal(t.store.renewals[0].state, 'charging');
    assert.equal(t.charges().length, 0);
    t.store.hooks.beforeCreatePayment = undefined;
    t.clock.set('2026-12-17T09:15:00Z'); // lease (10 min) expired
    await runRenewalTick(t.deps);
    assert.equal(t.charges().length, 1);
    assert.equal(t.store.payments.length, 1);
    assert.equal(t.store.payments[0].attemptNo, 1);
  });

  for (const mode of ['timeout', 'html200', 'html502', 'json500', 'pending'] as const) {
    it(`no confirmation is not a decline (${mode}): stays awaiting_confirmation, no second charge, 48 h → manual_review`, async () => {
      const t = setup();
      t.state.mode = mode;
      t.state.recordSuccess = false;
      await t.tickUntil('2026-12-19T08:00:00Z'); // past the A2 date, < 48 h after the payment row
      assert.equal(t.charges().length, 1);
      assert.equal(t.store.payments[0].status, 'pending');
      assert.equal(t.store.renewals[0].state, 'awaiting_confirmation');
      assert.ok(!t.mails.some((m) => m.variant.startsWith('attempt')));
      await t.tickUntil('2026-12-21T12:00:00Z');
      assert.equal(t.charges().length, 1, 'never a second charge');
      assert.equal(t.store.renewals[0].state, 'manual_review');
      assert.ok(t.captured.includes('billing-charge-unresolved'));
      assert.ok(t.mails.some((m) => m.variant === 'unresolved'));
      await t.tickUntil('2026-12-22T12:00:00Z');
      assert.equal(t.store.renewals[0].state, 'lapsed', 'lapses at graceEnd');
      assert.equal(t.charges().length, 1);
    });
  }

  it('a late SUCCESS for an unconfirmed charge settles it once', async () => {
    const t = setup();
    t.state.mode = 'timeout';
    await t.tickUntil('2026-12-17T10:00:00Z');
    const id = t.store.payments[0].id;
    t.rows.set(id, [successRow(id, '999.00')]);
    await t.tickUntil('2026-12-17T14:00:00Z');
    assert.equal(t.store.payments[0].status, 'succeeded');
    assert.equal(t.settle.calls.filter((x) => x === id).length, 1);
    assert.equal(t.charges().length, 1);
  });

  it('three_d_required stays awaiting_confirmation (no retry) and is reported', async () => {
    const t = setup();
    t.state.mode = 'three_d';
    await t.tickUntil('2026-12-19T08:00:00Z');
    assert.equal(t.charges().length, 1);
    assert.equal(t.store.renewals[0].state, 'awaiting_confirmation');
    assert.ok(t.captured.includes('billing-three-d-required'));
  });
});

describe('auto-charge — failures and dunning', () => {
  it('explicit soft failure → retry_wait at the announced A2 with a new clientRefCode; past_due; attempt_1 mail', async () => {
    const t = setup();
    t.state.mode = 'decline51';
    await t.tickUntil('2026-12-17T09:00:00Z');
    const first = t.store.payments[0];
    assert.equal(first.status, 'pending', 'a sync decline is failed only after 30 min without SUCCESS');
    await t.tickUntil('2026-12-17T11:00:00Z');
    assert.equal(first.status, 'failed');
    const r = t.store.renewals[0];
    assert.equal(r.state, 'retry_wait');
    assert.equal(r.nextAttemptAt?.getTime(), E.getTime() + 48 * HOUR);
    assert.equal(t.store.subscriptions.get('u1')?.status, 'past_due');
    assert.ok(t.mails.some((m) => m.variant === 'attempt_1'));
    t.state.mode = 'approve';
    await t.tickUntil('2026-12-19T10:00:00Z');
    const c = t.charges();
    assert.equal(c.length, 2);
    assert.notEqual(c[0].form.clientRefCode, c[1].form.clientRefCode);
    assert.equal(t.store.renewals[0].state, 'succeeded');
  });

  it('earlier attempt re-check: a SUCCESS that appears for attempt 1 settles it and attempt 2 never runs', async () => {
    const t = setup();
    t.state.mode = 'decline51';
    await t.tickUntil('2026-12-17T11:00:00Z');
    assert.equal(t.store.renewals[0].state, 'retry_wait');
    const id = t.store.payments[0].id;
    t.rows.set(id, [successRow(id, '999.00')]);
    t.clock.set('2026-12-19T09:00:00Z');
    await runRenewalTick(t.deps);
    assert.equal(t.charges().length, 1);
    assert.equal(t.store.payments[0].status, 'succeeded');
  });

  it('soft decline ×3: attempts only after explicit failures, dunning mails, expiry only at E+120h', async () => {
    const t = setup();
    t.state.mode = 'decline51';
    await t.tickUntil('2026-12-22T08:00:00Z');
    assert.equal(t.charges().length, 3);
    for (const c of t.charges()) assert.ok(c.form.clientRefCode);
    assert.equal(t.store.renewals[0].state, 'needs_action');
    assert.deepEqual(
      t.mails.filter((m) => ['attempt_1', 'attempt_2', 'final'].includes(m.variant)).map((m) => m.variant),
      ['attempt_1', 'attempt_2', 'final'],
    );
    await t.tickUntil('2026-12-22T10:00:00Z');
    assert.equal(t.store.renewals[0].state, 'lapsed');
  });

  it('hard decline (54) → needs_action, no further charge, mail hard', async () => {
    const t = setup();
    t.state.mode = 'decline54';
    await t.tickUntil('2026-12-21T09:00:00Z');
    assert.equal(t.charges().length, 1);
    assert.equal(t.store.renewals[0].state, 'needs_action');
    assert.ok(t.mails.some((m) => m.variant === 'hard'));
  });
});

describe('auto-charge — amount, card and owner gates', () => {
  it('price above the consent cap: no charge, needs_action, auto-renew off, off_price_increase + action_needed mails', async () => {
    const t = setup();
    await t.tickUntil('2026-12-14T09:00:00Z');
    t.store.owners.get('u1')!.amountMinor = 129_900;
    await t.tickUntil('2026-12-18T09:00:00Z');
    assert.equal(t.charges().length, 0);
    assert.equal(t.store.renewals[0].state, 'needs_action');
    assert.equal(t.store.subscriptions.get('u1')?.autoRenew, false);
    assert.ok(t.mails.some((m) => m.variant === 'off_price_increase'));
  });

  it('price above the notice but within the cap: a new notice, the charge ≥ 72 h after it, for the DB amount', async () => {
    const t = setup();
    t.store.owners.get('u1')!.consent!.amountMinor = 150_000;
    await t.tickUntil('2026-12-14T09:00:00Z');
    t.store.owners.get('u1')!.amountMinor = 119_900;
    await t.tickUntil('2026-12-21T09:00:00Z');
    const notices = t.mails.filter((m) => m.variant === 'auto_notice');
    assert.equal(notices.length, 2);
    assert.equal(notices[1].amountMinor, 119_900);
    const c = t.charges();
    assert.equal(c.length, 1);
    assert.equal(c[0].form.amount, '1199.00');
  });

  it('PaymentList amount ≠ stored amount → charged_mismatch → manual_review + refund queue, never retry_wait', async () => {
    const t = setup();
    t.state.recordSuccess = false;
    await t.tickUntil('2026-12-17T08:00:00Z');
    t.clock.set('2026-12-17T09:00:00Z');
    t.state.mode = 'timeout';
    await runRenewalTick(t.deps);
    const id = t.store.payments[0].id;
    t.rows.set(id, [successRow(id, '1999.00')]);
    await t.tickUntil('2026-12-17T12:00:00Z');
    assert.equal(t.store.renewals[0].state, 'manual_review');
    assert.equal(t.store.payments[0].status, 'needs_review');
    assert.equal(t.store.payments[0].refundState, 'required');
  });

  it('the charge amount is the DB price even when the consent cap is raised', async () => {
    const t = setup();
    t.store.owners.get('u1')!.consent!.amountMinor = 999_999;
    await t.tickUntil('2026-12-17T10:00:00Z');
    assert.equal(t.charges()[0].form.amount, '999.00');
  });

  it('owner paying (D19): an owner_paying renewal or a pending owner checkout < 45 min blocks the claim', async () => {
    const t = setup();
    await t.tickUntil('2026-12-17T08:00:00Z');
    const r = t.store.renewals[0];
    t.store.payments.push(makePayment({ id: 'own1', userId: 'u1', kind: 'renewal_link', renewalId: r.id, createdAt: new Date('2026-12-17T08:55:00Z') }));
    r.state = 'owner_paying';
    r.ownerPaymentId = 'own1';
    r.ownerPrevState = 'scheduled';
    r.lockedUntil = new Date('2026-12-17T09:40:00Z');
    t.clock.set('2026-12-17T09:25:00Z');
    await runRenewalTick(t.deps);
    assert.equal(t.charges().length, 0);
    t.rows.set('own1', [successRow('own1', '999.00')]);
    t.clock.set('2026-12-17T09:30:00Z');
    await runRenewalTick(t.deps);
    assert.equal(t.store.renewals[0].state, 'succeeded');
    await t.tickUntil('2026-12-19T09:00:00Z');
    assert.equal(t.charges().length, 0, 'the owner paid: no automatic charge');

    const v = setup();
    await v.tickUntil('2026-12-17T08:00:00Z');
    v.store.payments.push(makePayment({ id: 'own2', userId: 'u1', kind: 'checkout', createdAt: new Date('2026-12-17T08:55:00Z') }));
    v.clock.set('2026-12-17T09:25:00Z');
    await runRenewalTick(v.deps);
    assert.equal(v.charges().length, 0, 'a pending checkout without a renewal link blocks too');
    v.store.payments[0].status = 'failed';
    v.clock.set('2026-12-17T10:00:00Z');
    await runRenewalTick(v.deps);
    assert.equal(v.charges().length, 1, 'after the owner payment failed, the cron charges');
  });

  it('TOCTOU: opt-out between claim and payment row → no HTTP call; after the row → refund_pending, no period', async () => {
    const t = setup();
    await t.tickUntil('2026-12-17T08:00:00Z');
    t.clock.set('2026-12-17T09:00:00Z');
    t.store.hooks.beforeCreatePayment = async () => {
      await t.store.disableAutoRenew('u1', 'owner_off', 'owner', t.clock());
    };
    await runRenewalTick(t.deps);
    assert.equal(t.charges().length, 0);
    assert.equal(t.store.payments.length, 0);
    assert.notEqual(t.store.renewals[0].state, 'charging');

    const u = setup();
    u.state.mode = 'timeout';
    await u.tickUntil('2026-12-17T09:00:00Z');
    const res = await u.store.disableAutoRenew('u1', 'card_removed', 'system', u.clock());
    assert.equal(res.chargeInProgress, true);
    const id = u.store.payments[0].id;
    u.rows.set(id, [successRow(id, '999.00')]);
    await u.tickUntil('2026-12-17T12:00:00Z');
    assert.equal(u.store.payments[0].refundState, 'required');
    assert.equal(u.store.renewals[0].state, 'needs_action');
    assert.equal(u.store.subscriptions.get('u1')?.renewsAt?.getTime(), E.getTime(), 'no period added');
    assert.ok(u.mails.some((m) => m.variant === 'refund_pending'));
  });

  it('card missing once → nothing disabled, retried after 24 h; missing again ≥ 24 h later → auto-renew off, no charge', async () => {
    const t = setup();
    t.cards.set('u1', { ok: false, reason: 'bound_missing_first', freshMirror: false });
    await t.tickUntil('2026-12-17T10:00:00Z');
    assert.equal(t.store.subscriptions.get('u1')?.autoRenew, true);
    assert.ok(t.store.renewals[0].nextAttemptAt!.getTime() >= E.getTime() + 24 * HOUR);
    t.cards.set('u1', { ok: false, reason: 'bound_missing_confirmed' });
    await t.tickUntil('2026-12-18T12:00:00Z');
    assert.equal(t.charges().length, 0);
    assert.equal(t.store.subscriptions.get('u1')?.autoRenew, false);
    assert.equal(t.store.renewals[0].state, 'needs_action');
    assert.ok(t.mails.some((m) => m.variant === 'off_provider_missing'));
  });

  it('another card next to the bound one → needs_action, Sentry, no charge', async () => {
    const t = setup();
    t.cards.set('u1', { ok: false, reason: 'unbound_card_present' });
    await t.tickUntil('2026-12-17T10:00:00Z');
    assert.equal(t.charges().length, 0);
    assert.equal(t.store.renewals[0].state, 'needs_action');
    assert.ok(t.captured.includes('billing-unbound-card'));
    assert.ok(t.mails.some((m) => m.variant === 'action_needed'));
  });

  it('admin canceled the subscription or set cancel-at-period-end: the claim cancels the renewal, no charge', async () => {
    const t = setup();
    await t.tickUntil('2026-12-17T08:00:00Z');
    t.store.subscriptions.get('u1')!.cancelAtPeriodEnd = true;
    t.clock.set('2026-12-17T09:00:00Z');
    await runRenewalTick(t.deps);
    assert.equal(t.charges().length, 0);
    assert.equal(t.store.renewals[0].state, 'canceled');
  });
});

describe('auto-charge — window, budget and breaker', () => {
  it('outside 09:00–21:00 Istanbul nothing is charged; a clock past the 240 s budget stops claiming', async () => {
    const t = setup();
    await t.tickUntil('2026-12-17T05:00:00Z');
    t.clock.set('2026-12-17T05:30:00Z'); // 08:30 Istanbul — due (A1 = E is 09:00Z), but window closed... A1 not due yet
    await runRenewalTick(t.deps);
    assert.equal(t.charges().length, 0);
    t.clock.set('2026-12-17T19:00:00Z'); // 22:00 Istanbul
    t.store.renewals[0].nextAttemptAt = new Date('2026-12-17T18:00:00Z');
    await runRenewalTick(t.deps);
    assert.equal(t.charges().length, 0, 'outside the window');

    const b = setup({ owners: [{ id: 'u1', consentId: 'c1' }, { id: 'u2', consentId: 'c2' }] });
    await b.tickUntil('2026-12-17T08:00:00Z');
    b.clock.set('2026-12-17T09:00:00Z');
    let calls = 0;
    const jumping = Object.assign(() => {
      calls += 1;
      return new Date(b.clock().getTime() + (calls > 6 ? 300_000 : 0));
    }, {});
    await runRenewalTick({ ...b.deps, clock: jumping });
    assert.ok(b.charges().length <= 1, 'no claim after the budget');
  });

  it('3 consecutive unknown outcomes trip the breaker: no failure mails, next tick within 6 h charges nothing', async () => {
    const owners = ['u1', 'u2', 'u3', 'u4'].map((id, i) => ({ id, consentId: `c${i + 1}` }));
    const t = setup({ owners });
    t.state.mode = 'html502';
    await t.tickUntil('2026-12-17T08:00:00Z');
    t.clock.set('2026-12-17T09:00:00Z');
    const s = await runRenewalTick(t.deps);
    assert.equal(s.breaker, 'tripped');
    assert.equal(t.charges().length, 3);
    assert.ok(t.settings.row?.breakerUntil);
    assert.ok(t.captured.includes('billing-breaker-open'));
    assert.ok(!t.mails.some((m) => ['attempt_1', 'final', 'hard'].includes(m.variant)));
    t.clock.set('2026-12-17T10:00:00Z');
    await runRenewalTick(t.deps);
    assert.equal(t.charges().length, 3);
  });

  it('3 trips within 24 h hold the breaker open until reset', async () => {
    const t = setup();
    const now = new Date('2026-12-17T09:00:00Z');
    await t.settings.tripBreaker(new Date(now.getTime() - 14 * HOUR), 'x', 6 * HOUR);
    await t.settings.tripBreaker(new Date(now.getTime() - 7 * HOUR), 'x', 6 * HOUR);
    const owners = ['u1', 'u2', 'u3'].map((id, i) => ({ id, consentId: `c${i + 1}` }));
    const u = setup({ owners });
    u.settings.row!.breakerTrippedAt = [...t.settings.row!.breakerTrippedAt];
    u.state.mode = 'timeout';
    await u.tickUntil('2026-12-17T08:00:00Z');
    u.clock.set('2026-12-17T09:00:00Z');
    await runRenewalTick(u.deps);
    assert.ok(u.settings.row!.breakerUntil!.getTime() > now.getTime() + 365 * DAY);
  });

  it('two owners with an empty list and a fresh mirror trip the breaker; nobody\'s auto-renew is disabled', async () => {
    const owners = ['u1', 'u2', 'u3'].map((id, i) => ({ id, consentId: `c${i + 1}` }));
    const t = setup({ owners });
    for (const o of owners) t.cards.set(o.id, { ok: false, reason: 'bound_missing_first', freshMirror: true });
    await t.tickUntil('2026-12-17T08:00:00Z');
    t.clock.set('2026-12-17T09:00:00Z');
    const s = await runRenewalTick(t.deps);
    assert.equal(s.breaker, 'tripped');
    for (const o of owners) assert.equal(t.store.subscriptions.get(o.id)?.autoRenew, true);
    assert.equal(t.charges().length, 0);
  });

  it('rows of the other environment are never charged', async () => {
    const t = setup();
    await t.tickUntil('2026-12-17T08:00:00Z');
    t.store.renewals[0].providerEnv = 'test';
    await t.tickUntil('2026-12-18T09:00:00Z');
    assert.equal(t.charges().length, 0);
  });
});
