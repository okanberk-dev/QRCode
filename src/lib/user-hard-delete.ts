// Wave B4 (CLAUDE.md §38.B + §38.193) — shared hard-delete helper.
//
// Originally inline in /api/admin/members/[id]/hard-delete (Stage A,
// CLAUDE.md §38.0). Wave B4 introduced a second caller —
// /api/cron/process-scheduled-deletions — for owner-initiated 30-day
// grace deletions. Same cascade chain, same KVKK m.7 anonymisation; the
// only delta is the actor context recorded in the final audit row.
//
// Cascade chain (§37.9):
//   User → Restaurant (Cascade) → Feedback / Menu / QR / Analytics /
//                                 BrandSettings / PlatformLinkCheck /
//                                 RestaurantActivationState /
//                                 PlatformRedirectEvent / QrScan /
//                                 EmbedView (all Cascade)
//   User → UserSession (Cascade)
//   User → ImpersonationSession (Cascade)
//
// Anonymised (not deleted — KVKK m.7 + audit retention):
//   BillingInvoice.userId    → null
//   AdminAuditLog.actorId    → null  (+ PII fields in payload redacted)
//   AdminAuditLog.targetId   → null  (+ PII fields in payload redacted)
//
// Deleted (userId is PK, cannot null):
//   BillingSubscription      → deleted

import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
): Promise<HardDeleteResult> {
  const emailHash = hashEmailShort(email);

  return prisma.$transaction(async (tx) => {
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

    // Cascade-delete the User. Restaurant + UserSession + ImpersonationSession
    // wipe automatically via onDelete: Cascade (CLAUDE.md §37.9). Restaurant
    // cascade itself wipes Feedback / Menu / QR / Analytics / Brand / etc.
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
          ...(actor.extra ?? {}),
        },
      },
    });

    return {
      invoicesAnonymized: invoiceCount.count,
      subscriptionsDeleted: subscriptionDel.count,
      auditRowsRedacted: audited.length,
    };
  });
}
