import { randomBytes } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';
import {
  confirmCharge,
  getPaynkolayConfig,
  PAYMENT_LIST_RANGE_VERIFIED,
  paynkolayAmountToMinor,
  queryPaymentListRange,
  type PaymentDecision,
  type PaynkolayConfig,
} from '@/lib/payment/paynkolay';
import { fetchTransport, type PaynkolayTransport } from '@/lib/payment/paynkolay-transport';
import { billingSettings, type BillingSettingsApi } from './billing-settings';
import { billingMailer } from './billing-mails';
import { loadCardVaultDeps, loadProviderVaultDeps, purgeCardsWithKey, reconcileCardsAfterSave, retryCardCleanup } from './card-vault';
import { loadBillingFlags, type BillingFlags } from './flags';
import {
  applyPostSettleEffects,
  expireLapsedPaynkolayPeriods,
  settlePaynkolayPayment,
  type SettleDecision,
  type SettleResult,
} from './paynkolay-billing';
import { billingLog, safeError } from './redact';
import {
  classifyDecline,
  confirmBackoffMs,
  evaluateRenewal,
  graceEnd,
  inIstanbulWindow,
  istanbulDay,
  istanbulHour,
  RENEWAL_POLICY,
  tombstoneBackoffMs,
  type RenewalState,
} from './renewal-policy';
import type { PaymentToConfirm, RenewalContext, RenewalRow, RenewalStore, StoredPaymentSummary } from './renewal-store';
import { prismaRenewalStore } from './renewal-store-prisma';
import { runRetention, type MailTarget } from './retention';
import { loadVaultKeys, openCustomerKey, VaultKeyError, type VaultKeys } from './vault-crypto';

/**
 * The renewal engine tick (billing spec §9), run hourly by
 * `/api/cron/billing-renewals`.
 *
 * SCOPE: this release contains no charge phase — nothing here charges a
 * card. Renewal means REMINDER MODE: mails that lead the owner to a 3D
 * Secure payment on the hosted page. It runs:
 *   1. reconcile — PaymentList decides every pending payment (settle on
 *      SUCCESS, fail on explicit failure rows, abandoned hosted checkouts
 *      fail after 45 min, unresolved ones go to review after 48 h), stale
 *      charge leases, expired owner_paying locks, a 7-day late-success
 *      re-check of failed payments, unconfirmed card saves and unverified
 *      D1 clean-ups (other cards after a verified save);
 *   2. schedule — a reminder-mode renewal row 7 days before each period end
 *      (consented subscriptions always; others while card storage is
 *      intended, O-2);
 *   3. mails — inside 09:00–21:00 Istanbul only (D10): queued mails
 *      (period ended) and the E−7d / E−1d reminders, each claimed once;
 *   5. lapse — renewal rows past grace, then the subscription expiry (§11.3);
 *   6. erasure tombstones — finish provider card deletions owed by erasures;
 *   7. daily scans — decline ratio, overdue refunds, and (once Q-16 is
 *      verified) the foreign/duplicate transaction scan;
 *   8. retention (§4.4), once per Istanbul day.
 *
 * Single-flighted by the `billing_settings` tick lease (never an advisory
 * lock: the pooler runs in transaction mode). Nothing runs — not even
 * reconciliation — unless the environment binding holds (D18). A failing
 * phase is logged as `{ phase, code }` only and the next phase still runs.
 * No provider call starts after the 240 s budget.
 */

export type SettleFn = (paymentId: string, decision: SettleDecision) => Promise<SettleResult>;

export interface RenewalDeps {
  store: RenewalStore;
  cfg: PaynkolayConfig | null;
  transport: PaynkolayTransport;
  flags: BillingFlags;
  settings: BillingSettingsApi;
  clock: () => Date;
  settle: SettleFn;
  postSettle: (paymentId: string) => Promise<void>;
  expireLapsed: (now: Date) => Promise<number>;
  /** Phase 8 (§4.4); null skips it. */
  retention: ((now: Date) => Promise<unknown>) | null;
  /** Vault keys for erasure tombstones; null skips phase 6. */
  vault: { keys: VaultKeys } | null;
  /** Reminder and period-ended mails (phase 3); absent/null skips phase 3 (claims stay free, queued mails wait). */
  mailer?: RenewalMailer | null;
  /** Absolute site origin for links in mails (SITE_URL). */
  siteUrl?: string;
  /** Saved cards: confirms a payment's unconfirmed card save (reconcileCardsAfterSave); absent skips it. */
  cardSaveReconcile?: ((paymentId: string) => Promise<unknown>) | null;
  /** Saved cards: retries a D1 clean-up (other cards after a verified save) that was not verified; absent skips it. */
  cardCleanup?: ((paymentId: string) => Promise<unknown>) | null;
  captureMessage: (msg: string, fingerprint: string, tags?: Record<string, string>) => void;
  captureException: (err: Error, tags?: Record<string, string>) => void;
  runId: string;
}

export type ReminderVariant = 'reminder_7' | 'reminder_1';

/** Renewal mails of this release (billing-mails.ts). Each returns true only when the mail provider accepted the message. */
export interface RenewalMailer {
  upcoming(
    to: MailTarget,
    v: {
      variant: ReminderVariant;
      planName: string;
      amountMinor: number | null;
      cycle: 'monthly' | 'yearly';
      periodEnd: Date;
      /** The real access end: graceEndsAt for a consented (paused) renewal, else the period end. */
      accessUntil: Date;
      renewUrl: string;
      savedCardLast4: string | null;
    },
  ): Promise<boolean>;
  periodEnded(to: MailTarget, v: { planName: string; pricingUrl: string }): Promise<boolean>;
}

export interface RenewalTickSummary {
  skipped: null | 'config_missing' | 'binding' | 'busy';
  reconciled: number;
  scheduled: number;
  mailed: number;
  charged: number;
  succeeded: number;
  failed: number;
  needsAction: number;
  manualReview: number;
  lapsed: number;
  /** Subscriptions moved to 'expired' by §11.3 during this tick. */
  expired: number;
  tombstonesCleared: number;
  dryRunWouldCharge: number;
  breaker: null | 'open' | 'tripped';
  budgetExhausted: boolean;
  failedPhases: string[];
}

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
const SETTLED: ReadonlySet<SettleResult> = new Set<SettleResult>(['succeeded', 'late_success', 'duplicate_period', 'refund_pending']);
const OPEN_FOR_LAPSE: RenewalState[] = ['scheduled', 'retry_wait', 'needs_action', 'manual_review'];
/** Open states that get reminder mails (an owner payment or a charge in flight gets none). */
const REMINDABLE: RenewalState[] = ['scheduled', 'retry_wait', 'needs_action'];
const ALL_OPEN_AND_ENDED: RenewalState[] = ['scheduled', 'retry_wait', 'needs_action', 'manual_review', 'lapsed', 'canceled', 'succeeded'];
const MAX_SCHEDULE_PER_RUN = 200;
const MAX_MAILS_PER_RUN = 100;
const MAX_CARD_SAVES_PER_RUN = 20;

/** The account can receive billing mails: active, not deactivated, not scheduled for deletion. */
function mailable(ctx: RenewalContext | null): ctx is RenewalContext {
  return !!ctx && ctx.user.isActive && !ctx.user.deactivatedAt && !ctx.user.scheduledDeletionAt && !!ctx.user.email;
}

/** Links in renewal mails: the review page for a renewable plan, else the plan picker in the panel. */
export function renewLinkFor(siteUrl: string, locale: 'tr' | 'en', r: Pick<RenewalRow, 'modeReason'>): string {
  return r.modeReason === 'plan_changed'
    ? `${siteUrl}/${locale}/dashboard/account?section=billing`
    : `${siteUrl}/billing/${locale}/checkout?intent=renew`;
}

function emptySummary(): RenewalTickSummary {
  return {
    skipped: null,
    reconciled: 0,
    scheduled: 0,
    mailed: 0,
    charged: 0,
    succeeded: 0,
    failed: 0,
    needsAction: 0,
    manualReview: 0,
    lapsed: 0,
    expired: 0,
    tombstonesCleared: 0,
    dryRunWouldCharge: 0,
    breaker: null,
    budgetExhausted: false,
    failedPhases: [],
  };
}

function errCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    return String((err as { code: string }).code).replace(/[^A-Za-z0-9_:-]/g, '').slice(0, 40) || 'error';
  }
  return err instanceof Error ? err.name : 'error';
}

// ── Daily transaction scan (pure; runs only once Q-16 is verified) ─────────

export interface ScanFinding {
  fingerprint:
    | 'billing-foreign-transaction'
    | 'billing-foreign-merchant'
    | 'billing-duplicate-charge'
    | 'billing-charged-mismatch'
    | 'billing-non3d-hosted'
    | 'billing-success-unsettled';
  paymentId: string | null;
}

export interface ScanResult {
  findings: ScanFinding[];
  /** Payments with a SUCCESS row that are still pending/failed: run the normal confirm + settle path. */
  toSettle: string[];
  /** Payments PayNKolay charged more than once: refund queue. */
  duplicates: string[];
}

function field(row: Record<string, unknown>, ...names: string[]): string {
  for (const name of names) {
    const value = row[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

/**
 * Compares a day of PaymentList rows with the stored payments (§9 phase 7).
 * Findings carry only payment ids, never row contents.
 */
export function analyzeDailyTransactions(
  rows: Record<string, unknown>[],
  stored: ReadonlyMap<string, StoredPaymentSummary>,
  merchantNo: string,
): ScanResult {
  const findings: ScanFinding[] = [];
  const toSettle = new Set<string>();
  const salesPerRef = new Map<string, number>();
  for (const row of rows) {
    if (field(row, 'STATUS', 'status').toUpperCase() !== 'SUCCESS') continue;
    const ref = field(row, 'CLIENT_REFERENCE_CODE', 'clientRefCode');
    const type = field(row, 'TRANSACTION_TYPE', 'transactionType').toUpperCase();
    const merchant = field(row, 'MERCHANT_NO', 'merchantNo');
    if (merchant && merchantNo && merchant !== merchantNo) findings.push({ fingerprint: 'billing-foreign-merchant', paymentId: null });
    const payment = ref ? stored.get(ref) : undefined;
    if (!payment) {
      findings.push({ fingerprint: 'billing-foreign-transaction', paymentId: null });
      continue;
    }
    if (type !== '' && type !== 'SALES' && type !== 'SALE') continue;
    salesPerRef.set(ref, (salesPerRef.get(ref) ?? 0) + 1);
    const amount = paynkolayAmountToMinor(field(row, 'AUTHORIZATION_AMOUNT', 'authorizationAmount'));
    if (amount !== payment.amountMinor) findings.push({ fingerprint: 'billing-charged-mismatch', paymentId: payment.id });
    const threeD = field(row, 'USE_3D', 'IS_3D', 'use3D');
    if (payment.kind !== 'renewal_auto' && threeD && /^(false|0)$/i.test(threeD)) {
      findings.push({ fingerprint: 'billing-non3d-hosted', paymentId: payment.id });
    }
    if (payment.status === 'pending' || payment.status === 'failed') toSettle.add(payment.id);
    else if (payment.status !== 'succeeded') findings.push({ fingerprint: 'billing-success-unsettled', paymentId: payment.id });
  }
  const duplicates = [...salesPerRef.entries()].filter(([, n]) => n > 1).map(([ref]) => ref);
  for (const id of duplicates) findings.push({ fingerprint: 'billing-duplicate-charge', paymentId: id });
  return { findings, toSettle: [...toSettle], duplicates };
}

// ── The tick ───────────────────────────────────────────────────────────────

export async function runRenewalTick(deps: RenewalDeps): Promise<RenewalTickSummary> {
  const { store, cfg, transport, clock } = deps;
  const summary = emptySummary();
  const start = clock();

  if (!cfg) return { ...summary, skipped: 'config_missing' };
  if (!deps.flags.binding.ok || deps.flags.binding.env !== cfg.env) {
    // PayNKolay is configured but nothing runs — not even reconciliation, so hosted payments stay pending.
    // Say so (a warning, grouped by fingerprint) instead of answering a silent { ok: true }.
    try {
      deps.captureMessage('billing: renewal tick skipped, the PayNKolay environment binding does not hold', 'billing-binding-skipped', {
        reason: deps.flags.binding.reason ?? 'env_mismatch',
      });
    } catch {
      /* reporting never breaks the tick */
    }
    return { ...summary, skipped: 'binding' };
  }
  const env = cfg.env;

  if (!(await deps.settings.acquireTickLease(start, RENEWAL_POLICY.tickLeaseMs, deps.runId))) {
    return { ...summary, skipped: 'busy' };
  }

  const deadline = start.getTime() + RENEWAL_POLICY.tickBudgetMs;
  const providerTime = (): boolean => {
    if (clock().getTime() < deadline) return true;
    summary.budgetExhausted = true;
    return false;
  };
  const capture = (msg: string, fingerprint: string, extra?: Record<string, string>) => {
    try {
      deps.captureMessage(msg, fingerprint, extra);
    } catch {
      /* reporting must never break a phase */
    }
  };

  async function phase(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      summary.failedPhases.push(name);
      billingLog('error', 'renewal.phase_failed', { phase: name, code: err instanceof Error ? err.name : 'unknown', runId: deps.runId });
      try {
        deps.captureException(safeError(err, name), { phase: name });
      } catch {
        /* ignore */
      }
    }
  }

  async function settleAndApply(paymentId: string, decision: SettleDecision): Promise<void> {
    const result = await deps.settle(paymentId, decision);
    if (SETTLED.has(result)) {
      summary.succeeded += 1;
      await deps.postSettle(paymentId);
    }
  }

  /** A payment failed explicitly: release an owner_paying lock; an automatic attempt stops (no retry in this release). */
  async function afterFailure(p: { id: string; renewalId: string | null; kind: string }, code: string | null): Promise<void> {
    const renewal = await store.renewalForPayment(p);
    if (!renewal) return;
    if (renewal.state === 'owner_paying' && renewal.ownerPaymentId === p.id) {
      await store.releaseOwnerPaying(renewal.id, p.id);
      return;
    }
    if (p.kind === 'renewal_auto' && renewal.state === 'awaiting_confirmation') {
      const moved = await store.transition(renewal.id, ['awaiting_confirmation'], {
        state: 'needs_action',
        nextAttemptAt: null,
        lockedUntil: null,
        lastFailureCode: code ? code.slice(0, 40) : 'failed',
        lastFailureKind: classifyDecline(code, null),
      });
      if (moved) summary.needsAction += 1;
    }
  }

  async function unresolved(p: PaymentToConfirm, now: Date): Promise<void> {
    if (now.getTime() - p.createdAt.getTime() < RENEWAL_POLICY.unresolvedAfterMs) return;
    if (p.kind !== 'renewal_auto') {
      if (await store.markPaymentNeedsReview(p.id, 'unresolved', null)) {
        summary.manualReview += 1;
        capture('billing: payment unresolved after 48 h', 'billing-charge-unresolved', { paymentId: p.id });
      }
      const renewal = await store.renewalForPayment(p);
      if (renewal?.state === 'owner_paying' && renewal.ownerPaymentId === p.id) await store.releaseOwnerPaying(renewal.id, p.id);
      return;
    }
    const renewal = await store.renewalForPayment(p);
    if (renewal && renewal.state === 'awaiting_confirmation') {
      const moved = await store.transition(renewal.id, ['awaiting_confirmation'], {
        state: 'manual_review',
        manualReviewAt: now,
        lockedUntil: null,
        pendingMail: 'failed_unresolved',
      });
      if (moved) {
        summary.manualReview += 1;
        capture('billing: automatic charge unresolved after 48 h', 'billing-charge-unresolved', { paymentId: p.id });
      }
    }
  }

  async function applyDecision(p: PaymentToConfirm, decision: PaymentDecision, now: Date): Promise<void> {
    const hosted = p.kind !== 'renewal_auto';
    const age = now.getTime() - p.createdAt.getTime();
    switch (decision.kind) {
      case 'succeeded':
      case 'duplicate':
        await settleAndApply(p.id, decision);
        return;
      case 'charged_mismatch': {
        await store.markPaymentNeedsReview(p.id, `mismatch_${decision.reason}`, 'charged_mismatch');
        capture(
          'billing: PaymentList success does not match the payment',
          hosted && decision.reason === 'not_3d' ? 'billing-non3d-hosted' : 'billing-charged-mismatch',
          { paymentId: p.id, reason: decision.reason },
        );
        const renewal = await store.renewalForPayment(p);
        if (renewal?.state === 'owner_paying' && renewal.ownerPaymentId === p.id) {
          await store.releaseOwnerPaying(renewal.id, p.id);
        } else if (renewal?.state === 'awaiting_confirmation') {
          if (await store.transition(renewal.id, ['awaiting_confirmation'], { state: 'manual_review', manualReviewAt: now, lockedUntil: null })) {
            summary.manualReview += 1;
          }
        }
        return;
      }
      case 'failed':
        if (await store.markPaymentFailed(p.id, decision.reason, now)) {
          summary.failed += 1;
          await afterFailure(p, decision.reason);
        }
        return;
      case 'not_found':
        if (hosted) {
          if (age >= RENEWAL_POLICY.hostedNotFoundFailAfterMs && (await store.markPaymentFailed(p.id, 'no_transaction', now))) {
            summary.failed += 1;
            await afterFailure(p, null);
          }
          return;
        }
        if (p.providerOutcome === 'declined' && age >= RENEWAL_POLICY.declineFailAfterMs) {
          const code = p.providerDeclineCode ?? 'unknown';
          if (await store.markPaymentFailed(p.id, `declined:${code}`, now)) {
            summary.failed += 1;
            await afterFailure(p, code);
          }
          return;
        }
        await unresolved(p, now);
        return;
      case 'indeterminate':
        await unresolved(p, now);
        return;
    }
  }

  try {
    // ── Phase 1: reconcile (provider calls, any hour) ──
    await phase('reconcile', async () => {
      const now = clock();
      // (a) pending payments
      const pending = await store.listPaymentsToConfirm(env, now, RENEWAL_POLICY.maxReconcilesPerRun);
      for (const p of pending) {
        if (!providerTime()) break;
        let decision: PaymentDecision;
        try {
          decision = await confirmCharge(cfg, transport, { clientRefCode: p.id, amountMinor: p.amountMinor, createdAt: p.createdAt, kind: p.kind }, clock());
        } catch (err) {
          // PaymentList could not be asked: not the same as "not charged" (D17).
          await store.deferPaymentConfirm(p.id, new Date(clock().getTime() + confirmBackoffMs(p.confirmAttempts)));
          billingLog('warn', 'renewal.confirm_deferred', { paymentId: p.id, code: errCode(err) });
          continue;
        }
        summary.reconciled += 1;
        await applyDecision(p, decision, clock());
      }

      // (b) stale charge leases: the outcome of a sent charge is unknown, never "not charged".
      const stale = await store.listRenewals({ states: ['charging'], providerEnv: env, lockedBefore: clock() }, RENEWAL_POLICY.maxReconcilesPerRun);
      for (const r of stale) {
        const payments = await store.paymentsForRenewal(r.id);
        const sent = payments.some((p) => p.kind === 'renewal_auto' && p.attemptNo === r.attempts);
        if (sent) {
          await store.transition(r.id, ['charging'], { state: 'awaiting_confirmation', confirmAfter: clock(), lockedUntil: null, leaseId: null });
        } else {
          const attempts = Math.max(0, r.attempts - 1);
          await store.transition(r.id, ['charging'], {
            state: attempts === 0 ? 'scheduled' : 'retry_wait',
            attempts,
            lockedUntil: null,
            leaseId: null,
          });
        }
      }

      // (c) owner_paying locks that expired with a failed owner payment.
      const owner = await store.listRenewals({ states: ['owner_paying'], providerEnv: env, lockedBefore: clock() }, RENEWAL_POLICY.maxReconcilesPerRun);
      for (const r of owner) {
        if (!r.ownerPaymentId) continue;
        const [payment] = await store.paymentsByIds([r.ownerPaymentId]);
        if (!payment || payment.status === 'failed' || payment.status === 'needs_review') {
          await store.releaseOwnerPaying(r.id, r.ownerPaymentId);
        }
      }

      // (d) late-success re-check of payments failed only for "not found".
      const failed = await store.listFailedToRecheck(env, clock(), RENEWAL_POLICY.maxRechecksPerRun);
      for (const p of failed) {
        if (!providerTime()) break;
        let decision: PaymentDecision;
        try {
          decision = await confirmCharge(cfg, transport, { clientRefCode: p.id, amountMinor: p.amountMinor, createdAt: p.createdAt, kind: p.kind }, clock());
        } catch (err) {
          billingLog('warn', 'renewal.recheck_failed', { paymentId: p.id, code: errCode(err) });
          continue;
        }
        await store.markRechecked(p.id, new Date(clock().getTime() + RENEWAL_POLICY.recheckFailedEveryMs));
        if (decision.kind === 'succeeded' || decision.kind === 'duplicate') {
          await settleAndApply(p.id, decision);
        } else if (decision.kind === 'charged_mismatch') {
          await store.markPaymentNeedsReview(p.id, `mismatch_${decision.reason}`, 'charged_mismatch');
          capture('billing: PaymentList success does not match the payment', 'billing-charged-mismatch', { paymentId: p.id });
        }
      }

      // (e) card saves the return route could not confirm (provider list failed): retried, provider calls.
      if (deps.cardSaveReconcile) {
        const saves = await store.listPendingCardSaves(env, clock(), MAX_CARD_SAVES_PER_RUN);
        for (const p of saves) {
          if (!providerTime()) break;
          try {
            await deps.cardSaveReconcile(p.id);
          } catch (err) {
            billingLog('warn', 'renewal.card_save_retry_failed', { paymentId: p.id, code: errCode(err) });
          }
        }
      }

      // (f) D1 clean-ups that did not verify (a delete timed out, the re-list failed or still showed the old
      //     card): retried every tick for 7 days after the save, provider calls.
      if (deps.cardCleanup) {
        const owed = await store.listCardCleanupsOwed(env, clock(), MAX_CARD_SAVES_PER_RUN);
        for (const p of owed) {
          if (!providerTime()) break;
          try {
            await deps.cardCleanup(p.id);
          } catch (err) {
            billingLog('warn', 'renewal.card_cleanup_retry_failed', { paymentId: p.id, code: errCode(err) });
          }
        }
      }
    });

    // ── Phase 2: schedule (DB only; reminder mode — this release has no charge phase) ──
    await phase('schedule', async () => {
      const now = clock();
      const candidates = await store.findSubscriptionsToSchedule(now, MAX_SCHEDULE_PER_RUN, deps.flags.cardStorageIntent);
      for (const c of candidates) {
        const ctx = await store.loadRenewalContext(c.userId);
        if (!ctx || !ctx.sub.renewsAt || ctx.sub.renewsAt.getTime() !== c.renewsAt.getTime()) continue;
        const decision = evaluateRenewal({
          flags: deps.flags,
          sub: ctx.sub,
          user: ctx.user,
          plan: ctx.plan,
          consent: ctx.consent,
          boundCard: ctx.boundCard,
        });
        let modeReason: string;
        if (!decision.eligible) {
          // A plan that can no longer be bought still gets reminders (pointing to the plan picker).
          if (decision.reason !== 'plan_unavailable') continue;
          modeReason = 'plan_changed';
        } else {
          // Without a charge phase every renewal is a reminder; 'auto' would mean auto-charging is configured.
          modeReason = decision.mode === 'auto' ? 'flag_off' : decision.modeReason;
        }
        // D4: a subscription with an effective auto-renew consent keeps access until graceEnd, whatever the mode.
        const consented = ctx.sub.autoRenew && ctx.consent !== null;
        const created = await store.createRenewal({
          userId: c.userId,
          providerEnv: env,
          periodEnd: c.renewsAt,
          subscriptionPlanId: ctx.sub.subscriptionPlanId,
          billingCycle: ctx.sub.billingCycle === 'yearly' ? 'yearly' : 'monthly',
          mode: 'reminder',
          modeReason: modeReason.slice(0, 32),
          nextAttemptAt: null,
          consentId: consented && ctx.consent ? ctx.consent.id : null,
          graceEndsAt: consented ? graceEnd(c.renewsAt) : null,
        });
        if (created !== 'exists') summary.scheduled += 1;
      }
    });

    // ── Phase 3: mails (inside 09:00–21:00 Istanbul only, D10) ──
    await phase('mails', async () => {
      const mailer = deps.mailer;
      if (!mailer) return;
      const siteUrl = (deps.siteUrl ?? '').replace(/\/+$/, '');
      let budget = MAX_MAILS_PER_RUN;

      // (a) queued mails (produced by lapse / reconciliation, possibly outside the window).
      const queued = await store.listRenewals({ states: ALL_OPEN_AND_ENDED, providerEnv: env, withPendingMail: true }, MAX_MAILS_PER_RUN);
      for (const r of queued) {
        if (budget <= 0 || !inIstanbulWindow(clock())) break;
        if (r.pendingMail !== 'period_ended') continue; // other queued mails belong to the charge release
        const ctx = await store.loadRenewalContext(r.userId);
        if (!mailable(ctx)) {
          await store.clearPendingMail(r.id, r.pendingMail);
          continue;
        }
        // Renewed since the mail was queued (e.g. lapse at 22:35, paid at 08:00): "your plan has ended" would be false.
        const renewed =
          (ctx.sub.status === 'active' || ctx.sub.status === 'past_due') &&
          !!ctx.sub.renewsAt &&
          ctx.sub.renewsAt.getTime() > r.periodEnd.getTime();
        if (renewed) {
          await store.clearPendingMail(r.id, r.pendingMail);
          continue;
        }
        budget -= 1;
        const sent = await mailer.periodEnded(
          { email: ctx.user.email, locale: ctx.user.locale },
          { planName: ctx.plan?.name ?? '', pricingUrl: `${siteUrl}/${ctx.user.locale}/pricing` },
        );
        if (sent) {
          await store.clearPendingMail(r.id, r.pendingMail);
          summary.mailed += 1;
        }
      }

      // (b) reminders before the period end: E−7d (notice slot) and E−1d (last-call slot), each claimed once.
      const open = await store.listRenewals({ states: REMINDABLE, providerEnv: env }, 500);
      for (const r of open) {
        if (budget <= 0) break;
        const now = clock();
        if (!inIstanbulWindow(now)) break;
        if (r.mode !== 'reminder') continue;
        const untilEnd = r.periodEnd.getTime() - now.getTime();
        if (untilEnd <= 0) continue;
        let variant: ReminderVariant | null = null;
        let slot: 'notice' | 'last_call' | null = null;
        if (untilEnd <= RENEWAL_POLICY.reminderHours[1] * HOUR_MS) {
          if (!r.lastCallClaimedAt) {
            variant = 'reminder_1';
            slot = 'last_call';
          }
        } else if (untilEnd <= RENEWAL_POLICY.reminderHours[0] * HOUR_MS && !r.noticeClaimedAt) {
          variant = 'reminder_7';
          slot = 'notice';
        }
        if (!variant || !slot) continue;
        const sub = await store.subscriptionSnapshot(r.userId);
        if (!sub?.renewsAt || sub.renewsAt.getTime() !== r.periodEnd.getTime()) continue; // renewed or superseded
        // Re-check eligibility at send time, not only at scheduling: a subscription canceled, moved to manual
        // invoicing or set to cancel at period end since E−7d gets no "renew by card" mail (its link would
        // lead to an unavailable page). The row is closed with the reason. A plan that can no longer be
        // bought keeps its reminders (plan picker link); a blocked account is handled by `mailable`.
        const ctx = await store.loadRenewalContext(r.userId);
        if (ctx) {
          const decision = evaluateRenewal({
            flags: deps.flags,
            sub: ctx.sub,
            user: ctx.user,
            plan: ctx.plan,
            consent: ctx.consent,
            boundCard: ctx.boundCard,
          });
          if (!decision.eligible && decision.reason !== 'plan_unavailable' && decision.reason !== 'account_blocked') {
            await store.transition(r.id, [r.state], {
              state: 'canceled',
              endedAt: now,
              endReason: decision.reason.slice(0, 32),
              nextAttemptAt: null,
              lockedUntil: null,
            });
            continue;
          }
        }
        if (!(await store.claimMail(r.id, slot, now))) continue;
        // The E−1d mail makes a still-unsent E−7d mail pointless: its slot is consumed silently.
        if (slot === 'last_call' && !r.noticeClaimedAt) await store.claimMail(r.id, 'notice', now);
        if (!mailable(ctx)) continue; // nobody to mail; the claim stays
        budget -= 1;
        const locale = ctx.user.locale;
        const sent = await mailer.upcoming(
          { email: ctx.user.email, locale },
          {
            variant,
            planName: ctx.plan?.name ?? '',
            amountMinor: ctx.plan?.amountMinor ?? null,
            cycle: r.billingCycle === 'yearly' ? 'yearly' : 'monthly',
            periodEnd: r.periodEnd,
            accessUntil: r.graceEndsAt ?? r.periodEnd,
            renewUrl: renewLinkFor(siteUrl, locale, r),
            savedCardLast4: ctx.savedCard?.last4 ?? null,
          },
        );
        if (sent) summary.mailed += 1;
        else await store.releaseMailClaim(r.id, slot);
      }
    });

    // ── Phase 5: lapse (DB only) ──
    await phase('lapse', async () => {
      const now = clock();
      const open = await store.listRenewals({ states: OPEN_FOR_LAPSE, providerEnv: env }, 500);
      for (const r of open) {
        const limit = r.graceEndsAt ?? r.periodEnd;
        if (now.getTime() < limit.getTime()) continue;
        const sub = await store.subscriptionSnapshot(r.userId);
        if (sub?.renewsAt && sub.renewsAt.getTime() !== r.periodEnd.getTime()) continue; // renewed or superseded
        const moved = await store.transition(r.id, [r.state], {
          state: 'lapsed',
          endedAt: now,
          endReason: 'unpaid',
          nextAttemptAt: null,
          lockedUntil: null,
          pendingMail: 'period_ended',
        });
        if (moved) summary.lapsed += 1;
      }
      summary.expired += await deps.expireLapsed(now);
    });

    if (clock().getTime() < start.getTime() + RENEWAL_POLICY.lateStartMs) {
      // ── Phase 6: erasure tombstones ──
      await phase('tombstones', async () => {
        if (!deps.vault) return;
        const now = clock();
        const due = await store.listDueTombstones(env, now, RENEWAL_POLICY.maxTombstonesPerRun);
        for (const row of due) {
          if (!providerTime()) break;
          let customerKey;
          try {
            customerKey = openCustomerKey(row.customerKeyEnc, row.aadUserId, deps.vault.keys);
          } catch (err) {
            capture('billing: vault key cannot open a tombstone', 'billing-vault-key', {
              code: err instanceof VaultKeyError ? err.code : 'unknown',
            });
            continue; // row untouched until the key is available
          }
          let lastError = 'not_empty';
          try {
            const res = await purgeCardsWithKey(cfg, transport, customerKey);
            if (res.ok) {
              await store.deleteTombstone(row.id);
              summary.tombstonesCleared += 1;
              continue;
            }
          } catch (err) {
            lastError = errCode(err);
          }
          const attempts = row.attempts + 1;
          const manual = attempts >= RENEWAL_POLICY.tombstoneMaxAttempts;
          await store.deferTombstone(row.id, {
            attempts,
            nextAttemptAt: new Date(clock().getTime() + tombstoneBackoffMs(attempts)),
            lastError,
            manualSince: manual ? clock() : null,
          });
          if (manual) capture('billing: provider card deletion still owed after 14 attempts', 'billing-tombstone-stuck', { tombstoneId: row.id });
        }
      });

      // ── Phase 7: daily scans ──
      await phase('daily_scan', async () => {
        const now = clock();
        // Same calendar as the marker: the first tick at or after 09:00 Istanbul of each Istanbul day.
        if (istanbulHour(now) < RENEWAL_POLICY.dailyScanIstanbulHour) return;
        if (!(await deps.settings.claimDailyMarker('lastDailyScanOn', istanbulDay(now)))) return;

        const stats = await store.hostedPaymentStats(env, new Date(now.getTime() - DAY_MS));
        const ratio = RENEWAL_POLICY.declineRatio;
        if ((stats.total >= ratio.minSample && stats.failed / stats.total >= ratio.ratio) || stats.maxFailedPerUser >= ratio.perAccount) {
          capture('billing: hosted payment decline ratio is high', 'billing-decline-ratio', {
            total: String(stats.total),
            failed: String(stats.failed),
          });
        }
        const overdue = await store.countOverdueRefunds(new Date(now.getTime() - RENEWAL_POLICY.refundOverdueMs));
        if (overdue > 0) capture('billing: refund queue has entries older than 3 days', 'billing-refund-overdue', { count: String(overdue) });

        // Foreign / duplicate transaction scan: needs the range query (Q-16).
        if (!PAYMENT_LIST_RANGE_VERIFIED || !providerTime()) return;
        const from = new Date(now.getTime() - DAY_MS);
        const rows = await queryPaymentListRange(cfg, transport, from, from);
        const ids = [...new Set(rows.map((r) => field(r, 'CLIENT_REFERENCE_CODE', 'clientRefCode')).filter(Boolean))];
        const stored = new Map((await store.paymentsByIds(ids)).map((p) => [p.id, p]));
        const scan = analyzeDailyTransactions(rows, stored, cfg.merchantNo);
        for (const id of scan.duplicates) await store.markRefundRequired(id, 'provider_duplicate');
        for (const finding of scan.findings) {
          capture('billing: daily transaction scan finding', finding.fingerprint, finding.paymentId ? { paymentId: finding.paymentId } : undefined);
        }
        for (const id of scan.toSettle) {
          if (!providerTime()) break;
          const p = stored.get(id);
          if (!p) continue;
          const decision = await confirmCharge(cfg, transport, { clientRefCode: id, amountMinor: p.amountMinor, createdAt: from, kind: p.kind }, clock());
          if (decision.kind === 'succeeded' || decision.kind === 'duplicate') await settleAndApply(id, decision);
        }
      });

      // ── Phase 8: retention ──
      await phase('retention', async () => {
        if (!deps.retention) return;
        const now = clock();
        // D10: retention sends customer mail (the stored-card notice), so the day's run — and its marker —
        // waits for the first tick inside 09:00–21:00 Istanbul (never the 00:25 tick).
        if (!inIstanbulWindow(now)) return;
        if (!(await deps.settings.claimDailyMarker('lastRetentionOn', istanbulDay(now)))) return;
        await deps.retention(now);
      });
    }

    const settings = await deps.settings.get({ fresh: true }).catch(() => null);
    if (settings?.breakerUntil && settings.breakerUntil.getTime() > clock().getTime()) summary.breaker = 'open';
  } finally {
    await deps.settings.releaseTickLease(deps.runId).catch(() => undefined);
  }
  return summary;
}

// ── Production wiring ──────────────────────────────────────────────────────

function loadVaultKeysOrNull(): VaultKeys | null {
  try {
    return loadVaultKeys();
  } catch {
    return null;
  }
}

/** The hourly cron entry point: real flags, Prisma store, fetch transport, Sentry. */
export async function runBillingRenewals(): Promise<RenewalTickSummary> {
  const flags = await loadBillingFlags();
  const cfg = getPaynkolayConfig();
  const store = prismaRenewalStore;
  const keys = loadVaultKeysOrNull();
  return runRenewalTick({
    store,
    cfg,
    transport: fetchTransport,
    flags,
    settings: billingSettings,
    clock: () => new Date(),
    settle: (paymentId, decision) => settlePaynkolayPayment(paymentId, decision),
    postSettle: (paymentId) =>
      applyPostSettleEffects(paymentId, {
        db: prisma,
        store,
        now: () => new Date(),
        reconcileCards: async (id) => {
          const vaultDeps = await loadCardVaultDeps();
          if (vaultDeps) await reconcileCardsAfterSave(vaultDeps, id);
        },
      }),
    expireLapsed: (now) => expireLapsedPaynkolayPeriods(now),
    retention: cfg
      ? async (now) =>
          runRetention({ db: prisma, env: cfg.env, vault: await loadProviderVaultDeps(), mailer: billingMailer }, now)
      : null,
    vault: keys ? { keys } : null,
    mailer: billingMailer,
    siteUrl: SITE_URL,
    cardSaveReconcile: flags.cardStorage
      ? async (paymentId) => {
          const vaultDeps = await loadCardVaultDeps();
          if (vaultDeps) await reconcileCardsAfterSave(vaultDeps, paymentId);
        }
      : null,
    cardCleanup: flags.cardStorage
      ? async (paymentId) => {
          const vaultDeps = await loadCardVaultDeps();
          if (vaultDeps) await retryCardCleanup(vaultDeps, paymentId);
        }
      : null,
    captureMessage: (msg, fingerprint, tags) =>
      Sentry.captureMessage(msg, {
        level: fingerprint === 'billing-binding-skipped' ? 'warning' : 'error',
        fingerprint: [fingerprint],
        tags: { billing: 'engine' },
        extra: tags,
      }),
    captureException: (err, tags) => Sentry.captureException(err, { tags: { billing: 'engine', ...tags } }),
    runId: randomBytes(12).toString('base64url'),
  });
}
