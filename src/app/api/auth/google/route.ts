import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signJwt } from '@/lib/auth';
import { rateLimit, resetRateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { verifyFirebaseIdToken, getFirebaseProjectId } from '@/lib/firebase-admin';
import { verifyRecaptchaToken } from '@/lib/recaptcha';

export async function POST(req: NextRequest) {
  try {
    maybeSweep();

    if (!getFirebaseProjectId()) {
      return NextResponse.json(
        { error: 'Google ile giriş şu anda aktif değil.' },
        { status: 503 },
      );
    }

    const ip = getClientIp(req.headers);
    const ipLimit = await rateLimit(`google-auth:ip:${ip}`, 10, 10 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
      );
    }

    const { idToken, recaptchaToken, locale } = await req.json();
    const captchaLocale = locale === 'en' ? 'en' : 'tr';
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
    }

    const captcha = await verifyRecaptchaToken(req, recaptchaToken, 'auth_google', captchaLocale);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    const claims = await verifyFirebaseIdToken(idToken);
    if (!claims) {
      return NextResponse.json({ error: 'Kimlik doğrulanamadı.' }, { status: 401 });
    }

    const email = claims.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json(
        { error: 'E-posta adresi alınamadı. Lütfen e-posta ile giriş yapın.' },
        { status: 400 },
      );
    }
    if (claims.email_verified === false) {
      return NextResponse.json(
        { error: 'E-posta adresiniz doğrulanmamış.' },
        { status: 403 },
      );
    }

    let user = await prisma.user.findUnique({ where: { email } });
    const now = new Date();
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Google tarafından gelen kullanıcı → parolasız hesap. Rastgele güçlü
      // bir hash saklıyoruz ki e-posta yolundan giriş denenemesin.
      const randomSecret = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const passwordHash = await bcrypt.hash(randomSecret, 12);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: claims.name?.trim() || null,
          plan: 'trial',
          trialEndsAt,
        },
      });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Hesabınız askıya alınmıştır.' },
        { status: 403 },
      );
    }

    const isTrialExpired =
      user.plan === 'trial' && user.trialEndsAt && user.trialEndsAt < now;
    if (isTrialExpired) {
      return NextResponse.json(
        { error: 'Ücretsiz deneme süreniz sona ermiştir.', trialExpired: true },
        { status: 402 },
      );
    }

    resetRateLimit(`google-auth:ip:${ip}`);

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const isSecure =
      process.env.NODE_ENV === 'production' &&
      (req.headers.get('x-forwarded-proto') === 'https' ||
        req.nextUrl.protocol === 'https:');

    // Dönen kullanıcıysa onboarding tamamlanmış mı — email akışıyla parite için
    // aynı "yeni ise /onboarding, değilse /dashboard" davranışını client'a aktarıyoruz.
    //
    // Önemli: progress satırı bulunamayan legacy/eski kullanıcıyı (OnboardingProgress
    // tablosundan önce kaydolmuş) onboarding'e geri göndermiyoruz — onlar zaten
    // paneli kullanıyor. Sadece satır VAR ama completedAt boşsa (kullanıcı wizard'ı
    // yarıda bıraktı) onboarding'e gönder.
    let onboardingCompleted = false;
    if (!isNewUser) {
      try {
        const progress = await prisma.onboardingProgress.findUnique({
          where: { userId: user.id },
          select: { completedAt: true },
        });
        onboardingCompleted = progress ? Boolean(progress.completedAt) : true;
      } catch {
        // Tablo henüz deploy edilmemişse sessizce true kabul et — dashboard'a yönlendirme güvenli.
        onboardingCompleted = true;
      }
    }

    const response = NextResponse.json({
      success: true,
      isNewUser,
      onboardingCompleted,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
      },
    });

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
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
    console.error('[AUTH_GOOGLE]', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 },
    );
  }
}
