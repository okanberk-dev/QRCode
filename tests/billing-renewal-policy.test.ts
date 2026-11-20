import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addPeriod,
  anchorFits,
  attemptSchedule,
  canTransition,
  classifyDecline,
  evaluateRenewal,
  graceEnd,
  inIstanbulWindow,
  istanbulDay,
  istanbulDayOfMonth,
  istanbulHour,
  nextWindowSlot,
  RENEWAL_POLICY,
  type RenewalEvalInput,
  type RenewalState,
} from '../src/lib/billing/renewal-policy';
import { nextPeriodEnd } from '../src/lib/billing/paynkolay-billing';

// billing spec §15.2 `billing-renewal-policy.test.ts` (items 1-6; the consent
// text of item 7 arrives with the auto-renew consent).

const HOUR = 3600_000;
const iso = (d: Date) => d.toISOString();

test('anchorFits: the stored anchor must describe the period end (exact day or month-end clamp)', () => {
  assert.equal(anchorFits(20, new Date('2027-03-20T09:00:00Z')), true);
  assert.equal(anchorFits(1, new Date('2027-03-20T09:00:00Z')), false); // left behind by an admin edit
  assert.equal(anchorFits(31, new Date('2027-02-28T09:00:00Z')), true); // Jan 31 → Feb 28
  assert.equal(anchorFits(29, new Date('2027-02-28T09:00:00Z')), true); // yearly Feb 29 → Feb 28
  assert.equal(anchorFits(31, new Date('2027-04-29T09:00:00Z')), false);
  assert.equal(anchorFits(1, new Date('2027-02-28T21:30:00Z')), true); // 00:30 Istanbul on 1 March
  assert.equal(anchorFits(0, new Date('2027-03-20T09:00:00Z')), false);
  assert.equal(istanbulHour(new Date('2027-03-01T21:25:00Z')), 0);
  assert.equal(istanbulHour(new Date('2027-03-02T06:25:00Z')), 9);
});

test('attemptSchedule: A1 ≥ E in the window, 48 h apart, all before graceEnd, never before E', () => {
  const E = new Date('2026-12-18T07:00:00Z'); // 10:00 Istanbul
  const s = attemptSchedule(E);
  assert.equal(s.length, 3);
  assert.equal(iso(s[0]), iso(E));
  assert.ok(s[1].getTime() >= s[0].getTime() + 48 * HOUR);
  assert.ok(s[2].getTime() >= s[1].getTime() + 48 * HOUR);
  for (const t of s) {
    assert.ok(t.getTime() >= E.getTime());
    assert.ok(t.getTime() < graceEnd(E).getTime());
    assert.ok(inIstanbulWindow(t));
  }
  // E at 23:30 Istanbul → A1 next morning 09:00 Istanbul
  const late = new Date('2026-12-18T20:30:00Z');
  assert.equal(iso(attemptSchedule(late)[0]), '2026-12-19T06:00:00.000Z');
});

test('attemptSchedule: a late notice pushes A1 and drops attempts past graceEnd', () => {
  const E = new Date('2026-12-18T07:00:00Z');
  const s = attemptSchedule(E, { noticeDeliveredAt: new Date(E.getTime() - HOUR) });
  assert.ok(s[0].getTime() >= E.getTime() + 71 * HOUR);
  assert.ok(s.length < 3);
  for (const t of s) assert.ok(t.getTime() < graceEnd(E).getTime());
  const first = new Date(E.getTime() + 30 * HOUR);
  assert.ok(attemptSchedule(E, { firstChargeDate: first })[0].getTime() >= first.getTime());
  // notice after graceEnd - 72h → no slot at all
  assert.deepEqual(attemptSchedule(E, { noticeDeliveredAt: new Date(E.getTime() + 60 * HOUR) }), []);
});

test('Istanbul window, next slot and day around midnight', () => {
  assert.equal(inIstanbulWindow(new Date('2026-12-01T05:59:00Z')), false);
  assert.equal(inIstanbulWindow(new Date('2026-12-01T06:00:00Z')), true);
  assert.equal(inIstanbulWindow(new Date('2026-12-01T17:59:00Z')), true);
  assert.equal(inIstanbulWindow(new Date('2026-12-01T18:00:00Z')), false);
  assert.equal(iso(nextWindowSlot(new Date('2026-12-01T03:00:00Z'))), '2026-12-01T06:00:00.000Z');
  assert.equal(iso(nextWindowSlot(new Date('2026-12-01T19:00:00Z'))), '2026-12-02T06:00:00.000Z');
  assert.equal(iso(nextWindowSlot(new Date('2026-12-01T21:30:00Z'))), '2026-12-02T06:00:00.000Z'); // 00:30 Istanbul
  const t = new Date('2026-12-01T12:00:00Z');
  assert.equal(nextWindowSlot(t), t);
  assert.equal(istanbulDay(new Date('2026-11-30T20:59:59Z')), '2026-11-30');
  assert.equal(istanbulDay(new Date('2026-11-30T21:00:00Z')), '2026-12-01');
});

test('classifyDecline', () => {
  assert.equal(classifyDecline('51', null), 'soft');
  assert.equal(classifyDecline('05', null), 'soft');
  assert.equal(classifyDecline('54', null), 'hard');
  assert.equal(classifyDecline('43', null), 'hard');
  assert.equal(classifyDecline('12', null), 'hard');
  assert.equal(classifyDecline('63', null), 'hard');
  assert.equal(classifyDecline('4', null), 'hard');
  assert.equal(classifyDecline('ZZ', null), 'soft');
  assert.equal(classifyDecline(null, null), 'soft');
  assert.equal(classifyDecline(null, 'Çalıntı kart'), 'hard');
});

function input(over: Partial<{ [K in keyof RenewalEvalInput]: Partial<RenewalEvalInput[K]> | null }> = {}): RenewalEvalInput {
  const base: RenewalEvalInput = {
    flags: { autoCharge: true, dryRun: false, non3dLimitMinor: 200000 },
    sub: {
      source: 'paynkolay',
      status: 'active',
      autoRenew: true,
      cancelAtPeriodEnd: false,
      billingCycle: 'monthly',
      renewsAt: new Date('2026-12-18T07:00:00Z'),
      subscriptionPlanId: 'plan_1',
    },
    user: { isActive: true, deactivatedAt: null, scheduledDeletionAt: null, userId: 'cuser1' },
    plan: { isActive: true, amountMinor: 99900 },
    consent: { id: 'c1', amountMinor: 99900, subscriptionPlanId: 'plan_1', billingCycle: 'monthly', cardId: 'card1' },
    boundCard: { id: 'card1' },
  };
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    out[k] = v === null ? null : { ...(base as unknown as Record<string, object>)[k], ...v };
  }
  return out as unknown as RenewalEvalInput;
}

test('evaluateRenewal matrix', () => {
  const reason = (i: RenewalEvalInput) => {
    const d = evaluateRenewal(i);
    return !d.eligible ? d.reason : d.mode === 'reminder' ? d.modeReason : 'auto';
  };
  assert.equal(reason(input()), 'auto');
  assert.equal(reason(input({ flags: { autoCharge: false } })), 'flag_off');
  assert.equal(reason(input({ flags: { dryRun: true } })), 'dry_run');
  assert.equal(reason(input({ sub: { billingCycle: 'yearly' } })), 'yearly');
  assert.equal(reason(input({ sub: { autoRenew: false } })), 'auto_renew_off');
  assert.equal(reason(input({ boundCard: null })), 'no_card');
  assert.equal(reason(input({ consent: null })), 'no_consent');
  assert.equal(reason(input({ plan: { amountMinor: 109900 } })), 'above_consent');
  assert.equal(reason(input({ flags: { non3dLimitMinor: 50000 } })), 'above_non3d_limit');
  assert.equal(reason(input({ consent: { subscriptionPlanId: 'plan_2' } })), 'plan_changed');
  assert.equal(reason(input({ user: { isActive: false } })), 'account_blocked');
  assert.equal(reason(input({ user: { deactivatedAt: new Date() } })), 'account_blocked');
  assert.equal(reason(input({ user: { scheduledDeletionAt: new Date() } })), 'account_blocked');
  assert.equal(reason(input({ user: { userId: 'del_abc' } })), 'pseudonymised');
  assert.equal(reason(input({ sub: { status: 'canceled' } })), 'subscription_inactive');
  assert.equal(reason(input({ sub: { cancelAtPeriodEnd: true } })), 'cancel_at_period_end');
  assert.equal(reason(input({ plan: { isActive: false } })), 'plan_unavailable');
  assert.equal(reason(input({ sub: { source: 'manual' } })), 'not_card_subscription');
  // The amount is always the DB price; a lower price is charged as is.
  const lower = evaluateRenewal(input({ plan: { amountMinor: 79900 } }));
  assert.deepEqual(lower, { eligible: true, mode: 'auto', amountMinor: 79900 });
});

test('canTransition: every §10.2 edge passes, forbidden samples fail', () => {
  const allowed: [RenewalState, RenewalState][] = [
    ['scheduled', 'charging'],
    ['retry_wait', 'charging'],
    ['charging', 'awaiting_confirmation'],
    ['charging', 'scheduled'],
    ['charging', 'retry_wait'],
    ['charging', 'needs_action'],
    ['charging', 'canceled'],
    ['awaiting_confirmation', 'succeeded'],
    ['awaiting_confirmation', 'retry_wait'],
    ['awaiting_confirmation', 'needs_action'],
    ['awaiting_confirmation', 'manual_review'],
    ['awaiting_confirmation', 'awaiting_confirmation'],
    ['scheduled', 'owner_paying'],
    ['retry_wait', 'owner_paying'],
    ['needs_action', 'owner_paying'],
    ['manual_review', 'owner_paying'],
    ['owner_paying', 'succeeded'],
    ['owner_paying', 'scheduled'],
    ['owner_paying', 'retry_wait'],
    ['manual_review', 'needs_action'],
    ['needs_action', 'retry_wait'],
    ['manual_review', 'succeeded'],
    ['scheduled', 'canceled'],
    ['retry_wait', 'canceled'],
    ['needs_action', 'canceled'],
    ['manual_review', 'canceled'],
    ['scheduled', 'lapsed'],
    ['retry_wait', 'lapsed'],
    ['needs_action', 'lapsed'],
    ['manual_review', 'lapsed'],
  ];
  for (const [from, to] of allowed) assert.equal(canTransition(from, to), true, `${from} → ${to}`);
  const forbidden: [RenewalState, RenewalState][] = [
    ['succeeded', 'charging'],
    ['lapsed', 'succeeded'],
    ['canceled', 'scheduled'],
    ['manual_review', 'charging'],
    ['scheduled', 'succeeded'],
    ['succeeded', 'succeeded'],
  ];
  for (const [from, to] of forbidden) assert.equal(canTransition(from, to), false, `${from} → ${to}`);
});

test('addPeriod in the Istanbul calendar (month-end clamp, anchor day, time of day)', () => {
  // 31 Jan 2027 12:00 Istanbul → 28 Feb; with anchor 31: 28 Feb → 31 Mar
  const jan31 = new Date('2027-01-31T09:00:00Z');
  const feb28 = addPeriod('monthly', jan31);
  assert.equal(iso(feb28), '2027-02-28T09:00:00.000Z');
  assert.equal(iso(addPeriod('monthly', feb28, 31)), '2027-03-31T09:00:00.000Z');
  // without the anchor the drift is the old bug: 28 Feb → 28 Mar
  assert.equal(iso(addPeriod('monthly', feb28)), '2027-03-28T09:00:00.000Z');
  // 29 Feb 2028 yearly → 28 Feb 2029
  assert.equal(iso(addPeriod('yearly', new Date('2028-02-29T09:00:00Z'))), '2029-02-28T09:00:00.000Z');
  // 01:30 Istanbul on 1 March (still 28 Feb in UTC) → 1 April 01:30 Istanbul, anchor day 1
  const mar1 = new Date('2027-02-28T22:30:00Z');
  assert.equal(istanbulDayOfMonth(mar1), 1);
  assert.equal(iso(addPeriod('monthly', mar1)), '2027-03-31T22:30:00.000Z');
  // December → January of the next year
  assert.equal(iso(addPeriod('monthly', new Date('2026-12-15T10:00:00Z'))), '2027-01-15T10:00:00.000Z');
  assert.equal(RENEWAL_POLICY.graceHours, 120);
});

test('nextPeriodEnd: stacking still holds; the anchor applies only when extending', () => {
  const now = new Date(Date.UTC(2026, 0, 15));
  assert.equal(iso(nextPeriodEnd('monthly', null, now)), '2026-02-15T00:00:00.000Z');
  assert.equal(iso(nextPeriodEnd('monthly', new Date(Date.UTC(2026, 0, 20)), now)), '2026-02-20T00:00:00.000Z');
  // a stale anchor (31) never stretches a period restarted from now
  assert.equal(iso(nextPeriodEnd('monthly', new Date(Date.UTC(2026, 0, 10)), now, 31)), '2026-02-15T00:00:00.000Z');
  // extending from 28 Feb with anchor 31 → 31 Mar
  assert.equal(
    iso(nextPeriodEnd('monthly', new Date('2027-02-28T09:00:00Z'), new Date('2027-02-20T00:00:00Z'), 31)),
    '2027-03-31T09:00:00.000Z',
  );
});
