import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { isStrongPassword } from '@/lib/validations';

/**
 * Admin password reset finalisation.
 *
 * Body: { username, code, newPassword }
 *
 * Verifies the 6-digit code stored as SHA-256 hash on AdminUser, checks
 * expiry, and on success writes a fresh bcrypt hash for the password.
 * Constant-time hash compare; brute-force gate via attempt counter.
 *
 * Rate limit: 10 attempts / 15 min / IP.
 */

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const rl = await rateLimit(`admin:reset:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla deneme. Lütfen biraz bekle.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body.username || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const newPassword = String(body.newPassword || '');

    if (!username || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Kullanıcı adı, kod ve yeni şifre zorunludur.' },
        { status: 400 },
      );
    }

    // reCAPTCHA — paired with the forgot-password gate. Without it the
    // attacker that brute-forces the 6-digit code (10/15min limit notwith-
    // standing) gets to do so without any bot signal.
    const captcha = await verifyRecaptchaToken(req, body.recaptchaToken, 'admin_reset_password');
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Match the strength bar used everywhere else in the codebase: 8+ chars,
    // at least one letter, at least one digit. The previous `length < 8`
    // check accepted "12345678" as a valid admin password.
    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        { error: 'Şifre en az 8 karakter olmalı; harf ve rakam içermeli.' },
        { status: 400 },
      );
    }

    const admin = await prisma.adminUser.findUnique({
      where: { username },
      select: {
        id: true,
        resetTokenHash: true,
        resetTokenExpiry: true,
        resetAttempts: true,
        resetLastAttempt: true,
      },
    });

    // Generic error — never leak whether user exists, only whether code valid
    const genericInvalid = NextResponse.json(
      { error: 'Kod geçersiz veya süresi dolmuş.' },
      { status: 400 },
    );

    if (!admin || !admin.resetTokenHash || !admin.resetTokenExpiry) {
      return genericInvalid;
    }

    // Expired
    if (admin.resetTokenExpiry < new Date()) {
      return genericInvalid;
    }

    // Brute-force gate
    const oneHourAgo = new Date(Date.now() - ATTEMPT_WINDOW_MS);
    if (
      admin.resetAttempts >= MAX_ATTEMPTS &&
      admin.resetLastAttempt &&
      admin.resetLastAttempt > oneHourAgo
    ) {
      return NextResponse.json(
        { error: 'Çok fazla yanlış kod. Bir saat sonra tekrar dene.' },
        { status: 429 },
      );
    }

    // Constant-time compare
    const incomingHash = hashCode(code);
    if (!timingSafeEqual(incomingHash, admin.resetTokenHash)) {
      // Increment attempts (or reset if window passed)
      const now = new Date();
      const inWindow =
        admin.resetLastAttempt && admin.resetLastAttempt > oneHourAgo;
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          resetAttempts: inWindow ? admin.resetAttempts + 1 : 1,
          resetLastAttempt: now,
        },
      });
      return genericInvalid;
    }

    // Success — write new password hash + clear reset state.
    // `passwordChangedAt` is the auth-staleness pivot (CLAUDE.md §37.2 A):
    // every admin_token issued before this timestamp will be rejected by
    // `getAdminFromRequest`'s staleness check, so a stolen pre-reset
    // cookie can't survive the password rotation.
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetAttempts: 0,
        resetLastAttempt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/reset-password]', error);
    return NextResponse.json({ error: 'İşlem başarısız.' }, { status: 500 });
  }
}
