import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt } from '@/lib/auth';
import { rateLimit, resetRateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { annotateRecaptchaAssessment, verifyRecaptchaToken } from '@/lib/recaptcha';

export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);
    const { email, password, rememberMe, recaptchaToken, locale } = await req.json();
    const captchaLocale = locale === 'en' ? 'en' : 'tr';

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'E-posta ve şifre zorunludur.' },
        { status: 400 }
      );
    }
    if (email.length > 256 || password.length > 256) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
    }

    const captcha = await verifyRecaptchaToken(req, recaptchaToken, 'auth_login', captchaLocale);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Burst-protection: 10 attempts per IP per 10 minutes and a tighter 5 per email.
    const ipLimit = rateLimit(`user-login:ip:${ip}`, 10, 10 * 60 * 1000);
    const emailLimit = rateLimit(`user-login:email:${email.toLowerCase()}`, 5, 10 * 60 * 1000);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: 'Çok fazla başarısız deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Use constant-time comparison to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$dummyhashfortimingatackprevention');
      if (captcha.assessmentName) {
        await annotateRecaptchaAssessment(captcha.assessmentName, 'PASSWORD_INCORRECT');
      }
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      if (captcha.assessmentName) {
        await annotateRecaptchaAssessment(captcha.assessmentName, 'PASSWORD_INCORRECT');
      }
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı.' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Hesabınız askıya alınmıştır. Destek için hello@buaze.com adresine yazın.' },
        { status: 403 }
      );
    }

    // Check trial status
    const now = new Date();
    const isTrialExpired = user.plan === 'trial' && user.trialEndsAt && user.trialEndsAt < now;
    
    if (isTrialExpired) {
      return NextResponse.json(
        {
          error: 'Ücretsiz deneme süreniz sona ermiştir.',
          trialExpired: true,
        },
        { status: 402 }
      );
    }

    // Successful auth — clear brute-force counters.
    resetRateLimit(`user-login:ip:${ip}`);
    resetRateLimit(`user-login:email:${email.toLowerCase()}`);
    if (captcha.assessmentName) {
      await annotateRecaptchaAssessment(captcha.assessmentName, 'PASSWORD_CORRECT');
    }

    // Sign user JWT — restaurantId is intentionally omitted; owners can have
    // multiple restaurants and scoping is resolved per-request via getScopedRestaurantIds().
    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
      },
    });

    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 1; // 30 days or 1 day
    const isSecure = process.env.NODE_ENV === 'production' && 
                     (req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:');

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: cookieMaxAge,
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
    console.error('[AUTH_LOGIN]', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
