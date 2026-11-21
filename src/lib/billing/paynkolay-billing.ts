import { Prisma, type PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { applyPlanModulesForOwner } from '@/lib/plan-modules';
import type { PaymentDecision } from '@/lib/payment/paynkolay';
import { getBillingSettings } from './billing-settings';
import { hostedPaymentEnvCheck } from './flags';
import { billingLog, safeError } from './redact';
import {
  addPeriod,
  anchorFits,
  canTransition,
  IN_FLIGHT_STATES,
  isRenewalState,
  istanbulDayOfMonth,
  istanbulYearMonth,
  RENEWAL_POLICY,
  statesThatCanReach,
  TERMINAL_STATES,
} from './renewal-policy';
import type { RenewalStore } from './renewal-store';
import { loadHmacKeys, referenceFingerprint, referenceFingerprints, type HmacKeys } from './vault-crypto';

/**
 * Subscription side of a PayNKolay payment (CLAUDE.md §44, billing spec §11).
 * Each payment buys one period (a month or a year). Periods are computed in
 * the Europe/Istanbul calendar and anchored to a day of month, settlement is
 * idempotent and serialised on the subscription row (`FOR UPDATE`), and a
 * lapsed period moves the account to the free plan unless a payment for it is
 * in flight or a consented renewal still has grace.
 */

export type BillingCycle = 'monthly' | 'yearly';

const DAY_MS = 24 * 60 * 60_000;
const OWNER_KINDS = new Set(['checkout', 'renewal_link']);
const CONSENT_IP_RETENTION_MS = 540 * DAY_MS;

/**
 * End of the next paid period. Extends an active period instead of
 * overlapping it. The anchor day applies only when the period continues from
 * `currentEnd`; a period that restarts from `now` anchors to today.
 */
export function nextPeriod(
  cycle: BillingCycle,
  currentEnd: Date | null,
  now: Date = new Date(),
  anchorDay?: number | null,
): { renewsAt: Date; anchorDay: number } {
  if (currentEnd && currentEnd.getTime() > now.getTime()) {
    const anchor = anchorDay ?? istanbulDayOfMonth(currentEnd);
    return { renewsAt: addPeriod(cycle, currentEnd, anchor), anchorDay: anchor };
  }
  const anchor = istanbulDayOfMonth(now);
  return { renewsAt: addPeriod(cycle, now, anchor), anchorDay: anchor };
}

/** End of the paid period (Istanbul calendar, month-end safe). */
export function nextPeriodEnd(
  cycle: BillingCycle,
  currentEnd: Date | null,
  now: Date = new Date(),
  anchorDay?: number | null,
): Date {
  return nextPeriod(cycle, currentEnd, now, anchorDay).renewsAt;
}

/** `PNK-YYYYMM-XXXXXXXX`, month in Europe/Istanbul. Existing numbers are never rewritten. */
export function invoiceNumberFor(paymentId: string, at: Date): string {
  return `PNK-${istanbulYearMonth(at)}-${paymentId.slice(-8).toUpperCase()}`;
}

// ── Settlement (§11.2) ─────────────────────────────────────────────────────

export type SettleResult = 'succeeded' | 'already' | 'duplicate_period' | 'refund_pending' | 'late_success' | 'review';
export type SettleDecision = Extract<PaymentDecision, { kind: 'succeeded' | 'duplicate' }>;

export interface SettleDeps {
  db: PrismaClient;
  /** BILLING_HMAC_KEY set; null → references are not stored (`paynkolay:<id>` on the invoice). */
  hmac: HmacKeys | null;
  /** billing_settings.referenceBackfillDoneAt is set: no raw reference can exist any more. */
  backfillDone: boolean;
  /** The billing_settings binding row (D18); null = not bound yet (gate G0). */
  binding: { providerEnv: string } | null;
  now: () => Date;
  capture: (message: string, fingerprint: string, extra?: Record<string, string | number>) => void;
  applyPlanModules: (userId: string) => Promise<unknown>;
}

/** Thrown before any write when a payment of the other PayNKolay environment reaches settle (D18). */
export class BillingEnvMismatchError extends Error {
  constructor(readonly reason: string) {
    super('billing environment mismatch');
    this.name = 'BillingEnvMismatchError';
  }
}

function defaultCapture(message: string, fingerprint: string, extra?: Record<string, string | number>): void {
  Sentry.captureMessage(message, { level: 'error', fingerprint: [fingerprint], tags: { billing: 'settle' }, extra });
}

function loadHmacOrNull(): HmacKeys | null {
  try {
    return loadHmacKeys();
  } catch {
    return null;
  }
}

export async function defaultSettleDeps(overrides: Partial<SettleDeps> = {}): Promise<SettleDeps> {
  let backfillDone = overrides.backfillDone;
  let binding = overrides.binding;
  if (backfillDone === undefined || binding === undefined) {
    let settings: Awaited<ReturnType<typeof getBillingSettings>> = null;
    try {
      settings = await getBillingSettings();
    } catch {
      settings = null;
    }
    if (backfillDone === undefined) backfillDone = settings?.referenceBackfillDoneAt != null;
    if (binding === undefined) binding = settings ? { providerEnv: settings.providerEnv } : null;
  }
  return {
    db: overrides.db ?? prisma,
    hmac: overrides.hmac !== undefined ? overrides.hmac : loadHmacOrNull(),
    backfillDone,
    binding,
    now: overrides.now ?? (() => new Date()),
    capture: overrides.capture ?? defaultCapture,
    applyPlanModules: overrides.applyPlanModules ?? applyPlanModulesForOwner,
  };
}

/**
 * The anchor day for the next period after `periodEnd`: the stored one while it
 * still fits `periodEnd` (§11.1), else the Istanbul day of `periodEnd` itself.
 * A stored anchor stops fitting when the period end was moved by an admin edit;
 * using it then would shorten (or lengthen) a full paid period.
 */
function anchorFor(storedAnchor: number | null, periodEnd: Date): number {
  return storedAnchor != null && anchorFits(storedAnchor, periodEnd) ? storedAnchor : istanbulDayOfMonth(periodEnd);
}

// One Sentry report per process for references that arrive while BILLING_HMAC_KEY is unavailable.
let hmacMissingReported = false;

interface Alert {
  message: string;
  fingerprint: string;
  extra?: Record<string, string | number>;
}

interface SettleOutcome {
  result: SettleResult;
  alerts: Alert[];
  userId: string | null;
  periodGranted: boolean;
}

const PAYMENT_SELECT = {
  id: true,
  userId: true,
  kind: true,
  status: true,
  renewalId: true,
  autoRenewConsentId: true,
  refundOnSuccess: true,
  refundReason: true,
  refundState: true,
  providerEnv: true,
  subscriptionPlanId: true,
  billingCycle: true,
  amountMinor: true,
} as const;

const RENEWAL_CONTEXT_SELECT = { id: true, state: true, periodEnd: true, succeededPaymentId: true } as const;

async function settleOnce(paymentId: string, decision: SettleDecision, deps: SettleDeps): Promise<SettleOutcome> {
  return deps.db.$transaction(async (tx) => {
    const now = deps.now();
    const alerts: Alert[] = [];
    const already: SettleOutcome = { result: 'already', alerts, userId: null, periodGranted: false };

    // 1. The payment (explicit select). Only the owner, status and environment are used before the claim: the
    //    rest is read again after it, under the locks (an opt-out may have changed it in between).
    const seen = await tx.billingPayment.findUnique({
      where: { id: paymentId },
      select: { userId: true, status: true, providerEnv: true },
    });
    if (!seen || seen.status === 'succeeded' || seen.status === 'needs_review') return already;

    // D18 backstop: a payment of the other PayNKolay environment is never settled here (nothing is written).
    const envCheck = hostedPaymentEnvCheck(seen.providerEnv, deps.binding, process.env);
    if (!envCheck.ok) throw new BillingEnvMismatchError(envCheck.reason);

    const review = async (reason: string, refundReason: string, alert: Alert): Promise<SettleOutcome> => {
      const res = await tx.billingPayment.updateMany({
        where: { id: paymentId, status: { in: ['pending', 'failed'] } },
        data: { status: 'needs_review', failureReason: reason, completedAt: now, refundState: 'required', refundReason },
      });
      if (res.count === 0) return already;
      alerts.push(alert);
      return { result: 'review', alerts, userId: seen.userId, periodGranted: false };
    };

    // 2. Pseudonymised owner (erased account): money received, nothing to grant.
    if (seen.userId.startsWith('del_')) {
      return review('erased_user', 'erased_user', {
        message: 'billing: a payment of an erased account succeeded; refund required',
        fingerprint: 'billing-refund-required',
        extra: { paymentId },
      });
    }

    // 3. Serialise on the subscription row BEFORE touching the payment row: the same lock order as
    //    disableAutoRenew and the expiry (subscription → payment). Two settles (or a settle and the expiry, or an
    //    opt-out) never interleave, can never deadlock, and an opt-out that committed while we waited is seen
    //    by the claim below. When the row does not exist yet nothing is locked; the create below then fails
    //    with P2002 for the loser of a concurrent first settle and the whole transaction is retried.
    await tx.$queryRaw`SELECT "user_id" FROM "billing_subscriptions" WHERE "user_id" = ${seen.userId} FOR UPDATE`;

    // 4. Reference guard: a REFERENCE_CODE already used by another payment is never accepted twice.
    const rawRef = decision.referenceCode?.trim() || null;
    const rf = rawRef && deps.hmac ? referenceFingerprint(rawRef, deps.hmac) : null;
    if (rawRef) {
      const candidates = deps.hmac ? referenceFingerprints(rawRef, deps.hmac) : [];
      // Until the back-fill has run, an old row may still hold the raw value.
      if (!deps.backfillDone) candidates.push(rawRef);
      if (candidates.length > 0) {
        const reusedPayment = await tx.billingPayment.findFirst({
          where: { referenceCode: { in: candidates }, id: { not: paymentId } },
          select: { id: true },
        });
        const reusedInvoice = reusedPayment
          ? null
          : await tx.billingInvoice.findFirst({ where: { providerRef: { in: candidates } }, select: { id: true } });
        if (reusedPayment || reusedInvoice) {
          return review('reference_reused', 'reference_reused', {
            message: 'billing: PayNKolay reference already used by another payment',
            fingerprint: 'billing-reference-reused',
            extra: { paymentId },
          });
        }
      }
    }

    // 5. Claim (failed allowed: a late success; needs_review never), then re-read the payment under its row lock:
    //    refundOnSuccess / refundReason are the values committed by any opt-out that ran before our lock.
    const claimed = await tx.billingPayment.updateMany({
      where: { id: paymentId, status: { in: ['pending', 'failed'] } },
      data: { status: 'succeeded', completedAt: now, referenceCode: rf, failureReason: null },
    });
    if (claimed.count === 0) return already;
    const payment = await tx.billingPayment.findUnique({ where: { id: paymentId }, select: PAYMENT_SELECT });
    if (!payment) return already;
    if (payment.userId !== seen.userId) {
      // The account was erased (its payments pseudonymised) between the first read and the claim.
      await tx.billingPayment.update({
        where: { id: paymentId },
        data: { status: 'needs_review', failureReason: 'erased_user', refundState: 'required', refundReason: 'erased_user' },
        select: { id: true },
      });
      alerts.push({ message: 'billing: a payment of an erased account succeeded; refund required', fingerprint: 'billing-refund-required', extra: { paymentId } });
      return { result: 'review', alerts, userId: payment.userId, periodGranted: false };
    }

    const current = await tx.billingSubscription.findUnique({
      where: { userId: payment.userId },
      select: { renewsAt: true, status: true, subscriptionPlanId: true, billingCycle: true, billingAnchorDay: true },
    });

    // 6. Renewal context.
    const renewal = payment.renewalId
      ? await tx.billingRenewal.findUnique({ where: { id: payment.renewalId }, select: RENEWAL_CONTEXT_SELECT })
      : await tx.billingRenewal.findFirst({ where: { ownerPaymentId: paymentId }, select: RENEWAL_CONTEXT_SELECT });
    const renewalState = renewal && isRenewalState(renewal.state) ? renewal.state : null;

    const cycle: BillingCycle = payment.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const samePlanId = !!current && current.subscriptionPlanId === payment.subscriptionPlanId;
    const sameCycle = !!current && (current.billingCycle ?? cycle) === cycle;
    const samePlan = samePlanId && sameCycle;
    const amountMajor = payment.amountMinor / 100;
    let result: SettleResult = 'succeeded';
    let period: { renewsAt: Date; anchorDay: number } | null = null;
    let refundReason: string | null = null;
    let refundAmountMinor: number | null = null;

    const activeAndPaidAhead = current?.status === 'active' && !!current.renewsAt && current.renewsAt.getTime() > now.getTime();

    // 7. Exactly one of a–e.
    if (payment.refundOnSuccess) {
      // a. The owner opted out (or removed the card / asked for deletion) while this charge was in flight.
      result = 'refund_pending';
      refundReason = payment.refundReason ?? 'owner_opt_out';
      if (renewal && (renewalState === 'awaiting_confirmation' || renewalState === 'manual_review')) {
        await tx.billingRenewal.updateMany({
          where: { id: renewal.id, state: { in: ['awaiting_confirmation', 'manual_review'] } },
          data: { state: 'needs_action', mode: 'reminder', modeReason: 'auto_renew_off', nextAttemptAt: null, lockedUntil: null },
        });
      }
    } else if (renewal && (renewalState === 'succeeded' || (renewal.succeededPaymentId && renewal.succeededPaymentId !== paymentId))) {
      // b. The period was already paid by another payment: never stacked (D19).
      result = 'duplicate_period';
      refundReason = 'duplicate_period';
      alerts.push({ message: 'billing: second payment for an already paid period', fingerprint: 'billing-duplicate-charge', extra: { paymentId } });
    } else if (
      renewal &&
      renewalState &&
      canTransition(renewalState, 'succeeded') &&
      current?.renewsAt &&
      current.renewsAt.getTime() === renewal.periodEnd.getTime() &&
      samePlan
    ) {
      // c. Renewal payment: anchored to E, even when paid during grace.
      const anchorDay = anchorFor(current.billingAnchorDay, renewal.periodEnd);
      period = { renewsAt: addPeriod(cycle, renewal.periodEnd, anchorDay), anchorDay };
      await tx.billingRenewal.updateMany({
        where: { id: renewal.id, state: { in: statesThatCanReach('succeeded') } },
        data: {
          state: 'succeeded',
          succeededPaymentId: paymentId,
          endedAt: now,
          endReason: 'paid',
          lockedUntil: null,
          ownerPaymentId: null,
          ownerPrevState: null,
        },
      });
    } else if (renewal && payment.kind === 'renewal_auto' && (renewalState === 'lapsed' || renewalState === 'canceled')) {
      if (activeAndPaidAhead) {
        // The owner has paid again in the meantime: keep their period, refund this charge.
        result = 'duplicate_period';
        refundReason = 'duplicate_period';
        alerts.push({ message: 'billing: late automatic charge for a period already paid', fingerprint: 'billing-duplicate-charge', extra: { paymentId } });
      } else {
        // d. Late success after a lapse: reactivate from now (not from E).
        result = 'late_success';
        period = nextPeriod(cycle, null, now);
        alerts.push({ message: 'billing: automatic charge succeeded after the renewal ended', fingerprint: 'billing-late-success', extra: { paymentId } });
      }
    } else {
      // e. Plain checkout.
      const recentlyLapsed =
        current?.status === 'canceled' &&
        !!current.renewsAt &&
        current.renewsAt.getTime() >= now.getTime() - RENEWAL_POLICY.anchorAfterLapseDays * DAY_MS;
      if (samePlan && current?.renewsAt && (current.status === 'past_due' || recentlyLapsed)) {
        // Grace days are paid for: the new period starts at the old period end (E-17).
        const anchorDay = anchorFor(current.billingAnchorDay, current.renewsAt);
        const renewsAt = addPeriod(cycle, current.renewsAt, anchorDay);
        period = renewsAt.getTime() > now.getTime() ? { renewsAt, anchorDay } : nextPeriod(cycle, null, now);
      } else if (samePlanId && current?.status === 'active') {
        // Same plan, active: stacking as before (§11.2 e), whatever the cycle — the days already paid for are
        // never lost. A cycle change re-anchors to the current period end (§11.1).
        const anchor = current.renewsAt && sameCycle ? anchorFor(current.billingAnchorDay, current.renewsAt) : null;
        period = nextPeriod(cycle, current.renewsAt, now, anchor);
      } else {
        // New or changed plan: restart from now with a fresh anchor day.
        period = nextPeriod(cycle, null, now);
      }
      // The owner paid (another plan or cycle) while holding an open renewal of the old period (D19,
      // checkout of any intent): that renewal is resolved by this payment. Without this it would stay
      // owner_paying (never superseded, never lapsed) and keep deferring an account deletion.
      if (renewal && renewalState === 'owner_paying' && canTransition('owner_paying', 'succeeded')) {
        await tx.billingRenewal.updateMany({
          where: { id: renewal.id, state: 'owner_paying', ownerPaymentId: paymentId },
          data: {
            state: 'succeeded',
            succeededPaymentId: paymentId,
            endedAt: now,
            endReason: 'replaced',
            lockedUntil: null,
            ownerPaymentId: null,
            ownerPrevState: null,
          },
        });
      }
    }

    // 8. PayNKolay charged this clientRefCode more than once. The queue records what must go back: the extra
    //    charges when this payment is kept, every charge when this payment itself is refunded (a–d above).
    if (decision.kind === 'duplicate') {
      const charges = Math.max(2, Math.trunc(decision.successCount) || 2);
      if (refundReason) {
        refundAmountMinor = payment.amountMinor * charges;
      } else {
        refundReason = 'provider_duplicate';
        refundAmountMinor = payment.amountMinor * (charges - 1);
      }
      alerts.push({
        message: 'billing: PayNKolay reports more than one successful sale for one payment',
        fingerprint: 'billing-duplicate-charge',
        extra: { paymentId, successCount: decision.successCount },
      });
    }
    if (refundReason) {
      await tx.billingPayment.update({
        where: { id: paymentId },
        data: { refundState: 'required', refundReason: refundReason.slice(0, 32), refundAmountMinor },
        select: { id: true },
      });
    }

    if (period) {
      const ownerKind = OWNER_KINDS.has(payment.kind);
      const common = {
        plan: cycle,
        status: 'active',
        renewsAt: period.renewsAt,
        subscriptionPlanId: payment.subscriptionPlanId,
        billingCycle: cycle,
        amount: amountMajor,
        currency: 'TRY',
        source: 'paynkolay',
        billingAnchorDay: period.anchorDay,
      };
      if (current) {
        // The row is locked FOR UPDATE above. autoRenew is never set here; cancelAtPeriodEnd is reset only by an
        // owner-initiated payment.
        await tx.billingSubscription.update({
          where: { userId: payment.userId },
          data: { ...common, trialEndsAt: null, ...(ownerKind ? { cancelAtPeriodEnd: false } : {}) },
          select: { userId: true },
        });
      } else {
        // A plain INSERT, never an upsert: Prisma runs upsert as INSERT … ON CONFLICT DO UPDATE, which would let a
        // concurrent first settle silently overwrite this one (two payments, one period). The INSERT instead
        // fails with P2002 for the loser, and settlePaynkolayPayment retries it against the winner's locked row.
        await tx.billingSubscription.create({
          data: { userId: payment.userId, ...common, cancelAtPeriodEnd: false },
          select: { userId: true },
        });
      }
      // `User.plan` drives the trial gate and quotas (§15.2).
      await tx.user.update({ where: { id: payment.userId }, data: { plan: cycle }, select: { id: true } });
    }

    // 9. Invoice: money was received in every branch.
    await tx.billingInvoice.create({
      data: {
        userId: payment.userId,
        invoiceNumber: invoiceNumberFor(paymentId, now),
        amount: amountMajor,
        currency: 'TRY',
        status: 'paid',
        providerRef: rf ?? `paynkolay:${paymentId}`,
        description:
          payment.kind === 'renewal_auto'
            ? 'Aylık abonelik · otomatik yenileme · PayNKolay'
            : cycle === 'yearly'
              ? 'Yıllık abonelik · PayNKolay'
              : 'Aylık abonelik · PayNKolay',
        source: 'paynkolay',
      },
      select: { id: true },
    });

    return { result, alerts, userId: payment.userId, periodGranted: period !== null };
  });
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * Records a PaymentList success for a payment (billing spec §11.2).
 * Idempotent: the payment is claimed with `status IN ('pending','failed')`,
 * so a replayed return, the engine and a concurrent return settle it once.
 * Results: 'succeeded' | 'already' | 'duplicate_period' | 'refund_pending' |
 * 'late_success' | 'review'. Throws BillingEnvMismatchError, before any
 * write, for a payment of the other PayNKolay environment (D18).
 */
export async function settlePaynkolayPayment(
  paymentId: string,
  decision: SettleDecision,
  overrides: Partial<SettleDeps> = {},
): Promise<SettleResult> {
  const deps = await defaultSettleDeps(overrides);
  let outcome: SettleOutcome;
  try {
    outcome = await settleOnce(paymentId, decision, deps);
  } catch (err) {
    // A concurrent first-time subscription insert (or the same reference claimed by two payments at once):
    // retry the whole transaction once. The winner's row now exists, so the retry is serialised on it.
    if (!isUniqueViolation(err)) throw err;
    outcome = await settleOnce(paymentId, decision, deps);
  }
  if (decision.referenceCode?.trim() && !deps.hmac && !hmacMissingReported) {
    // The reference was not fingerprinted, so the reuse guard cannot see it later (§11.2 step 3).
    hmacMissingReported = true;
    deps.capture('billing: BILLING_HMAC_KEY unavailable at settle; reference fingerprints are not stored', 'billing-vault-key', { paymentId });
  }
  for (const alert of outcome.alerts) deps.capture(alert.message, alert.fingerprint, alert.extra);
  if (outcome.alerts.length > 0) billingLog('warn', 'settle.alert', { paymentId, reason: outcome.alerts[0].fingerprint });
  if (outcome.periodGranted && outcome.userId) {
    // Plan modules follow the paid plan; a failure here must not undo the payment.
    try {
      await deps.applyPlanModules(outcome.userId);
    } catch (err) {
      billingLog('error', 'settle.plan_modules_failed', { paymentId, code: err instanceof Error ? err.name : 'unknown' });
    }
  }
  return outcome.result;
}

// ── Post-settle effects ────────────────────────────────────────────────────

export interface PostSettleDeps {
  db: PrismaClient;
  store: Pick<RenewalStore, 'disableAutoRenew'>;
  now: () => Date;
  /**
   * Saved cards (billing spec §11.2): confirms the card a `saveCard` payment
   * stored (`reconcileCardsAfterSave`). Absent or failing → the payment keeps
   * `cardSaveResult = 'pending'` and the renewal engine retries.
   */
  reconcileCards?: (paymentId: string) => Promise<unknown>;
  /** §13.4 `off_plan_changed`: the owner is told a checkout for another plan ended the instruction. */
  mailAutoRenewOff?: (userId: string, variant: 'off_plan_changed') => Promise<boolean>;
}

/**
 * Best-effort effects after a successful settle (billing spec §11.2). Logs
 * only ids:
 *  - a payment that asked to save the card: confirm the saved card
 *    (`reconcileCards`, verified by PayNKolay's list, D1);
 *  - a checkout for another plan/cycle than the active auto-renew consent
 *    (without a new consent) turns auto-renew off (`plan_changed`);
 *  - open renewals of another period are superseded;
 *  - the owner's consent IP retention is extended to ≥ now + 540 days.
 */
export async function applyPostSettleEffects(paymentId: string, deps: PostSettleDeps): Promise<void> {
  const { db } = deps;
  const now = deps.now();
  try {
    const payment = await db.billingPayment.findUnique({
      where: { id: paymentId },
      select: {
        userId: true,
        kind: true,
        status: true,
        subscriptionPlanId: true,
        billingCycle: true,
        autoRenewConsentId: true,
        saveCard: true,
        cardSaveResult: true,
      },
    });
    if (!payment || payment.status !== 'succeeded' || payment.userId.startsWith('del_')) return;

    if (payment.saveCard && payment.cardSaveResult === 'pending' && deps.reconcileCards) {
      try {
        await deps.reconcileCards(paymentId);
      } catch (err) {
        billingLog('warn', 'settle.card_reconcile_failed', { paymentId, code: err instanceof Error ? err.name : 'unknown' });
      }
    }
    const sub = await db.billingSubscription.findUnique({
      where: { userId: payment.userId },
      select: { autoRenew: true, autoRenewConsentId: true, renewsAt: true },
    });

    if (sub?.autoRenew && sub.autoRenewConsentId && OWNER_KINDS.has(payment.kind) && !payment.autoRenewConsentId) {
      const consent = await db.billingConsent.findUnique({
        where: { id: sub.autoRenewConsentId },
        select: { subscriptionPlanId: true, billingCycle: true },
      });
      if (consent && (consent.subscriptionPlanId !== payment.subscriptionPlanId || consent.billingCycle !== payment.billingCycle)) {
        const off = await deps.store.disableAutoRenew(payment.userId, 'plan_changed', 'system', now);
        if (off.changed && deps.mailAutoRenewOff) {
          try {
            await deps.mailAutoRenewOff(payment.userId, 'off_plan_changed');
          } catch (err) {
            billingLog('warn', 'settle.plan_changed_mail_failed', { paymentId, code: err instanceof Error ? err.name : 'unknown' });
          }
        }
      }
    }

    if (sub?.renewsAt) {
      await db.billingRenewal.updateMany({
        where: {
          userId: payment.userId,
          periodEnd: { not: sub.renewsAt },
          state: { in: statesThatCanReach('canceled').filter((s) => !IN_FLIGHT_STATES.has(s)) },
        },
        data: { state: 'canceled', endedAt: now, endReason: 'superseded', nextAttemptAt: null },
      });
    }

    const keepUntil = new Date(now.getTime() + CONSENT_IP_RETENTION_MS);
    await db.billingConsent.updateMany({
      where: { userId: payment.userId, ipTruncatedAt: null, OR: [{ ipPurgeAfter: null }, { ipPurgeAfter: { lt: keepUntil } }] },
      data: { ipPurgeAfter: keepUntil },
    });
  } catch (err) {
    billingLog('error', 'settle.post_effects_failed', { paymentId, code: err instanceof Error ? err.name : 'unknown' });
    Sentry.captureException(safeError(err, 'post_settle'), { tags: { billing: 'settle' } });
  }
}

// ── Expiry (§11.3) ─────────────────────────────────────────────────────────

/**
 * Lapsed card periods (status active or past_due, renewsAt < now) become
 * 'expired'; the dashboard layout then sends the owner to /pricing until they
 * pay again. A period is NOT expired while a payment for it is in flight
 * (owner_paying, charging, awaiting_confirmation) or while a consented
 * renewal still has grace (graceEndsAt > now). Serialised with settlement on
 * the subscription row, so a payment that settles at the same moment always
 * wins. Idempotent; run by the renewal engine and the daily lifecycle cron.
 */
export async function expireLapsedPaynkolayPeriods(now: Date = new Date(), db: PrismaClient = prisma): Promise<number> {
  const lapsed = await db.billingSubscription.findMany({
    where: { source: 'paynkolay', status: { in: ['active', 'past_due'] }, renewsAt: { lt: now } },
    select: { userId: true, renewsAt: true },
    orderBy: { renewsAt: 'asc' },
    take: 500,
  });
  let expired = 0;
  for (const row of lapsed) {
    if (!row.renewsAt) continue;
    const periodEnd = row.renewsAt;
    const done = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "user_id" FROM "billing_subscriptions" WHERE "user_id" = ${row.userId} FOR UPDATE`;
      const renewal = await tx.billingRenewal.findFirst({
        where: { userId: row.userId, periodEnd },
        select: { id: true, state: true, graceEndsAt: true },
      });
      const state = renewal && isRenewalState(renewal.state) ? renewal.state : null;
      if (state && IN_FLIGHT_STATES.has(state)) return false;
      if (state && !TERMINAL_STATES.has(state) && renewal?.graceEndsAt && renewal.graceEndsAt.getTime() > now.getTime()) return false;
      // Conditional on the period we looked at: a settle that just extended it wins.
      const res = await tx.billingSubscription.updateMany({
        where: { userId: row.userId, source: 'paynkolay', status: { in: ['active', 'past_due'] }, renewsAt: periodEnd },
        data: { status: 'canceled', plan: 'expired' },
      });
      if (res.count === 0) return false;
      await tx.user.updateMany({ where: { id: row.userId }, data: { plan: 'expired' } });
      if (renewal && state && canTransition(state, 'lapsed')) {
        await tx.billingRenewal.updateMany({
          where: { id: renewal.id, state: { in: statesThatCanReach('lapsed') } },
          data: { state: 'lapsed', endedAt: now, endReason: 'expired', nextAttemptAt: null },
        });
      }
      return true;
    });
    if (done) expired += 1;
  }
  return expired;
}
