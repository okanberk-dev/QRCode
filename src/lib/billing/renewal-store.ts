import type { BillingEnv } from './flags';
import type { RenewalEvalInput, RenewalState } from './renewal-policy';

/**
 * Storage interface of the renewal engine (billing spec §6.1). The Prisma
 * implementation lives in `renewal-store-prisma.ts`; tests use an in-memory
 * store with the same conditional-update semantics.
 *
 * The foundation carries the methods the reconcile, lapse, tombstone, scan
 * and opt-out paths need; saved cards add scheduling and reminder mails
 * (`findSubscriptionsToSchedule`, `loadRenewalContext`, `createRenewal`,
 * `claimMail`, …). The charge methods of §6.1 (`claimForCharge`,
 * `createRenewalPayment`, `recordChargeOutcome`) arrive with the charge phase.
 * The owner_paying lock (D19) is written by the checkout POST transaction.
 *
 * Every provider-facing listing is scoped to one PayNKolay environment; rows
 * whose `provider_env` is NULL (created before saved cards) count as `live`.
 */

export interface RenewalRow {
  id: string;
  userId: string;
  providerEnv: BillingEnv;
  periodEnd: Date;
  subscriptionPlanId: string | null;
  billingCycle: string;
  mode: 'auto' | 'reminder';
  modeReason: string | null;
  state: RenewalState;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date | null;
  confirmAfter: Date | null;
  lockedUntil: Date | null;
  leaseId: string | null;
  graceEndsAt: Date | null;
  consentId: string | null;
  chargeCardId: string | null;
  quotedAmountMinor: number | null;
  noticeClaimedAt: Date | null;
  noticeDeliveredAt: Date | null;
  noticeCardId: string | null;
  lastCallClaimedAt: Date | null;
  pendingMail: string | null;
  ownerPaymentId: string | null;
  ownerPrevState: RenewalState | null;
  cancelRequestedAt: Date | null;
  dunningStep: number;
  manualReviewAt: Date | null;
  succeededPaymentId: string | null;
  endedAt: Date | null;
  endReason: string | null;
  updatedAt: Date;
}

export type RenewalPatch = Partial<
  Pick<
    RenewalRow,
    | 'mode'
    | 'modeReason'
    | 'state'
    | 'attempts'
    | 'nextAttemptAt'
    | 'confirmAfter'
    | 'lockedUntil'
    | 'leaseId'
    | 'graceEndsAt'
    | 'pendingMail'
    | 'ownerPaymentId'
    | 'ownerPrevState'
    | 'cancelRequestedAt'
    | 'manualReviewAt'
    | 'succeededPaymentId'
    | 'endedAt'
    | 'endReason'
  >
> & {
  lastFailureCode?: string | null;
  lastFailureKind?: 'soft' | 'hard' | null;
  cancelReason?: string | null;
};

export interface PaymentToConfirm {
  id: string;
  userId: string;
  kind: string;
  renewalId: string | null;
  amountMinor: number;
  createdAt: Date;
  confirmAfter: Date | null;
  confirmAttempts: number;
  providerOutcome: string | null;
  providerDeclineCode: string | null;
}

export interface FailedPaymentToRecheck {
  id: string;
  userId: string;
  kind: string;
  renewalId: string | null;
  amountMinor: number;
  createdAt: Date;
}

export interface RenewalPaymentRow {
  id: string;
  attemptNo: number | null;
  kind: string;
  status: string;
  providerOutcome: string | null;
  failureReason: string | null;
  amountMinor: number;
  createdAt: Date;
}

export interface TombstoneRow {
  id: string;
  providerEnv: BillingEnv;
  customerKeyEnc: string;
  aadUserId: string;
  attempts: number;
  createdAt: Date;
}

export interface HostedPaymentStats {
  total: number;
  failed: number;
  /** Highest number of failed hosted payments of a single account in the window. */
  maxFailedPerUser: number;
}

export interface StoredPaymentSummary {
  id: string;
  status: string;
  kind: string;
  amountMinor: number;
}

export interface SubscriptionSnapshot {
  status: string;
  renewsAt: Date | null;
  autoRenew: boolean;
}

export interface ScheduleCandidate {
  userId: string;
  renewsAt: Date;
}

/** Everything `evaluateRenewal` and the reminder mails need about one owner (fresh read). */
export interface RenewalContext {
  sub: RenewalEvalInput['sub'] & { autoRenewConsentId: string | null };
  user: RenewalEvalInput['user'] & { email: string; locale: 'tr' | 'en'; firstName: string | null };
  plan: { id: string; name: string; isActive: boolean; amountMinor: number | null } | null;
  consent: RenewalEvalInput['consent'];
  /** billing_cards row bound to the consent, not deleted. */
  boundCard: { id: string; last4: string | null } | null;
  /** The newest verified saved card (display only). */
  savedCard: { last4: string | null } | null;
}

export interface NewRenewal {
  userId: string;
  providerEnv: BillingEnv;
  periodEnd: Date;
  subscriptionPlanId: string | null;
  billingCycle: string;
  mode: 'auto' | 'reminder';
  modeReason: string | null;
  nextAttemptAt: Date | null;
  consentId: string | null;
  graceEndsAt: Date | null;
}

/** `notice` = the auto notice / reminder_7 slot; `last_call` = reminder_1. */
export type MailSlot = 'notice' | 'last_call';

export type OptOutReason =
  | 'owner_off'
  | 'card_removed'
  | 'provider_missing'
  | 'plan_changed'
  | 'price_increase'
  | 'admin_override'
  | 'account_deletion'
  | 'retention';

export interface RenewalStore {
  // ── Renewals ──
  listRenewals(
    filter: {
      states: RenewalState[];
      providerEnv: BillingEnv;
      dueBefore?: Date;
      confirmBefore?: Date;
      lockedBefore?: Date;
      /** Only rows with a queued mail (`pendingMail` set). */
      withPendingMail?: boolean;
    },
    limit: number,
  ): Promise<RenewalRow[]>;

  // ── Scheduling and reminder mails (phases 2-3) ──
  /**
   * PayNKolay subscriptions (active | past_due) whose period ends within the
   * next 7 days and that have no renewal row for that period yet. Consented
   * subscriptions always (also up to 5 days after the period end, for their
   * grace); others only when `includeNonConsented` (card storage intended,
   * O-2) and only before the period end.
   */
  findSubscriptionsToSchedule(now: Date, limit: number, includeNonConsented: boolean): Promise<ScheduleCandidate[]>;
  loadRenewalContext(userId: string): Promise<RenewalContext | null>;
  /** Unique (userId, periodEnd): a second insert answers 'exists'. */
  createRenewal(row: NewRenewal): Promise<RenewalRow | 'exists'>;
  /** UPDATE … SET <slot>_claimed_at = now WHERE <slot>_claimed_at IS NULL; false when already claimed. */
  claimMail(id: string, slot: MailSlot, now: Date): Promise<boolean>;
  /** The mailer did not accept the message: the slot is free again for the next tick. */
  releaseMailClaim(id: string, slot: MailSlot): Promise<void>;
  /** Clears a queued mail once it was sent (only while it is still `mail`). */
  clearPendingMail(id: string, mail: string): Promise<void>;
  /** Succeeded payments that saved a card whose save is still unconfirmed (cardSaveResult 'pending'), own env, < 7 days. */
  listPendingCardSaves(env: BillingEnv, now: Date, limit: number): Promise<{ id: string }[]>;
  /**
   * D1 clean-up still owed: the owner's newest verified save (cardSaveResult 'saved', own env, < 7 days)
   * whose card is live while another live, unbound card of the owner is still in the mirror.
   */
  listCardCleanupsOwed(env: BillingEnv, now: Date, limit: number): Promise<{ id: string }[]>;
  getRenewal(id: string): Promise<RenewalRow | null>;
  /** The renewal a payment belongs to: by `renewalId`, else the one whose `ownerPaymentId` is the payment. */
  renewalForPayment(payment: { id: string; renewalId: string | null }): Promise<RenewalRow | null>;
  /** Conditional transition: WHERE id AND state IN (from) [AND lease_id = leaseId]; canTransition() asserted; false when nothing matched. */
  transition(id: string, from: RenewalState[], patch: RenewalPatch, leaseId?: string): Promise<boolean>;
  /** D19: owner_paying → ownerPrevState, owner fields cleared; only while ownerPaymentId = paymentId. */
  releaseOwnerPaying(renewalId: string, paymentId: string): Promise<boolean>;
  paymentsForRenewal(renewalId: string): Promise<RenewalPaymentRow[]>;
  subscriptionSnapshot(userId: string): Promise<SubscriptionSnapshot | null>;

  // ── Payments ──
  /** status pending and (confirmAfter ≤ now, or hosted kinds ≥ 30 min old), at most 7 days old, own env. */
  listPaymentsToConfirm(env: BillingEnv, now: Date, limit: number): Promise<PaymentToConfirm[]>;
  /** status failed with reason transaction_not_found | no_transaction | abandoned, < 7 days old, not re-checked within 6 h. */
  listFailedToRecheck(env: BillingEnv, now: Date, limit: number): Promise<FailedPaymentToRecheck[]>;
  /** The late-success re-check of a failed payment ran: next one no earlier than `nextAt`. */
  markRechecked(id: string, nextAt: Date): Promise<void>;
  /** WHERE status = 'pending'. */
  markPaymentFailed(id: string, reason: string, now: Date): Promise<boolean>;
  /** WHERE status IN ('pending','failed'); sets refundState 'required' when a refund reason is given. */
  markPaymentNeedsReview(id: string, reason: string, refundReason: string | null): Promise<boolean>;
  /** PaymentList could not be asked: confirmAfter = nextAt, confirmAttempts + 1. */
  deferPaymentConfirm(id: string, nextAt: Date): Promise<void>;
  paymentsByIds(ids: string[]): Promise<StoredPaymentSummary[]>;
  /** Refund queue (§11.7): refundState 'required' unless already set. */
  markRefundRequired(id: string, reason: string): Promise<void>;

  // ── Opt-out (§9.3) ──
  /**
   * ONE transaction with the subscription row locked FOR UPDATE: consent off
   * row, autoRenew=false, bound card unbound; renewals in charging without a
   * payment row get cancel_requested_at; in-flight payments get
   * refund_on_success; other open renewals switch to reminder mode (grace
   * cleared before E, kept after).
   */
  disableAutoRenew(
    userId: string,
    reason: OptOutReason,
    actor: 'owner' | 'system' | 'admin',
    now: Date,
    evidence?: { authMethod?: string; ip?: string | null; ua?: string | null },
  ): Promise<{ changed: boolean; chargeInProgress: boolean }>;

  // ── Erasure tombstones (§11.6, phase 6) ──
  listDueTombstones(env: BillingEnv, now: Date, limit: number): Promise<TombstoneRow[]>;
  deleteTombstone(id: string): Promise<void>;
  deferTombstone(
    id: string,
    patch: { attempts: number; nextAttemptAt: Date; lastError: string; manualSince: Date | null },
  ): Promise<void>;

  // ── Daily scans (phase 7) ──
  hostedPaymentStats(env: BillingEnv, since: Date): Promise<HostedPaymentStats>;
  countOverdueRefunds(before: Date): Promise<number>;
}
