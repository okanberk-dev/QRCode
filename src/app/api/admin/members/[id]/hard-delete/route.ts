/**
 * Stage A — Admin hard-delete (KVKK right-to-be-forgotten).
 *
 * Permanent deletion of a previously soft-deleted (isActive=false) User row
 * + cascade through Restaurant + UserSession + ImpersonationSession via the
 * Prisma onDelete: Cascade chain (CLAUDE.md §37.9). Financial records and
 * audit log entries survive with anonymized userId / actorId so KVKK m.7
 * 10-year retention is respected.
 *
 * Flow:
 *   1. RBAC: members:delete (same gate as soft-delete).
 *   2. Pre-flight: user.isActive === false; deactivatedAt at least
 *      HARD_DELETE_GRACE_DAYS (default 7) old.
 *   3. Rate limit: 5 hard-deletes per minute per admin (Upstash).
 *   4. Transaction (CLAUDE.md §40.1):
 *      - Anonymize BillingInvoice.userId → null (KVKK m.7 mali kayıt)
 *      - Delete BillingSubscription row (userId is PK, can't null)
 *      - Anonymize AdminAuditLog actorId/payload PII for rows that
 *        reference the deleted user; targetId is already nullable in schema.
 *      - prisma.user.delete cascades Restaurant → 12 child tables
 *        (Feedback / Menu / QR / Analytics / Sessions / Brand / Platform /
 *        Activation / Embed / etc. per §37.9).
 *      - Write final 'admin.members.hard_delete' audit row (current admin
 *        actor, redacted payload — only hashed email + deletedAt).
 *
 * The endpoint is destructive AND irreversible. The UI double-confirms with
 * cascade preview + e-mail typing confirmation.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HARD_DELETE_GRACE_DAYS = Number(process.env.HARD_DELETE_GRACE_DAYS) || 7;

/** SHA-256 short prefix used to retain a non-reversible audit hint of who was
 *  deleted (e.g. for "did we delete this person?" investigations) without
 *  storing the raw e-mail. 12 hex chars = 48 bits, plenty for forensic match. */
function hashEmailShort(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 12);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'members', 'delete'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const limit = await rateLimit(`admin-hard-delete:${adminId}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds || 60 },
      { status: 429 },
    );
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, isActive: true, deactivatedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  if (user.isActive) {
    return NextResponse.json(
      { error: 'must_deactivate_first', message: 'Kullanıcı önce pasifleştirilmelidir.' },
      { status: 409 },
    );
  }

  const now = Date.now();
  const deactivatedAt = user.deactivatedAt?.getTime() ?? now;
  const ageDays = Math.floor((now - deactivatedAt) / (1000 * 60 * 60 * 24));
  if (ageDays < HARD_DELETE_GRACE_DAYS) {
    return NextResponse.json(
      {
        error: 'grace_period_active',
        message: `Kalıcı silme için ${HARD_DELETE_GRACE_DAYS}-gün bekleme süresi gereklidir.`,
        graceDays: HARD_DELETE_GRACE_DAYS,
        elapsedDays: ageDays,
        retryAfterDays: HARD_DELETE_GRACE_DAYS - ageDays,
      },
      { status: 409 },
    );
  }

  const emailHash = hashEmailShort(user.email);

  try {
    const stats = await prisma.$transaction(async (tx) => {
      // Audit logs — anonymize PII before the cascade wipes the User row.
      // actorId is nullable (Stage A migration); payload may contain email
      // snapshots from past admin.members.* writes which we redact here.
      const audited = await tx.adminAuditLog.findMany({
        where: { OR: [{ actorId: id }, { targetId: id }] },
        select: { id: true, payload: true },
      });
      for (const row of audited) {
        let redactedPayload = row.payload;
        if (row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)) {
          const copy = { ...(row.payload as Record<string, unknown>) };
          // Strip common PII surface keys; payload structure varies by
          // action (members.update vs. members.deactivate vs. reset).
          for (const key of ['email', 'name', 'phone', 'newEmail', 'oldEmail']) {
            if (key in copy) copy[key] = null;
          }
          redactedPayload = copy as typeof row.payload;
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
        where: { userId: id },
        data: { userId: null },
      });
      const subscriptionDel = await tx.billingSubscription.deleteMany({
        where: { userId: id },
      });

      // Cascade-delete the User. Restaurant + UserSession + ImpersonationSession
      // wipe automatically via onDelete: Cascade (CLAUDE.md §37.9). Restaurant
      // cascade itself wipes Feedback / Menu / QR / Analytics / Brand / etc.
      await tx.user.delete({ where: { id } });

      // Final audit row — actorId = the admin who performed the wipe; targetId
      // is null because the User row no longer exists. Payload keeps a hash of
      // the e-mail so future forensics can answer "was X deleted?" without
      // retaining the PII itself.
      await tx.adminAuditLog.create({
        data: {
          actorId: adminId,
          actorSource: 'admin',
          action: 'admin.members.hard_delete',
          targetId: null,
          payload: {
            emailHash,
            deactivatedAt: user.deactivatedAt,
            deletedAt: new Date(),
            graceDays: HARD_DELETE_GRACE_DAYS,
            elapsedDays: ageDays,
            invoicesAnonymized: invoiceCount.count,
            subscriptionsDeleted: subscriptionDel.count,
            auditRowsRedacted: audited.length,
          },
        },
      });

      return {
        invoicesAnonymized: invoiceCount.count,
        subscriptionsDeleted: subscriptionDel.count,
        auditRowsRedacted: audited.length,
      };
    });

    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: 'admin.members.hard-delete' },
      extra: { userId: id, emailHash },
    });
    return NextResponse.json(
      {
        error: 'hard_delete_failed',
        message: 'Kalıcı silme sırasında bir hata oluştu. Tekrar deneyin.',
      },
      { status: 500 },
    );
  }
}
