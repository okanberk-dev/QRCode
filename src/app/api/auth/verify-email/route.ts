import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signJwt } from '@/lib/auth';
import { hashToken } from '@/lib/session-hash';
import { rateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * §22 davet akışı — e-posta onay endpoint'i.
 *
 * GET ?token=...
 *   1. Rate limit 30/dk/IP (login burst-protection ile aynı katman)
 *   2. emailVerifyToken match + expiresAt geçerli kontrol
 *   3. User.update: emailVerified=true, token alanlarını null'la
 *   4. JWT sign + UserSession row + user_token cookie set (auto-login)
 *   5. JSON response — client `/dashboard`'a push eder
 *
 * Bu endpoint email gate'i AÇAR. Login flow `emailVerified=false` ise 403
 * + check-email yönlendirir (login/route.ts §22 patch). Bir kullanıcı bu
 * mail'i kullanmadan asla panele giremez.
 */
export async function GET(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);

    const ipLimit = await rateLimit(`verify-email:ip:${ip}`, 30, 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: ipLimit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
      );
    }

    const url = new URL(req.url);
    const token = url.searchParams.get('token')?.trim() ?? '';
    if (!token || token.length < 32) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }

    // Explicit select — CLAUDE.md §14.1 P2022 drift bağışıklığı.
    const user = await prisma.user.findUnique({
      where: { emailVerifyToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        locale: true,
        isActive: true,
        emailVerified: true,
        emailVerifyTokenExpiresAt: true,
        trialEndsAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'account_disabled' }, { status: 403 });
    }

    if (user.emailVerified) {
      // Idempotent — kullanıcı maili 2. kez tıklarsa onayı yine başarılı say,
      // sadece cookie set etmeden 200 dön. Davet kabul akışında bu durumda
      // login sayfasına yönlendiriyoruz.
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
        redirectTo: `/${user.locale}/auth/login`,
      });
    }

    if (
      user.emailVerifyTokenExpiresAt &&
      user.emailVerifyTokenExpiresAt.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: 'expired', email: user.email },
        { status: 400 },
      );
    }

    // Onayı uygula + token nullify (replay engeli) + cookie set tek
    // request içinde. UserSession create login flow paterniyle aynı.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
      },
    });

    const jwt = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const userAgent = req.headers.get('user-agent') ?? null;
    try {
      await prisma.userSession.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(jwt),
          userAgent: userAgent?.slice(0, 500) ?? null,
          ipAddress: ip ?? null,
        },
      });
    } catch (err) {
      console.error('[verify-email] UserSession create failed:', (err as Error).message);
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: `/${user.locale}/dashboard`,
      user: { id: user.id, email: user.email, name: user.name },
    });

    const isSecure =
      process.env.NODE_ENV === 'production' &&
      (req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:');

    response.cookies.set('user_token', jwt, {
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
    console.error('[AUTH_VERIFY_EMAIL]', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
