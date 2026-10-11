import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { getClientIp } from '@/lib/rate-limit';
import { createUserSessionForToken } from '@/lib/user-session';
import { describeDevice } from '@/lib/device-fingerprint';
import { sendNewDeviceLoginEmail } from '@/lib/email';

// Lives outside `src/app/api/**/route.ts` on purpose: Next.js route modules
// may only export HTTP handlers + route config. Exporting a helper from a
// route file fails the generated `.next/types` route check.

/**
 * Login son adımı — JWT imzala, UserSession row create, cookie set.
 * 2FA olmayan akışın, /api/auth/login/2fa verify akışının ve
 * /api/team/accept-invite (yeni hesap auto-login) akışının paylaştığı yol.
 *
 * `extraBody` set edilirse default `{ success, user }` body'sine merge edilir
 * — caller kendi response shape'ini (ör. `ok: true`, `redirectTo`) ekler ve
 * cookie + UserSession davranışı korunur.
 */
export async function issueLoginSession(args: {
  req: NextRequest;
  user: { id: string; email: string; name: string | null; role: string; plan: string; trialEndsAt: Date | null };
  rememberMe: boolean;
  extraBody?: Record<string, unknown>;
}): Promise<NextResponse> {
  const { req, user, rememberMe, extraBody } = args;

  const token = await signJwt({
    userId: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  });

  // UserSession row create — Section 8 ActiveSessionsTable + force-logout
  // (logout'ta revokedAt set, getPanelActorFromRequest revoked ise null döner).
  // tokenHash UNIQUE constraint'i çatışmazsa bu insert'tir; çakışırsa (aynı
  // sub-second login retry) silently skip.
  //
  // Stage 18 §38.89 — assertion (CLAUDE.md §38.84 disipline checklist):
  // Stage 14 hotfix dokümante etti: "Stage 9 re-introduce öncesi login
  // akışındaki UserSession.create silent fail çözülmeli — sessiz error
  // log + UX inconsistency 401 storm yaratıyor". Stage 18 fix: P2002
  // duplicate (random secret + sub-second collision = impossible) hariç
  // herhangi bir hata 500 döner + Sentry.captureException tag
  // `login-session-create-failure`. Cookie set ETMEZ — kullanıcı yeniden
  // dener, gerçek silent fail flood'u durur.
  const session = await createUserSessionForToken({
    req,
    userId: user.id,
    token,
    context: 'AUTH_LOGIN',
  });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: 500 });
  }

  // Wave D (CLAUDE.md §38.195) — new-device login security alert.
  // session.isNewDevice is true only when the user has prior sessions
  // AND none of them match the current fuzzy fingerprint
  // (UA major + IP /16). Fire-and-forget; sender wires ops alert
  // internally on send failure.
  if (session.isNewDevice) {
    const userAgent = req.headers.get('user-agent');
    const ip = getClientIp(req.headers);
    const desc = describeDevice(userAgent, ip);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
    // Best-effort locale resolution — User row was fetched above (user) so
    // we can read the locale field directly when available.
    const userLocale: 'tr' | 'en' = (
      (user as unknown as { locale?: string }).locale === 'en' ? 'en' : 'tr'
    );
    sendNewDeviceLoginEmail({
      to: user.email,
      firstName: user.name,
      accountEmail: user.email,
      device: desc.device,
      location: desc.location,
      loggedInAt: new Date(),
      resetUrl: `${appUrl}/${userLocale}/auth/forgot-password`,
      locale: userLocale,
    }).catch(() => {
      // Sender already logs + ops-alerts on failure.
    });
  }

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
    },
    ...(extraBody ?? {}),
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
}
