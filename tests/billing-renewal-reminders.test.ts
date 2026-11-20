import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BillingFlags } from '../src/lib/billing/flags';
import { renewLinkFor, runRenewalTick, type RenewalDeps, type RenewalMailer } from '../src/lib/billing/renewal-engine';
import { fakeSettings, fakeTransport, fixedClock, testConfig } from './fixtures/paynkolay-fakes';
import { fakeSettle, makeRenewal, memoryRenewalStore, paymentListHandler } from './fixtures/renewal-fakes';

// Reminder mode (billing spec §9.2 phases 2-3, O-2, D10): without a charge phase, renewal means a renewal row
// 7 days before the period end and the E−7d / E−1d mails that lead to a 3D Secure payment. Never a charge.

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const E = new Date('2026-12-17T09:00:00Z'); // 12:00 Istanbul

function flags(over: Partial<BillingFlags> = {}): BillingFlags {
  return {
    binding: { ok: true, env: 'live', reason: null },
    cardStorageIntent: true,
    cardStorage: true,
    hostedCardSelect: false,
    autoCharge: false,
    dryRun: true,
    non3dLimitMinor: null,
    mitCardholderIp: null,
    mitPath: null,
    unknownValues: [],
    ...over,
  };
}

function setup(start: string, opts: { failMail?: boolean } = {}) {
  const clock = fixedClock(start);
  const store = memoryRenewalStore(clock);
  const fake = fakeTransport({ PaymentList: paymentListHandler(new Map()) });
  const sent: { variant: string; to: string; renewUrl?: string; amountMinor?: number | null }[] = [];
  const state = { fail: opts.failMail ?? false };
  const mailer: RenewalMailer = {
    async upcoming(to, v) {
      if (state.fail) return false;
      sent.push({ variant: v.variant, to: to.email, renewUrl: v.renewUrl, amountMinor: v.amountMinor });
      return true;
    },
    async periodEnded(to) {
      if (state.fail) return false;
      sent.push({ variant: 'period_ended', to: to.email });
      return true;
    },
  };
  store.subscriptions.set('u1', { status: 'active', renewsAt: E, autoRenew: false });
  store.owners.set('u1', { email: 'u1@example.test', locale: 'tr', savedCardLast4: '4242' });
  const deps: RenewalDeps = {
    store,
    cfg: testConfig({ env: 'live' }),
    transport: fake.transport,
    flags: flags(),
    settings: fakeSettings({ providerEnv: 'live' }),
    clock,
    settle: fakeSettle(store),
    postSettle: async () => {},
    expireLapsed: async () => 0,
    retention: null,
    vault: null,
    captureMessage: () => {},
    captureException: () => {},
    runId: 'run1',
    mailer,
    siteUrl: 'https://www.buaze.com',
  };
  return { clock, store, deps, sent, state, calls: fake.calls };
}

describe('renewal engine — reminder mode', () => {
  it('schedules a reminder row 7 days ahead only while card storage is intended (O-2)', async () => {
    const off = setup('2026-12-10T10:00:00Z');
    await runRenewalTick({ ...off.deps, flags: flags({ cardStorageIntent: false, cardStorage: false }) });
    assert.equal(off.store.renewals.length, 0, 'flags off: no row, no mail (today\'s behaviour)');
    assert.equal(off.sent.length, 0);

    const t = setup('2026-12-10T10:00:00Z');
    const s = await runRenewalTick(t.deps);
    assert.equal(s.scheduled, 1);
    const r = t.store.renewals[0];
    assert.equal(r.mode, 'reminder');
    assert.equal(r.periodEnd.getTime(), E.getTime());
    assert.equal(r.graceEndsAt, null, 'no consent → lapses at E as today');
    assert.equal(r.nextAttemptAt, null);
    await runRenewalTick(t.deps);
    assert.equal(t.store.renewals.length, 1, 'unique (user, period end)');
    assert.equal(t.calls.filter((c) => c.url.endsWith('/Vpos/v1/Payment')).length, 0, 'never a charge');
  });

  it('E−7d reminder inside the Istanbul window, once; E−1d last call, once; renew link to the review page', async () => {
    const t = setup('2026-12-10T10:00:00Z'); // E − 7d − 23h → reminder_7 due (≤ 7 d)
    t.clock.set('2026-12-10T10:00:00Z');
    await runRenewalTick(t.deps);
    assert.deepEqual(t.sent.map((m) => m.variant), ['reminder_7']);
    assert.equal(t.sent[0].renewUrl, 'https://www.buaze.com/billing/tr/checkout?intent=renew');
    assert.equal(t.sent[0].amountMinor, 99900);
    await runRenewalTick(t.deps);
    assert.equal(t.sent.length, 1, 'claimed once');
    t.clock.set('2026-12-16T12:00:00Z'); // 15:00 Istanbul, E − 21h
    await runRenewalTick(t.deps);
    assert.deepEqual(t.sent.map((m) => m.variant), ['reminder_7', 'reminder_1']);
    await runRenewalTick(t.deps);
    assert.equal(t.sent.length, 2);
  });

  it('no mail outside 09:00–21:00 Istanbul (D10); a refused send is retried next tick', async () => {
    const t = setup('2026-12-10T19:00:00Z', { failMail: true }); // 22:00 Istanbul
    await runRenewalTick(t.deps);
    assert.equal(t.store.renewals.length, 1, 'scheduling is DB-only and runs at any hour');
    assert.equal(t.store.renewals[0].noticeClaimedAt, null, 'nothing claimed outside the window');
    t.clock.set('2026-12-11T07:00:00Z'); // 10:00 Istanbul
    await runRenewalTick(t.deps);
    assert.equal(t.sent.length, 0);
    assert.equal(t.store.renewals[0].noticeClaimedAt, null, 'the mailer refused: the slot is free again');
    t.state.fail = false;
    await runRenewalTick(t.deps);
    assert.deepEqual(t.sent.map((m) => m.variant), ['reminder_7']);
  });

  it('a renewal created at E−1d sends only the last call; a renewed or paying owner gets nothing', async () => {
    const t = setup('2026-12-16T12:00:00Z');
    await runRenewalTick(t.deps);
    assert.deepEqual(t.sent.map((m) => m.variant), ['reminder_1']);
    assert.ok(t.store.renewals[0].noticeClaimedAt, 'the E−7d slot is consumed silently');

    const paid = setup('2026-12-10T10:00:00Z');
    paid.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, state: 'owner_paying' }));
    await runRenewalTick(paid.deps);
    assert.equal(paid.sent.length, 0);

    const renewed = setup('2026-12-10T10:00:00Z');
    renewed.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E }));
    renewed.store.subscriptions.set('u1', { status: 'active', renewsAt: new Date(E.getTime() + 30 * DAY), autoRenew: false });
    await runRenewalTick(renewed.deps);
    assert.equal(renewed.sent.length, 0);
  });

  it('a lapsed renewal mails "period ended" once, in the window; accounts scheduled for deletion get no mail', async () => {
    const t = setup('2026-12-17T10:00:00Z'); // after E
    t.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, noticeClaimedAt: E, lastCallClaimedAt: E }));
    await runRenewalTick(t.deps);
    assert.equal(t.store.renewals[0].state, 'lapsed');
    assert.equal(t.store.renewals[0].pendingMail, 'period_ended');
    await runRenewalTick(t.deps);
    assert.deepEqual(t.sent.map((m) => m.variant), ['period_ended']);
    assert.equal(t.store.renewals[0].pendingMail, null);
    await runRenewalTick(t.deps);
    assert.equal(t.sent.length, 1);

    const del = setup('2026-12-10T10:00:00Z');
    del.store.owners.set('u1', { email: 'u1@example.test', locale: 'tr', scheduledDeletionAt: new Date('2027-01-01T00:00:00Z') });
    await runRenewalTick(del.deps);
    assert.equal(del.sent.length, 0);
  });

  it('a plan that can no longer be bought still gets reminders, pointing to the plan picker', async () => {
    const t = setup('2026-12-10T10:00:00Z');
    t.store.owners.set('u1', { email: 'u1@example.test', locale: 'en', planActive: false });
    await runRenewalTick(t.deps);
    assert.equal(t.store.renewals[0].modeReason, 'plan_changed');
    assert.equal(t.sent[0].renewUrl, 'https://www.buaze.com/en/dashboard/account?section=billing');
    assert.equal(renewLinkFor('https://x', 'tr', { modeReason: 'flag_off' }), 'https://x/billing/tr/checkout?intent=renew');
  });

  it('unconfirmed card saves are retried by the reconcile phase', async () => {
    const t = setup('2026-12-10T10:00:00Z');
    t.store.pendingCardSaves.push('pay1', 'pay2');
    const seen: string[] = [];
    await runRenewalTick({ ...t.deps, cardSaveReconcile: async (id) => void seen.push(id) });
    assert.deepEqual(seen, ['pay1', 'pay2']);
  });
});
