import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BillingFlags } from '../src/lib/billing/flags';
import { analyzeDailyTransactions, runRenewalTick, type RenewalDeps } from '../src/lib/billing/renewal-engine';
import { sensitive } from '../src/lib/billing/sensitive';
import { loadVaultKeys, sealCustomerKey } from '../src/lib/billing/vault-crypto';
import { cardListBody, fakeSettings, fakeTransport, fixedClock, randomTestKey, testConfig, type FakeHandler } from './fixtures/paynkolay-fakes';
import {
  fakeSettle,
  makePayment,
  makeRenewal,
  memoryRenewalStore,
  paymentListHandler,
  successRow,
  type PaymentListRow,
} from './fixtures/renewal-fakes';

// billing spec §15.2 `billing-renewal-engine.test.ts` — the foundation subset:
// binding, flags-off/no-charge, single flight, reconcile (pending, abandoned,
// late success, mismatch, D17 unknown outcomes, owner_paying release), stale
// leases, lapse with grace, tombstones, daily scans, retention marker, budget
// and phase isolation. The charge-phase cases arrive with the charge phase.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const CHARGE_PATH = '/Vpos/v1/Payment';

function flags(over: Partial<BillingFlags> = {}): BillingFlags {
  return {
    binding: { ok: true, env: 'live', reason: null },
    cardStorageIntent: false,
    cardStorage: false,
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

function setup(opts: { start?: string; extraHandlers?: Record<string, FakeHandler>; failPaymentList?: () => boolean } = {}) {
  const clock = fixedClock(opts.start ?? '2026-12-10T10:00:00Z'); // 13:00 Istanbul
  const store = memoryRenewalStore(clock);
  const settings = fakeSettings({ providerEnv: 'live' });
  const rows = new Map<string, PaymentListRow[]>();
  const fake = fakeTransport({
    PaymentList: paymentListHandler(rows, { fail: opts.failPaymentList }),
    ...(opts.extraHandlers ?? {}),
  });
  const settle = fakeSettle(store);
  const captured: string[] = [];
  const exceptions: Error[] = [];
  const postSettled: string[] = [];
  const expireCalls: Date[] = [];
  const retentionCalls: Date[] = [];
  const deps: RenewalDeps = {
    store,
    cfg: testConfig({ env: 'live' }),
    transport: fake.transport,
    flags: flags(),
    settings,
    clock,
    settle,
    postSettle: async (id) => {
      postSettled.push(id);
    },
    expireLapsed: async (now) => {
      expireCalls.push(now);
      return 0;
    },
    retention: async (now) => {
      retentionCalls.push(now);
    },
    vault: null,
    captureMessage: (_msg, fingerprint) => {
      captured.push(fingerprint);
    },
    captureException: (err) => {
      exceptions.push(err);
    },
    runId: 'run1',
  };
  const paymentListCalls = () => fake.calls.filter((c) => c.url.endsWith('/PaymentList')).length;
  return { clock, store, settings, rows, calls: fake.calls, settle, captured, exceptions, postSettled, expireCalls, retentionCalls, deps, paymentListCalls };
}

describe('renewal engine (foundation phases)', () => {
  it('skips everything without config or a valid binding — no provider call, no write', async () => {
    for (const binding of [
      { ok: false, env: 'live' as const, reason: 'no_binding_row' as const },
      { ok: false, env: 'live' as const, reason: 'env_mismatch' as const },
      { ok: false, env: 'live' as const, reason: 'host_not_allowed' as const },
    ]) {
      const t = setup();
      t.store.payments.push(makePayment({ id: 'p1', userId: 'u1', createdAt: new Date(t.clock().getTime() - HOUR) }));
      const summary = await runRenewalTick({ ...t.deps, flags: flags({ binding }) });
      assert.equal(summary.skipped, 'binding');
      assert.equal(t.calls.length, 0);
      assert.equal(t.store.payments[0].status, 'pending');
      assert.equal(t.settings.row?.tickLeaseId, null);
      assert.equal(t.expireCalls.length, 0);
    }
    const t = setup();
    assert.equal((await runRenewalTick({ ...t.deps, cfg: null })).skipped, 'config_missing');
    // a binding of the other environment is not this deployment's binding
    assert.equal((await runRenewalTick({ ...t.deps, flags: flags({ binding: { ok: true, env: 'test', reason: null } }) })).skipped, 'binding');
  });

  it('never charges and never lists cards over a full renewal timeline (flags off)', async () => {
    const t = setup({ start: '2026-12-10T00:00:00Z' });
    const E = new Date('2026-12-18T07:00:00Z');
    t.store.subscriptions.set('u1', { status: 'active', renewsAt: E, autoRenew: true });
    t.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, mode: 'auto', graceEndsAt: new Date(E.getTime() + 120 * HOUR) }));
    t.store.payments.push(makePayment({ id: 'p1', userId: 'u1', createdAt: new Date(t.clock().getTime()) }));
    for (let h = 0; h < 14 * 24; h++) {
      await runRenewalTick(t.deps);
      t.clock.advance(HOUR);
    }
    assert.equal(t.calls.filter((c) => c.url.endsWith(CHARGE_PATH)).length, 0);
    assert.equal(t.calls.filter((c) => c.url.includes('CardStorage')).length, 0);
    assert.equal(t.store.renewals[0].state, 'lapsed'); // only after graceEnd
    assert.ok(t.expireCalls.length >= 14 * 24);
  });

  it('runs one tick at a time (DB lease): a concurrent tick is busy', async () => {
    const t = setup({ extraHandlers: {} });
    const slow = t.deps.transport;
    const delayed = {
      async postForm(url: string, form: Record<string, string>) {
        await new Promise((r) => setTimeout(r, 50));
        return slow.postForm(url, form);
      },
    };
    t.store.payments.push(makePayment({ id: 'p1', userId: 'u1', createdAt: new Date(t.clock().getTime() - 40 * MIN) }));
    t.rows.set('p1', [successRow('p1', '999.00')]);
    const [a, b] = await Promise.all([runRenewalTick({ ...t.deps, transport: delayed }), runRenewalTick({ ...t.deps, transport: delayed, runId: 'run2' })]);
    assert.deepEqual([a.skipped, b.skipped].sort(), [null, 'busy'].sort());
    assert.equal(t.paymentListCalls(), 1);
    assert.deepEqual(t.settle.calls, ['p1']);
    // the lease is released afterwards
    assert.equal((await runRenewalTick(t.deps)).skipped, null);
  });

  it('reconcile: settles a 40-min-old checkout, fails an abandoned one at 45 min, late success settles later', async () => {
    const t = setup();
    const now = t.clock().getTime();
    t.store.payments.push(makePayment({ id: 'paid', userId: 'u1', createdAt: new Date(now - 40 * MIN) }));
    t.store.payments.push(makePayment({ id: 'gone', userId: 'u2', createdAt: new Date(now - 46 * MIN) }));
    t.store.payments.push(makePayment({ id: 'young', userId: 'u3', createdAt: new Date(now - 31 * MIN) }));
    t.store.payments.push(makePayment({ id: 'fresh', userId: 'u4', createdAt: new Date(now - 5 * MIN) }));
    t.rows.set('paid', [successRow('paid', '999.00')]);
    const s1 = await runRenewalTick(t.deps);
    assert.equal(s1.succeeded, 1);
    assert.deepEqual(t.postSettled, ['paid']);
    const byId = (id: string) => t.store.payments.find((p) => p.id === id)!;
    assert.equal(byId('gone').status, 'failed');
    assert.equal(byId('gone').failureReason, 'no_transaction');
    assert.equal(byId('young').status, 'pending'); // not found but < 45 min: not "unpaid" yet
    assert.equal(byId('fresh').status, 'pending');
    assert.equal(t.paymentListCalls(), 3); // 'fresh' is not asked before 30 min

    // Two days later PaymentList shows the abandoned one as paid → the re-check settles it.
    t.clock.advance(2 * DAY);
    t.rows.set('gone', [successRow('gone', '999.00')]);
    await runRenewalTick(t.deps);
    assert.ok(t.settle.calls.includes('gone'));
    assert.equal(byId('gone').status, 'succeeded');
  });

  it('a PaymentList error is never "not charged": the payment waits with backoff', async () => {
    let failing = true;
    const t = setup({ failPaymentList: () => failing });
    t.store.payments.push(makePayment({ id: 'p1', userId: 'u1', createdAt: new Date(t.clock().getTime() - 2 * HOUR) }));
    await runRenewalTick(t.deps);
    const p = t.store.payments[0];
    assert.equal(p.status, 'pending');
    assert.equal(p.confirmAttempts, 1);
    assert.equal(p.confirmAfter?.getTime(), t.clock().getTime() + 15 * MIN);
    failing = false;
    t.clock.advance(16 * MIN);
    t.rows.set('p1', [successRow('p1', '999.00')]);
    await runRenewalTick(t.deps);
    assert.equal(p.status, 'succeeded');
  });

  it('hosted mismatch (no 3D) → needs_review + refund queue + Sentry; owner_paying is released', async () => {
    const t = setup();
    const E = new Date('2026-12-09T07:00:00Z');
    t.store.payments.push(makePayment({ id: 'p1', userId: 'u1', createdAt: new Date(t.clock().getTime() - HOUR) }));
    t.store.renewals.push(
      makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, state: 'owner_paying', ownerPaymentId: 'p1', ownerPrevState: 'retry_wait', graceEndsAt: new Date(E.getTime() + 120 * HOUR) }),
    );
    t.rows.set('p1', [successRow('p1', '999.00', { USE_3D: 'false' })]);
    await runRenewalTick(t.deps);
    const p = t.store.payments[0];
    assert.equal(p.status, 'needs_review');
    assert.equal(p.refundState, 'required');
    assert.equal(p.refundReason, 'charged_mismatch');
    assert.ok(t.captured.includes('billing-non3d-hosted'));
    assert.equal(t.store.renewals[0].state, 'retry_wait');
    assert.equal(t.settle.calls.length, 0);
  });

  it('an explicit failure row fails the payment and gives the renewal back (D19)', async () => {
    const t = setup();
    const E = new Date('2026-12-20T07:00:00Z'); // after the test window: no lapse
    t.store.payments.push(makePayment({ id: 'p1', userId: 'u1', createdAt: new Date(t.clock().getTime() - HOUR) }));
    t.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, state: 'owner_paying', ownerPaymentId: 'p1', ownerPrevState: 'needs_action' }));
    t.rows.set('p1', [successRow('p1', '999.00', { STATUS: 'DECLINED' })]);
    const s = await runRenewalTick(t.deps);
    assert.equal(s.failed, 1);
    assert.equal(t.store.payments[0].failureReason, 'provider:declined');
    assert.equal(t.store.renewals[0].state, 'needs_action');
    assert.equal(t.store.renewals[0].ownerPaymentId, null);
  });

  it('a hosted payment still unresolved after 48 h goes to review (never to failed)', async () => {
    const t = setup();
    t.store.payments.push(makePayment({ id: 'p1', userId: 'u1', createdAt: new Date(t.clock().getTime() - 47 * HOUR) }));
    t.rows.set('p1', [successRow('p1', '999.00', { STATUS: 'PENDING' })]);
    await runRenewalTick(t.deps);
    assert.equal(t.store.payments[0].status, 'pending');
    t.clock.advance(2 * HOUR);
    await runRenewalTick(t.deps);
    assert.equal(t.store.payments[0].status, 'needs_review');
    assert.ok(t.captured.includes('billing-charge-unresolved'));
  });

  it('automatic-charge rows (D17): unknown stays pending, 48 h → manual_review; decline + 30 min → failed', async () => {
    const t = setup();
    const E = new Date('2026-12-20T07:00:00Z'); // after the test window: no lapse
    const now = t.clock().getTime();
    t.store.renewals.push(makeRenewal({ id: 'r1', userId: 'u1', periodEnd: E, mode: 'auto', state: 'awaiting_confirmation', attempts: 1 }));
    t.store.renewals.push(makeRenewal({ id: 'r2', userId: 'u2', periodEnd: E, mode: 'auto', state: 'awaiting_confirmation', attempts: 1 }));
    t.store.payments.push(
      makePayment({ id: 'a1', userId: 'u1', kind: 'renewal_auto', renewalId: 'r1', attemptNo: 1, providerOutcome: 'unknown', confirmAfter: new Date(now), createdAt: new Date(now - HOUR) }),
    );
    t.store.payments.push(
      makePayment({ id: 'a2', userId: 'u2', kind: 'renewal_auto', renewalId: 'r2', attemptNo: 1, providerOutcome: 'declined', providerDeclineCode: '51', confirmAfter: new Date(now), createdAt: new Date(now - 31 * MIN) }),
    );
    await runRenewalTick(t.deps);
    assert.equal(t.store.payments[0].status, 'pending');
    assert.equal(t.store.renewals[0].state, 'awaiting_confirmation');
    assert.equal(t.store.payments[1].status, 'failed');
    assert.equal(t.store.payments[1].failureReason, 'declined:51');
    assert.equal(t.store.renewals[1].state, 'needs_action');
    t.clock.advance(48 * HOUR);
    await runRenewalTick(t.deps);
    assert.equal(t.store.payments[0].status, 'pending');
    assert.equal(t.store.renewals[0].state, 'manual_review');
    assert.ok(t.captured.includes('billing-charge-unresolved'));
    assert.equal(t.calls.filter((c) => c.url.endsWith(CHARGE_PATH)).length, 0);
  });

  it('stale charge lease: a sent charge waits for confirmation; an unsent one is given back', async () => {
    const t = setup();
    const E = new Date('2026-12-20T07:00:00Z'); // after the test window: no lapse
    const past = new Date(t.clock().getTime() - MIN);
    t.store.renewals.push(makeRenewal({ id: 'sent', userId: 'u1', periodEnd: E, mode: 'auto', state: 'charging', attempts: 1, lockedUntil: past, leaseId: 'x' }));
    t.store.renewals.push(makeRenewal({ id: 'unsent', userId: 'u2', periodEnd: E, mode: 'auto', state: 'charging', attempts: 2, lockedUntil: past, leaseId: 'y' }));
    t.store.payments.push(makePayment({ id: 'a1', userId: 'u1', kind: 'renewal_auto', renewalId: 'sent', attemptNo: 1, providerOutcome: 'not_sent', confirmAfter: new Date(t.clock().getTime() + DAY) }));
    await runRenewalTick(t.deps);
    assert.equal(t.store.renewals[0].state, 'awaiting_confirmation');
    assert.equal(t.store.renewals[1].state, 'retry_wait');
    assert.equal(t.store.renewals[1].attempts, 1);
  });

  it('lapse: a consented renewal keeps access until graceEnd; without consent it lapses at E; renewed ones never', async () => {
    const t = setup({ start: '2026-12-18T08:00:00Z' });
    const E = new Date('2026-12-18T07:00:00Z');
    t.store.subscriptions.set('u1', { status: 'active', renewsAt: E, autoRenew: true });
    t.store.subscriptions.set('u2', { status: 'active', renewsAt: E, autoRenew: false });
    t.store.subscriptions.set('u3', { status: 'active', renewsAt: new Date(E.getTime() + 30 * DAY), autoRenew: false });
    t.store.renewals.push(makeRenewal({ id: 'grace', userId: 'u1', periodEnd: E, modeReason: 'dry_run', graceEndsAt: new Date(E.getTime() + 120 * HOUR) }));
    t.store.renewals.push(makeRenewal({ id: 'plain', userId: 'u2', periodEnd: E }));
    t.store.renewals.push(makeRenewal({ id: 'renewed', userId: 'u3', periodEnd: E }));
    const s = await runRenewalTick(t.deps);
    assert.equal(s.lapsed, 1);
    const state = (id: string) => t.store.renewals.find((r) => r.id === id)!.state;
    assert.equal(state('grace'), 'scheduled');
    assert.equal(state('plain'), 'lapsed');
    assert.equal(t.store.renewals.find((r) => r.id === 'plain')!.pendingMail, 'period_ended');
    assert.equal(state('renewed'), 'scheduled');
    t.clock.advance(120 * HOUR);
    await runRenewalTick(t.deps);
    assert.equal(state('grace'), 'lapsed');
    assert.equal(t.expireCalls.length, 2);
  });

  it('tombstones: provider deletion verified by re-list; failures back off, then manual; unknown key leaves the row', async () => {
    const keys = loadVaultKeys({ BILLING_VAULT_KEY: randomTestKey() });
    const otherKeys = loadVaultKeys({ BILLING_VAULT_KEY: randomTestKey() });
    let stored = [{ Token: 'TOKEN-1', TranId: 'TRAN-1', Maskedpan: '545616******5454', CARD_ALIACE: 'Buaze-1' }];
    let listFails = false;
    const t = setup({
      extraHandlers: {
        CardStorageCardList: () => (listFails ? { status: 500, contentType: 'text/html', text: '<html/>' } : { body: cardListBody(stored) }),
        CardStorageCardDelete: () => {
          stored = [];
          return { body: { ProcReturnCode: '00' } };
        },
      },
    });
    const deps = { ...t.deps, vault: { keys } };
    const now = t.clock();
    const blob = sealCustomerKey(sensitive('ABCDEFGHJK1'), 'cuser_t1', keys);
    const foreignBlob = sealCustomerKey(sensitive('ZZZZZZZZZZ1'), 'cuser_t2', otherKeys);
    t.store.tombstones.push({ id: 'tb_1', providerEnv: 'live', customerKeyEnc: blob, aadUserId: 'cuser_t1', attempts: 0, createdAt: now, state: 'open', nextAttemptAt: now, lastError: null, manualSince: null });
    t.store.tombstones.push({ id: 'tb_2', providerEnv: 'live', customerKeyEnc: foreignBlob, aadUserId: 'cuser_t2', attempts: 0, createdAt: now, state: 'open', nextAttemptAt: now, lastError: null, manualSince: null });
    t.store.tombstones.push({ id: 'tb_3', providerEnv: 'test', customerKeyEnc: blob, aadUserId: 'cuser_t1', attempts: 0, createdAt: now, state: 'open', nextAttemptAt: now, lastError: null, manualSince: null });
    const s = await runRenewalTick(deps);
    assert.equal(s.tombstonesCleared, 1);
    assert.deepEqual(t.store.tombstones.map((x) => x.id), ['tb_2', 'tb_3']);
    assert.ok(t.captured.includes('billing-vault-key'));
    assert.equal(t.store.tombstones[0].attempts, 0); // untouched until the key is available
    const listCalls = t.calls.filter((c) => c.url.endsWith('CardStorageCardList'));
    assert.equal(listCalls.length, 2);
    assert.equal(listCalls[0].form.customerKey, 'ABCDEFGHJK1');

    // A failing provider: backoff 1 h, 6 h, 24 h … and manual after 14 attempts.
    listFails = true;
    t.store.tombstones.push({ id: 'tb_4', providerEnv: 'live', customerKeyEnc: blob, aadUserId: 'cuser_t1', attempts: 12, createdAt: now, state: 'open', nextAttemptAt: now, lastError: null, manualSince: null });
    await runRenewalTick(deps);
    const tb4 = t.store.tombstones.find((x) => x.id === 'tb_4')!;
    assert.equal(tb4.attempts, 13);
    assert.equal(tb4.state, 'open');
    assert.equal(tb4.nextAttemptAt.getTime(), t.clock().getTime() + DAY);
    t.clock.advance(DAY);
    await runRenewalTick(deps);
    assert.equal(tb4.attempts, 14);
    assert.equal(tb4.state, 'manual');
    assert.ok(t.captured.includes('billing-tombstone-stuck'));
  });

  it('daily scans: once per Istanbul day after 06:00 UTC — decline ratio and overdue refunds', async () => {
    const t = setup({ start: '2026-12-10T05:00:00Z' });
    const now = t.clock().getTime();
    for (let i = 0; i < 10; i++) {
      t.store.payments.push(
        makePayment({ id: `h${i}`, userId: `u${i % 2}`, status: i < 4 ? 'failed' : 'succeeded', failureReason: i < 4 ? 'provider:declined' : null, createdAt: new Date(now - HOUR) }),
      );
    }
    t.store.payments.push(makePayment({ id: 'dup', userId: 'u9', status: 'succeeded', refundState: 'required', refundReason: 'duplicate_period', completedAt: new Date(now - 4 * DAY) }));
    await runRenewalTick(t.deps);
    assert.equal(t.captured.includes('billing-decline-ratio'), false); // before 06:00 UTC
    t.clock.advance(2 * HOUR);
    await runRenewalTick(t.deps);
    assert.ok(t.captured.includes('billing-decline-ratio'));
    assert.ok(t.captured.includes('billing-refund-overdue'));
    const count = t.captured.length;
    t.clock.advance(HOUR);
    await runRenewalTick(t.deps);
    assert.equal(t.captured.length, count); // marker already claimed today
    // the range scan stays off until Q-16 is verified
    assert.equal(t.paymentListCalls(), 0);
  });

  it('retention runs once per Istanbul day', async () => {
    const t = setup({ start: '2026-12-10T10:00:00Z' });
    await runRenewalTick(t.deps);
    t.clock.advance(HOUR);
    await runRenewalTick(t.deps);
    assert.equal(t.retentionCalls.length, 1);
    t.clock.advance(DAY);
    await runRenewalTick(t.deps);
    assert.equal(t.retentionCalls.length, 2);
  });

  it('no provider call starts after the 240 s budget; DB-only phases still run', async () => {
    const t = setup();
    const inner = t.deps.transport;
    const slow = {
      async postForm(url: string, form: Record<string, string>) {
        t.clock.advance(200_000);
        return inner.postForm(url, form);
      },
    };
    for (const id of ['p1', 'p2', 'p3']) {
      t.store.payments.push(makePayment({ id, userId: id, createdAt: new Date(t.clock().getTime() - HOUR) }));
    }
    const s = await runRenewalTick({ ...t.deps, transport: slow });
    assert.equal(t.paymentListCalls(), 2);
    assert.equal(s.budgetExhausted, true);
    assert.equal(t.expireCalls.length, 1);
    assert.equal(t.retentionCalls.length, 0); // phases 6-8 start only before 270 s
  });

  it('a failing phase is reported as { phase } only and the next phase still runs', async () => {
    const t = setup();
    t.deps.store.listPaymentsToConfirm = async () => {
      throw new Error('connection refused to postgres://user:pw@host/db');
    };
    const s = await runRenewalTick(t.deps);
    assert.deepEqual(s.failedPhases, ['reconcile']);
    assert.equal(t.expireCalls.length, 1);
    assert.equal(t.exceptions.length, 1);
    assert.equal(t.exceptions[0].message, 'Error:reconcile');
    assert.equal(JSON.stringify(s).includes('postgres'), false);
  });

  it('rows of the other PayNKolay environment are never reconciled (NULL counts as live)', async () => {
    const t = setup();
    const created = new Date(t.clock().getTime() - HOUR);
    t.store.payments.push(makePayment({ id: 'testrow', userId: 'u1', providerEnv: 'test', createdAt: created }));
    t.store.payments.push(makePayment({ id: 'legacy', userId: 'u2', providerEnv: null, createdAt: created }));
    await runRenewalTick(t.deps);
    const asked = t.calls.filter((c) => c.url.endsWith('/PaymentList')).map((c) => c.form.clientRefCode);
    assert.deepEqual(asked, ['legacy']);
  });
});

describe('daily transaction scan analysis (pure)', () => {
  it('flags foreign, foreign-merchant, duplicate, mismatched, non-3D hosted and unsettled successes', () => {
    const stored = new Map([
      ['p1', { id: 'p1', status: 'succeeded', kind: 'checkout', amountMinor: 99900 }],
      ['p2', { id: 'p2', status: 'pending', kind: 'checkout', amountMinor: 99900 }],
      ['p3', { id: 'p3', status: 'needs_review', kind: 'checkout', amountMinor: 99900 }],
      ['p4', { id: 'p4', status: 'succeeded', kind: 'checkout', amountMinor: 99900 }],
    ]);
    const rows = [
      successRow('p1', '999.00', { MERCHANT_NO: '400' }),
      successRow('p1', '999.00', { REFERENCE_CODE: 'R2' }),
      successRow('p2', '999.00'),
      successRow('p3', '999.00'),
      successRow('p4', '1.00', { USE_3D: 'false' }),
      successRow('zz', '5.00'),
      successRow('p4', '999.00', { MERCHANT_NO: '999', TRANSACTION_TYPE: 'REFUND' }),
      { CLIENT_REFERENCE_CODE: 'p1', STATUS: 'FAILED' },
    ];
    const scan = analyzeDailyTransactions(rows, stored, '400');
    const fps = scan.findings.map((f) => f.fingerprint).sort();
    assert.deepEqual(fps, [
      'billing-charged-mismatch',
      'billing-duplicate-charge',
      'billing-foreign-merchant',
      'billing-foreign-transaction',
      'billing-non3d-hosted',
      'billing-success-unsettled',
    ]);
    assert.deepEqual(scan.toSettle, ['p2']);
    assert.deepEqual(scan.duplicates, ['p1']);
  });
});
