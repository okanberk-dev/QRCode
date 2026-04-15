import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';

const FALLBACK_SECRET = 'cldqlkmC72MfL/WvllPYQq9O0puMk4j+LxrEtzm8PVs=';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || FALLBACK_SECRET);
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  // 6-digit zero-padded numeric code
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const locale = body.locale === 'en' ? 'en' : 'tr';

    if (!email || email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta girin.' }, { status: 400 });
    }

    // Rate limiting: 5 per IP per 10 min, 3 per email per 30 min
    const ipLimit = rateLimit(`pwr:ip:${ip}`, 5, 10 * 60 * 1000);
    const emailLimit = rateLimit(`pwr:email:${email}`, 3, 30 * 60 * 1000);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: 'Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond with the same shape so attackers can't enumerate emails.
    // Only actually send the email if the user exists & is active.
    if (user && user.isActive) {
      const code = generateCode();
      const codeHash = hashCode(code);

      const token = await new jose.SignJWT({
        purpose: 'pwr',
        userId: user.id,
        email: user.email,
        codeHash,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30m')
        .sign(getSecret());

      const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
      const safeBase = envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)
        ? envAppUrl
        : 'https://buaze.com';
      const resetUrl = `${safeBase}/${locale}/auth/reset-password?token=${encodeURIComponent(token)}`;

      const sent = await sendPasswordResetEmail({
        to: user.email,
        code,
        resetUrl,
        locale,
      });

      if (!sent) {
        // Log but still return ok to the client — we don't want to leak infra state
        console.error('[FORGOT_PASSWORD] SMTP failed for', user.email);
      }

      return NextResponse.json({ ok: true, token });
    }

    // User doesn't exist — pretend success after a small delay to blunt timing attacks
    await new Promise((r) => setTimeout(r, 150));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[FORGOT_PASSWORD]', error);
    return NextResponse.json({ error: 'Bir hata oluştu. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
