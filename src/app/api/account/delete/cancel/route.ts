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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function renderLandingPage(opts: { locale: 'tr' | 'en'; success: boolean; message: string; ctaUrl: string }): string {
  const isTr = opts.locale !== 'en';
  const palette = opts.success ? { accent: '#A8D62E', bg: '#EAF9B8', headerColor: '#0A0A0A' } : { accent: '#DC2626', bg: '#FEE2E2', headerColor: '#0A0A0A' };
  const title = opts.success
    ? (isTr ? 'Hesap silme iptal edildi' : 'Account deletion canceled')
    : (isTr ? 'Bağlantı geçersiz' : 'Link is invalid');
  const ctaLabel = isTr ? 'Panele git' : 'Open dashboard';
  return `<!DOCTYPE html>
<html lang="${isTr ? 'tr' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background: #FAFAFA; color: #0A0A0A; margin: 0; padding: 48px 24px; min-height: 100vh; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
  .card { max-width: 480px; width: 100%; background: #FFFFFF; border: 1px solid #EDEDED; border-radius: 18px; padding: 36px; box-shadow: 0 4px 16px rgba(10,10,10,0.04); }
  .badge { display: inline-block; padding: 4px 12px; background: ${palette.bg}; color: ${palette.headerColor}; font-size: 11px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.18em; text-transform: uppercase; border-radius: 999px; border-left: 3px solid ${palette.accent}; }
  h1 { font-family: 'Space Grotesk', sans-serif; font-size: 28px; line-height: 1.1; letter-spacing: -0.025em; font-weight: 500; margin: 16px 0 12px; }
  p { font-size: 15px; line-height: 1.6; color: #525252; margin: 0 0 24px; }
  a.cta { display: inline-block; padding: 12px 24px; background: #0A0A0A; color: #FFFFFF; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 500; }
  a.cta:hover { background: #1A1A1A; }
  .footer { margin-top: 32px; font-size: 12px; color: #A3A3A3; }
</style>
</head>
<body>
<div class="card">
  <span class="badge">${isTr ? 'Hesap silme · İptal' : 'Account delete · Cancel'}</span>
  <h1>${title}</h1>
  <p>${opts.message}</p>
  <a class="cta" href="${opts.ctaUrl}">${ctaLabel} →</a>
  <div class="footer">buaze.com</div>
</div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
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
    return new NextResponse(
      renderLandingPage({
        locale: 'tr',
        success: false,
        message: 'Bu link geçersiz görünüyor. Mail\'deki bağlantıyı tekrar dene veya destek ekibine yaz.',
        ctaUrl: `${appUrl}/tr/dashboard`,
      }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
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
    return new NextResponse(
      renderLandingPage({
        locale: 'tr',
        success: false,
        message: 'Bu link artık geçerli değil. İptal süresi dolmuş veya hesabın zaten aktif olabilir.',
        ctaUrl: `${appUrl}/tr/dashboard`,
      }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
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

  console.error('[ACCOUNT_DELETE_CANCELED]', {
    userId: user.id,
    ip,
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

  const message = userLocale === 'tr'
    ? 'Hesabın aktif kalıyor. Tüm verin yerinde — restoranlar, yorumlar ve abonelik geçmişi olduğu gibi devam ediyor. Onay maili dakikalar içinde inbox\'ına gelir.'
    : 'Your account stays active. All data is intact — restaurants, reviews and subscription history continue unchanged. A confirmation mail will arrive in your inbox shortly.';

  return new NextResponse(
    renderLandingPage({
      locale: userLocale,
      success: true,
      message,
      ctaUrl: `${appUrl}/${userLocale}/dashboard`,
    }),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';

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

  console.error('[ACCOUNT_DELETE_CANCELED_INAPP]', {
    userId,
    ip: getClientIp(req.headers),
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
