// Wave B4 (CLAUDE.md §38.B + §38.193) — shared hard-delete helper.
//
// Originally inline in /api/admin/members/[id]/hard-delete (Stage A,
// CLAUDE.md §38.0). Wave B4 introduced a second caller —
// /api/cron/process-scheduled-deletions — for owner-initiated 30-day
// grace deletions. Same cascade chain, same KVKK m.7 anonymisation; the
// only delta is the actor context recorded in the final audit row.
//
// Cascade chain — CORRECTED (§38.238).
//
// The previous comment (and CLAUDE.md §37.9) claimed `User → Restaurant`
// cascades. It does NOT. The migration declares:
//   ALTER TABLE "restaurants" ... FOREIGN KEY ("user_id")
//     REFERENCES "users"("id") ON DELETE SET NULL
// and the schema models it as `userId String?` / `user User?` with no
// `onDelete:`. A bare `user.delete()` therefore left every Restaurant row
// alive with `user_id = NULL`, and with it every Feedback row (customer
// name / e-mail / phone / comment / ipAddress), QR, analytics and brand
// row — i.e. the exact PII the erasure exists to remove. The orphaned
// restaurants also stayed reachable on the public /r/[slug] and
// /menu/[slug] surfaces (those look up by slug, never by userId), so a
// deleted account kept collecting new feedback. Meanwhile the menus WERE
// destroyed by the explicit deleteMany below, so the wipe was both
// incomplete and lossy — and it reported success.
//
// Restaurants are now deleted explicitly; their children really are
// CASCADE, so that wipes the tree:
//   Restaurant (explicit delete) → Feedback / MenuCategory / MenuItem /
//     QrGeneration / QrScan / MenuAnalyticsEvent / BrandSettings /
//     PlatformLinkCheck / PlatformRedirectEvent / RestaurantActivationState /
//     EmbedView (all ON DELETE CASCADE)
//   User → UserSession (Cascade — the only real user-level cascade)
//
// Tables that hold user-owned data with NO foreign key to `users` at all
// (`grep 'REFERENCES "users"'` returns only user_sessions + restaurants)
// are deleted explicitly too, or they would outlive the account:
//   GoogleIntegration      → OAuth refresh token for a deleted account
//   ApiKey                 → credentials that would still authenticate
//   TeamMember (ownerId)   → invited teammates' e-mail addresses (PII)
//   NotificationPreference → per-user settings row
//
// Anonymised (not deleted — KVKK m.7 + audit retention):
//   BillingInvoice.userId    → null
//   AdminAuditLog.actorId    → null  (+ PII fields in payload redacted)
//   AdminAuditLog.targetId   → null  (+ PII fields in payload redacted)
//
// Deleted (userId is PK, cannot null):
//   BillingSubscription      → deleted
//
// Saved cards (billing spec §11.6), whatever the billing flags say:
//   - deferred (`{ deferred: 'billing_in_flight' }`, nothing deleted) while a
//     payment of the user is pending (< 7 days) or a renewal is in
//     owner_paying / charging / awaiting_confirmation (< 7 days);
//   - before the transaction, cards stored at PayNKolay are purged (verified
//     by re-list) when config, binding and vault keys are available; if not,
//     or if the purge is not verified, a tombstone keeps the VERBATIM sealed
//     customer key + AAD user id so phase 6 of the renewal engine can finish
//     the provider deletion later (no key needed at delete time);
//   - BillingConsent / BillingPayment.userId → the same `del_…` pseudonym
//     (consents get purge_after = now + 10 y); renewals, card mirror rows and
//     the customer row are deleted (the customer FK is RESTRICT on purpose).

import { createHash, randomBytes, randomUUID } from 'crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { loadProviderVaultDeps, purgeProviderCards, type VaultDeps } from '@/lib/billing/card-vault';
import { billingLog } from '@/lib/billing/redact';
import { IN_FLIGHT_STATES } from '@/lib/billing/renewal-policy';
import { loadHmacKeys, userPseudonym, type HmacKeys } from '@/lib/billing/vault-crypto';

export interface HardDeleteActor {
  /** Audit log actor.id (admin user id, or null for cron). */
  id: string | null;
  /** Audit log actor.source: 'admin' | 'cron' | 'user'. */
  source: 'admin' | 'cron' | 'user';
  /** Action label written to AdminAuditLog (e.g. 'admin.members.hard_delete',
   *  'cron.account.scheduled_delete'). */
  action: string;
  /** Free-form extra payload merged into the audit row's payload. */
  extra?: Record<string, unknown>;
}

export interface HardDeleteResult {
  invoicesAnonymized: number;
  subscriptionsDeleted: number;
  auditRowsRedacted: number;
  /** §38.238 — restaurants (and their whole CASCADE subtree) actually removed. */
  restaurantsDeleted: number;
  /** §38.238 — FK-less user-owned rows removed (google integration, api keys,
   *  team members, notification preferences). */
  orphanRowsDeleted: number;
  /** Stored cards were deleted at PayNKolay and the deletion was verified. */
  billingVaultPurged: boolean;
  /** Provider deletion is still owed: a tombstone was written. */
  billingTombstoned: boolean;
  consentsPseudonymised: number;
  paymentsPseudonymised: number;
}

export interface HardDeleteDeferred {
  deferred: 'billing_in_flight';
}

export function isHardDeleteDeferred(value: HardDeleteResult | HardDeleteDeferred): value is HardDeleteDeferred {
  return 'deferred' in value;
}

export interface HardDeleteBillingDeps {
  db: PrismaClient;
  now: () => Date;
  /** Provider purge context (config + binding + vault keys), or null when any is missing. */
  vault: () => Promise<VaultDeps | null>;
  hmac: () => HmacKeys | null;
}

const BILLING_DEFER_MS = 7 * 24 * 60 * 60_000;
const CONSENT_RETENTION_YEARS = 10;

function defaultBillingDeps(): HardDeleteBillingDeps {
  return {
    db: prisma,
    now: () => new Date(),
    vault: () => loadProviderVaultDeps(),
    hmac: () => {
      try {
        return loadHmacKeys();
      } catch {
        return null;
      }
    },
  };
}

/** True while billing for the user is in flight (bounded to 7 days, §11.6). */
export async function billingInFlight(db: PrismaClient, userId: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - BILLING_DEFER_MS);
  const payment = await db.billingPayment.findFirst({
    where: { userId, status: 'pending', createdAt: { gte: since } },
    select: { id: true },
  });
  if (payment) return true;
  const renewal = await db.billingRenewal.findFirst({
    where: { userId, state: { in: [...IN_FLIGHT_STATES] }, updatedAt: { gte: since } },
    select: { id: true },
  });
  return renewal !== null;
}

/** SHA-256 short prefix used to retain a non-reversible audit hint of who was
 *  deleted (e.g. for "did we delete this person?" investigations) without
 *  storing the raw e-mail. 12 hex chars = 48 bits, plenty for forensic match. */
export function hashEmailShort(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 12);
}

/**
 * Execute the hard-delete cascade for `userId`. The caller is responsible
 * for pre-flight checks (rate limit, RBAC, grace period). This function
 * wraps everything in a single Prisma transaction so an audit-redact
 * crash can't leave the User row half-deleted with PII still in audit
 * logs.
 *
 * Caller must guarantee `userId` exists. Returns counters for the audit
 * trail. Throws if the transaction fails — the cron handler catches and
 * continues with the next user; the admin endpoint surfaces a 500.
 */
export async function executeUserHardDelete(
  userId: string,
  email: string,
  actor: HardDeleteActor,
  overrides: Partial<HardDeleteBillingDeps> = {},
): Promise<HardDeleteResult | HardDeleteDeferred> {
  const deps: HardDeleteBillingDeps = { ...defaultBillingDeps(), ...overrides };
  const db = deps.db;
  const emailHash = hashEmailShort(email);
  const now = deps.now();

  if (await billingInFlight(db, userId, now)) return { deferred: 'billing_in_flight' };

  // Network I/O is not allowed inside the transaction: purge stored cards first.
  const customer = await db.billingCustomer.findUnique({
    where: { userId },
    select: { customerKeyEnc: true, providerEnv: true },
  });
  let billingVaultPurged = false;
  if (customer) {
    try {
      const vault = await deps.vault();
      if (vault && vault.cfg.env === customer.providerEnv) {
        billingVaultPurged = (await purgeProviderCards(vault, userId, 'account_deleted')).ok;
      }
    } catch (err) {
      // Never blocks the erasure: the tombstone below finishes it later.
      billingLog('warn', 'erasure.purge_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
    }
  }
  const billingTombstoned = customer !== null && !billingVaultPurged;
  const hmac = deps.hmac();
  // Only has to be consistent within this deletion when the HMAC key is unavailable.
  const pseudonym = hmac ? userPseudonym(userId, hmac) : `del_${randomBytes(16).toString('base64url').slice(0, 22)}`;
  const consentPurgeAfter = new Date(now.getTime());
  consentPurgeAfter.setUTCFullYear(consentPurgeAfter.getUTCFullYear() + CONSENT_RETENTION_YEARS);

  return db.$transaction(async (tx) => {
    // Audit logs — anonymize PII before the cascade wipes the User row.
    // actorId is nullable (Stage A migration); payload may contain email
    // snapshots from past admin.members.* writes which we redact here.
    const audited = await tx.adminAuditLog.findMany({
      where: { OR: [{ actorId: userId }, { targetId: userId }] },
      select: { id: true, payload: true },
    });
    for (const row of audited) {
      let redactedPayload: Prisma.InputJsonValue | typeof row.payload = row.payload;
      if (row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)) {
        const copy = { ...(row.payload as Record<string, unknown>) };
        for (const key of ['email', 'name', 'phone', 'newEmail', 'oldEmail']) {
          if (key in copy) copy[key] = null;
        }
        redactedPayload = copy as Prisma.InputJsonValue;
      }
      await tx.adminAuditLog.update({
        where: { id: row.id },
        data: {
          actorId: null,
          targetId: null,
          payload: redactedPayload ?? undefined,
        },
      });
    }

    // Financial — anonymize invoices (10-year retention per KVKK m.7) and
    // delete the subscription row (userId is PK, can't null).
    const invoiceCount = await tx.billingInvoice.updateMany({
      where: { userId },
      data: { userId: null },
    });
    const subscriptionDel = await tx.billingSubscription.deleteMany({
      where: { userId },
    });

    // Saved cards (§11.6). The tombstone copies the sealed blob verbatim.
    if (billingTombstoned && customer) {
      await tx.billingVaultTombstone.create({
        data: {
          id: `tb_${randomUUID()}`,
          providerEnv: customer.providerEnv,
          customerKeyEnc: customer.customerKeyEnc,
          aadUserId: userId,
        },
        select: { id: true },
      });
    }
    const consentsPseudonymised = (
      await tx.billingConsent.updateMany({ where: { userId }, data: { userId: pseudonym, purgeAfter: consentPurgeAfter } })
    ).count;
    // Amounts and reference fingerprints stay, so a dispute can still be traced from the payment id.
    const paymentsPseudonymised = (await tx.billingPayment.updateMany({ where: { userId }, data: { userId: pseudonym } })).count;
    await tx.billingRenewal.deleteMany({ where: { userId } });
    await tx.billingCard.deleteMany({ where: { userId } });
    await tx.billingCustomer.deleteMany({ where: { userId } });

    // Menu items must be cleared BEFORE their categories.
    // `menu_items.category_id` is the one ON DELETE RESTRICT foreign key in the
    // schema (CLAUDE.md §37.9). Postgres evaluates RESTRICT immediately, so it
    // fires even when the referencing rows would be cascaded away by the very
    // same statement — a plain `user.delete()` therefore threw for every owner
    // that had ever created a single menu item, and the 30-day deletion cron
    // then failed for that user on every run (KVKK erasure never fulfilled).
    // /api/restaurants/[id] DELETE already orders these explicitly; the account
    // wipe now does the same.
    const ownedRestaurants = await tx.restaurant.findMany({
      where: { userId },
      select: { id: true },
    });
    const restaurantIds = ownedRestaurants.map((r) => r.id);
    if (restaurantIds.length > 0) {
      await tx.menuItem.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
      await tx.menuCategory.deleteMany({ where: { restaurantId: { in: restaurantIds } } });
    }

    // §38.238 — delete the restaurants EXPLICITLY. `restaurants.user_id` is
    // ON DELETE SET NULL, so `user.delete()` would orphan them (and every
    // Feedback / QR / analytics row hanging off them) instead of cascading.
    // Their own child FKs are real CASCADE, so this one statement wipes the
    // subtree that the erasure is actually about.
    const restaurantDel =
      restaurantIds.length > 0
        ? await tx.restaurant.deleteMany({ where: { id: { in: restaurantIds } } })
        : { count: 0 };

    // §38.238 — FK-less user-owned rows. Nothing in the database links these
    // to `users`, so they survive `user.delete()` unless removed by hand.
    // GoogleIntegration and ApiKey are the security-relevant ones: a live
    // OAuth refresh token and working API credentials for an account that no
    // longer exists.
    const googleDel = await tx.googleIntegration.deleteMany({ where: { userId } });
    const apiKeyDel = await tx.apiKey.deleteMany({ where: { userId } });
    // Both directions: the team this user OWNED, and this user's own
    // memberships in other owners' workspaces. Team scope is resolved by
    // e-mail, so an active membership left behind for a deleted account
    // could be inherited by whoever registers that address next.
    const teamDel = await tx.teamMember.deleteMany({
      where: {
        OR: [
          { ownerId: userId },
          { email: email.toLowerCase().trim() },
        ],
      },
    });
    const notifDel = await tx.notificationPreference.deleteMany({ where: { userId } });
    const orphanRowsDeleted =
      googleDel.count + apiKeyDel.count + teamDel.count + notifDel.count;

    // Finally the User row itself (UserSession cascades from here).
    await tx.user.delete({ where: { id: userId } });

    // Final audit row — actorId = the admin / cron who performed the wipe;
    // targetId is null because the User row no longer exists. Payload keeps
    // a hash of the e-mail so future forensics can answer "was X deleted?"
    // without retaining the PII itself.
    await tx.adminAuditLog.create({
      data: {
        actorId: actor.id,
        actorSource: actor.source,
        action: actor.action,
        targetId: null,
        payload: {
          emailHash,
          deletedAt: new Date().toISOString(),
          invoicesAnonymized: invoiceCount.count,
          subscriptionsDeleted: subscriptionDel.count,
          auditRowsRedacted: audited.length,
          restaurantsDeleted: restaurantDel.count,
          orphanRowsDeleted,
          billingVaultPurged,
          billingTombstoned,
          consentsPseudonymised,
          paymentsPseudonymised,
          ...(actor.extra ?? {}),
        },
      },
    });

    return {
      invoicesAnonymized: invoiceCount.count,
      subscriptionsDeleted: subscriptionDel.count,
      auditRowsRedacted: audited.length,
      restaurantsDeleted: restaurantDel.count,
      orphanRowsDeleted,
      billingVaultPurged,
      billingTombstoned,
      consentsPseudonymised,
      paymentsPseudonymised,
    };
  });
}
