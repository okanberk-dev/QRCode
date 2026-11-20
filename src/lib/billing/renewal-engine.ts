import { randomBytes } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
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
import { loadProviderVaultDeps, purgeCardsWithKey } from './card-vault';
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
  istanbulDay,
  istanbulHour,
  RENEWAL_POLICY,
  tombstoneBackoffMs,
  type RenewalState,
} from './renewal-policy';
import type { PaymentToConfirm, RenewalStore, StoredPaymentSummary } from './renewal-store';
import { prismaRenewalStore } from './renewal-store-prisma';
import { runRetention } from './retention';
import { loadVaultKeys, openCustomerKey, VaultKeyError, type VaultKeys } from './vault-crypto';

/**
 * The renewal engine tick (billing spec §9), run hourly by
 * `/api/cron/billing-renewals`.
 *
 * FOUNDATION SCOPE: this release contains no charge phase and no schedule or
 * mail phase — nothing here charges a card or mails an owner. It runs:
 *   1. reconcile — PaymentList decides every pending payment (settle on
 *      SUCCESS, fail on explicit failure rows, abandoned hosted checkouts
 *      fail after 45 min, unresolved ones go to review after 48 h), stale
 *      charge leases, expired owner_paying locks, and a 7-day late-success
 *      re-check of failed payments;
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
  captureMessage: (msg: string, fingerprint: string, tags?: Record<string, string>) => void;
  captureException: (err: Error, tags?: Record<string, string>) => void;
  runId: string;
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
    postSettle: (paymentId) => applyPostSettleEffects(paymentId, { db: prisma, store, now: () => new Date() }),
    expireLapsed: (now) => expireLapsedPaynkolayPeriods(now),
    retention: cfg
      ? async (now) =>
          runRetention({ db: prisma, env: cfg.env, vault: await loadProviderVaultDeps(), mailer: null }, now)
      : null,
    vault: keys ? { keys } : null,
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
