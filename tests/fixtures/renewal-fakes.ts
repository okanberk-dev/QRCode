/**
 * In-memory doubles for the renewal engine (billing spec §15.1):
 * `memoryRenewalStore()` mirrors the Prisma store's conditional-update
 * semantics (atomic between awaits, like SQL), `fakeSettle()` is an
 * idempotent claim like production, and `paymentListHandler()` answers
 * PaymentList from a per-clientRefCode row table.
 */

import { canTransition, isRenewalState, TERMINAL_STATES, type RenewalState } from '../../src/lib/billing/renewal-policy';
import type {
  NewRenewal,
  OptOutReason,
  PaymentToConfirm,
  RenewalContext,
  RenewalPatch,
  RenewalRow,
  RenewalStore,
  TombstoneRow,
} from '../../src/lib/billing/renewal-store';
import type { SettleDecision, SettleResult } from '../../src/lib/billing/paynkolay-billing';
import type { BillingEnv } from '../../src/lib/billing/flags';
import type { FakeHandler } from './paynkolay-fakes';

const DAY_MS = 24 * 60 * 60_000;
const HOSTED = new Set(['checkout', 'renewal_link']);
const RECHECKABLE = new Set(['transaction_not_found', 'no_transaction', 'abandoned']);

export interface MemPayment {
  id: string;
  userId: string;
  kind: string;
  status: string;
  providerEnv: BillingEnv | null;
  renewalId: string | null;
  attemptNo: number | null;
  amountMinor: number;
  createdAt: Date;
  completedAt: Date | null;
  confirmAfter: Date | null;
  confirmAttempts: number;
  providerOutcome: string | null;
  providerDeclineCode: string | null;
  failureReason: string | null;
  refundOnSuccess: boolean;
  refundState: string | null;
  refundReason: string | null;
}

export interface MemSubscription {
  status: string;
  renewsAt: Date | null;
  autoRenew: boolean;
  /** Scheduling inputs (defaults: paynkolay, monthly, plan_1, no consent). */
  source?: string;
  billingCycle?: string;
  subscriptionPlanId?: string | null;
  cancelAtPeriodEnd?: boolean;
  autoRenewConsentId?: string | null;
}

/** Owner data for loadRenewalContext (mail target, plan price, cards). */
export interface MemOwner {
  email: string;
  locale: 'tr' | 'en';
  firstName?: string | null;
  isActive?: boolean;
  scheduledDeletionAt?: Date | null;
  planName?: string;
  planActive?: boolean;
  amountMinor?: number | null;
  savedCardLast4?: string | null;
  consent?: RenewalContext['consent'];
  boundCard?: RenewalContext['boundCard'];
}

export function makePayment(p: Partial<MemPayment> & { id: string; userId: string }): MemPayment {
  return {
    kind: 'checkout',
    status: 'pending',
    providerEnv: 'live',
    renewalId: null,
    attemptNo: null,
    amountMinor: 99900,
    createdAt: new Date(),
    completedAt: null,
    confirmAfter: null,
    confirmAttempts: 0,
    providerOutcome: null,
    providerDeclineCode: null,
    failureReason: null,
    refundOnSuccess: false,
    refundState: null,
    refundReason: null,
    ...p,
  };
}

export function makeRenewal(r: Partial<RenewalRow> & { id: string; userId: string; periodEnd: Date }): RenewalRow {
  return {
    providerEnv: 'live',
    subscriptionPlanId: 'plan_1',
    billingCycle: 'monthly',
    mode: 'reminder',
    modeReason: null,
    state: 'scheduled',
    attempts: 0,
    maxAttempts: 3,
    nextAttemptAt: null,
    confirmAfter: null,
    lockedUntil: null,
    leaseId: null,
    graceEndsAt: null,
    consentId: null,
    chargeCardId: null,
    quotedAmountMinor: null,
    noticeClaimedAt: null,
    noticeDeliveredAt: null,
    noticeCardId: null,
    lastCallClaimedAt: null,
    pendingMail: null,
    ownerPaymentId: null,
    ownerPrevState: null,
    cancelRequestedAt: null,
    dunningStep: 0,
    manualReviewAt: null,
    succeededPaymentId: null,
    endedAt: null,
    endReason: null,
    updatedAt: new Date(),
    ...r,
  };
}

export interface MemoryStore extends RenewalStore {
  payments: MemPayment[];
  renewals: RenewalRow[];
  subscriptions: Map<string, MemSubscription>;
  owners: Map<string, MemOwner>;
  /** Payments whose card save is unconfirmed (listPendingCardSaves). */
  pendingCardSaves: string[];
  /** Payments whose D1 clean-up is still owed (listCardCleanupsOwed). */
  cardCleanupsOwed: string[];
  tombstones: (TombstoneRow & { state: string; nextAttemptAt: Date; lastError: string | null; manualSince: Date | null })[];
  optOuts: { userId: string; reason: OptOutReason }[];
}

function envMatches(rowEnv: BillingEnv | null, env: BillingEnv): boolean {
  return (rowEnv ?? 'live') === env;
}

export function memoryRenewalStore(clock: () => Date): MemoryStore {
  const payments: MemPayment[] = [];
  const renewals: RenewalRow[] = [];
  const subscriptions = new Map<string, MemSubscription>();
  const tombstones: MemoryStore['tombstones'] = [];
  const optOuts: MemoryStore['optOuts'] = [];
  const owners = new Map<string, MemOwner>();
  const pendingCardSaves: string[] = [];
  const cardCleanupsOwed: string[] = [];
  let seq = 0;

  const store: MemoryStore = {
    payments,
    renewals,
    subscriptions,
    tombstones,
    optOuts,
    owners,
    pendingCardSaves,
    cardCleanupsOwed,

    async findSubscriptionsToSchedule(now, limit, includeNonConsented) {
      const to = now.getTime() + 7 * DAY_MS;
      const from = now.getTime() - 5 * DAY_MS;
      const out: { userId: string; renewsAt: Date }[] = [];
      for (const [userId, s] of subscriptions) {
        if ((s.source ?? 'paynkolay') !== 'paynkolay' || !['active', 'past_due'].includes(s.status) || !s.renewsAt) continue;
        const t = s.renewsAt.getTime();
        if (t > to) continue;
        const consented = !!s.autoRenewConsentId && t >= from;
        const other = includeNonConsented && t > now.getTime();
        if (!consented && !other) continue;
        if (renewals.some((r) => r.userId === userId && r.periodEnd.getTime() === t)) continue;
        out.push({ userId, renewsAt: s.renewsAt });
      }
      return out.sort((a, b) => a.renewsAt.getTime() - b.renewsAt.getTime()).slice(0, limit);
    },
    async loadRenewalContext(userId): Promise<RenewalContext | null> {
      const s = subscriptions.get(userId);
      const o = owners.get(userId);
      if (!s || !o) return null;
      return {
        sub: {
          source: s.source ?? 'paynkolay',
          status: s.status,
          autoRenew: s.autoRenew,
          cancelAtPeriodEnd: s.cancelAtPeriodEnd ?? false,
          billingCycle: s.billingCycle ?? 'monthly',
          renewsAt: s.renewsAt,
          subscriptionPlanId: s.subscriptionPlanId === undefined ? 'plan_1' : s.subscriptionPlanId,
          autoRenewConsentId: s.autoRenewConsentId ?? null,
        },
        user: {
          userId,
          email: o.email,
          locale: o.locale,
          firstName: o.firstName ?? null,
          isActive: o.isActive ?? true,
          deactivatedAt: null,
          scheduledDeletionAt: o.scheduledDeletionAt ?? null,
        },
        plan: { id: 'plan_1', name: o.planName ?? 'Büyüme', isActive: o.planActive ?? true, amountMinor: o.amountMinor === undefined ? 99900 : o.amountMinor },
        consent: o.consent ?? null,
        boundCard: o.boundCard ?? null,
        savedCard: o.savedCardLast4 ? { last4: o.savedCardLast4 } : null,
      };
    },
    async createRenewal(row: NewRenewal) {
      if (renewals.some((r) => r.userId === row.userId && r.periodEnd.getTime() === row.periodEnd.getTime())) return 'exists';
      seq += 1;
      const created = makeRenewal({ id: `r_new_${seq}`, ...row, updatedAt: clock() });
      renewals.push(created);
      return { ...created };
    },
    async claimMail(id, slot, now) {
      const r = renewals.find((x) => x.id === id);
      if (!r) return false;
      const field = slot === 'notice' ? 'noticeClaimedAt' : 'lastCallClaimedAt';
      if (r[field] !== null) return false;
      r[field] = now;
      return true;
    },
    async releaseMailClaim(id, slot) {
      const r = renewals.find((x) => x.id === id);
      if (r) r[slot === 'notice' ? 'noticeClaimedAt' : 'lastCallClaimedAt'] = null;
    },
    async clearPendingMail(id, mail) {
      const r = renewals.find((x) => x.id === id && x.pendingMail === mail);
      if (r) r.pendingMail = null;
    },
    async listCardCleanupsOwed(_env, _now, limit) {
      return cardCleanupsOwed.slice(0, limit).map((id) => ({ id }));
    },
    async listPendingCardSaves(_env, _now, limit) {
      return pendingCardSaves.slice(0, limit).map((id) => ({ id }));
    },

    async listRenewals(filter, limit) {
      return renewals
        .filter(
          (r) =>
            filter.states.includes(r.state) &&
            r.providerEnv === filter.providerEnv &&
            (!filter.dueBefore || (r.nextAttemptAt && r.nextAttemptAt <= filter.dueBefore)) &&
            (!filter.confirmBefore || (r.confirmAfter && r.confirmAfter <= filter.confirmBefore)) &&
            (!filter.withPendingMail || r.pendingMail !== null) &&
            (!filter.lockedBefore || (r.lockedUntil && r.lockedUntil < filter.lockedBefore)),
        )
        .slice(0, limit)
        .map((r) => ({ ...r }));
    },
    async getRenewal(id) {
      const r = renewals.find((x) => x.id === id);
      return r ? { ...r } : null;
    },
    async renewalForPayment(payment) {
      const r = payment.renewalId
        ? renewals.find((x) => x.id === payment.renewalId)
        : renewals.find((x) => x.ownerPaymentId === payment.id);
      return r ? { ...r } : null;
    },
    async transition(id, from, patch: RenewalPatch, leaseId) {
      const r = renewals.find((x) => x.id === id);
      if (!r || !from.includes(r.state)) return false;
      if (leaseId && r.leaseId !== leaseId) return false;
      if (patch.state && !canTransition(r.state, patch.state)) return false;
      if (!patch.state && TERMINAL_STATES.has(r.state)) return false;
      const { lastFailureCode: _a, lastFailureKind: _b, cancelReason: _c, ...rest } = patch;
      void _a;
      void _b;
      void _c;
      Object.assign(r, rest, { updatedAt: clock() });
      return true;
    },
    async releaseOwnerPaying(renewalId, paymentId) {
      const r = renewals.find((x) => x.id === renewalId);
      if (!r || r.state !== 'owner_paying' || r.ownerPaymentId !== paymentId) return false;
      const prev: RenewalState = r.ownerPrevState && isRenewalState(r.ownerPrevState) ? r.ownerPrevState : 'scheduled';
      Object.assign(r, { state: prev, ownerPaymentId: null, ownerPrevState: null, lockedUntil: null });
      return true;
    },
    async paymentsForRenewal(renewalId) {
      return payments
        .filter((p) => p.renewalId === renewalId)
        .map((p) => ({
          id: p.id,
          attemptNo: p.attemptNo,
          kind: p.kind,
          status: p.status,
          providerOutcome: p.providerOutcome,
          failureReason: p.failureReason,
          amountMinor: p.amountMinor,
          createdAt: p.createdAt,
        }));
    },
    async subscriptionSnapshot(userId) {
      const s = subscriptions.get(userId);
      return s ? { ...s } : null;
    },
    async listPaymentsToConfirm(env, now, limit): Promise<PaymentToConfirm[]> {
      return payments
        .filter(
          (p) =>
            p.status === 'pending' &&
            envMatches(p.providerEnv, env) &&
            p.createdAt.getTime() >= now.getTime() - 7 * DAY_MS &&
            ((p.confirmAfter && p.confirmAfter <= now) ||
              (!p.confirmAfter && HOSTED.has(p.kind) && p.createdAt.getTime() <= now.getTime() - 30 * 60_000)),
        )
        .slice(0, limit)
        .map((p) => ({ ...p }));
    },
    async listFailedToRecheck(env, now, limit) {
      return payments
        .filter(
          (p) =>
            p.status === 'failed' &&
            RECHECKABLE.has(p.failureReason ?? '') &&
            envMatches(p.providerEnv, env) &&
            p.createdAt.getTime() >= now.getTime() - 7 * DAY_MS &&
            (!p.confirmAfter || p.confirmAfter <= now),
        )
        .slice(0, limit)
        .map((p) => ({ ...p }));
    },
    async markRechecked(id, nextAt) {
      const p = payments.find((x) => x.id === id && x.status === 'failed');
      if (p) p.confirmAfter = nextAt;
    },
    async markPaymentFailed(id, reason, now) {
      const p = payments.find((x) => x.id === id && x.status === 'pending');
      if (!p) return false;
      Object.assign(p, { status: 'failed', failureReason: reason, completedAt: now, confirmAfter: new Date(now.getTime() + 6 * 3600_000) });
      return true;
    },
    async markPaymentNeedsReview(id, reason, refundReason) {
      const p = payments.find((x) => x.id === id && (x.status === 'pending' || x.status === 'failed'));
      if (!p) return false;
      Object.assign(p, { status: 'needs_review', failureReason: reason });
      if (refundReason) Object.assign(p, { refundState: 'required', refundReason });
      return true;
    },
    async deferPaymentConfirm(id, nextAt) {
      const p = payments.find((x) => x.id === id && x.status === 'pending');
      if (p) {
        p.confirmAfter = nextAt;
        p.confirmAttempts += 1;
      }
    },
    async paymentsByIds(ids) {
      return payments.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, status: p.status, kind: p.kind, amountMinor: p.amountMinor }));
    },
    async markRefundRequired(id, reason) {
      const p = payments.find((x) => x.id === id && x.refundState === null);
      if (p) Object.assign(p, { refundState: 'required', refundReason: reason });
    },
    async disableAutoRenew(userId, reason) {
      optOuts.push({ userId, reason });
      const s = subscriptions.get(userId);
      const changed = !!s?.autoRenew;
      if (s) s.autoRenew = false;
      return { changed, chargeInProgress: false };
    },
    async listDueTombstones(env, now, limit) {
      return tombstones
        .filter((t) => t.state === 'open' && t.providerEnv === env && t.nextAttemptAt <= now)
        .slice(0, limit)
        .map((t) => ({ id: t.id, providerEnv: t.providerEnv, customerKeyEnc: t.customerKeyEnc, aadUserId: t.aadUserId, attempts: t.attempts, createdAt: t.createdAt }));
    },
    async deleteTombstone(id) {
      const i = tombstones.findIndex((t) => t.id === id);
      if (i >= 0) tombstones.splice(i, 1);
    },
    async deferTombstone(id, patch) {
      const t = tombstones.find((x) => x.id === id);
      if (t) Object.assign(t, patch, { state: patch.manualSince ? 'manual' : 'open' });
    },
    async hostedPaymentStats(env, since) {
      const rows = payments.filter((p) => HOSTED.has(p.kind) && p.createdAt >= since && envMatches(p.providerEnv, env));
      const declined = rows.filter((p) => p.status === 'failed' && !RECHECKABLE.has(p.failureReason ?? ''));
      const perUser = new Map<string, number>();
      for (const p of declined) perUser.set(p.userId, (perUser.get(p.userId) ?? 0) + 1);
      return {
        total: rows.filter((p) => p.status !== 'pending').length,
        failed: declined.length,
        maxFailedPerUser: Math.max(0, ...perUser.values()),
      };
    },
    async countOverdueRefunds(before) {
      return payments.filter((p) => p.refundState === 'required' && (p.completedAt ?? p.createdAt) <= before).length;
    },
  };
  return store;
}

/** Idempotent settle like production: claims pending/failed → succeeded once. */
export function fakeSettle(store: MemoryStore): ((id: string, d: SettleDecision) => Promise<SettleResult>) & { calls: string[] } {
  const calls: string[] = [];
  const fn = (async (id: string): Promise<SettleResult> => {
    calls.push(id);
    const p = store.payments.find((x) => x.id === id);
    if (!p || (p.status !== 'pending' && p.status !== 'failed')) return 'already';
    p.status = 'succeeded';
    if (p.userId.startsWith('del_')) {
      p.status = 'needs_review';
      return 'review';
    }
    return 'succeeded';
  }) as unknown as ((id: string, d: SettleDecision) => Promise<SettleResult>) & { calls: string[] };
  fn.calls = calls;
  return fn;
}

export interface PaymentListRow {
  CLIENT_REFERENCE_CODE?: string;
  REFERENCE_CODE?: string;
  STATUS: string;
  TRANSACTION_TYPE?: string;
  AUTHORIZATION_AMOUNT?: string;
  [key: string]: string | undefined;
}

/** PaymentList answers: rows per clientRefCode (any request may also see `alsoReturn` foreign rows). */
export function paymentListHandler(
  rowsByRef: Map<string, PaymentListRow[]>,
  opts: { alsoReturn?: PaymentListRow[]; fail?: () => boolean } = {},
): FakeHandler {
  return (form) => {
    if (opts.fail?.()) return { status: 502, contentType: 'text/html', text: '<html>bad gateway</html>' };
    const rows = [...(rowsByRef.get(form.clientRefCode) ?? []), ...(opts.alsoReturn ?? [])];
    if (rows.length === 0) return { body: { result: { LIST: null, ERROR_CODE: 'CORE0305' } } };
    return { body: { result: { LIST: rows } } };
  };
}

export function successRow(clientRef: string, amount: string, extra: Partial<PaymentListRow> = {}): PaymentListRow {
  return {
    CLIENT_REFERENCE_CODE: clientRef,
    REFERENCE_CODE: `R-${clientRef}`,
    STATUS: 'SUCCESS',
    TRANSACTION_TYPE: 'SALES',
    AUTHORIZATION_AMOUNT: amount,
    ...extra,
  };
}
