/**
 * Pure OAuth + token-refresh logic.
 *
 * The Google OAuth route (`/api/auth/google`) and the refresh route
 * (`/api/auth/refresh`) wire prisma + Firebase + jose into these helpers.
 * Keeping the branching logic free of framework deps makes it directly
 * unit-testable (see `tests/oauth.test.ts`) — no DB, no HTTP, no Firebase.
 */

export interface TokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export interface OAuthUserRecord {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  isActive: boolean;
  trialEndsAt: Date | null;
  /** Optional — only the refresh path selects it (team_member gate). */
  emailVerified?: boolean;
}

export interface NewUserData {
  email: string;
  name: string | null;
  trialEndsAt: Date;
}

export interface OAuthDeps {
  verifyToken: (idToken: string) => Promise<TokenClaims | null>;
  findUser: (email: string) => Promise<OAuthUserRecord | null>;
  createUser: (data: NewUserData) => Promise<OAuthUserRecord>;
  signToken: (payload: Record<string, unknown>) => Promise<string>;
  now: () => Date;
}

export interface OAuthInput {
  idToken: string;
}

export type OAuthResult =
  | { ok: true; token: string; user: OAuthUserRecord; isNewUser: boolean }
  | { ok: false; status: number; error: string; trialExpired?: true };

const TRIAL_DAYS = 14;

export async function handleOAuthSignIn(
  input: OAuthInput,
  deps: OAuthDeps,
): Promise<OAuthResult> {
  if (!input.idToken || typeof input.idToken !== 'string') {
    return { ok: false, status: 400, error: 'Geçersiz istek.' };
  }

  const claims = await deps.verifyToken(input.idToken);
  if (!claims) {
    return { ok: false, status: 401, error: 'Kimlik doğrulanamadı.' };
  }

  const email = claims.email?.toLowerCase().trim();
  if (!email) {
    return {
      ok: false,
      status: 400,
      error: 'E-posta adresi alınamadı. Lütfen e-posta ile giriş yapın.',
    };
  }

  if (claims.email_verified === false) {
    return { ok: false, status: 403, error: 'E-posta adresiniz doğrulanmamış.' };
  }

  let user = await deps.findUser(email);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const trialEndsAt = new Date(deps.now());
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
    user = await deps.createUser({
      email,
      name: claims.name?.trim() || null,
      trialEndsAt,
    });
  }

  const gate = gateUser(user, deps.now());
  if (gate) return gate;

  const token = await deps.signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  });

  return { ok: true, token, user, isNewUser };
}

export interface RefreshDeps {
  verifyToken: (token: string) => Promise<Record<string, unknown> | null>;
  findUserById: (id: string) => Promise<OAuthUserRecord | null>;
  signToken: (payload: Record<string, unknown>) => Promise<string>;
  now: () => Date;
}

export type RefreshResult =
  | { ok: true; token: string; user: OAuthUserRecord }
  | { ok: false; status: number; error: string; trialExpired?: true };

export async function handleTokenRefresh(
  input: { token: string },
  deps: RefreshDeps,
): Promise<RefreshResult> {
  if (!input.token) {
    return { ok: false, status: 401, error: 'Oturum bulunamadı.' };
  }

  const payload = await deps.verifyToken(input.token);
  const userId = typeof payload?.userId === 'string' ? payload.userId : null;
  if (!userId) {
    return { ok: false, status: 401, error: 'Geçersiz veya süresi dolmuş oturum.' };
  }

  // §38.238 — never refresh an impersonation token.
  //
  // A token minted by /api/admin/impersonate carries
  // `impersonating: { adminId, sessionId }`. This function re-signs a NEW
  // token from scratch with only { userId, email, role, plan }, and the
  // route sets it with maxAge 7 days. Refreshing therefore LAUNDERED a
  // 30-minute, audited, banner-visible shadow session into a plain 7-day
  // login as that customer: `getPanelActorFromRequest` no longer saw
  // `realAdminId`, so the ImpersonationBanner disappeared, the
  // expire-impersonation-sessions cron could close the DB row without
  // touching the cookie, and every subsequent action was attributed to the
  // customer instead of the admin.
  //
  // Carrying the claim forward would need the session re-validated and the
  // new expiry clamped to `session.endsAt`; refusing is simpler and strictly
  // safer. Impersonation is deliberately short-lived and has its own exit
  // (/api/admin/impersonate/end), so there is nothing legitimate to refresh.
  if (payload && payload.impersonating != null) {
    return {
      ok: false,
      status: 403,
      error: 'Gölge oturum yenilenemez. Yönetici oturumuna dönün.',
    };
  }

  const user = await deps.findUserById(userId);
  if (!user) {
    return { ok: false, status: 401, error: 'Kullanıcı bulunamadı.' };
  }

  const gate = gateUser(user, deps.now());
  if (gate) return gate;

  // Parity with /api/auth/login: a team member whose address is not
  // verified cannot obtain a session. Refresh skipped this check, so a
  // session minted before an e-mail change kept renewing with the new,
  // unverified address — and team scope is resolved by that address.
  if (user.role === 'team_member' && user.emailVerified === false) {
    return {
      ok: false,
      status: 403,
      error: 'E-posta adresinizi doğrulamanız gerekiyor.',
    };
  }

  const token = await deps.signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  });

  return { ok: true, token, user };
}

function gateUser(
  user: OAuthUserRecord,
  now: Date,
):
  | { ok: false; status: number; error: string; trialExpired?: true }
  | null {
  if (!user.isActive) {
    return { ok: false, status: 403, error: 'Hesabınız askıya alınmıştır.' };
  }
  if (user.plan === 'trial' && user.trialEndsAt && user.trialEndsAt < now) {
    return {
      ok: false,
      status: 402,
      error: 'Ücretsiz deneme süreniz sona ermiştir.',
      trialExpired: true,
    };
  }
  return null;
}
