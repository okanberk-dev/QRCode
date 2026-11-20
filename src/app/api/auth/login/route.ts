import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSecret } from '@/lib/auth';
import { rateLimit, resetRateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { annotateRecaptchaAssessment, verifyRecaptchaToken } from '@/lib/recaptcha';
import { recordLoginRiskScore } from '@/lib/login-risk';
import { issueLoginSession } from '@/lib/login-session';
import * as jose from 'jose';

// 2FA challenge JWT — login sonrasında geçerli kullanıcının kimliğini taşıyan
// kısa ömürlü token. 5 dakika içinde 6 haneli kod doğrulanmazsa expire olur.
// Çalınmış challenge token = sadece 5 dk geçerli + sadece yeni 2FA verify
// endpoint'inde kabul (cookie set etmez). `getSecret()` production'da
// JWT_SECRET yoksa throw eder (defensive — public dev key ile imzalama).
const CHALLENGE_TTL = '5m';

async function signChallengeJwt(payload: Record<string, unknown>): Promise<string> {
  return new jose.SignJWT({ ...payload, kind: 'login_challenge' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(CHALLENGE_TTL)
    .sign(getSecret());
}

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

    // Latency optimization (CLAUDE.md §34.19): reCAPTCHA verify, rate-
    // limit checks, and the user lookup all hit the network independently.
    // Running them sequentially adds ~200-400ms; running them in
    // `Promise.all` collapses the wait time to the slowest leg
    // (typically the reCAPTCHA Enterprise assessment at 50-200ms).
    // The bcrypt compare still runs sequentially below — it depends on
    // the password hash from the user row.
    const normalizedEmail = email.toLowerCase().trim();
    const [captcha, ipLimit, emailLimit, user] = await Promise.all([
      verifyRecaptchaToken(req, recaptchaToken, 'auth_login', captchaLocale),
      rateLimit(`user-login:ip:${ip}`, 10, 10 * 60 * 1000),
      rateLimit(`user-login:email:${email.toLowerCase()}`, 5, 10 * 60 * 1000),
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
    ]);

    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Burst-protection: 10 attempts per IP per 10 minutes and a tighter 5 per email.
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: 'Çok fazla başarısız deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      );
    }

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

    // §22 — Email verify hard gate. Davet akışında oluşan team_member
    // hesapları emailVerified=false ile başlar; verify mail'indeki linke
    // tıklamadan panele giremez. Backward compat için sadece team_member
    // role'üne uygulanır — eski owner'lar (restaurant_owner) emailVerified
    // false ile kayıtlı olabilir, onlar etkilenmez.
    if (user.role === 'team_member' && user.emailVerified === false) {
      return NextResponse.json(
        {
          error: 'email_not_verified',
          message: 'E-postanı onaylaman gerekiyor.',
          email: user.email,
          needsVerification: true,
        },
        { status: 403 },
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
    // Card checkout gate (billing spec §3.3): the score of this assessed sign-in.
    await recordLoginRiskScore(user.id, captcha);

    // 2FA challenge — şifre doğru, kullanıcı twoFactorEnabled=true ise cookie
    // set ETME, kısa ömürlü challenge JWT döner. Client /api/auth/login/2fa
    // endpoint'ine 6 haneli kod ile birlikte challengeToken'ı geri gönderir;
    // sadece o aşamada user_token cookie set edilir + UserSession row create.
    if (user.twoFactorEnabled) {
      const challengeToken = await signChallengeJwt({
        userId: user.id,
        email: user.email,
        rememberMe: !!rememberMe,
      });
      return NextResponse.json({
        success: true,
        needs2FA: true,
        challengeToken,
        // E-posta hint — UI'da hangi hesaba doğrulandığını göstermek için.
        email: user.email,
      });
    }

    return await issueLoginSession({
      req,
      user,
      rememberMe: !!rememberMe,
    });
  } catch (error) {
    // §37.7 — structured, PII-free (raw Prisma error may carry email/query meta).
    console.error('[AUTH_LOGIN]', {
      name: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
    });
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
