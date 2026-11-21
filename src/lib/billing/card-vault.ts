import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPaynkolayConfig, type PaynkolayConfig } from '@/lib/payment/paynkolay';
import {
  cardIdentity,
  deleteSavedCard,
  generateCustomerKey,
  listSavedCards,
  type ProviderCard,
} from '@/lib/payment/paynkolay-cards';
import { fetchTransport, type PaynkolayTransport } from '@/lib/payment/paynkolay-transport';
import { loadBillingFlags } from './flags';
import { billingLog } from './redact';
import { attemptSchedule, istanbulYearMonth } from './renewal-policy';
import { applyCardChangeAmendment, markCardReplacedNotice } from './auto-renew';
import type { PublicSavedCard } from './card-types';
import type { Sensitive } from './sensitive';
import {
  cardHandle,
  customerKeyFingerprint,
  customerKeyFingerprints,
  loadHmacKeys,
  loadVaultKeys,
  openCustomerKey,
  sealCustomerKey,
  type HmacKeys,
  type VaultKeys,
} from './vault-crypto';

/**
 * Server-only orchestration of stored cards: database plus provider (billing
 * spec §6.1 `card-vault.ts`).
 *
 *  - The PayNKolay customer key is created once per owner, sealed with the
 *    vault key (owner id + key id in the AAD) and fingerprinted with the HMAC
 *    key; it is opened only in memory, in a `Sensitive` wrapper.
 *  - `billing_cards` is a display-only mirror of PayNKolay's card list
 *    (last4, brand, issuer, expiry, alias, handle). Tokens and TranIds are
 *    never stored; a card is identified by an HMAC handle that includes the
 *    owner id, so a handle is meaningless for any other owner (IDOR).
 *  - Deletion is verified by a re-list: PayNKolay's delete answer is advisory
 *    (Q-10), so "deleted" means "the provider no longer lists it".
 *  - A card counts as saved through Buaze ("verified") only when the payment
 *    that saved it asked for it (saveCard) under a card_save consent (D1).
 *    After a verified save, every other unbound card is deleted (one card on
 *    file). Nothing here charges a card.
 */

export interface VaultDeps {
  db: PrismaClient;
  cfg: PaynkolayConfig;
  transport: PaynkolayTransport;
  keys: VaultKeys;
  hmac: HmacKeys;
  now: () => Date;
  /**
   * D6: after a verified replacement card, auto-renew moves to it (amendment consent). This sends the
   * `card_replaced` mail and returns true when Resend accepted it. Absent → no mail (tests, retention).
   */
  notifyCardReplaced?: (userId: string, mail: CardReplacedMail) => Promise<boolean>;
}

export interface CardReplacedMail {
  locale: 'tr' | 'en';
  planName: string;
  amountMinor: number;
  last4: string | null;
  chargeDate: Date;
  retryDates: Date[];
  consentId: string;
}

export type { PublicSavedCard } from './card-types';

export interface MirrorRow {
  handle: string;
  last4: string | null;
  brand: string | null;
  issuer: string | null;
  expMonth: number | null;
  expYear: number | null;
  boundConsentId: string | null;
  savedByPaymentId: string | null;
}

const MIRROR_SELECT = {
  id: true,
  handle: true,
  last4: true,
  brand: true,
  issuer: true,
  expMonth: true,
  expYear: true,
  boundConsentId: true,
  savedByPaymentId: true,
  createdAt: true,
} as const;

const CARD_MISSING_CONFIRM_MS = 24 * 60 * 60_000;
/** A save whose card PayNKolay does not list yet stays 'pending' this long after settlement (one list is not proof). */
const CARD_SAVE_NOT_LISTED_GRACE_MS = 60 * 60_000;

function cardYearMonth(expMonth: number | null, expYear: number | null): number | null {
  if (!expMonth || !expYear || expMonth < 1 || expMonth > 12) return null;
  return expYear * 100 + expMonth;
}

/** The owner-visible projection of a mirror row: never a token, TranId or customer key. */
export function toPublicCard(row: MirrorRow, now: Date, nextChargeAt: Date | null): PublicSavedCard {
  const ym = cardYearMonth(row.expMonth, row.expYear);
  // A card is valid through the last day of its expiry month (Istanbul calendar).
  const expired = ym !== null && ym < Number(istanbulYearMonth(now));
  const expiresBeforeNextCharge = ym !== null && nextChargeAt !== null && ym < Number(istanbulYearMonth(nextChargeAt));
  return {
    handle: row.handle,
    last4: row.last4,
    brand: row.brand,
    issuer: row.issuer,
    expMonth: row.expMonth,
    expYear: row.expYear,
    expired,
    expiresBeforeNextCharge: expiresBeforeNextCharge && !expired,
    bound: row.boundConsentId !== null,
    verified: row.savedByPaymentId !== null,
  };
}

/** The mirror (DB only), newest first. Soft-deleted rows are never returned. */
export async function mirrorCards(
  db: Pick<PrismaClient, 'billingCard'>,
  userId: string,
  now: Date,
  nextChargeAt: Date | null,
): Promise<PublicSavedCard[]> {
  const rows = await db.billingCard.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: MIRROR_SELECT,
  });
  return rows.map((row) => toPublicCard(row, now, nextChargeAt));
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** The owner's customer key, opened with the vault key; null without a customer row of this environment. */
export async function getCustomerKey(deps: VaultDeps, userId: string): Promise<Sensitive | null> {
  const customer = await deps.db.billingCustomer.findUnique({
    where: { userId },
    select: { customerKeyEnc: true, providerEnv: true },
  });
  if (!customer || customer.providerEnv !== deps.cfg.env) return null;
  return openCustomerKey(customer.customerKeyEnc, userId, deps.keys);
}

/**
 * The owner's customer key, creating the BillingCustomer row (random key,
 * sealed, fingerprinted, providerEnv) when missing. The fingerprint is
 * checked under the current and the previous HMAC key before the insert; a
 * unique-key race (two tabs, or a fingerprint collision) is resolved by
 * re-reading, then by one retry with a new key. Throws when the existing row
 * belongs to the other PayNKolay environment.
 */
export async function getOrCreateCustomerKey(deps: VaultDeps, userId: string): Promise<Sensitive> {
  const read = async (): Promise<Sensitive | null> => {
    const customer = await deps.db.billingCustomer.findUnique({
      where: { userId },
      select: { customerKeyEnc: true, providerEnv: true },
    });
    if (!customer) return null;
    if (customer.providerEnv !== deps.cfg.env) throw new Error('billing: customer key belongs to another PayNKolay environment');
    return openCustomerKey(customer.customerKeyEnc, userId, deps.keys);
  };
  const existing = await read();
  if (existing) return existing;

  for (let attempt = 0; attempt < 3; attempt++) {
    const key = generateCustomerKey();
    const taken = await deps.db.billingCustomer.findFirst({
      where: { customerKeyFp: { in: customerKeyFingerprints(key, deps.hmac) } },
      select: { userId: true },
    });
    if (taken) continue;
    try {
      await deps.db.billingCustomer.create({
        data: {
          userId,
          providerEnv: deps.cfg.env,
          customerKeyEnc: sealCustomerKey(key, userId, deps.keys),
          customerKeyFp: customerKeyFingerprint(key, deps.hmac),
        },
        select: { userId: true },
      });
      return key;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const raced = await read();
      if (raced) return raced;
    }
  }
  throw new Error('billing: could not create a customer key');
}

interface ListedCard {
  card: ProviderCard;
  handle: string;
}

function withHandles(deps: VaultDeps, userId: string, cards: ProviderCard[]): ListedCard[] {
  return cards.map((card) => ({ card, handle: cardHandle(userId, cardIdentity(card), deps.hmac) }));
}

async function listWithHandles(deps: VaultDeps, userId: string, customerKey: Sensitive): Promise<ListedCard[]> {
  const list = await listSavedCards(deps.cfg, deps.transport, customerKey);
  return list.kind === 'empty' ? [] : withHandles(deps, userId, list.cards);
}

/**
 * Brings the mirror in line with one provider list:
 *  - listed → created or updated (lastSeenAt = now, missingSince cleared, a
 *    soft-deleted row with the same handle comes back);
 *  - not listed → `missingSince` set on the first miss; soft-deleted
 *    'provider_missing' only on a second miss ≥ 24 h later (one empty list
 *    never removes anything, §9.5).
 * Never changes `boundConsentId` and never promotes a card. Returns the
 * handles that were already in the mirror before this sync.
 */
async function syncMirror(deps: VaultDeps, userId: string, listed: ListedCard[], now: Date): Promise<Set<string>> {
  const { db } = deps;
  const rows = await db.billingCard.findMany({
    where: { userId },
    select: { id: true, handle: true, deletedAt: true, missingSince: true },
  });
  const known = new Set(rows.filter((r) => r.deletedAt === null).map((r) => r.handle));
  const byHandle = new Map(rows.map((r) => [r.handle, r]));
  const present = new Set<string>();

  for (const { card, handle } of listed) {
    if (present.has(handle)) continue;
    present.add(handle);
    const fields = {
      last4: card.last4,
      brand: card.brand,
      issuer: card.issuer,
      cardType: card.cardType,
      expMonth: card.expMonth,
      expYear: card.expYear,
      alias: card.alias,
      lastSeenAt: now,
      missingSince: null,
    };
    const row = byHandle.get(handle);
    if (row) {
      await db.billingCard.update({
        where: { id: row.id },
        data: { ...fields, ...(row.deletedAt ? { deletedAt: null, deleteReason: null } : {}) },
        select: { id: true },
      });
    } else {
      try {
        await db.billingCard.create({ data: { userId, handle, ...fields }, select: { id: true } });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err; // a concurrent sync created it
      }
    }
  }

  for (const row of rows) {
    if (row.deletedAt !== null || present.has(row.handle)) continue;
    if (row.missingSince === null) {
      await db.billingCard.updateMany({ where: { id: row.id, missingSince: null }, data: { missingSince: now } });
    } else if (row.missingSince.getTime() <= now.getTime() - CARD_MISSING_CONFIRM_MS) {
      await db.billingCard.updateMany({
        where: { id: row.id, deletedAt: null },
        data: { deletedAt: now, deleteReason: 'provider_missing' },
      });
    }
  }
  await db.billingCustomer.updateMany({ where: { userId }, data: { lastListedAt: now } });
  return known;
}

/**
 * Lists the owner's cards at PayNKolay and syncs the mirror (see
 * syncMirror). Returns the public cards; never tokens. Without a customer row
 * nothing is listed and the (empty) mirror is returned. Throws on a provider
 * or vault failure (never with response text).
 */
export async function refreshCards(deps: VaultDeps, userId: string, nextChargeAt: Date | null = null): Promise<PublicSavedCard[]> {
  const now = deps.now();
  const customerKey = await getCustomerKey(deps, userId);
  if (customerKey) {
    const listed = await listWithHandles(deps, userId, customerKey);
    await syncMirror(deps, userId, listed, now);
  }
  return mirrorCards(deps.db, userId, now, nextChargeAt);
}

export type DeleteOwnerCardResult = 'deleted' | 'not_found' | 'unconfirmed';

/**
 * Owner deletion (§8.2): re-list with THIS owner's customer key only, find the
 * card whose handle (HMAC over this owner's id) equals `handle`, delete it at
 * PayNKolay, re-list to verify. No match → 'not_found' and no provider delete:
 * a handle of another owner can never match (the IDOR path), and a card of
 * this owner that one list did not show is NOT reported deleted — one list
 * is not proof (§9.5); the mirror sync records the miss and removes the row
 * only on a second miss ≥ 24 h later. 'unconfirmed' when PayNKolay still
 * lists the card after the delete. Only 'deleted' means a verified delete.
 */
export async function deleteOwnerCard(
  deps: VaultDeps,
  userId: string,
  handle: string,
  reason: 'owner' | 'replaced' | 'unbound',
): Promise<DeleteOwnerCardResult> {
  const now = deps.now();
  const markDeleted = () =>
    deps.db.billingCard.updateMany({
      where: { userId, handle, deletedAt: null },
      data: { deletedAt: deps.now(), deleteReason: reason, boundConsentId: null },
    });

  const customerKey = await getCustomerKey(deps, userId);
  if (!customerKey) return 'not_found';
  const before = await listWithHandles(deps, userId, customerKey);
  const target = before.find((c) => c.handle === handle);
  if (!target) {
    await syncMirror(deps, userId, before, now);
    return 'not_found';
  }

  try {
    await deleteSavedCard(deps.cfg, deps.transport, customerKey, target.card.token);
  } catch (err) {
    billingLog('warn', 'vault.card_delete_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
  }
  const after = await listWithHandles(deps, userId, customerKey);
  if (after.some((c) => c.handle === handle)) return 'unconfirmed';
  await markDeleted();
  await syncMirror(deps, userId, after, deps.now());
  return 'deleted';
}

export type ChargeableCard =
  | { ok: true; customerKey: Sensitive; token: Sensitive; cardId: string; last4: string | null }
  | {
      ok: false;
      reason: 'no_customer' | 'no_bound_card' | 'bound_missing_first' | 'bound_missing_confirmed' | 'unbound_card_present' | 'list_failed';
      /** bound_missing_first: the mirror saw the bound card < 48 h ago (breaker input, §9.5). */
      freshMirror?: boolean;
    };

const MIRROR_FRESH_MS = 48 * 60 * 60_000;

/**
 * Server-internal, used ONLY by the renewal engine (§9.2 phase 4 step 7):
 * re-lists the owner's cards with the owner's own customer key and returns
 * the token of the card bound to `consentId` (D1). Any other live card at
 * PayNKolay means 'unbound_card_present' — nothing is charged until the owner
 * removes it. A bound card missing from one list is 'bound_missing_first'
 * (nothing disabled); only a second miss ≥ 24 h later (the mirror then
 * soft-deletes it) is 'bound_missing_confirmed'. The token never leaves
 * memory and is wrapped in `Sensitive`.
 */
export async function resolveChargeableCard(deps: VaultDeps, userId: string, consentId: string): Promise<ChargeableCard> {
  const { db } = deps;
  const now = deps.now();
  const bound = await db.billingCard.findFirst({
    where: { userId, boundConsentId: consentId, deletedAt: null },
    select: { id: true, handle: true, last4: true, lastSeenAt: true },
  });
  if (!bound) return { ok: false, reason: 'no_bound_card' };
  let customerKey: Sensitive | null;
  try {
    customerKey = await getCustomerKey(deps, userId);
  } catch (err) {
    billingLog('warn', 'vault.chargeable_key_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
    return { ok: false, reason: 'list_failed' };
  }
  if (!customerKey) return { ok: false, reason: 'no_customer' };
  let listed: ListedCard[];
  try {
    listed = await listWithHandles(deps, userId, customerKey);
  } catch (err) {
    billingLog('warn', 'vault.chargeable_list_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
    return { ok: false, reason: 'list_failed' };
  }
  await syncMirror(deps, userId, listed, now);
  const match = listed.find((c) => c.handle === bound.handle);
  if (!match) {
    const after = await db.billingCard.findFirst({ where: { id: bound.id }, select: { deletedAt: true } });
    if (!after || after.deletedAt) return { ok: false, reason: 'bound_missing_confirmed' };
    return { ok: false, reason: 'bound_missing_first', freshMirror: bound.lastSeenAt.getTime() > now.getTime() - MIRROR_FRESH_MS };
  }
  if (listed.some((c) => c.handle !== bound.handle)) return { ok: false, reason: 'unbound_card_present' };
  return { ok: true, customerKey, token: match.card.token, cardId: bound.id, last4: bound.last4 };
}

export type CardSaveResult = 'saved' | 'not_saved' | 'pending';

/**
 * After a payment with saveCard=true has settled (billing spec §11.2):
 *  1. list the owner's cards and sync the mirror;
 *  2. find the card this payment saved: the one carrying the payment's
 *     `csCardAlias`, else a card whose handle was not in the mirror before
 *     (Q-1: the alias may not round-trip);
 *  3. only with a `card_save` consent for this payment: mark it verified
 *     (`savedByPaymentId`), link the consent to it, and delete every other
 *     unbound card at PayNKolay (one card on file, D1; verified by re-list);
 *  4. record `cardSaveResult`.
 * Idempotent: a payment already marked saved / not_saved returns that. A
 * provider failure leaves it 'pending' (the engine retries). No consent → the
 * card is never treated as Buaze's card ('not_saved').
 */
export async function reconcileCardsAfterSave(deps: VaultDeps, paymentId: string): Promise<CardSaveResult> {
  const { db } = deps;
  const payment = await db.billingPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      userId: true,
      status: true,
      saveCard: true,
      cardAlias: true,
      cardSaveResult: true,
      providerEnv: true,
      createdAt: true,
      completedAt: true,
    },
  });
  if (!payment || !payment.saveCard) return 'not_saved';
  if (payment.cardSaveResult === 'saved' || payment.cardSaveResult === 'not_saved') return payment.cardSaveResult;
  if (payment.status !== 'succeeded') return 'pending';
  if ((payment.providerEnv ?? 'live') !== deps.cfg.env || payment.userId.startsWith('del_')) return 'pending';
  const userId = payment.userId;

  const setResult = async (result: 'saved' | 'not_saved') => {
    await db.billingPayment.updateMany({ where: { id: paymentId }, data: { cardSaveResult: result } });
    return result;
  };

  const consent = await db.billingConsent.findFirst({
    where: { paymentId, userId, kind: 'card_save' },
    select: { id: true },
  });
  const customerKey = await getCustomerKey(deps, userId);
  if (!customerKey) return setResult('not_saved');

  const now = deps.now();
  let listed: ListedCard[];
  try {
    listed = await listWithHandles(deps, userId, customerKey);
  } catch (err) {
    billingLog('warn', 'vault.reconcile_list_failed', { paymentId, code: err instanceof Error ? err.name : 'unknown' });
    return 'pending';
  }
  const knownBefore = await syncMirror(deps, userId, listed, now);
  const saved =
    (payment.cardAlias ? listed.find((c) => c.card.alias === payment.cardAlias) : undefined) ??
    listed.find((c) => !knownBefore.has(c.handle));
  if (!consent) {
    billingLog('info', 'vault.card_not_saved', { paymentId, reason: 'no_consent' });
    return setResult('not_saved');
  }
  if (!saved) {
    // One list that does not show the new card (not there yet, or a one-off "02 Gecerli Kart Yok") is not
    // proof: stay 'pending' (the engine re-lists every tick) for an hour after settlement, then give up.
    const settledAt = (payment.completedAt ?? payment.createdAt).getTime();
    if (now.getTime() - settledAt < CARD_SAVE_NOT_LISTED_GRACE_MS) return 'pending';
    billingLog('info', 'vault.card_not_saved', { paymentId, reason: 'not_listed' });
    return setResult('not_saved');
  }

  const row = await db.billingCard.findFirst({ where: { userId, handle: saved.handle }, select: { id: true } });
  if (!row) return 'pending';
  await db.billingCard.update({ where: { id: row.id }, data: { savedByPaymentId: paymentId }, select: { id: true } });
  await db.billingConsent.updateMany({ where: { id: consent.id, cardId: null }, data: { cardId: row.id, effectiveAt: now } });

  // D6: with auto-renew on, the verified replacement card becomes the chargeable one (amendment consent);
  // the previously bound card is then unbound, so the clean-up below deletes it.
  if (deps.notifyCardReplaced) {
    try {
      const amendment = await applyCardChangeAmendment(db, { userId, newCardId: row.id, paymentId, now });
      if (amendment) {
        const retryDates = amendment.renewal
          ? attemptSchedule(amendment.renewal.periodEnd, { firstChargeDate: amendment.chargeDate, noticeDeliveredAt: now }).slice(amendment.renewal.attempts + 1)
          : [];
        const sent = await deps.notifyCardReplaced(userId, {
          locale: amendment.locale,
          planName: amendment.planName,
          amountMinor: amendment.amountMinor,
          last4: amendment.last4,
          chargeDate: amendment.chargeDate,
          retryDates,
          consentId: amendment.consentId,
        });
        if (sent) await markCardReplacedNotice(db, amendment, row.id, deps.now());
      }
    } catch (err) {
      billingLog('error', 'vault.card_change_failed', { paymentId, code: err instanceof Error ? err.name : 'unknown' });
    }
  }

  // D1: one card on file. A failed or unverified clean-up does not undo the save: the engine retries it
  // (listCardCleanupsOwed → retryCardCleanup) until the other cards are verified gone.
  await deleteOtherCards(deps, userId, customerKey, saved.handle, listed, paymentId);
  return setResult('saved');
}

/**
 * D1 clean-up after a verified save: deletes every other card of the owner at
 * PayNKolay except the saved one and any card bound to an auto-renew consent
 * (switching the chargeable card is the D6 amendment), then re-lists. A card
 * is marked 'replaced' only when that re-list is a real answer — it shows the
 * saved card — and no longer shows the deleted one; an empty or failed
 * re-list proves nothing. Returns true when no other card is left.
 */
async function deleteOtherCards(
  deps: VaultDeps,
  userId: string,
  customerKey: Sensitive,
  savedHandle: string,
  listed: ListedCard[],
  paymentId: string,
): Promise<boolean> {
  const { db } = deps;
  const bound = await db.billingCard.findMany({
    where: { userId, deletedAt: null, boundConsentId: { not: null } },
    select: { handle: true },
  });
  const keep = new Set([savedHandle, ...bound.map((b) => b.handle)]);
  const others = listed.filter((c) => !keep.has(c.handle));
  if (others.length === 0) return true;
  for (const other of others) {
    try {
      await deleteSavedCard(deps.cfg, deps.transport, customerKey, other.card.token);
    } catch (err) {
      billingLog('warn', 'vault.card_delete_failed', { paymentId, code: err instanceof Error ? err.name : 'unknown' });
    }
  }
  let after: ListedCard[];
  try {
    after = await listWithHandles(deps, userId, customerKey);
  } catch (err) {
    billingLog('warn', 'vault.reconcile_relist_failed', { paymentId, code: err instanceof Error ? err.name : 'unknown' });
    return false;
  }
  if (!after.some((a) => a.handle === savedHandle)) {
    billingLog('warn', 'vault.reconcile_relist_unreliable', { paymentId });
    return false;
  }
  const gone = others.filter((o) => !after.some((a) => a.handle === o.handle)).map((o) => o.handle);
  if (gone.length > 0) {
    await db.billingCard.updateMany({
      where: { userId, handle: { in: gone }, deletedAt: null },
      data: { deletedAt: deps.now(), deleteReason: 'replaced', boundConsentId: null },
    });
  }
  await syncMirror(deps, userId, after, deps.now());
  return gone.length === others.length;
}

/**
 * Engine retry of a D1 clean-up (§9 phase 1): the payment's verified card must
 * still be live and listed (a list without it is not a real answer, so
 * nothing is deleted on it). Returns true when no other card is left.
 */
export async function retryCardCleanup(deps: VaultDeps, paymentId: string): Promise<boolean> {
  const { db } = deps;
  const card = await db.billingCard.findFirst({
    where: { savedByPaymentId: paymentId, deletedAt: null },
    select: { userId: true, handle: true },
  });
  if (!card || card.userId.startsWith('del_')) return false;
  const customerKey = await getCustomerKey(deps, card.userId);
  if (!customerKey) return false;
  const listed = await listWithHandles(deps, card.userId, customerKey);
  if (!listed.some((c) => c.handle === card.handle)) return false;
  await syncMirror(deps, card.userId, listed, deps.now());
  return deleteOtherCards(deps, card.userId, customerKey, card.handle, listed, paymentId);
}

export interface PurgeResult {
  ok: boolean;
  deleted: number;
  remaining: number;
}

/**
 * Deletes every card stored under `customerKey`, then re-lists. `ok` only when
 * the provider lists nothing any more. A list failure throws (never with body
 * text); a single delete failure just leaves that card for the re-list to see.
 */
export async function purgeCardsWithKey(
  cfg: PaynkolayConfig,
  transport: PaynkolayTransport,
  customerKey: Sensitive,
): Promise<PurgeResult> {
  const before = await listSavedCards(cfg, transport, customerKey);
  if (before.kind === 'empty') return { ok: true, deleted: 0, remaining: 0 };
  let deleted = 0;
  for (const card of before.cards) {
    try {
      await deleteSavedCard(cfg, transport, customerKey, card.token);
      deleted += 1;
    } catch (err) {
      billingLog('warn', 'vault.card_delete_failed', { code: err instanceof Error ? err.name : 'unknown' });
    }
  }
  const after = await listSavedCards(cfg, transport, customerKey);
  const remaining = after.kind === 'empty' ? 0 : after.cards.length;
  return { ok: remaining === 0, deleted, remaining };
}

/**
 * Deletes every stored card of the owner at PayNKolay, verified by a re-list.
 * On success the mirror rows are soft-deleted with `reason`. Throws on a
 * vault key error or a provider failure; returns ok=false when cards remain or
 * the customer belongs to another PayNKolay environment.
 */
export async function purgeProviderCards(
  deps: VaultDeps,
  userId: string,
  reason: 'account_deleted' | 'retention' = 'account_deleted',
): Promise<{ ok: boolean }> {
  const customer = await deps.db.billingCustomer.findUnique({
    where: { userId },
    select: { customerKeyEnc: true, providerEnv: true },
  });
  if (!customer) return { ok: true };
  if (customer.providerEnv !== deps.cfg.env) return { ok: false };
  const customerKey = openCustomerKey(customer.customerKeyEnc, userId, deps.keys);
  const result = await purgeCardsWithKey(deps.cfg, deps.transport, customerKey);
  if (result.ok) {
    await deps.db.billingCard.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: deps.now(), deleteReason: reason, boundConsentId: null },
    });
  }
  return { ok: result.ok };
}

function vaultDepsFor(db: PrismaClient, cfg: PaynkolayConfig): VaultDeps | null {
  try {
    return { db, cfg, transport: fetchTransport, keys: loadVaultKeys(), hmac: loadHmacKeys(), now: () => new Date(), notifyCardReplaced };
  } catch {
    return null;
  }
}

/** Production `card_replaced` mail (D6), with the off-only link of the amendment consent. */
async function notifyCardReplaced(userId: string, mail: CardReplacedMail): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email || user.email.endsWith('.invalid')) return false;
  const [{ sendAutoRenewChangedMail }, { offLinkFor }] = await Promise.all([import('./billing-mails'), import('./renewal-engine')]);
  return sendAutoRenewChangedMail(
    { email: user.email, locale: mail.locale },
    {
      variant: 'card_replaced',
      planName: mail.planName,
      amountMinor: mail.amountMinor,
      last4: mail.last4,
      chargeDate: mail.chargeDate,
      retryDates: mail.retryDates,
      offLink: offLinkFor(mail.consentId, userId, mail.locale),
    },
  );
}

/**
 * Production provider context for erasure, tombstones and retention: needs
 * the PayNKolay config, a valid environment binding and both billing keys —
 * but NOT the card-storage flag (an erasure must purge whatever was stored).
 * Null when any of them is missing.
 */
export async function loadProviderVaultDeps(db: PrismaClient = prisma): Promise<VaultDeps | null> {
  const cfg = getPaynkolayConfig();
  if (!cfg) return null;
  const flags = await loadBillingFlags();
  if (!flags.binding.ok || flags.binding.env !== cfg.env) return null;
  return vaultDepsFor(db, cfg);
}

/**
 * Production context for the saved-card features (save, list, delete):
 * everything `loadProviderVaultDeps` needs plus the card-storage flag
 * (PAYNKOLAY_CARD_STORAGE=on). Null whenever saved cards are off.
 */
export async function loadCardVaultDeps(db: PrismaClient = prisma): Promise<VaultDeps | null> {
  const cfg = getPaynkolayConfig();
  if (!cfg) return null;
  const flags = await loadBillingFlags();
  if (!flags.cardStorage || !flags.binding.ok || flags.binding.env !== cfg.env) return null;
  return vaultDepsFor(db, cfg);
}
