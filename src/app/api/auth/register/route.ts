import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt } from '@/lib/auth';
import { rateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { isStrongPassword } from '@/lib/validations';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { recordConsentBatch } from '@/lib/legal/consent';
import { isSupportedLegalLocale, type LegalLocale } from '@/lib/legal/keys';

export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);

    // Rate limit: 5 registrations per IP per 30 minutes
    const ipLimit = await rateLimit(`register:ip:${ip}`, 5, 30 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla kayıt denemesi. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
      );
    }

    const { email, password, name, website, recaptchaToken, locale, inviteToken } = await req.json();
    const captchaLocale = locale === 'en' ? 'en' : 'tr';

    // Honeypot check
    if (website) {
      // Silently ignore or return success to trick the bot
      return NextResponse.json({ success: true, message: 'Registration received' }, { status: 201 });
    }

    const captcha = await verifyRecaptchaToken(req, recaptchaToken, 'auth_register', captchaLocale);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve şifre zorunludur.' },
        { status: 400 }
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { error: 'Şifre en az 8 karakter uzunluğunda olmalı, en az bir harf ve bir rakam içermelidir.' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi girin.' },
        { status: 400 }
      );
    }

    // Create user only. Restaurant creation is deferred to onboarding — if the
    // user skips onboarding, no restaurant is created. See
    // /api/onboarding/complete for the auto-create path (bizName ≥ 2 chars).
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new Error('USER_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
        plan: 'trial',
        trialEndsAt,
      },
    });

    // Kayıt onayı log'u — kullanıcı kayıt akışında kullanım şartları + gizlilik
    // politikası + KVKK aydınlatma metnini kabul ediyor sayılır (UI bu üçünü
    // tek "kayıt olarak kabul ediyorum" string'i altında toplar). ETK izni
    // ayrı tutulur — register form'unda toplanmıyor (kullanıcı dashboard'tan
    // bültene abone olduğunda toplanacak).
    {
      const ua = req.headers.get('user-agent');
      const localeRaw = typeof locale === 'string' ? locale.toLowerCase() : 'tr';
      const consentLocale: LegalLocale = isSupportedLegalLocale(localeRaw) ? localeRaw : 'tr';
      void recordConsentBatch(
        {
          locale: consentLocale,
          subjectType: 'user',
          subjectId: user.id,
          source: 'register',
          ipAddress: ip ?? null,
          userAgent: ua,
        },
        [
          { key: 'kullanim-sartlari', granted: true },
          { key: 'gizlilik-politikasi', granted: true },
          { key: 'kvkk-aydinlatma', granted: true },
        ],
      );
    }

    // Auto-activate TeamMember after register (Section 5 davet kabul akışı).
    // Davet maili'ndeki link kullanıcıyı /auth/register?inviteToken=... ile buraya
    // getirir. Email match + token geçerli ise TeamMember status invited→active +
    // token tek-seferlik silinir. Email mismatch veya geçersiz token sessizce
    // ignored — register zaten başarılı, kullanıcı /accept-invite'a tekrar giderse
    // yine işler.
    let invitedAccepted = false;
    if (typeof inviteToken === 'string' && inviteToken.length >= 32) {
      try {
        const member = await prisma.teamMember.findUnique({
          where: { inviteToken },
          select: { id: true, email: true, status: true, inviteTokenExpiresAt: true },
        });
        const tokenValid =
          member &&
          member.email === normalizedEmail &&
          member.status === 'invited' &&
          (!member.inviteTokenExpiresAt || member.inviteTokenExpiresAt.getTime() > Date.now());
        if (tokenValid && member) {
          await prisma.teamMember.update({
            where: { id: member.id },
            data: {
              status: 'active',
              inviteToken: null,
              inviteTokenExpiresAt: null,
            },
          });
          invitedAccepted = true;
        }
      } catch (err) {
        // Token mismatch veya DB hata — fail-open, kullanıcı /accept-invite'a
        // tekrar giderse manuel akış yine çalışır.
        console.error('[register] invite auto-activate failed:', (err as Error).message);
      }
    }

    // Welcome email — fire and forget. We don\'t want a Resend hiccup to
    // block account creation; the cookie + redirect still succeeds.
    const userLocale: 'tr' | 'en' = locale === 'en' ? 'en' : 'tr';
    void (async () => {
      try {
        const { sendWelcomeEmail } = await import('@/lib/email');
        await sendWelcomeEmail({ to: user.email, firstName: user.name, locale: userLocale });
      } catch (err) {
        console.error('[register] welcome mail failed', err);
      }
    })();

    // Sign tokens — no restaurantId yet; it's populated after onboarding completes.
    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      restaurantId: null,
    });

    const isSecure = process.env.NODE_ENV === 'production' && 
                     (req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:');

    const response = NextResponse.json(
      {
        success: true,
        invitedAccepted,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          trialEndsAt: user.trialEndsAt,
        },
      },
      { status: 201 }
    );

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[AUTH_REGISTER]', error);

    if (error instanceof Error && error.message === 'USER_EXISTS') {
      return NextResponse.json(
        { error: 'Bu e-posta adresiyle zaten bir hesap mevcut.' },
        { status: 409 }
      );
    }

    // Prisma Connection Timeout
    const errCode = (error as { code?: string })?.code;
    if (errCode === 'P2024') {
      return NextResponse.json(
        { error: 'Veritabanı bağlantı zaman aşımı. Lütfen biraz bekleyip tekrar deneyin.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
