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
 *      - executeUserHardDelete() removes Restaurant rows explicitly (the
 *        users→restaurants FK is ON DELETE SET NULL, NOT cascade — §38.238)
 *        which then cascades Feedback / Menu / QR / Analytics / Brand /
 *        Platform / Activation / Embed, plus the FK-less GoogleIntegration /
 *        ApiKey / TeamMember / NotificationPreference rows.
 *      - Write final 'admin.members.hard_delete' audit row (current admin
 *        actor, redacted payload — only hashed email + deletedAt).
 *
 * The endpoint is destructive AND irreversible. The UI double-confirms with
 * cascade preview + e-mail typing confirmation.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { executeUserHardDelete, hashEmailShort, isHardDeleteDeferred } from '@/lib/user-hard-delete';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HARD_DELETE_GRACE_DAYS = Number(process.env.HARD_DELETE_GRACE_DAYS) || 7;

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
    // §38.238 — delegate to the shared helper. This route previously carried
    // its own copy of the transaction, which meant the SET-NULL cascade bug
    // (and the FK-less orphan rows) had to be fixed in two places. It also
    // never removed menu items, so on this path `user.delete()` deleted
    // essentially nothing beyond the User row itself.
    const stats = await executeUserHardDelete(id, user.email, {
      id: adminId,
      source: 'admin',
      action: 'admin.members.hard_delete',
      extra: {
        deactivatedAt: user.deactivatedAt,
        graceDays: HARD_DELETE_GRACE_DAYS,
        elapsedDays: ageDays,
      },
    });
    if (isHardDeleteDeferred(stats)) {
      // A payment or automatic charge of this member is in flight (at most 7 days, billing spec §11.6).
      return NextResponse.json(
        {
          error: 'billing_in_flight',
          message: 'Üyenin işlemdeki bir ödemesi var. Kalıcı silme en geç 7 gün içinde yapılabilir.',
        },
        { status: 409 },
      );
    }

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
