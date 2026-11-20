import type { BillingFlags } from './flags';

/**
 * Renewal policy (billing spec §6.1, §9, §10). Pure: no I/O, no clock, no
 * env. Every time rule of the renewal engine lives here so it can be tested
 * without a database:
 *  - the Europe/Istanbul calendar (period arithmetic, the 09:00–21:00 window,
 *    the Istanbul day used for once-per-day markers);
 *  - the attempt schedule (never before the period end E, ≥ 72 h after a
 *    delivered notice, 48 h apart, only before graceEnd = E + 120 h);
 *  - the renewal state machine (§10.2);
 *  - decline classification and the eligibility decision.
 */

export const RENEWAL_POLICY = {
  scheduleLeadHours: 7 * 24,
  noticeLeadHours: 96,
  minNoticeHours: 72,
  reminderHours: [7 * 24, 24],
  retryGapHours: 48,
  graceHours: 120,
  maxAttempts: 3,
  istanbulWindow: { fromHour: 9, toHour: 21 },
  tickLeaseMs: 330_000,
  tickBudgetMs: 240_000,
  /** Phases 6-8 start only before this point of the tick (§9.0). */
  lateStartMs: 270_000,
  leaseMs: 10 * 60_000,
  confirmDelayMs: 10 * 60_000,
  declineFailAfterMs: 30 * 60_000,
  /** A hosted payment PaymentList does not know after this long was abandoned. */
  hostedNotFoundFailAfterMs: 45 * 60_000,
  /** Hosted payments are reconciled once they are this old, even without confirmAfter. */
  hostedReconcileAfterMs: 30 * 60_000,
  unresolvedAfterMs: 48 * 60 * 60_000,
  ownerPayingLockMs: 45 * 60_000,
  recheckFailedDays: 7,
  recheckFailedEveryMs: 6 * 60 * 60_000,
  maxRechecksPerRun: 50,
  confirmBackoffBaseMs: 15 * 60_000,
  confirmBackoffMaxMs: 6 * 60 * 60_000,
  cardMissingConfirmMs: 24 * 60 * 60_000,
  anchorAfterLapseDays: 7,
  breaker: { consecutive: 3, ratio: 0.2, minSample: 10, emptyListOwners: 2, mirrorFreshMs: 48 * 3600_000, holdMs: 6 * 3600_000, maxTrips24h: 3 },
  maxChargesPerRun: 40,
  maxReconcilesPerRun: 200,
  maxTombstonesPerRun: 20,
  tombstoneMaxAttempts: 14,
  /**
   * Daily scans run on the first tick at or after this Istanbul wall-clock hour
   * of each Istanbul day (09:00 Istanbul = 06:00 UTC). Gating on the same
   * calendar as the once-per-day marker keeps the 21:25 UTC tick (00:25
   * Istanbul, already the next Istanbul day) from claiming the day at night.
   */
  dailyScanIstanbulHour: 9,
  refundOverdueMs: 3 * 24 * 60 * 60_000,
  declineRatio: { ratio: 0.3, minSample: 10, perAccount: 3 },
  panelEnable: true,
  stepUpMaxAgeMs: 5 * 60_000,
} as const;

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

// ── States (§10) ───────────────────────────────────────────────────────────

export type RenewalState =
  | 'scheduled'
  | 'owner_paying'
  | 'charging'
  | 'awaiting_confirmation'
  | 'retry_wait'
  | 'needs_action'
  | 'manual_review'
  | 'succeeded'
  | 'lapsed'
  | 'canceled';

export const RENEWAL_STATES: readonly RenewalState[] = [
  'scheduled',
  'owner_paying',
  'charging',
  'awaiting_confirmation',
  'retry_wait',
  'needs_action',
  'manual_review',
  'succeeded',
  'lapsed',
  'canceled',
];

export const TERMINAL_STATES: ReadonlySet<RenewalState> = new Set<RenewalState>(['succeeded', 'lapsed', 'canceled']);
/** The engine never makes an automatic attempt from these. */
export const NO_AUTO_ATTEMPT_STATES: ReadonlySet<RenewalState> = new Set<RenewalState>([...TERMINAL_STATES, 'manual_review']);
/** A payment for the period is in flight: never expire, never hard-delete without deferral. */
export const IN_FLIGHT_STATES: ReadonlySet<RenewalState> = new Set<RenewalState>(['owner_paying', 'charging', 'awaiting_confirmation']);

/** §10.2 transition table. A non-terminal state may always be patched in place (from === to). */
const TRANSITIONS: Readonly<Record<RenewalState, readonly RenewalState[]>> = {
  scheduled: ['charging', 'owner_paying', 'canceled', 'lapsed'],
  // retry_wait → manual_review: an earlier attempt re-checked before attempt n+1 is unresolved (§9.2 4.3).
  retry_wait: ['charging', 'owner_paying', 'manual_review', 'canceled', 'lapsed'],
  charging: ['awaiting_confirmation', 'scheduled', 'retry_wait', 'needs_action', 'canceled'],
  awaiting_confirmation: ['succeeded', 'retry_wait', 'needs_action', 'manual_review'],
  // owner_paying goes back to whatever state it came from (ownerPrevState).
  owner_paying: ['succeeded', 'scheduled', 'retry_wait', 'needs_action', 'manual_review'],
  needs_action: ['owner_paying', 'retry_wait', 'canceled', 'lapsed'],
  manual_review: ['owner_paying', 'succeeded', 'needs_action', 'canceled', 'lapsed'],
  succeeded: [],
  lapsed: [],
  canceled: [],
};

export function isRenewalState(value: unknown): value is RenewalState {
  return typeof value === 'string' && (RENEWAL_STATES as readonly string[]).includes(value);
}

export function canTransition(from: RenewalState, to: RenewalState): boolean {
  if (TERMINAL_STATES.has(from)) return false;
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

/** Every state that may move to `to` (used for conditional SQL updates). */
export function statesThatCanReach(to: RenewalState): RenewalState[] {
  return RENEWAL_STATES.filter((from) => canTransition(from, to));
}

// ── Europe/Istanbul calendar ───────────────────────────────────────────────

const ISTANBUL_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

interface WallTime {
  year: number;
  month: number; // 1..12
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

function istanbulWall(d: Date): WallTime {
  const out: Record<string, number> = {};
  for (const part of ISTANBUL_FORMAT.formatToParts(d)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
    ms: d.getUTCMilliseconds(),
  };
}

/** UTC offset of Istanbul at `d`, in ms (Turkey is fixed UTC+3, but the helper still asks Intl). */
function istanbulOffsetMs(d: Date): number {
  const w = istanbulWall(d);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second, w.ms) - d.getTime();
}

/** The instant whose Istanbul wall-clock time is the given one. */
function fromIstanbulWall(w: WallTime): Date {
  const naive = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second, w.ms);
  let t = naive - istanbulOffsetMs(new Date(naive));
  t = naive - istanbulOffsetMs(new Date(t));
  return new Date(t);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** YYYY-MM-DD in Europe/Istanbul. */
export function istanbulDay(d: Date): string {
  const w = istanbulWall(d);
  return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`;
}

/** Istanbul day of month (1..31). */
export function istanbulDayOfMonth(d: Date): number {
  return istanbulWall(d).day;
}

/** Istanbul wall-clock hour (0..23). */
export function istanbulHour(d: Date): number {
  return istanbulWall(d).hour;
}

/**
 * True when `anchorDay` still describes the period end `at`: its Istanbul day
 * equals the anchor, or the anchor is past the end of that month and `at` is
 * the month's last day (the Jan 31 → Feb 28 clamp). A stored anchor that does
 * not fit was left behind by an edit of the period end (an admin change), and
 * must not be used to compute the next period.
 */
export function anchorFits(anchorDay: number, at: Date): boolean {
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) return false;
  const w = istanbulWall(at);
  const last = daysInMonth(w.year, w.month);
  return w.day === anchorDay || (anchorDay > last && w.day === last);
}

/** Istanbul `YYYYMM` (invoice numbers). */
export function istanbulYearMonth(d: Date): string {
  const w = istanbulWall(d);
  return `${w.year}${String(w.month).padStart(2, '0')}`;
}

/** [09:00, 21:00) Europe/Istanbul. */
export function inIstanbulWindow(now: Date): boolean {
  const { hour } = istanbulWall(now);
  return hour >= RENEWAL_POLICY.istanbulWindow.fromHour && hour < RENEWAL_POLICY.istanbulWindow.toHour;
}

/** `t` if it is inside the window, else the next 09:00 Istanbul. */
export function nextWindowSlot(t: Date): Date {
  if (inIstanbulWindow(t)) return t;
  const w = istanbulWall(t);
  const nineToday = fromIstanbulWall({ ...w, hour: RENEWAL_POLICY.istanbulWindow.fromHour, minute: 0, second: 0, ms: 0 });
  if (w.hour < RENEWAL_POLICY.istanbulWindow.fromHour) return nineToday;
  // After 21:00: the next Istanbul day at 09:00 (Turkey has no DST; +24 h is the next day).
  const next = new Date(nineToday.getTime() + DAY_MS);
  return fromIstanbulWall({ ...istanbulWall(next), hour: RENEWAL_POLICY.istanbulWindow.fromHour, minute: 0, second: 0, ms: 0 });
}

/**
 * Month-end safe period arithmetic in the Europe/Istanbul calendar. Keeps the
 * Istanbul time of day. The day is `min(anchorDay ?? istanbul day of from,
 * days in the target month)`, so Jan 31 → Feb 28 → (anchor 31) Mar 31, and a
 * payment at 01:30 Istanbul on 1 March stays on the 1st.
 */
export function addPeriod(cycle: 'monthly' | 'yearly', from: Date, anchorDay?: number | null): Date {
  const w = istanbulWall(from);
  const anchor = anchorDay != null && Number.isInteger(anchorDay) && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : w.day;
  let year = w.year;
  let month = w.month;
  if (cycle === 'yearly') {
    year += 1;
  } else {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  const day = Math.min(anchor, daysInMonth(year, month));
  return fromIstanbulWall({ ...w, year, month, day });
}

// ── Attempt schedule (D4) ──────────────────────────────────────────────────

export function graceEnd(periodEnd: Date): Date {
  return new Date(periodEnd.getTime() + RENEWAL_POLICY.graceHours * HOUR_MS);
}

/**
 * A1 = slot(max(E, firstChargeDate, noticeDelivered + 72 h)), A(n+1) =
 * slot(A(n) + 48 h); at most maxAttempts, only times < graceEnd(E). Never a
 * time before E.
 */
export function attemptSchedule(
  periodEnd: Date,
  opts: { firstChargeDate?: Date | null; noticeDeliveredAt?: Date | null } = {},
): Date[] {
  let base = periodEnd.getTime();
  if (opts.firstChargeDate) base = Math.max(base, opts.firstChargeDate.getTime());
  if (opts.noticeDeliveredAt) base = Math.max(base, opts.noticeDeliveredAt.getTime() + RENEWAL_POLICY.minNoticeHours * HOUR_MS);
  const limit = graceEnd(periodEnd).getTime();
  const out: Date[] = [];
  let next = nextWindowSlot(new Date(base));
  while (out.length < RENEWAL_POLICY.maxAttempts && next.getTime() < limit) {
    out.push(next);
    next = nextWindowSlot(new Date(next.getTime() + RENEWAL_POLICY.retryGapHours * HOUR_MS));
  }
  return out;
}

// ── Declines ───────────────────────────────────────────────────────────────

export type DeclineKind = 'soft' | 'hard';

const HARD_DECLINE_CODES = new Set(['04', '07', '12', '14', '15', '33', '41', '43', '54', '57', '62', '63']);
const HARD_DECLINE_MESSAGE = /çal[ıi]nt[ıi]|kay[ıi]p|stolen|lost|expired|süresi dol/i;

/** Hard: stolen/lost/expired/closed cards and invalid-card codes. Everything else (incl. unknown) is soft. [VERIFY Q-13] */
export function classifyDecline(code: string | null, message: string | null): DeclineKind {
  const c = (code ?? '').trim();
  if (c && HARD_DECLINE_CODES.has(c.padStart(2, '0'))) return 'hard';
  if (message && HARD_DECLINE_MESSAGE.test(message)) return 'hard';
  return 'soft';
}

// ── Eligibility ────────────────────────────────────────────────────────────

export interface RenewalEvalInput {
  flags: Pick<BillingFlags, 'autoCharge' | 'dryRun' | 'non3dLimitMinor'>;
  sub: {
    source: string;
    status: string;
    autoRenew: boolean;
    cancelAtPeriodEnd: boolean;
    billingCycle: string | null;
    renewsAt: Date | null;
    subscriptionPlanId: string | null;
  };
  user: { isActive: boolean; deactivatedAt: Date | null; scheduledDeletionAt: Date | null; userId: string };
  /** amountMinor via paynkolayCheckoutAmounts(toAdminRow(plan))[cycle]. */
  plan: { isActive: boolean; amountMinor: number | null } | null;
  consent: {
    id: string;
    amountMinor: number | null;
    subscriptionPlanId: string | null;
    billingCycle: string | null;
    cardId: string | null;
  } | null;
  /** billing_cards row with boundConsentId === consent.id, not deleted. */
  boundCard: { id: string } | null;
}

export type RenewalIneligibleReason =
  | 'not_card_subscription'
  | 'subscription_inactive'
  | 'account_blocked'
  | 'plan_unavailable'
  | 'cancel_at_period_end'
  | 'pseudonymised';

export type ReminderReason =
  | 'flag_off'
  | 'dry_run'
  | 'yearly'
  | 'auto_renew_off'
  | 'no_card'
  | 'no_consent'
  | 'above_consent'
  | 'above_non3d_limit'
  | 'plan_changed';

export type RenewalDecision =
  | { eligible: false; reason: RenewalIneligibleReason }
  | { eligible: true; mode: 'auto'; amountMinor: number }
  | { eligible: true; mode: 'reminder'; amountMinor: number; modeReason: ReminderReason };

/**
 * Whether (and how) a subscription renews. The amount is always the DB plan
 * price at evaluation time; `dry_run` is the last reminder reason, so a dry
 * run reports exactly the renewals that would otherwise be charged.
 */
export function evaluateRenewal(input: RenewalEvalInput): RenewalDecision {
  const { flags, sub, user, plan, consent, boundCard } = input;
  if (sub.source !== 'paynkolay') return { eligible: false, reason: 'not_card_subscription' };
  if (user.userId.startsWith('del_')) return { eligible: false, reason: 'pseudonymised' };
  if (sub.status !== 'active' && sub.status !== 'past_due') return { eligible: false, reason: 'subscription_inactive' };
  if (sub.cancelAtPeriodEnd) return { eligible: false, reason: 'cancel_at_period_end' };
  if (!user.isActive || user.deactivatedAt || user.scheduledDeletionAt) return { eligible: false, reason: 'account_blocked' };
  if (!plan || !plan.isActive || plan.amountMinor == null || !(plan.amountMinor > 0)) {
    return { eligible: false, reason: 'plan_unavailable' };
  }
  const amountMinor = plan.amountMinor;
  const reminder = (modeReason: ReminderReason): RenewalDecision => ({ eligible: true, mode: 'reminder', amountMinor, modeReason });

  if (!flags.autoCharge) return reminder('flag_off');
  if (sub.billingCycle !== 'monthly') return reminder('yearly');
  if (!sub.autoRenew) return reminder('auto_renew_off');
  if (!consent) return reminder('no_consent');
  if (consent.subscriptionPlanId !== sub.subscriptionPlanId || (consent.billingCycle ?? 'monthly') !== sub.billingCycle) {
    return reminder('plan_changed');
  }
  if (!boundCard) return reminder('no_card');
  if (consent.amountMinor == null || amountMinor > consent.amountMinor) return reminder('above_consent');
  if (flags.non3dLimitMinor == null || amountMinor > flags.non3dLimitMinor) return reminder('above_non3d_limit');
  if (flags.dryRun) return reminder('dry_run');
  return { eligible: true, mode: 'auto', amountMinor };
}

/** Confirm backoff after a PaymentList error: 15 min × 2^attempts, at most 6 h. */
export function confirmBackoffMs(confirmAttempts: number): number {
  const n = Math.max(0, Math.min(20, Math.trunc(confirmAttempts)));
  return Math.min(RENEWAL_POLICY.confirmBackoffBaseMs * 2 ** n, RENEWAL_POLICY.confirmBackoffMaxMs);
}

/** Tombstone retry backoff: 1 h, 6 h, 24 h, then daily. */
export function tombstoneBackoffMs(attempts: number): number {
  if (attempts <= 1) return HOUR_MS;
  if (attempts === 2) return 6 * HOUR_MS;
  return DAY_MS;
}
