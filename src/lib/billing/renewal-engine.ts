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
import { chargeSavedCard, type DirectChargeOutcome } from '@/lib/payment/paynkolay-cards';
import { billingSettings, type BillingSettingsApi } from './billing-settings';
import { billingMailer } from './billing-mails';
import {
  loadCardVaultDeps,
  loadProviderVaultDeps,
  purgeCardsWithKey,
  reconcileCardsAfterSave,
  resolveChargeableCard,
  retryCardCleanup,
  type ChargeableCard,
} from './card-vault';
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
  attemptSchedule,
  classifyDecline,
  confirmBackoffMs,
  evaluateRenewal,
  graceEnd,
  inIstanbulWindow,
  istanbulDay,
  istanbulHour,
  nextWindowSlot,
  RENEWAL_POLICY,
  tombstoneBackoffMs,
  type RenewalState,
} from './renewal-policy';
import {
  NOTICE_RESET,
  type PaymentToConfirm,
  type RenewalContext,
  type RenewalPatch,
  type RenewalRow,
  type RenewalStore,
  type StoredPaymentSummary,
} from './renewal-store';
import { prismaRenewalStore } from './renewal-store-prisma';
import { runRetention, type MailTarget } from './retention';
import { loadHmacKeys, loadVaultKeys, offLinkToken, openCustomerKey, VaultKeyError, type VaultKeys } from './vault-crypto';

/**
 * The renewal engine tick (billing spec §9), run hourly by
 * `/api/cron/billing-renewals`.
 *
 * Renewal is REMINDER MODE (mails that lead the owner to a 3D Secure payment
 * on the hosted page) unless the owner gave an auto-renew consent AND
 * auto-charge is on AND dry run is off AND the breaker is closed: only then
 * phase 4 charges the bound card, merchant-initiated (D15). It runs:
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
 *   4. charge — inside the window only: a payment row is committed before
 *      every HTTP charge, the provider answer is recorded in the same
 *      transaction as the move to awaiting_confirmation, and only a
 *      PaymentList SUCCESS row for that clientRefCode settles (D17);
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
  /**
   * Auto-charge (§9.2 phase 4 step 7): re-lists the owner's cards and returns the token of the card bound to
   * the consent (resolveChargeableCard). Absent → phase 4 charges nothing.
   */
  chargeCard?: ((userId: string, consentId: string) => Promise<ChargeableCard>) | null;
  /** The off-only mail link (§8.8) for a consent; null when the HMAC key is unavailable. */
  offLink?: ((consentId: string, userId: string, locale: 'tr' | 'en') => string | null) | null;
  /** Wait before the single PaymentList retry after an `approved_claimed` answer (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
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
  /**
   * Auto-charge (§9.2 phase 3): the pre-charge notice naming the amount, the card, the charge date and both
   * retry dates. Its delivery gates the charge (D5, §9.4-3). Absent → no notice, so nothing is ever charged.
   */
  autoNotice?(
    to: MailTarget,
    v: { planName: string; amountMinor: number; chargeDate: Date; retryDates: Date[]; last4: string | null; offLink: string | null },
  ): Promise<boolean>;
  /** Charge results and dunning (§10.2): paid, refund pending, attempt failures, action needed, unresolved. */
  chargeResult?(
    to: MailTarget,
    v: {
      variant: ChargeMailVariant;
      planName: string;
      amountMinor: number | null;
      last4: string | null;
      nextAttemptAt: Date | null;
      accessUntil: Date;
      renewUrl: string;
    },
  ): Promise<boolean>;
  /** Auto-renew changed by the system (§13.4): price increase, card missing at PayNKolay, card removed. */
  autoRenewChanged?(
    to: MailTarget,
    v: { variant: AutoRenewSystemVariant; planName: string; amountMinor: number | null; accessUntil: Date | null; renewUrl: string },
  ): Promise<boolean>;
}

export type ChargeMailVariant = 'paid' | 'refund_pending' | 'attempt_1' | 'attempt_2' | 'final' | 'hard' | 'action_needed' | 'unresolved';
export type AutoRenewSystemVariant = 'off_price_increase' | 'off_provider_missing' | 'off_card_removed';

/** Queued mail keys (`billing_renewals.pending_mail`, ≤ 24 chars). One slot: a later key replaces an unsent one. */
const CHARGE_MAIL_KEYS: Record<string, ChargeMailVariant> = {
  paid: 'paid',
  paid_refund_pending: 'refund_pending',
  failed_attempt_1: 'attempt_1',
  failed_attempt_2: 'attempt_2',
  failed_final: 'final',
  failed_hard: 'hard',
  failed_action_needed: 'action_needed',
  failed_unresolved: 'unresolved',
};
const SYSTEM_MAIL_KEYS: Record<string, AutoRenewSystemVariant> = {
  off_price_increase: 'off_price_increase',
  off_provider_missing: 'off_provider_missing',
  off_card_removed: 'off_card_removed',
};

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

  // §9.0-4: the breaker as it stood when the tick started (a breaker open for more than 24 h pauses auto mode, §9.1).
  const settingsAtStart = await deps.settings.get({ fresh: true }).catch(() => null);
  const breakerUntilAtStart = settingsAtStart?.breakerUntil?.getTime() ?? 0;
  let breakerOpen = breakerUntilAtStart > start.getTime();
  const breakerLong = breakerOpen && breakerUntilAtStart - start.getTime() > DAY_MS;

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

  async function settleAndApply(paymentId: string, decision: SettleDecision, p?: { kind: string; renewalId: string | null }): Promise<void> {
    const result = await deps.settle(paymentId, decision);
    if (SETTLED.has(result)) {
      summary.succeeded += 1;
      await deps.postSettle(paymentId);
      // The owner hears about an automatic charge that went through (sent in the next window, §9.2 phase 3).
      if (p?.kind === 'renewal_auto' && p.renewalId && (result === 'succeeded' || result === 'refund_pending')) {
        await store.queueMail(p.renewalId, result === 'refund_pending' ? 'paid_refund_pending' : 'paid');
      }
    }
  }

  /**
   * The next retry after an explicit soft failure: the date announced in the delivered notice for this attempt
   * (§10.2), or the next window slot after it when it has passed; null when no slot is left before graceEnd.
   */
  function retryAt(renewal: RenewalRow, firstChargeDate: Date | null, now: Date): Date | null {
    if (renewal.attempts >= renewal.maxAttempts) return null;
    const schedule = attemptSchedule(renewal.periodEnd, { firstChargeDate, noticeDeliveredAt: renewal.noticeDeliveredAt });
    const announced = schedule[renewal.attempts];
    if (!announced) return null;
    const at = announced.getTime() > now.getTime() ? announced : nextWindowSlot(now);
    return at.getTime() < graceEnd(renewal.periodEnd).getTime() ? at : null;
  }

  /**
   * A payment failed explicitly (terminal PaymentList rows, or a synchronous decline with still no SUCCESS row
   * 30 min later — never a timeout or a missing answer, D17): release an owner_paying lock; an automatic attempt
   * moves to retry_wait (soft decline, attempts and a slot left) or needs_action (hard decline or last attempt).
   */
  async function afterFailure(p: { id: string; renewalId: string | null; kind: string; userId?: string }, code: string | null): Promise<void> {
    const renewal = await store.renewalForPayment(p);
    if (!renewal) return;
    if (renewal.state === 'owner_paying' && renewal.ownerPaymentId === p.id) {
      await store.releaseOwnerPaying(renewal.id, p.id);
      return;
    }
    if (p.kind !== 'renewal_auto' || renewal.state !== 'awaiting_confirmation') return;
    const now = clock();
    const kind = classifyDecline(code, null);
    const ctx = await store.loadRenewalContext(renewal.userId);
    const next = kind === 'soft' ? retryAt(renewal, ctx?.consent?.firstChargeDate ?? null, now) : null;
    const base = { lockedUntil: null, lastFailureCode: code ? code.slice(0, 40) : 'failed', lastFailureKind: kind } as const;
    if (next) {
      const moved = await store.transition(renewal.id, ['awaiting_confirmation'], {
        ...base,
        state: 'retry_wait',
        nextAttemptAt: next,
        dunningStep: renewal.attempts,
        pendingMail: renewal.attempts >= 2 ? 'failed_attempt_2' : 'failed_attempt_1',
      });
      if (moved) await store.setSubscriptionPastDue(renewal.userId, renewal.periodEnd); // D4: past_due only now
      return;
    }
    const moved = await store.transition(renewal.id, ['awaiting_confirmation'], {
      ...base,
      state: 'needs_action',
      nextAttemptAt: null,
      dunningStep: renewal.attempts,
      pendingMail: kind === 'hard' ? 'failed_hard' : 'failed_final',
    });
    if (moved) {
      summary.needsAction += 1;
      await store.setSubscriptionPastDue(renewal.userId, renewal.periodEnd);
    }
  }

  function evaluate(ctx: RenewalContext, flags: BillingFlags = deps.flags) {
    return evaluateRenewal({ flags, sub: ctx.sub, user: ctx.user, plan: ctx.plan, consent: ctx.consent, boundCard: ctx.boundCard });
  }

  /**
   * §9.1 flag-state normalisation (DB only). Paused (flag off, dry run, breaker open > 24 h): open auto renewals
   * become reminder renewals with their grace and consent kept, so owners get reminder mails and are never locked
   * out at E (D4). Not paused: consented renewals paused by a switch return to auto mode with a notice reset —
   * a fresh notice with fresh dates is required before any charge. Dry run counts the would-charge renewals.
   */
  async function normaliseFlagState(now: Date): Promise<void> {
    const paused = !deps.flags.autoCharge ? 'flag_off' : deps.flags.dryRun ? 'dry_run' : breakerLong ? 'breaker' : null;
    const open = await store.listRenewals({ states: ['scheduled', 'retry_wait', 'needs_action'], providerEnv: env }, 500);
    for (const r of open) {
      if (paused) {
        if (r.mode === 'auto') {
          await store.transition(r.id, [r.state], { mode: 'reminder', modeReason: paused, nextAttemptAt: null });
        }
        const counts = paused === 'dry_run' && (r.mode === 'auto' || r.modeReason === 'dry_run') && !r.dryRunCountedAt && r.state !== 'needs_action';
        if (!counts) continue;
        const ctx = await store.loadRenewalContext(r.userId);
        if (!ctx || ctx.sub.renewsAt?.getTime() !== r.periodEnd.getTime()) continue;
        const live = evaluate(ctx, { ...deps.flags, dryRun: false });
        const a1 = attemptSchedule(r.periodEnd, { firstChargeDate: ctx.consent?.firstChargeDate ?? null })[0];
        if (live.eligible && live.mode === 'auto' && a1 && a1.getTime() <= now.getTime()) {
          if (await store.transition(r.id, [r.state], { dryRunCountedAt: now })) summary.dryRunWouldCharge += 1;
        }
        continue;
      }
      if (r.mode !== 'reminder' || r.state === 'needs_action' || !r.consentId) continue;
      if (!['flag_off', 'dry_run', 'breaker'].includes(r.modeReason ?? '')) continue;
      const ctx = await store.loadRenewalContext(r.userId);
      if (!ctx?.consent || !ctx.sub.autoRenew || ctx.sub.renewsAt?.getTime() !== r.periodEnd.getTime()) continue;
      const decision = evaluate(ctx);
      if (!decision.eligible || decision.mode !== 'auto') continue;
      const first = attemptSchedule(r.periodEnd, { firstChargeDate: ctx.consent.firstChargeDate ?? null })[0];
      if (!first) continue;
      await store.transition(r.id, [r.state], {
        ...NOTICE_RESET,
        mode: 'auto',
        modeReason: null,
        nextAttemptAt: first,
        consentId: ctx.consent.id,
        chargeCardId: ctx.boundCard?.id ?? null,
      });
    }
  }

  /** Sends one queued mail. true = sent (or nothing to send), false = keep it queued. */
  async function sendQueuedMail(r: RenewalRow, key: string, ctx: RenewalContext): Promise<boolean> {
    const mailer = deps.mailer;
    if (!mailer) return false;
    const siteUrl = (deps.siteUrl ?? '').replace(/\/+$/, '');
    const to = { email: ctx.user.email, locale: ctx.user.locale };
    const planName = ctx.plan?.name ?? '';
    const charge = CHARGE_MAIL_KEYS[key];
    if (charge) {
      if (deps.flags.dryRun || !mailer.chargeResult) return false; // §9.2 phase 3: dry run suppresses charge mails
      return mailer.chargeResult(to, {
        variant: charge,
        planName,
        amountMinor: r.quotedAmountMinor ?? ctx.plan?.amountMinor ?? null,
        last4: ctx.boundCard?.last4 ?? ctx.savedCard?.last4 ?? null,
        nextAttemptAt: charge === 'attempt_1' || charge === 'attempt_2' ? r.nextAttemptAt : null,
        accessUntil: r.graceEndsAt ?? r.periodEnd,
        renewUrl: renewLinkFor(siteUrl, ctx.user.locale, r),
      });
    }
    const system = SYSTEM_MAIL_KEYS[key];
    if (system) {
      if (!mailer.autoRenewChanged) return false;
      return mailer.autoRenewChanged(to, {
        variant: system,
        planName,
        amountMinor: ctx.plan?.amountMinor ?? null,
        accessUntil: r.graceEndsAt ?? r.periodEnd,
        renewUrl: renewLinkFor(siteUrl, ctx.user.locale, r),
      });
    }
    return true; // unknown key: drop it
  }

  /** Inside the window: send now, else queue for the next window (D10). */
  async function deliverOrQueue(renewalId: string, key: string): Promise<void> {
    const r = await store.getRenewal(renewalId);
    if (!r) return;
    const ctx = await store.loadRenewalContext(r.userId);
    if (!mailable(ctx)) return;
    if (inIstanbulWindow(clock()) && (await sendQueuedMail(r, key, ctx))) {
      summary.mailed += 1;
      return;
    }
    await store.queueMail(renewalId, key);
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
        await settleAndApply(p.id, decision, p);
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
          await settleAndApply(p.id, decision, p);
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

    // ── Phase 2: schedule (DB only; runs even when auto-charge is paused, as long as the binding holds) ──
    await phase('schedule', async () => {
      const now = clock();
      await normaliseFlagState(now);
      const candidates = await store.findSubscriptionsToSchedule(now, MAX_SCHEDULE_PER_RUN, deps.flags.cardStorageIntent);
      for (const c of candidates) {
        const ctx = await store.loadRenewalContext(c.userId);
        if (!ctx || !ctx.sub.renewsAt || ctx.sub.renewsAt.getTime() !== c.renewsAt.getTime()) continue;
        const decision = evaluate(ctx);
        let modeReason: string | null;
        let auto = false;
        if (!decision.eligible) {
          // A plan that can no longer be bought still gets reminders (pointing to the plan picker).
          if (decision.reason !== 'plan_unavailable') continue;
          modeReason = 'plan_changed';
        } else if (decision.mode === 'auto') {
          modeReason = null;
          auto = true;
        } else {
          modeReason = decision.modeReason;
        }
        // D4: a subscription with an effective auto-renew consent keeps access until graceEnd, whatever the mode.
        const consented = ctx.sub.autoRenew && ctx.consent !== null;
        const first = auto ? attemptSchedule(c.renewsAt, { firstChargeDate: ctx.consent?.firstChargeDate ?? null })[0] ?? null : null;
        if (auto && !first) {
          auto = false;
          modeReason = 'notice_late';
        }
        const created = await store.createRenewal({
          userId: c.userId,
          providerEnv: env,
          periodEnd: c.renewsAt,
          subscriptionPlanId: ctx.sub.subscriptionPlanId,
          billingCycle: ctx.sub.billingCycle === 'yearly' ? 'yearly' : 'monthly',
          mode: auto ? 'auto' : 'reminder',
          modeReason: modeReason ? modeReason.slice(0, 32) : null,
          nextAttemptAt: auto ? first : null,
          consentId: consented && ctx.consent ? ctx.consent.id : null,
          graceEndsAt: consented ? graceEnd(c.renewsAt) : null,
        });
        if (created !== 'exists') {
          summary.scheduled += 1;
          if (auto && ctx.boundCard) await store.transition(created.id, ['scheduled'], { chargeCardId: ctx.boundCard.id });
        }
      }
    });

    // ── Phase 3: mails (inside 09:00–21:00 Istanbul only, D10) ──
    await phase('mails', async () => {
      const mailer = deps.mailer;
      if (!mailer) return;
      const siteUrl = (deps.siteUrl ?? '').replace(/\/+$/, '');
      let budget = MAX_MAILS_PER_RUN;

      // (a) queued mails (produced by lapse / reconciliation / the charge phase, possibly outside the window).
      const queued = await store.listRenewals({ states: ALL_OPEN_AND_ENDED, providerEnv: env, withPendingMail: true }, MAX_MAILS_PER_RUN);
      for (const r of queued) {
        if (budget <= 0 || !inIstanbulWindow(clock())) break;
        if (!r.pendingMail) continue;
        const ctx = await store.loadRenewalContext(r.userId);
        if (!mailable(ctx)) {
          await store.clearPendingMail(r.id, r.pendingMail);
          continue;
        }
        if (r.pendingMail !== 'period_ended') {
          budget -= 1;
          if (await sendQueuedMail(r, r.pendingMail, ctx)) {
            await store.clearPendingMail(r.id, r.pendingMail);
            summary.mailed += 1;
          }
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

      // (a2) the pre-charge notice of auto renewals (§9.2 phase 3): from the first window slot ≥ E − 96 h,
      //      naming the amount, the card, the charge date and both retry dates. Its DELIVERY gates the charge.
      const autos = await store.listRenewals({ states: ['scheduled', 'retry_wait'], providerEnv: env }, 500);
      for (const r of autos) {
        if (budget <= 0) break;
        const now = clock();
        if (!inIstanbulWindow(now)) break;
        if (r.mode !== 'auto' || r.noticeDeliveredAt || r.noticeClaimedAt) continue;
        if (now.getTime() < r.periodEnd.getTime() - RENEWAL_POLICY.noticeLeadHours * HOUR_MS) continue;
        if (!(await store.claimMail(r.id, 'notice', now))) continue;
        const ctx = await store.loadRenewalContext(r.userId);
        const decision = ctx ? evaluate(ctx) : null;
        const toReminder = async (reason: string) => {
          await store.transition(r.id, [r.state], { mode: 'reminder', modeReason: reason.slice(0, 32), nextAttemptAt: null, noticeClaimedAt: null });
        };
        if (!ctx || !mailable(ctx) || !decision || !decision.eligible || ctx.sub.renewsAt?.getTime() !== r.periodEnd.getTime()) {
          await store.releaseMailClaim(r.id, 'notice'); // phase 4 re-evaluates at claim time and closes the row
          continue;
        }
        if (decision.mode !== 'auto') {
          await toReminder(decision.modeReason);
          continue;
        }
        const schedule = attemptSchedule(r.periodEnd, { firstChargeDate: ctx.consent?.firstChargeDate ?? null, noticeDeliveredAt: now });
        if (schedule.length === 0) {
          await toReminder('notice_late');
          continue;
        }
        const offLink = ctx.consent && deps.offLink ? deps.offLink(ctx.consent.id, r.userId, ctx.user.locale) : null;
        budget -= 1;
        const sent = mailer.autoNotice
          ? await mailer.autoNotice(
              { email: ctx.user.email, locale: ctx.user.locale },
              {
                planName: ctx.plan?.name ?? '',
                amountMinor: decision.amountMinor,
                chargeDate: schedule[0],
                retryDates: schedule.slice(1),
                last4: ctx.boundCard?.last4 ?? null,
                offLink,
              },
            )
          : false;
        if (sent) {
          await store.transition(r.id, [r.state], {
            noticeDeliveredAt: now,
            quotedAmountMinor: decision.amountMinor,
            noticeCardId: ctx.boundCard?.id ?? null,
            announcedAttemptTimes: schedule.map((d) => d.toISOString()),
            nextAttemptAt: schedule[0],
          });
          summary.mailed += 1;
        } else {
          await store.releaseMailClaim(r.id, 'notice');
          const failures = await store.bumpNoticeFailures(r.id);
          if (failures === 3) capture('billing: pre-charge notice not delivered three times', 'billing-notice-undelivered', { renewalId: r.id });
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

    // ── Phase 4: charge (merchant-initiated, D15) — only when auto-charge is on, dry run is off and the breaker is closed ──
    await phase('charge', async () => {
      if (!deps.flags.autoCharge || deps.flags.dryRun || breakerOpen || !deps.chargeCard || !deps.flags.mitCardholderIp) return;
      const chargeCard = deps.chargeCard;
      const cardHolderIp = deps.flags.mitCardholderIp;
      const siteUrl = (deps.siteUrl ?? '').replace(/\/+$/, '');
      const returnUrl = `${siteUrl}/api/billing/paynkolay/return`;
      const breaker = { consecutiveBad: 0, total: 0, bad: 0, emptyFresh: 0 };

      async function trip(reason: string): Promise<void> {
        const now = clock();
        const row = await deps.settings.get({ fresh: true }).catch(() => null);
        const recent = (row?.breakerTrippedAt ?? []).filter((t) => t.getTime() > now.getTime() - DAY_MS).length;
        const final = recent + 1 >= RENEWAL_POLICY.breaker.maxTrips24h;
        // 3 trips within 24 h: held open until an operator resets it (scripts/billing-breaker.ts reset).
        await deps.settings.tripBreaker(now, reason, final ? 100 * 365 * DAY_MS : RENEWAL_POLICY.breaker.holdMs);
        breakerOpen = true;
        summary.breaker = 'tripped';
        capture(
          final ? 'billing: charge breaker tripped 3 times in 24 h, held until reset' : 'billing: charge breaker open',
          'billing-breaker-open',
          { reason, level: final ? 'fatal' : 'error' },
        );
      }

      /** §9.5: records one outcome; true when the breaker tripped (phase 4 ends). */
      async function account(bad: boolean, charged: boolean): Promise<boolean> {
        if (charged) breaker.total += 1;
        if (bad) {
          breaker.bad += charged ? 1 : 0;
          breaker.consecutiveBad += 1;
        } else if (charged) {
          breaker.consecutiveBad = 0;
        }
        const b = RENEWAL_POLICY.breaker;
        let reason: string | null = null;
        if (breaker.consecutiveBad >= b.consecutive) reason = 'consecutive_bad';
        else if (breaker.total >= b.minSample && breaker.bad / breaker.total >= b.ratio) reason = 'bad_ratio';
        else if (breaker.emptyFresh >= b.emptyListOwners) reason = 'empty_lists';
        if (!reason) return false;
        await trip(reason);
        return true;
      }

      const due = (await store.listRenewals({ states: ['scheduled', 'retry_wait'], providerEnv: env, dueBefore: clock() }, RENEWAL_POLICY.maxChargesPerRun))
        .filter((r) => r.mode === 'auto')
        .sort((a, b) => (a.nextAttemptAt?.getTime() ?? 0) - (b.nextAttemptAt?.getTime() ?? 0));

      for (const r of due) {
        // 1. Budget and window are re-checked before every claim (D10).
        if (!providerTime() || !inIstanbulWindow(clock())) break;
        const prevState = r.state;
        const now = clock();
        const ctx0 = await store.loadRenewalContext(r.userId);
        const firstChargeDate = ctx0?.consent?.firstChargeDate ?? null;

        // 2. Notice gate (the SQL claim guard is the backstop).
        if (!r.noticeDeliveredAt || !r.nextAttemptAt || r.noticeDeliveredAt.getTime() > r.nextAttemptAt.getTime() - RENEWAL_POLICY.minNoticeHours * HOUR_MS) {
          if (r.noticeDeliveredAt) {
            const slot = attemptSchedule(r.periodEnd, { firstChargeDate, noticeDeliveredAt: r.noticeDeliveredAt })[r.attempts];
            if (slot) await store.transition(r.id, [prevState], { nextAttemptAt: slot });
            else await store.transition(r.id, [prevState], { mode: 'reminder', modeReason: 'notice_late', nextAttemptAt: null });
          }
          continue;
        }

        // 3. Earlier attempts must be proven failed in PaymentList right now (§9.4-2, D17).
        if (r.attempts >= 1) {
          const earlier = (await store.paymentsForRenewal(r.id)).filter((p) => p.kind === 'renewal_auto');
          let blocked = false;
          for (const p of earlier) {
            if (p.status === 'pending') {
              if (await store.transition(r.id, [prevState], { state: 'awaiting_confirmation', confirmAfter: now })) {
                capture('billing: renewal due while an earlier attempt is still pending', 'billing-engine-invariant', { renewalId: r.id });
              }
              blocked = true;
              break;
            }
            let decision: PaymentDecision;
            try {
              decision = await confirmCharge(cfg, transport, { clientRefCode: p.id, amountMinor: p.amountMinor, createdAt: p.createdAt, kind: p.kind }, clock());
            } catch {
              blocked = true; // PaymentList unavailable: no new attempt on an unproven history
              break;
            }
            if (decision.kind === 'succeeded' || decision.kind === 'duplicate') {
              await settleAndApply(p.id, decision, { kind: p.kind, renewalId: r.id });
              blocked = true;
              break;
            }
            if (decision.kind === 'indeterminate' || decision.kind === 'charged_mismatch') {
              if (decision.kind === 'charged_mismatch') await store.markPaymentNeedsReview(p.id, `mismatch_${decision.reason}`, 'charged_mismatch');
              if (await store.transition(r.id, [prevState], { state: 'manual_review', manualReviewAt: now, pendingMail: 'failed_unresolved' })) {
                summary.manualReview += 1;
                capture('billing: earlier attempt unresolved before a retry', 'billing-charge-unresolved', { paymentId: p.id });
              }
              blocked = true;
              break;
            }
            // 'failed' or 'not_found' of a payment already marked failed: proven failed.
          }
          if (blocked) continue;
        }

        // 4. Atomic claim (SQL guard: notice, owner payment, cancel request, lease, attempts).
        const leaseId = randomBytes(12).toString('base64url');
        const claimed = await store.claimForCharge(r.id, env, clock(), RENEWAL_POLICY.leaseMs, leaseId);
        if (!claimed) continue;
        const back = (patch: RenewalPatch = {}) =>
          store.transition(claimed.id, ['charging'], { state: prevState, attempts: claimed.attempts - 1, lockedUntil: null, leaseId: null, ...patch }, leaseId);
        const toNeedsAction = (code: string, patch: RenewalPatch = {}) =>
          store.transition(
            claimed.id,
            ['charging'],
            { state: 'needs_action', attempts: claimed.attempts - 1, lockedUntil: null, leaseId: null, nextAttemptAt: null, lastFailureCode: code.slice(0, 40), ...patch },
            leaseId,
          );

        // 5. Fresh context: eligibility, period, mode, card of the notice.
        const ctx = await store.loadRenewalContext(r.userId);
        const decision = ctx ? evaluate(ctx) : null;
        if (!ctx || !decision) {
          await back();
          continue;
        }
        if (!decision.eligible) {
          await store.transition(claimed.id, ['charging'], { state: 'canceled', endedAt: clock(), endReason: decision.reason, lockedUntil: null, leaseId: null, nextAttemptAt: null }, leaseId);
          continue;
        }
        if (!ctx.sub.renewsAt || ctx.sub.renewsAt.getTime() !== r.periodEnd.getTime()) {
          await store.transition(claimed.id, ['charging'], { state: 'canceled', endedAt: clock(), endReason: 'superseded', lockedUntil: null, leaseId: null, nextAttemptAt: null }, leaseId);
          continue;
        }
        if (decision.mode !== 'auto') {
          if (await toNeedsAction(decision.modeReason, { modeReason: decision.modeReason })) summary.needsAction += 1;
          if (decision.modeReason === 'above_consent') {
            await store.disableAutoRenew(r.userId, 'price_increase', 'system', clock());
            await deliverOrQueue(claimed.id, 'off_price_increase');
          }
          await deliverOrQueue(claimed.id, 'failed_action_needed');
          continue;
        }
        if (!ctx.consent || !ctx.boundCard || ctx.boundCard.id !== r.noticeCardId) {
          // D6: the card charged is the card named in the delivered notice; another card needs a new notice.
          await back({ ...NOTICE_RESET });
          continue;
        }
        // 6. Amount gate (D5): never more than the delivered notice stated.
        if (r.quotedAmountMinor == null || decision.amountMinor > r.quotedAmountMinor) {
          await back({ ...NOTICE_RESET });
          continue;
        }

        // 7. The bound card, re-listed at PayNKolay with this owner's key only.
        let card: ChargeableCard;
        try {
          card = await chargeCard(r.userId, ctx.consent.id);
        } catch {
          card = { ok: false, reason: 'list_failed' };
        }
        if (!card.ok) {
          if (card.reason === 'list_failed') {
            await back({ nextAttemptAt: new Date(clock().getTime() + HOUR_MS) });
            if (await account(true, false)) break;
          } else if (card.reason === 'bound_missing_first') {
            if (card.freshMirror) breaker.emptyFresh += 1;
            const slot = nextWindowSlot(new Date(clock().getTime() + DAY_MS));
            if (slot.getTime() < graceEnd(r.periodEnd).getTime()) await back({ nextAttemptAt: slot });
            else await toNeedsAction('card_missing');
            if (await account(false, false)) break;
          } else if (card.reason === 'bound_missing_confirmed') {
            if (await toNeedsAction('card_missing')) summary.needsAction += 1;
            await store.disableAutoRenew(r.userId, 'provider_missing', 'system', clock());
            await deliverOrQueue(claimed.id, 'off_provider_missing');
          } else if (card.reason === 'unbound_card_present') {
            if (await toNeedsAction('unbound_card', { modeReason: 'unbound_card' })) summary.needsAction += 1;
            capture('billing: another card is stored next to the bound card', 'billing-unbound-card', { renewalId: r.id });
            await deliverOrQueue(claimed.id, 'failed_action_needed');
          } else {
            if (await toNeedsAction('card_removed')) summary.needsAction += 1;
            await store.disableAutoRenew(r.userId, 'card_removed', 'system', clock());
            capture('billing: no chargeable card for a consented renewal', 'billing-no-bound-card', { renewalId: r.id });
          }
          continue;
        }

        // 8. The payment row is committed BEFORE the HTTP call (§9.4-1).
        const payment = await store.createRenewalPayment({
          userId: r.userId,
          renewalId: claimed.id,
          leaseId,
          attemptNo: claimed.attempts,
          consentId: ctx.consent.id,
          periodEnd: r.periodEnd,
          subscriptionPlanId: ctx.sub.subscriptionPlanId,
          billingCycle: 'monthly',
          amountMinor: decision.amountMinor,
          chargeCardId: card.cardId,
          providerEnv: env,
          locale: ctx.user.locale,
        });
        if (payment === 'duplicate') {
          // A row for this attempt exists already: its outcome is unknown, never charge twice.
          await store.transition(claimed.id, ['charging'], { state: 'awaiting_confirmation', confirmAfter: clock(), lockedUntil: null, leaseId: null }, leaseId);
          continue;
        }
        if ('rejected' in payment) {
          const why = payment.rejected;
          if (why === 'cancel_requested' || why === 'auto_renew_off' || why === 'consent_changed') {
            await back({ mode: 'reminder', modeReason: 'auto_renew_off', nextAttemptAt: null });
          } else if (why !== 'lease_lost') {
            await store.transition(claimed.id, ['charging'], { state: 'canceled', endedAt: clock(), endReason: why, lockedUntil: null, leaseId: null, nextAttemptAt: null }, leaseId);
          }
          continue;
        }

        // 9. The HTTP charge (never throws for a provider answer: a timeout is `unknown`).
        let outcome: DirectChargeOutcome;
        try {
          outcome = await chargeSavedCard(
            cfg,
            transport,
            { clientRefCode: payment.id, amountMinor: decision.amountMinor, successUrl: returnUrl, failUrl: returnUrl, customerKey: card.customerKey, token: card.token, cardHolderIp, use3D: false },
            clock(),
          );
        } catch (err) {
          // The request could not be built (no MIT path): nothing was sent. The attempt number stays used.
          await store.markPaymentFailed(payment.id, 'not_sent', clock());
          await store.transition(claimed.id, ['charging'], { state: 'needs_action', lockedUntil: null, leaseId: null, nextAttemptAt: null, lastFailureCode: 'not_sent' }, leaseId);
          capture('billing: charge request could not be built', 'billing-charge-build-failed', { code: errCode(err) });
          break;
        }
        summary.charged += 1;

        // 10. The outcome and the move to awaiting_confirmation, in ONE transaction.
        const at = clock();
        const confirmAfter =
          outcome.kind === 'declined'
            ? new Date(payment.createdAt.getTime() + RENEWAL_POLICY.declineFailAfterMs)
            : outcome.kind === 'approved_claimed'
              ? at
              : new Date(at.getTime() + RENEWAL_POLICY.confirmDelayMs);
        await store.recordChargeOutcome(
          payment.id,
          claimed.id,
          leaseId,
          { kind: outcome.kind, declineCode: outcome.kind === 'declined' ? outcome.errorCode : null, confirmAfter },
          at,
        );
        if (outcome.kind === 'three_d_required') {
          capture('billing: merchant-initiated charge answered "3D required"', 'billing-three-d-required', { paymentId: payment.id });
        }

        // 11. Confirm right away; only a PaymentList SUCCESS row for this clientRefCode settles.
        const expected = { clientRefCode: payment.id, amountMinor: decision.amountMinor, createdAt: payment.createdAt, kind: 'renewal_auto' };
        let confirmed: PaymentDecision | null = null;
        try {
          confirmed = await confirmCharge(cfg, transport, expected, clock());
          if (confirmed.kind === 'not_found' && outcome.kind === 'approved_claimed') {
            await (deps.sleep ?? ((ms: number) => new Promise((res) => setTimeout(res, ms))))(3000);
            confirmed = await confirmCharge(cfg, transport, expected, clock());
          }
        } catch {
          confirmed = null;
        }
        const pRow = { id: payment.id, renewalId: claimed.id, kind: 'renewal_auto', userId: r.userId };
        if (confirmed && (confirmed.kind === 'succeeded' || confirmed.kind === 'duplicate')) {
          await settleAndApply(payment.id, confirmed, pRow);
        } else if (confirmed?.kind === 'failed') {
          if (await store.markPaymentFailed(payment.id, confirmed.reason, clock())) {
            summary.failed += 1;
            await afterFailure(pRow, outcome.kind === 'declined' ? outcome.errorCode : confirmed.reason);
          }
        } else if (confirmed?.kind === 'charged_mismatch') {
          await store.markPaymentNeedsReview(payment.id, `mismatch_${confirmed.reason}`, 'charged_mismatch');
          capture('billing: PaymentList success does not match the payment', 'billing-charged-mismatch', { paymentId: payment.id, reason: confirmed.reason });
          if (await store.transition(claimed.id, ['awaiting_confirmation'], { state: 'manual_review', manualReviewAt: clock(), lockedUntil: null })) summary.manualReview += 1;
        } else if (!(confirmed?.kind === 'not_found' && outcome.kind === 'declined')) {
          await store.setPaymentConfirmAfter(payment.id, new Date(clock().getTime() + RENEWAL_POLICY.confirmDelayMs));
        }

        // 12. Breaker accounting (§9.5): unknown and "3D required" answers are bad outcomes.
        const bad = outcome.kind === 'unknown' || outcome.kind === 'three_d_required';
        if (await account(bad, true)) break;
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
    if (summary.breaker !== 'tripped' && settings?.breakerUntil && settings.breakerUntil.getTime() > clock().getTime()) summary.breaker = 'open';
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
    // Phase 4 only charges when flags.autoCharge holds (and the engine itself checks dry run and the breaker).
    chargeCard: flags.autoCharge
      ? async (userId, consentId) => {
          const vaultDeps = await loadCardVaultDeps();
          if (!vaultDeps) return { ok: false, reason: 'list_failed' };
          return resolveChargeableCard(vaultDeps, userId, consentId);
        }
      : null,
    offLink: offLinkFor,
  });
}

/** The off-only mail link (§8.8): valid 30 days, can only turn auto-renew off. Null without the HMAC key. */
export function offLinkFor(consentId: string, userId: string, locale: 'tr' | 'en', now: Date = new Date()): string | null {
  try {
    const t = offLinkToken(consentId, userId, new Date(now.getTime() + 30 * DAY_MS), loadHmacKeys());
    return `${SITE_URL}/billing/${locale}/auto-renew-off?t=${encodeURIComponent(t)}`;
  } catch {
    return null;
  }
}
