import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import { verifyRecaptchaToken } from '@/lib/recaptcha';

/**
 * Admin password recovery — issues a 6-digit numeric code valid for 15
 * minutes. Code is hashed (SHA-256) and stored on AdminUser; plaintext only
 * ever appears in the recipient's mailbox.
 *
 * UX: always returns 200 to avoid username enumeration. The actual email
 * goes only when (a) admin exists, (b) admin has a recovery email set, and
 * (c) Resend is configured. Otherwise the call is a silent no-op.
 *
 * Rate limit: 5 requests / 15 min / IP. Prevents spam.
 */

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OUTSTANDING_ATTEMPTS = 6;

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const rl = await rateLimit(`admin:forgot:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen biraz bekle.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    // UI artık tek alan kullanıyor: "Kullanıcı adı veya e-posta". `username`
    // veya `identifier` field'ından gelir; her ikisini de destekleriz.
    const rawIdentifier = String(body.identifier || body.username || '').trim().toLowerCase();
    if (!rawIdentifier) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya e-posta zorunludur.' },
        { status: 400 },
      );
    }

    // reCAPTCHA — admin login already gates with this, the recovery flow
    // gives an attacker the same code-issuance surface so it needs the same
    // bot guard. Soft-fails to OK in monitor mode (CLAUDE.md §18) just like
    // the rest of the public auth flows.
    const captcha = await verifyRecaptchaToken(req, body.recaptchaToken, 'admin_forgot_password');
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Generic OK response — never leak whether the username exists or not
    const genericOk = NextResponse.json({ ok: true });

    let admin: {
      id: string;
      username: string;
      email: string | null;
      resetAttempts: number;
      resetLastAttempt: Date | null;
    } | null = null;
    const looksLikeEmail = rawIdentifier.includes('@');
    try {
      admin = await prisma.adminUser.findUnique({
        where: looksLikeEmail ? { email: rawIdentifier } : { username: rawIdentifier },
        select: {
          id: true,
          username: true,
          email: true,
          resetAttempts: true,
          resetLastAttempt: true,
        },
      });
    } catch (err) {
      // P2022: column doesn't exist yet (deploy race) — fail silently
      const code = (err as { code?: string })?.code;
      if (code !== 'P2022') console.error('[admin/forgot-password] lookup', err);
      return genericOk;
    }

    if (!admin || !admin.email) {
      // Either user doesn't exist OR has no recovery email — silent
      return genericOk;
    }

    // Brute-force gate: 6+ attempts in last hour → wait
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (
      admin.resetAttempts >= MAX_OUTSTANDING_ATTEMPTS &&
      admin.resetLastAttempt &&
      admin.resetLastAttempt > oneHourAgo
    ) {
      return genericOk;
    }

    // Generate 6-digit code (000000-999999), zero-padded
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        resetTokenHash: hashCode(code),
        resetTokenExpiry: new Date(Date.now() + CODE_TTL_MS),
        // Reset attempt counter every fresh request (operator may have
        // legitimately retried; their NEXT attempt counter resumes from 0).
        resetAttempts: 0,
        resetLastAttempt: new Date(),
      },
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com').replace(/\/+$/, '');
    // Reset URL her zaman username taşır — kullanıcı email ile arasa bile
    // kod doğrulama akışında AdminUser.username zorunludur.
    const resetUrl = `${appUrl}/admin/reset-password?username=${encodeURIComponent(admin.username)}`;

    // Fire-and-forget — UI doesn't reveal whether send succeeded (anti-enum)
    sendPasswordResetEmail({
      to: admin.email,
      code,
      resetUrl,
      locale: 'tr',
      ip,
      device: req.headers.get('user-agent') || null,
    }).catch((err) => console.error('[admin/forgot-password] mail', err));

    return genericOk;
  } catch (error) {
    console.error('[admin/forgot-password]', error);
    // Generic OK — never leak failure modes
    return NextResponse.json({ ok: true });
  }
}
