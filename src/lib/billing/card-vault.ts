import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPaynkolayConfig, type PaynkolayConfig } from '@/lib/payment/paynkolay';
import { deleteSavedCard, listSavedCards } from '@/lib/payment/paynkolay-cards';
import { fetchTransport, type PaynkolayTransport } from '@/lib/payment/paynkolay-transport';
import { loadBillingFlags } from './flags';
import { billingLog } from './redact';
import type { Sensitive } from './sensitive';
import { loadHmacKeys, loadVaultKeys, openCustomerKey, type HmacKeys, type VaultKeys } from './vault-crypto';

/**
 * Server-only orchestration of stored cards: database plus provider (billing
 * spec §6.1 `card-vault.ts`). The foundation carries the provider purge used
 * by account erasure, erasure tombstones and stored-card retention; listing,
 * saving and owner deletion arrive with the saved-cards UI.
 *
 * Tokens and customer keys stay in `Sensitive` wrappers and in memory only.
 * A purge is verified by a re-list: PayNKolay's delete answer is advisory
 * (Q-10), so "deleted" means "the provider no longer lists it".
 */

export interface VaultDeps {
  db: PrismaClient;
  cfg: PaynkolayConfig;
  transport: PaynkolayTransport;
  keys: VaultKeys;
  hmac: HmacKeys;
  now: () => Date;
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
  try {
    return { db, cfg, transport: fetchTransport, keys: loadVaultKeys(), hmac: loadHmacKeys(), now: () => new Date() };
  } catch {
    return null;
  }
}
