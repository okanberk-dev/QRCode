import type { PrismaClient } from '@prisma/client';
import type { DeleteCardResponse, PaymentMethodResponse, PublicSavedCard } from './card-types';
import { deleteOwnerCard, mirrorCards, refreshCards, type VaultDeps } from './card-vault';
import { recordConsent } from './consent';
import type { BillingFlags } from './flags';
import { billingLog } from './redact';
import { isRenewalState, TERMINAL_STATES } from './renewal-policy';
import type { RenewalStore } from './renewal-store';
import { CARD_HANDLE_RE } from './vault-crypto';

/**
 * Cores of the saved-card APIs (billing spec §8.1, §8.2), with injected
 * dependencies so the routes stay thin and the behaviour is tested without
 * HTTP: `GET /api/billing/payment-method` and `DELETE /api/billing/cards/[handle]`.
 * The caller has already passed `requireBillingOwner`.
 *
 * Responses never contain a token, TranId, customer key or any provider
 * text: only the public card projection (last4, brand, issuer, expiry,
 * handle, flags).
 */

export interface CardApiDeps {
  db: PrismaClient;
  flags: BillingFlags;
  /** Present only when saved cards are on (flags.cardStorage + keys + binding). */
  vault: VaultDeps | null;
  store: Pick<RenewalStore, 'disableAutoRenew'>;
  now: () => Date;
  rateLimit: (key: string, max: number, windowMs: number) => Promise<{ allowed: boolean }>;
}

export interface CardApiCaller {
  userId: string;
  canManage: boolean;
}

export interface CoreResponse<T = unknown> {
  status: number;
  body: T;
}

export type { AutoRenewStatus, DeleteCardResponse, PaymentMethodResponse } from './card-types';

const MIN_MS = 60_000;
const HOUR_MS = 60 * MIN_MS;
const MIRROR_MAX_AGE_MS = 24 * HOUR_MS;
const SAVE_MIN_ACCOUNT_AGE_MS = 24 * HOUR_MS;

/** §3.3: a card may be saved only by a verified account at least 24 h old. */
export function saveCardAllowed(user: { emailVerified: boolean; createdAt: Date } | null, now: Date): boolean {
  return !!user && user.emailVerified && user.createdAt.getTime() <= now.getTime() - SAVE_MIN_ACCOUNT_AGE_MS;
}

export interface PaymentMethodInput {
  flags: Pick<BillingFlags, 'cardStorage' | 'autoCharge'>;
  canManage: boolean;
  saveAllowed: boolean;
  cards: PublicSavedCard[];
  subscription: { renewsAt: Date | null; autoRenew: boolean; autoRenewChangedAt: Date | null } | null;
  renewal: {
    state: string;
    mode: string;
    periodEnd: Date;
    nextAttemptAt: Date | null;
    graceEndsAt: Date | null;
    attempts: number;
    maxAttempts: number;
    lastFailureKind: string | null;
  } | null;
  stale?: boolean;
}

/** Pure serializer of `GET /api/billing/payment-method` (tested for leaks). */
export function buildPaymentMethodResponse(input: PaymentMethodInput): PaymentMethodResponse {
  const cards = input.flags.cardStorage ? input.cards : [];
  const card = cards.find((c) => c.bound) ?? cards.find((c) => c.verified) ?? null;
  const otherCards = cards.filter((c) => c !== card);
  const sub = input.subscription;
  const r = input.renewal;
  const renewalState = r && isRenewalState(r.state) ? r.state : null;
  return {
    enabled: input.flags.cardStorage,
    // Auto-renew (consent, step-up, charging) is not part of this release.
    autoChargeAvailable: false,
    canManage: input.canManage,
    saveAllowed: input.saveAllowed,
    card,
    otherCards,
    autoRenew: {
      status: sub?.autoRenew ? 'paused' : 'unavailable',
      unavailableReason: sub?.autoRenew ? null : 'flag_off',
      since: sub?.autoRenew && sub.autoRenewChangedAt ? sub.autoRenewChangedAt.toISOString() : null,
      nextCharge: null,
      offer: null,
      stepUp: null,
      enableVia: 'checkout',
    },
    renewal:
      r && renewalState && !TERMINAL_STATES.has(renewalState)
        ? {
            state: renewalState,
            mode: r.mode === 'auto' ? 'auto' : 'reminder',
            periodEnd: r.periodEnd.toISOString(),
            nextAttemptAt: r.nextAttemptAt ? r.nextAttemptAt.toISOString() : null,
            graceEndsAt: r.graceEndsAt ? r.graceEndsAt.toISOString() : null,
            attempts: r.attempts,
            maxAttempts: r.maxAttempts,
            lastFailureKind: r.lastFailureKind === 'soft' || r.lastFailureKind === 'hard' ? r.lastFailureKind : null,
          }
        : null,
    accessUntil: sub?.renewsAt ? sub.renewsAt.toISOString() : null,
    ...(input.stale ? { stale: true } : {}),
  };
}

const RENEWAL_NOTICE_SELECT = {
  state: true,
  mode: true,
  periodEnd: true,
  nextAttemptAt: true,
  graceEndsAt: true,
  attempts: true,
  maxAttempts: true,
  lastFailureKind: true,
} as const;

/** The open renewal of the subscription's current period (or null). */
export async function openRenewalFor(
  db: Pick<PrismaClient, 'billingRenewal'>,
  userId: string,
  renewsAt: Date | null,
): Promise<PaymentMethodInput['renewal']> {
  if (!renewsAt) return null;
  return db.billingRenewal.findFirst({
    where: { userId, periodEnd: renewsAt, state: { notIn: [...TERMINAL_STATES] } },
    select: RENEWAL_NOTICE_SELECT,
  });
}

/** `GET /api/billing/payment-method[?refresh=1]` (§8.1). */
export async function paymentMethodCore(
  deps: CardApiDeps,
  caller: CardApiCaller,
  opts: { refresh: boolean },
): Promise<CoreResponse<PaymentMethodResponse | { error: string }>> {
  const { db, flags, userId } = { ...deps, userId: caller.userId };
  const now = deps.now();
  if (!(await deps.rateLimit(`billing:pm:${userId}`, 30, MIN_MS)).allowed) return { status: 429, body: { error: 'rate_limited' } };
  if (opts.refresh && !(await deps.rateLimit(`billing:pm-refresh:${userId}`, 6, 10 * MIN_MS)).allowed) {
    return { status: 429, body: { error: 'rate_limited' } };
  }

  const subscription = await db.billingSubscription.findUnique({
    where: { userId },
    select: { renewsAt: true, autoRenew: true, autoRenewChangedAt: true },
  });
  const user = await db.user.findUnique({ where: { id: userId }, select: { emailVerified: true, createdAt: true } });
  const renewal = await openRenewalFor(db, userId, subscription?.renewsAt ?? null);

  let cards: PublicSavedCard[] = [];
  let stale = false;
  if (flags.cardStorage && deps.vault) {
    const customer = await db.billingCustomer.findUnique({ where: { userId }, select: { lastListedAt: true } });
    const mirrorOld = !!customer && (!customer.lastListedAt || customer.lastListedAt.getTime() < now.getTime() - MIRROR_MAX_AGE_MS);
    let refreshed: PublicSavedCard[] | null = null;
    if (opts.refresh || mirrorOld) {
      try {
        refreshed = await refreshCards(deps.vault, userId, subscription?.renewsAt ?? null);
      } catch (err) {
        stale = true;
        billingLog('warn', 'billing.pm_refresh_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
      }
    }
    cards = refreshed ?? (await mirrorCards(db, userId, now, subscription?.renewsAt ?? null));
  }

  const body = buildPaymentMethodResponse({
    flags,
    canManage: caller.canManage,
    saveAllowed: saveCardAllowed(user, now),
    cards,
    subscription,
    renewal,
    stale,
  });
  if (stale && opts.refresh) return { status: 502, body: { error: 'provider_error', ...body } as PaymentMethodResponse & { error: string } };
  return { status: 200, body };
}

/** `DELETE /api/billing/cards/[handle]` (§8.2). The caller passed the guard with mutate + cardStorage. */
export async function deleteCardCore(
  deps: CardApiDeps,
  caller: CardApiCaller,
  handle: string,
): Promise<CoreResponse<DeleteCardResponse | { error: string }>> {
  if (!CARD_HANDLE_RE.test(handle)) return { status: 400, body: { error: 'invalid_handle' } };
  if (!caller.canManage) return { status: 403, body: { error: 'impersonation_blocked' } };
  if (!deps.flags.cardStorage || !deps.vault) return { status: 503, body: { error: 'unavailable' } };
  const { db } = deps;
  const userId = caller.userId;
  if (!(await deps.rateLimit(`billing:card-del:${userId}`, 5, 10 * MIN_MS)).allowed) return { status: 429, body: { error: 'rate_limited' } };

  // 1. Removing the chargeable card turns auto-renew off first (§9.3 lock protocol). Turning off is always safe.
  const mirrorRow = await db.billingCard.findFirst({
    where: { userId, handle, deletedAt: null },
    select: { id: true, boundConsentId: true },
  });
  let autoRenewDisabled = false;
  let chargeInProgress = false;
  if (mirrorRow?.boundConsentId) {
    const res = await deps.store.disableAutoRenew(userId, 'card_removed', 'system', deps.now());
    autoRenewDisabled = res.changed;
    chargeInProgress = res.chargeInProgress;
  }

  // 2. Provider delete, verified by re-list (with this owner's customer key only).
  let result: Awaited<ReturnType<typeof deleteOwnerCard>>;
  try {
    result = await deleteOwnerCard(deps.vault, userId, handle, 'owner');
  } catch (err) {
    billingLog('warn', 'billing.card_delete_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
    return { status: 502, body: { error: 'provider_error' } };
  }
  if (result === 'not_found') return { status: 404, body: { error: 'card_not_found' } };
  if (result === 'unconfirmed') return { status: 502, body: { error: 'delete_unconfirmed' } };

  await recordConsent(db, { userId, kind: 'card_delete', actor: 'owner', authMethod: 'session', cardId: mirrorRow?.id ?? null }, deps.now());
  billingLog('info', 'billing.card_deleted', { userId });
  return { status: 200, body: { ok: true, autoRenewDisabled, chargeInProgress, card: null } };
}
