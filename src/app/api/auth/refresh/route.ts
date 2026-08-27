import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signJwt, verifyUserTokenForLayout } from '@/lib/auth';
import { hashToken } from '@/lib/session-hash';
import { rateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { handleTokenRefresh, type RefreshDeps } from '@/lib/oauth';
import { createUserSessionForToken } from '@/lib/user-session';

/**
 * Sliding-expiry token refresh.
 *
 * Caller passes a still-valid `user_token` cookie (issued by login, register,
 * or /api/auth/google). We re-sign with a fresh 7-day expiry and rotate the
 * cookie + UserSession row. If the cookie is missing, malformed, expired,
 * the user is gone, deactivated, or trial is over, we fail with the
 * matching status (401 / 403 / 402) — same surface as login routes so the
 * client can react identically.
 */
export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);
    const ipLimit = await rateLimit(`auth-refresh:ip:${ip}`, 30, 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
      );
    }

    const oldToken = req.cookies.get('user_token')?.value ?? '';

    const deps: RefreshDeps = {
      // MUST be the session-aware verifier, not bare `verifyJwt`.
      // Refresh mints a brand-new token AND a brand-new UserSession row, so a
      // signature-only check let a revoked cookie resurrect itself: "log out
      // all devices" and the password-reset revoke sweep (§37.2.A) were both
      // undone by a single POST from the stolen cookie, for as long as the old
      // JWT had not expired. `verifyUserTokenForLayout` applies the same
      // revoke check + legacy tier matrix as `getUserFromRequest`, and takes a
      // raw token so the injectable dep shape (tests/oauth.test.ts) is kept.
      verifyToken: verifyUserTokenForLayout,
      findUserById: (id) =>
        prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            plan: true,
            isActive: true,
            trialEndsAt: true,
          },
        }),
      signToken: signJwt,
      now: () => new Date(),
    };

    const result = await handleTokenRefresh({ token: oldToken }, deps);
    if (!result.ok) {
      const body: Record<string, unknown> = { error: result.error };
      if (result.trialExpired) body.trialExpired = true;
      return NextResponse.json(body, { status: result.status });
    }

    const { token, user } = result;

    const session = await createUserSessionForToken({
      req,
      userId: user.id,
      token,
      context: 'AUTH_REFRESH',
    });
    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: 500 });
    }
    const oldTokenHash = hashToken(oldToken);
    const newTokenHash = hashToken(token);
    if (oldTokenHash !== newTokenHash) {
      await prisma.userSession.updateMany({
        where: { tokenHash: oldTokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const isSecure =
      process.env.NODE_ENV === 'production' &&
      (req.headers.get('x-forwarded-proto') === 'https' ||
        req.nextUrl.protocol === 'https:');

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

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[AUTH_REFRESH]', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 },
    );
  }
}
