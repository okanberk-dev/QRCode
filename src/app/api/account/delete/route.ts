// Wave B4 (CLAUDE.md §38.B + §38.193) — owner-initiated account deletion
// with a 30-day grace window.
//
// POST /api/account/delete
//   Schedules the wipe by setting User.scheduledDeletionAt = now + 30d and
//   minting a fresh User.deletionCancelToken. Revokes every UserSession
//   for the user (so the cookie that triggered this request also dies —
//   the next page load will hit /auth/login). Sends the
//   `account-deletion-scheduled` mail with the embedded cancel link.
//
// POST /api/account/delete (idempotent re-schedule)
//   If a schedule already exists, the same endpoint re-issues a fresh
//   30-day window + new cancel token + new mail. This is intentional —
//   owners who lost the cancel link can re-trigger to get a fresh one.
//
// Hard-delete itself runs on /api/cron/process-scheduled-deletions
// (daily 03:00 UTC) which cascades through Restaurant + Feedback + Menu +
// QR + Analytics + UserSession (§37.9 chain) and anonymises BillingInvoice
// / AdminAuditLog / BillingSubscription (existing 2026-05-18 migration
// 20260518000000_user_hard_delete_anonymize). KVKK m.7 mali kayıt 10y
// retention korunur.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendAccountDeletionScheduledEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GRACE_DAYS = 30;
const TOKEN_BYTES = 32;

export async function POST(req: NextRequest) {
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = payload.userId;
  if (!userId) return ApiErrors.unauthorized();

  // CLAUDE.md §37.2.C — privileged write rate limit. Account deletion is
  // a high-cost (Resend send + DB cascade chain) action; 3/min/actor is
  // plenty for the "owner clicks Delete, regrets it, clicks Cancel,
  // clicks Delete again" rapid-fire cycle without inviting abuse.
  const rl = await rateLimit(`account-delete:${userId}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      isActive: true,
    },
  });
  if (!user) return ApiErrors.notFound('User not found');
  if (!user.isActive) {
    // Already soft-deleted by an admin — no point in scheduling a second
    // wipe; refuse with a clear error so the UI can surface the right
    // message ("Your account is already deactivated. Contact support.").
    return NextResponse.json(
      { error: 'account_inactive', message: 'Account already deactivated by admin' },
      { status: 409 },
    );
  }

  const now = new Date();
  const scheduledFor = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  const cancelToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');

  // Two writes wrapped together so a session-revoke crash can't leave the
  // schedule in a state where the cookie keeps working past the deadline.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        scheduledDeletionAt: scheduledFor,
        deletionCancelToken: cancelToken,
      },
    }),
    prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  // CLAUDE.md §37.7 PII redaction — log userId, not email.
  console.error('[ACCOUNT_DELETE_SCHEDULED]', {
    userId,
    scheduledFor: scheduledFor.toISOString(),
    ip: getClientIp(req.headers),
  });

  // Fire-and-forget mail (sender wires ops alert internally §21.33). We
  // never want to gate the schedule on a Resend hiccup — the DB row is
  // already written, the session is already revoked. Worst-case the
  // owner sees "Account scheduled for deletion" in the UI but doesn't
  // get the mail; ops alert + admin trigger covers that path.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const userLocale: 'tr' | 'en' = user.locale === 'en' ? 'en' : 'tr';
  const cancelUrl = `${appUrl}/api/account/delete/cancel?token=${encodeURIComponent(cancelToken)}`;

  sendAccountDeletionScheduledEmail({
    to: user.email,
    firstName: user.name,
    accountEmail: user.email,
    scheduledFor,
    daysRemaining: GRACE_DAYS,
    cancelUrl,
    locale: userLocale,
  }).catch(() => {
    // sender already logs + ops-alerts; defence-in-depth catch
  });

  // 200 not 204 so the UI can show the resolved scheduledFor timestamp
  // (matches what's in the mail) without a second round-trip.
  return NextResponse.json({
    ok: true,
    scheduledFor: scheduledFor.toISOString(),
    daysRemaining: GRACE_DAYS,
  });
}
