import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { sendVerifyEmail } from '@/lib/email';
import { isValidEmail } from '@/lib/validations';

export const dynamic = 'force-dynamic';

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

function generateVerifyToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * §22 — Verify maili tekrar gönder (idempotent + rate-limited).
 *
 * Body: { email, locale? }
 * Rate limit:
 *   - 1/dk per email (kullanıcı misclick koruması)
 *   - 5/saat per IP (Resend mail send credit koruması)
 *
 * Davranış:
 *   - User yoksa → 200 ok (timing/leak engeli — invitee email enumeration)
 *   - emailVerified=true → 200 ok (idempotent)
 *   - Aksi halde yeni token üret + expires yenile + sendVerifyEmail
 *
 * Önemli: rate limit her zaman geçerli IP/email için sayar; "user yok"
 * branch'ine dahi sayar. Spam tarayıcısı 200 ok aldığında bile rate'a takılır.
 */
export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);

    let body: { email?: string; locale?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const email = (body.email ?? '').trim().toLowerCase();
    if (!email || !isValidEmail(email) || email.length > 200) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const localeStr: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';

    const ipLimit = await rateLimit(`resend-verify:ip:${ip}`, 5, 60 * 60 * 1000);
    const emailLimit = await rateLimit(`resend-verify:email:${email}`, 1, 60 * 1000);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: retry },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, locale: true, emailVerified: true },
    });

    // Leak engeli — user yok veya zaten verified ise 200 dön (kullanıcıya
    // farkı belli etme). UX için "Mail gönderildi" gösterilir; gerçekten
    // gitmediği zaman da kullanıcı endişelenmez (zaten hesap yok / verified).
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true });
    }

    const token = generateVerifyToken();
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: token,
        emailVerifyTokenExpiresAt: expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
    const mailLocale: 'tr' | 'en' = user.locale === 'en' ? 'en' : localeStr;
    const verifyUrl = `${appUrl}/${mailLocale}/auth/verify-email?token=${token}`;

    void sendVerifyEmail({
      to: user.email,
      firstName: user.name,
      verifyUrl,
      locale: mailLocale,
    }).catch((err) => {
      console.error('[resend-verify] mail send failed:', (err as Error).message);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[AUTH_RESEND_VERIFY]', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
