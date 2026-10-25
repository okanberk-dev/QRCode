// Wave B4 (CLAUDE.md §38.B + §38.193) — cancel a scheduled account
// deletion via the token in the confirmation mail. GET so the mail link
// works on a single click (mail clients don't POST). Idempotent — the
// same token can be hit twice and the second call just no-ops.
//
// Returns a friendly HTML page (NOT JSON) so the owner sees an immediate
// confirmation when they click the link from their inbox. Behind the
// scenes we send the `account-deletion-canceled` mail too so the owner
// has an audit trail.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendAccountDeletionCanceledEmail } from '@/lib/email';
import { ApiErrors } from '@/lib/api-errors';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { renderMailLandingPage } from '@/lib/email/landing-page';
import { accountDeleteCancelLanding, type AccountDeleteCancelState } from '@/lib/email/landing-pages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function landingHtml(
  locale: 'tr' | 'en',
  state: AccountDeleteCancelState,
  dashboardUrl: string,
): string {
  return renderMailLandingPage(accountDeleteCancelLanding({ locale, state, dashboardUrl }));
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const ip = getClientIp(req.headers);

  // Lookup token rate-limit so a brute-force scan of cancel tokens dies
  // before it can guess one. 60/min/IP — generous enough that a real
  // owner clicking + reloading works, low enough that a botnet stops
  // making progress.
  const rl = await rateLimit(`account-delete-cancel:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return new NextResponse('Rate limit exceeded — try again in a minute.', {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds), 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const token = (req.nextUrl.searchParams.get('token') ?? '').trim();
  // Token format check: hex string, exactly 64 chars (32 bytes hex).
  // Block obviously malformed input before hitting Prisma.
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return new NextResponse(landingHtml('tr', 'invalid', `${appUrl}/tr/dashboard`), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const user = await prisma.user.findUnique({
    where: { deletionCancelToken: token },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      scheduledDeletionAt: true,
    },
  });

  // Token belongs to no user (revoked, expired, never minted). Same
  // generic message as malformed input — don't leak whether the token
  // ever existed (timing attack hygiene).
  if (!user || !user.scheduledDeletionAt) {
    return new NextResponse(landingHtml('tr', 'expired', `${appUrl}/tr/dashboard`), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const userLocale: 'tr' | 'en' = user.locale === 'en' ? 'en' : 'tr';

  // Past-deadline tokens still get cleared (defensive — should never
  // happen because the cron clears them at execution time, but if the
  // cron is paused / lagging the link should still revoke the schedule).
  await prisma.user.update({
    where: { id: user.id },
    data: {
      scheduledDeletionAt: null,
      deletionCancelToken: null,
    },
  });

  // §37.7 — no IP in logs.
  console.error('[ACCOUNT_DELETE_CANCELED]', { userId: user.id });
  await writeAdminAuditLog({
    actorId: user.id,
    actorSource: 'user',
    action: 'owner.account.deletion_canceled',
    targetId: user.id,
    payload: { via: 'email_link' },
  });

  // Confirmation mail — fire-and-forget.
  sendAccountDeletionCanceledEmail({
    to: user.email,
    firstName: user.name,
    accountEmail: user.email,
    dashboardUrl: `${appUrl}/${userLocale}/dashboard`,
    locale: userLocale,
  }).catch(() => {
    // sender already logs + ops-alerts
  });

  return new NextResponse(landingHtml(userLocale, 'success', `${appUrl}/${userLocale}/dashboard`), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// POST /api/account/delete/cancel — auth-gated in-app cancel (no token).
// Used by the Danger Zone "Vazgeç" button so the owner can revoke without
// going back to their inbox. Same effect as the GET token flow + same
// confirmation mail.
export async function POST(req: NextRequest) {
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = payload.userId;
  if (!userId) return ApiErrors.unauthorized();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      scheduledDeletionAt: true,
    },
  });
  if (!user) return ApiErrors.notFound('User not found');
  if (!user.scheduledDeletionAt) {
    // Nothing to cancel — idempotent success so the UI doesn't have to
    // distinguish "already canceled" from "just canceled" optically.
    return NextResponse.json({ ok: true, alreadyClear: true });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { scheduledDeletionAt: null, deletionCancelToken: null },
  });

  console.error('[ACCOUNT_DELETE_CANCELED_INAPP]', { userId });
  await writeAdminAuditLog({
    actorId: userId,
    actorSource: 'user',
    action: 'owner.account.deletion_canceled',
    targetId: userId,
    payload: { via: 'in_app' },
  });

  const userLocale: 'tr' | 'en' = user.locale === 'en' ? 'en' : 'tr';
  sendAccountDeletionCanceledEmail({
    to: user.email,
    firstName: user.name,
    accountEmail: user.email,
    dashboardUrl: `${appUrl}/${userLocale}/dashboard`,
    locale: userLocale,
  }).catch(() => {
    // sender already logs + ops-alerts
  });

  return NextResponse.json({ ok: true });
}
