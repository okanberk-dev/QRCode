import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BillingEnv } from './flags';
import { canTransition, isRenewalState, RENEWAL_POLICY, TERMINAL_STATES, type RenewalState } from './renewal-policy';
import type {
  FailedPaymentToRecheck,
  HostedPaymentStats,
  OptOutReason,
  PaymentToConfirm,
  RenewalPaymentRow,
  RenewalRow,
  RenewalStore,
  StoredPaymentSummary,
  SubscriptionSnapshot,
  TombstoneRow,
} from './renewal-store';

/**
 * Prisma implementation of `RenewalStore` (billing spec §6.1). Conditional
 * updates use `updateMany` with the expected state in the WHERE clause, so
 * two writers can never both win; reads use an explicit `select` (§14.1).
 * Sequential calls only (Supabase pooler `connection_limit=1`, §40.1).
 */

const DAY_MS = 24 * 60 * 60_000;
const HOSTED_KINDS = ['checkout', 'renewal_link'];
/** Failure reasons that only mean "PaymentList did not know the payment yet". */
export const RECHECKABLE_FAILURES = ['transaction_not_found', 'no_transaction', 'abandoned'];
const CONSENT_IP_RETENTION_MS = 540 * DAY_MS;

const RENEWAL_SELECT = {
  id: true,
  userId: true,
  providerEnv: true,
  periodEnd: true,
  subscriptionPlanId: true,
  billingCycle: true,
  mode: true,
  modeReason: true,
  state: true,
  attempts: true,
  maxAttempts: true,
  nextAttemptAt: true,
  confirmAfter: true,
  lockedUntil: true,
  leaseId: true,
  graceEndsAt: true,
  consentId: true,
  chargeCardId: true,
  quotedAmountMinor: true,
  noticeClaimedAt: true,
  noticeDeliveredAt: true,
  noticeCardId: true,
  lastCallClaimedAt: true,
  pendingMail: true,
  ownerPaymentId: true,
  ownerPrevState: true,
  cancelRequestedAt: true,
  dunningStep: true,
  manualReviewAt: true,
  succeededPaymentId: true,
  endedAt: true,
  endReason: true,
  updatedAt: true,
} as const;

type RenewalRecord = Prisma.BillingRenewalGetPayload<{ select: typeof RENEWAL_SELECT }>;

function toRenewalRow(r: RenewalRecord): RenewalRow {
  if (!isRenewalState(r.state)) throw new Error('billing renewal: unknown state');
  return {
    ...r,
    providerEnv: r.providerEnv === 'test' ? 'test' : 'live',
    mode: r.mode === 'auto' ? 'auto' : 'reminder',
    state: r.state,
    ownerPrevState: isRenewalState(r.ownerPrevState) ? r.ownerPrevState : null,
  };
}

/** Rows of `env`; NULL provider_env (created before saved cards) counts as live. */
export function paymentEnvFilter(env: BillingEnv): Prisma.BillingPaymentWhereInput {
  return env === 'live' ? { OR: [{ providerEnv: 'live' }, { providerEnv: null }] } : { providerEnv: env };
}

function refundReasonFor(reason: OptOutReason): string {
  return reason === 'owner_off' ? 'owner_opt_out' : reason;
}

// 12+ digits, optionally separated by single spaces or dashes (a PAN typed with
// separators). Dots are not separators here: user agents carry dotted versions.
// Same pattern as the billing_consents_no_pan_grouped_ua CHECK.
const UA_PAN_RUN = /[0-9](?:[ -]?[0-9]){11,}/g;

export function stripDigitRuns(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const out = value.replace(UA_PAN_RUN, '').slice(0, max).trim();
  // Defensive: if removing one run ever joined digits into another, store nothing.
  if (new RegExp(UA_PAN_RUN.source).test(out)) return null;
  return out || null;
}

export function createPrismaRenewalStore(db: PrismaClient = prisma): RenewalStore {
  return {
    async listRenewals(filter, limit) {
      const rows = await db.billingRenewal.findMany({
        where: {
          state: { in: filter.states },
          providerEnv: filter.providerEnv,
          ...(filter.dueBefore ? { nextAttemptAt: { lte: filter.dueBefore } } : {}),
          ...(filter.confirmBefore ? { confirmAfter: { lte: filter.confirmBefore } } : {}),
          ...(filter.lockedBefore ? { lockedUntil: { lt: filter.lockedBefore } } : {}),
        },
        orderBy: { periodEnd: 'asc' },
        take: limit,
        select: RENEWAL_SELECT,
      });
      return rows.map(toRenewalRow);
    },

    async getRenewal(id) {
      const row = await db.billingRenewal.findUnique({ where: { id }, select: RENEWAL_SELECT });
      return row ? toRenewalRow(row) : null;
    },

    async renewalForPayment(payment) {
      const row = payment.renewalId
        ? await db.billingRenewal.findUnique({ where: { id: payment.renewalId }, select: RENEWAL_SELECT })
        : await db.billingRenewal.findFirst({ where: { ownerPaymentId: payment.id }, select: RENEWAL_SELECT });
      return row ? toRenewalRow(row) : null;
    },

    async transition(id, from, patch, leaseId) {
      const allowed = patch.state ? from.filter((state) => canTransition(state, patch.state as RenewalState)) : from.filter((s) => !TERMINAL_STATES.has(s));
      if (allowed.length === 0) return false;
      const res = await db.billingRenewal.updateMany({
        where: { id, state: { in: allowed }, ...(leaseId ? { leaseId } : {}) },
        data: patch,
      });
      return res.count === 1;
    },

    async releaseOwnerPaying(renewalId, paymentId) {
      const row = await db.billingRenewal.findFirst({
        where: { id: renewalId, state: 'owner_paying', ownerPaymentId: paymentId },
        select: { ownerPrevState: true },
      });
      if (!row) return false;
      const prev: RenewalState =
        isRenewalState(row.ownerPrevState) && row.ownerPrevState !== 'owner_paying' && canTransition('owner_paying', row.ownerPrevState)
          ? row.ownerPrevState
          : 'scheduled';
      const res = await db.billingRenewal.updateMany({
        where: { id: renewalId, state: 'owner_paying', ownerPaymentId: paymentId },
        data: { state: prev, ownerPaymentId: null, ownerPrevState: null, lockedUntil: null },
      });
      return res.count === 1;
    },

    async paymentsForRenewal(renewalId) {
      const rows: RenewalPaymentRow[] = await db.billingPayment.findMany({
        where: { renewalId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          attemptNo: true,
          kind: true,
          status: true,
          providerOutcome: true,
          failureReason: true,
          amountMinor: true,
          createdAt: true,
        },
      });
      return rows;
    },

    async subscriptionSnapshot(userId): Promise<SubscriptionSnapshot | null> {
      return db.billingSubscription.findUnique({
        where: { userId },
        select: { status: true, renewsAt: true, autoRenew: true },
      });
    },

    async listPaymentsToConfirm(env, now, limit): Promise<PaymentToConfirm[]> {
      return db.billingPayment.findMany({
        where: {
          status: 'pending',
          createdAt: { gte: new Date(now.getTime() - RENEWAL_POLICY.recheckFailedDays * DAY_MS) },
          AND: [
            paymentEnvFilter(env),
            {
              OR: [
                { confirmAfter: { lte: now } },
                {
                  confirmAfter: null,
                  kind: { in: HOSTED_KINDS },
                  createdAt: { lte: new Date(now.getTime() - RENEWAL_POLICY.hostedReconcileAfterMs) },
                },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        select: {
          id: true,
          userId: true,
          kind: true,
          renewalId: true,
          amountMinor: true,
          createdAt: true,
          confirmAfter: true,
          confirmAttempts: true,
          providerOutcome: true,
          providerDeclineCode: true,
        },
      });
    },

    async listFailedToRecheck(env, now, limit): Promise<FailedPaymentToRecheck[]> {
      return db.billingPayment.findMany({
        where: {
          status: 'failed',
          failureReason: { in: RECHECKABLE_FAILURES },
          createdAt: { gte: new Date(now.getTime() - RENEWAL_POLICY.recheckFailedDays * DAY_MS) },
          AND: [paymentEnvFilter(env), { OR: [{ confirmAfter: null }, { confirmAfter: { lte: now } }] }],
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        select: { id: true, userId: true, kind: true, renewalId: true, amountMinor: true, createdAt: true },
      });
    },

    async markRechecked(id, nextAt) {
      await db.billingPayment.updateMany({ where: { id, status: 'failed' }, data: { confirmAfter: nextAt } });
    },

    async markPaymentFailed(id, reason, now) {
      const res = await db.billingPayment.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'failed',
          failureReason: reason.slice(0, 120),
          completedAt: now,
          // The late-success re-check (phase 1d) looks again in 6 h at the earliest.
          confirmAfter: new Date(now.getTime() + RENEWAL_POLICY.recheckFailedEveryMs),
        },
      });
      return res.count === 1;
    },

    async markPaymentNeedsReview(id, reason, refundReason) {
      const res = await db.billingPayment.updateMany({
        where: { id, status: { in: ['pending', 'failed'] } },
        data: {
          status: 'needs_review',
          failureReason: reason.slice(0, 120),
          ...(refundReason ? { refundState: 'required', refundReason: refundReason.slice(0, 32) } : {}),
        },
      });
      return res.count === 1;
    },

    async deferPaymentConfirm(id, nextAt) {
      await db.billingPayment.updateMany({
        where: { id, status: 'pending' },
        data: { confirmAfter: nextAt, confirmAttempts: { increment: 1 } },
      });
    },

    async paymentsByIds(ids): Promise<StoredPaymentSummary[]> {
      if (ids.length === 0) return [];
      return db.billingPayment.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, kind: true, amountMinor: true },
      });
    },

    async markRefundRequired(id, reason) {
      await db.billingPayment.updateMany({
        where: { id, refundState: null },
        data: { refundState: 'required', refundReason: reason.slice(0, 32) },
      });
    },

    async disableAutoRenew(userId, reason, actor, now, evidence) {
      return db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "user_id" FROM "billing_subscriptions" WHERE "user_id" = ${userId} FOR UPDATE`;
        const sub = await tx.billingSubscription.findUnique({ where: { userId }, select: { autoRenew: true } });
        const changed = sub?.autoRenew === true;
        if (changed) {
          await tx.billingConsent.create({
            data: {
              userId,
              kind: 'auto_renew_off',
              actor,
              reason,
              authMethod: evidence?.authMethod?.slice(0, 16) ?? null,
              ipAddress: evidence?.ip?.slice(0, 45) ?? null,
              userAgent: stripDigitRuns(evidence?.ua, 255),
              ipPurgeAfter: new Date(now.getTime() + CONSENT_IP_RETENTION_MS),
            },
            select: { id: true },
          });
          await tx.billingSubscription.update({
            where: { userId },
            data: { autoRenew: false, autoRenewChangedAt: now },
            select: { userId: true },
          });
          await tx.billingCard.updateMany({ where: { userId, boundConsentId: { not: null } }, data: { boundConsentId: null } });
        }

        let chargeInProgress = false;
        const open = await tx.billingRenewal.findMany({
          where: { userId, state: { notIn: [...TERMINAL_STATES] } },
          select: { id: true, state: true, attempts: true, periodEnd: true },
        });
        for (const renewal of open) {
          if (renewal.state === 'owner_paying') continue; // the owner is paying for this period themselves
          if (renewal.state === 'charging' || renewal.state === 'awaiting_confirmation' || renewal.state === 'manual_review') {
            const inFlight = await tx.billingPayment.updateMany({
              where: {
                renewalId: renewal.id,
                status: 'pending',
                ...(renewal.state === 'charging' ? { attemptNo: renewal.attempts } : {}),
              },
              data: { refundOnSuccess: true, refundReason: refundReasonFor(reason) },
            });
            if (inFlight.count > 0) {
              chargeInProgress = true;
              continue;
            }
            if (renewal.state === 'charging') {
              // No payment row yet: createRenewalPayment will refuse and no HTTP call is made.
              await tx.billingRenewal.updateMany({
                where: { id: renewal.id, state: 'charging' },
                data: { cancelRequestedAt: now, cancelReason: reason },
              });
              continue;
            }
            if (renewal.state === 'awaiting_confirmation') continue;
          }
          await tx.billingRenewal.updateMany({
            where: { id: renewal.id, state: renewal.state },
            data: {
              mode: 'reminder',
              modeReason: 'auto_renew_off',
              nextAttemptAt: null,
              // Off before E costs nothing and loses that period's grace (D4); after E the running grace is kept.
              ...(now.getTime() < renewal.periodEnd.getTime() ? { graceEndsAt: null } : {}),
            },
          });
        }
        return { changed, chargeInProgress };
      });
    },

    async listDueTombstones(env, now, limit): Promise<TombstoneRow[]> {
      const rows = await db.billingVaultTombstone.findMany({
        where: { state: 'open', providerEnv: env, nextAttemptAt: { lte: now } },
        orderBy: { nextAttemptAt: 'asc' },
        take: limit,
        select: { id: true, providerEnv: true, customerKeyEnc: true, aadUserId: true, attempts: true, createdAt: true },
      });
      return rows.map((r) => ({ ...r, providerEnv: r.providerEnv === 'test' ? 'test' : 'live' }));
    },

    async deleteTombstone(id) {
      await db.billingVaultTombstone.deleteMany({ where: { id } });
    },

    async deferTombstone(id, patch) {
      await db.billingVaultTombstone.updateMany({
        where: { id },
        data: {
          attempts: patch.attempts,
          nextAttemptAt: patch.nextAttemptAt,
          lastError: patch.lastError.slice(0, 40),
          state: patch.manualSince ? 'manual' : 'open',
          manualSince: patch.manualSince,
        },
      });
    },

    async hostedPaymentStats(env, since): Promise<HostedPaymentStats> {
      const base: Prisma.BillingPaymentWhereInput = {
        kind: { in: HOSTED_KINDS },
        createdAt: { gte: since },
        AND: [paymentEnvFilter(env)],
      };
      const total = await db.billingPayment.count({ where: { ...base, status: { not: 'pending' } } });
      const declined: Prisma.BillingPaymentWhereInput = {
        ...base,
        status: 'failed',
        NOT: { failureReason: { in: RECHECKABLE_FAILURES } },
      };
      const failed = await db.billingPayment.count({ where: declined });
      const perUser = await db.billingPayment.groupBy({
        by: ['userId'],
        where: declined,
        _count: { _all: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 1,
      });
      return { total, failed, maxFailedPerUser: perUser[0]?._count._all ?? 0 };
    },

    async countOverdueRefunds(before) {
      return db.billingPayment.count({
        where: {
          refundState: 'required',
          OR: [{ completedAt: { lte: before } }, { completedAt: null, createdAt: { lte: before } }],
        },
      });
    },
  };
}

export const prismaRenewalStore: RenewalStore = createPrismaRenewalStore();

