import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';
import { prisma } from '@/lib/prisma';
import { signJwt } from '@/lib/auth';
import { rateLimit, resetRateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { verifyFirebaseIdToken, getFirebaseProjectId } from '@/lib/firebase-admin';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { handleOAuthSignIn, type OAuthDeps } from '@/lib/oauth';
import { createUserSessionForToken } from '@/lib/user-session';
import { describeDevice } from '@/lib/device-fingerprint';

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
    const { idToken, recaptchaToken, locale } = await req.json();
    const captchaLocale = locale === 'en' ? 'en' : 'tr';

    // Latency optimization (CLAUDE.md §34.4): rate-limit lookup, reCAPTCHA
    // assessment and the Firebase ID-token signature check are three
    // independent network round-trips (Upstash, Google reCAPTCHA, Google
    // JWKS). Run them concurrently; only the DB work below depends on the
    // verified claims. The verify is side-effect free, so starting it before
    // the rate-limit decision leaks nothing — an over-limit caller still gets
    // a 429 and never reaches the DB.
    const verifiedClaims =
      typeof idToken === 'string' && idToken
        ? verifyFirebaseIdToken(idToken)
        : Promise.resolve(null);
    const [ipLimit, captcha] = await Promise.all([
      rateLimit(`google-auth:ip:${ip}`, 10, 10 * 60 * 1000),
      verifyRecaptchaToken(req, recaptchaToken, 'auth_google', captchaLocale),
      // Swallow here; `handleOAuthSignIn` re-awaits and maps null → 401.
      verifiedClaims.catch(() => null),
    ]);

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
      );
    }

    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    const deps: OAuthDeps = {
      verifyToken: () => verifiedClaims.catch(() => null),
      findUser: (email) => prisma.user.findUnique({ where: { email } }),
      createUser: async (data) => {
        // Google tarafından gelen kullanıcı → parolasız hesap. Rastgele güçlü
        // bir hash saklıyoruz ki e-posta yolundan giriş denenemesin.
        const randomSecret = `${crypto.randomUUID()}${crypto.randomUUID()}`;
        const passwordHash = await bcrypt.hash(randomSecret, BCRYPT_COST);
        return prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            name: data.name,
            plan: 'trial',
            trialEndsAt: data.trialEndsAt,
          },
        });
      },
      signToken: signJwt,
      now: () => new Date(),
    };

    const result = await handleOAuthSignIn({ idToken }, deps);

    if (!result.ok) {
      const body: Record<string, unknown> = { error: result.error };
      if (result.trialExpired) body.trialExpired = true;
      return NextResponse.json(body, { status: result.status });
    }

    const { user, isNewUser, token } = result;

    resetRateLimit(`google-auth:ip:${ip}`);

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

    const session = await createUserSessionForToken({
      req,
      userId: user.id,
      token,
      context: 'AUTH_GOOGLE',
    });
    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: 500 });
    }

    // Wave D (CLAUDE.md §38.195) — new-device alert for Google sign-in.
    // Skip when isNewUser is true (just created account, first session);
    // session.isNewDevice already returns false in that case (no prior
    // sessions) so this is defence-in-depth.
    if (session.isNewDevice && !isNewUser) {
      const userAgent = req.headers.get('user-agent');
      const desc = describeDevice(userAgent, ip);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
      const userLocale: 'tr' | 'en' = (
        (user as unknown as { locale?: string }).locale === 'en' ? 'en' : 'tr'
      );
      // Lazy import: `@/lib/email` pulls in the whole template catalogue;
      // keeping it off the module graph shrinks the cold-start of this
      // route for the 99% of sign-ins that are not from a new device.
      import('@/lib/email')
        .then(({ sendNewDeviceLoginEmail }) =>
          sendNewDeviceLoginEmail({
            to: user.email,
            firstName: user.name,
            accountEmail: user.email,
            device: desc.device,
            location: desc.location,
            loggedInAt: new Date(),
            resetUrl: `${appUrl}/${userLocale}/auth/forgot-password`,
            locale: userLocale,
          }),
        )
        .catch(() => {
          // sender wires ops-alert internally
        });
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
