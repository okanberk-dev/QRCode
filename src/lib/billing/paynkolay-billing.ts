import { Prisma, type PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { applyPlanModulesForOwner } from '@/lib/plan-modules';
import type { PaymentDecision } from '@/lib/payment/paynkolay';
import { getBillingSettings } from './billing-settings';
import { billingLog, safeError } from './redact';
import {
  addPeriod,
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
  now: () => Date;
  capture: (message: string, fingerprint: string, extra?: Record<string, string | number>) => void;
  applyPlanModules: (userId: string) => Promise<unknown>;
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
  if (backfillDone === undefined) {
    try {
      backfillDone = (await getBillingSettings())?.referenceBackfillDoneAt != null;
    } catch {
      backfillDone = false;
    }
  }
  return {
    db: overrides.db ?? prisma,
    hmac: overrides.hmac !== undefined ? overrides.hmac : loadHmacOrNull(),
    backfillDone,
    now: overrides.now ?? (() => new Date()),
    capture: overrides.capture ?? defaultCapture,
    applyPlanModules: overrides.applyPlanModules ?? applyPlanModulesForOwner,
  };
}

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

    // 1. The payment (explicit select).
    const payment = await tx.billingPayment.findUnique({ where: { id: paymentId }, select: PAYMENT_SELECT });
    if (!payment || payment.status === 'succeeded' || payment.status === 'needs_review') return already;

    const review = async (reason: string, refundReason: string, alert: Alert): Promise<SettleOutcome> => {
      const res = await tx.billingPayment.updateMany({
        where: { id: paymentId, status: { in: ['pending', 'failed'] } },
        data: { status: 'needs_review', failureReason: reason, completedAt: now, refundState: 'required', refundReason },
      });
      if (res.count === 0) return already;
      alerts.push(alert);
      return { result: 'review', alerts, userId: payment.userId, periodGranted: false };
    };

    // 2. Pseudonymised owner (erased account): money received, nothing to grant.
    if (payment.userId.startsWith('del_')) {
      return review('erased_user', 'erased_user', {
        message: 'billing: a payment of an erased account succeeded; refund required',
        fingerprint: 'billing-refund-required',
        extra: { paymentId },
      });
    }

    // 3. Reference guard: a REFERENCE_CODE already used by another payment is never accepted twice.
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

    // 4. Claim (failed allowed: a late success; needs_review never).
    const claimed = await tx.billingPayment.updateMany({
      where: { id: paymentId, status: { in: ['pending', 'failed'] } },
      data: { status: 'succeeded', completedAt: now, referenceCode: rf, failureReason: null },
    });
    if (claimed.count === 0) return already;

    // 5. Serialise on the subscription row: two settles (or a settle and the expiry) never interleave.
    await tx.$queryRaw`SELECT "user_id" FROM "billing_subscriptions" WHERE "user_id" = ${payment.userId} FOR UPDATE`;
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
    const samePlan =
      !!current &&
      current.subscriptionPlanId === payment.subscriptionPlanId &&
      (current.billingCycle ?? cycle) === cycle;
    const amountMajor = payment.amountMinor / 100;
    let result: SettleResult = 'succeeded';
    let period: { renewsAt: Date; anchorDay: number } | null = null;
    let refundReason: string | null = null;

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
      const anchorDay = current.billingAnchorDay ?? istanbulDayOfMonth(renewal.periodEnd);
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
        const anchorDay = current.billingAnchorDay ?? istanbulDayOfMonth(current.renewsAt);
        const renewsAt = addPeriod(cycle, current.renewsAt, anchorDay);
        period = renewsAt.getTime() > now.getTime() ? { renewsAt, anchorDay } : nextPeriod(cycle, null, now);
      } else if (samePlan && current?.status === 'active') {
        period = nextPeriod(cycle, current.renewsAt, now, current.billingAnchorDay);
      } else {
        // New or changed plan: restart from now with a fresh anchor day.
        period = nextPeriod(cycle, null, now);
      }
    }

    // 8. PayNKolay charged this clientRefCode more than once.
    if (decision.kind === 'duplicate') {
      refundReason = refundReason ?? 'provider_duplicate';
      alerts.push({
        message: 'billing: PayNKolay reports more than one successful sale for one payment',
        fingerprint: 'billing-duplicate-charge',
        extra: { paymentId, successCount: decision.successCount },
      });
    }
    if (refundReason) {
      await tx.billingPayment.update({
        where: { id: paymentId },
        data: { refundState: 'required', refundReason: refundReason.slice(0, 32) },
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
      await tx.billingSubscription.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, ...common, cancelAtPeriodEnd: false },
        // autoRenew is never set here; cancelAtPeriodEnd is reset only by an owner-initiated payment.
        update: { ...common, trialEndsAt: null, ...(ownerKind ? { cancelAtPeriodEnd: false } : {}) },
        select: { userId: true },
      });
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
 * 'late_success' | 'review'.
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
    // A concurrent first-time subscription insert: retry the whole transaction once.
    if (!isUniqueViolation(err)) throw err;
    outcome = await settleOnce(paymentId, decision, deps);
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
}

/**
 * Best-effort effects after a successful settle (billing spec §11.2). Logs
 * only ids. Card reconciliation after a save arrives with saved cards; here:
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
      select: { userId: true, kind: true, status: true, subscriptionPlanId: true, billingCycle: true, autoRenewConsentId: true },
    });
    if (!payment || payment.status !== 'succeeded' || payment.userId.startsWith('del_')) return;
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
        await deps.store.disableAutoRenew(payment.userId, 'plan_changed', 'system', now);
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
