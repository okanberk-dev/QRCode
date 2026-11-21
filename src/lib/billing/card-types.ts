/**
 * Public shapes of the saved-card APIs (billing spec §6.1, §8.1), shared by
 * the server (card-vault, card-api) and the owner panel. Type-only module:
 * safe to import from client components. Nothing here can ever hold a token,
 * a TranId or a customer key.
 */

export interface PublicSavedCard {
  /** "cd_" + 22 base64url chars: HMAC over the owner id + card identity; meaningless for anyone else. */
  handle: string;
  last4: string | null;
  brand: string | null;
  issuer: string | null;
  expMonth: number | null;
  expYear: number | null;
  expired: boolean;
  expiresBeforeNextCharge: boolean;
  /** Chargeable under the effective auto-renew consent (D1). */
  bound: boolean;
  /** Saved through Buaze's save flow (savedByPaymentId set). */
  verified: boolean;
}

export type AutoRenewStatus = 'off' | 'on' | 'paused' | 'unavailable';

export type RenewalStateName =
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

export interface RenewalNoticeData {
  state: RenewalStateName;
  mode: 'auto' | 'reminder';
  periodEnd: string;
  nextAttemptAt: string | null;
  graceEndsAt: string | null;
  attempts: number;
  maxAttempts: number;
  lastFailureKind: 'soft' | 'hard' | null;
}

export type AutoRenewUnavailable =
  | 'no_card'
  | 'yearly_cycle'
  | 'not_card_subscription'
  | 'subscription_inactive'
  | 'above_non3d_limit'
  | 'plan_unavailable'
  | 'flag_off'
  | 'cancel_at_period_end';

export type StepUpMethodName = 'totp' | 'password' | 'google';

/** The server's auto-renew offer (§8.3 step 4): the exact text the owner confirms, and its terms. */
export interface AutoRenewOfferPublic {
  textVersion: string;
  text: string;
  textHash: string;
  cardHandle: string;
  terms: {
    planId: string;
    planName: string;
    amountMinor: number;
    firstChargeDate: string;
    last4: string | null;
    locale: 'tr' | 'en';
  };
}

export interface PaymentMethodResponse {
  /** flags.cardStorage: the saved-card UI is shown at all. */
  enabled: boolean;
  /** flags.autoCharge: auto-renew can be turned on (in dry run it then reads 'paused'). */
  autoChargeAvailable: boolean;
  /** False during admin impersonation (D8). */
  canManage: boolean;
  /** The account may save a card now (verified e-mail and ≥ 24 h old, §3.3). */
  saveAllowed: boolean;
  /** The bound card, else the newest verified card (D1). */
  card: PublicSavedCard | null;
  /** Every other card: unverified or unbound, display-only, removable. */
  otherCards: PublicSavedCard[];
  autoRenew: {
    status: AutoRenewStatus;
    unavailableReason: null | AutoRenewUnavailable;
    since: string | null;
    nextCharge: { date: string; amountMinor: number; currency: 'TRY' } | null;
    /** Present iff status === 'off' and the subscription can renew automatically. */
    offer: AutoRenewOfferPublic | null;
    stepUp: { required: boolean; method: StepUpMethodName } | null;
    enableVia: 'panel' | 'checkout';
  };
  renewal: RenewalNoticeData | null;
  /** BillingSubscription.renewsAt. */
  accessUntil: string | null;
  /** The provider could not be asked; the mirror is shown as it was. */
  stale?: boolean;
}

export interface DeleteCardResponse {
  ok: true;
  autoRenewDisabled: boolean;
  chargeInProgress: boolean;
  card: null;
}
