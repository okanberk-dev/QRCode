import * as jose from 'jose';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { hashToken } from './session-hash';

export type AdminRole = 'superadmin' | 'manager';

export interface PanelActor {
  id: string;
  role: string;
  restaurantId: string | null;
  username: string | null;
  email: string | null;
  plan: string | null;
  source: 'admin' | 'user';
}

// Dev-only fallback secret. The literal value sits in the public repo, so
// production MUST set JWT_SECRET. We hard-fail in production when JWT_SECRET
// is missing — issuing tokens signed with a public key is worse than a 5xx
// at the auth boundary (a forged superadmin token = full takeover).
const DEV_FALLBACK_SECRET = 'cldqlkmC72MfL/WvllPYQq9O0puMk4j+LxrEtzm8PVs=';
let warnedAboutFallback = false;
let warnedAboutShortSecret = false;

export function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    if (secret.length < 24 && !warnedAboutShortSecret) {
      warnedAboutShortSecret = true;
      console.warn('[Buaze] JWT_SECRET is too short (< 24 chars). Use a 32+ byte random value.');
    }
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV === 'production') {
    // Refuse to issue / verify any token. Caller bubbles 500 to client.
    throw new Error(
      '[Buaze] JWT_SECRET is not configured in production. Refusing to use the public dev fallback.',
    );
  }
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      '[Buaze] [WARN] JWT_SECRET is not configured. Falling back to a public dev key. ' +
      'Set JWT_SECRET to a 32+ byte random value before any deploy.',
    );
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

export async function signJwt(payload: Record<string, unknown>) {
  const secret = getSecret();

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return jwt;
}

export async function verifyJwt(token: string) {
  try {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(req: NextRequest) {
  return req.headers.get('Authorization')?.split(' ')[1] || null;
}

function getStringClaim(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function isAdminRole(role: unknown): role is AdminRole {
  return role === 'superadmin' || role === 'manager';
}

async function getTokenPayload(req: NextRequest, cookieName: 'admin_token' | 'user_token') {
  const token = req.cookies.get(cookieName)?.value || getBearerToken(req);
  if (!token) return null;
  return await verifyJwt(token);
}

/**
 * UserSession revoke check (Section 8 — force-logout).
 *
 * Logout veya "Tüm diğer oturumlardan çıkış" UserSession.revokedAt set eder.
 * Burada her user_token isteği DB'ye 1 PK lookup atar (tokenHash UNIQUE index).
 * Maliyet: ~1ms. Cache yok — revoke etkisi anında.
 *
 * Backward compat: UserSession kaydı YOKSA (eski login'ler) izin verilir.
 * Sadece revokedAt non-null ise reddedilir. Bu sayede Faz 3 öncesi cookie'ler
 * deploy sonrası kırılmaz.
 *
 * Auth.ts'ye bilinçli olarak prisma import edildi — middleware (edge) auth.ts
 * import etmiyor, kendi inline jwt verify'sini kullanıyor.
 */
async function isUserSessionRevoked(rawToken: string): Promise<boolean> {
  try {
    const session = await prisma.userSession.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      select: { revokedAt: true },
    });
    if (!session) return false; // legacy / pre-feature session
    return session.revokedAt !== null;
  } catch (err) {
    // DB error → fail-CLOSED: a transient DB outage must not let a token
    // that may have been revoked by force-logout / password-reset slip
    // through. The cost is one re-login on a real outage; the alternative
    // (fail-open) was a force-logout bypass during DB hiccups.
    console.error('[auth] UserSession revoke check failed — failing closed:', (err as Error).message);
    return true;
  }
}

/**
 * Admin session staleness check (CLAUDE.md §37.3 deferred #1 closure).
 *
 * AdminUser has no per-token `UserSession` row (the User flow uses one,
 * but adding a parallel admin table is heavier than the threat model
 * needs). Instead we stamp `passwordChangedAt` on the AdminUser row
 * every time the password is rotated (admin reset-password / users PUT
 * password change). Tokens issued before that timestamp are revoked.
 *
 * `iat` is set automatically by jose's `setIssuedAt()` at sign time, so
 * a forged token can't lie about it without invalidating the HS256 sig.
 *
 * Backward compat: AdminUser rows that pre-date this field have
 * `passwordChangedAt = null` and pass through (legacy session). Once a
 * password is rotated, the field is set and every old token issued
 * before that moment becomes stale.
 *
 * Best-effort: DB hiccup → log + return false (fail-open here so a
 * single Postgres glitch doesn't lock every superadmin out at once).
 * Trade-off: a transient outage is a smaller blast radius than a
 * locked-out admin during an incident; the User-side revoke check is
 * fail-closed but admins have a higher operational cost on lockout.
 */
async function isAdminTokenStale(payload: jose.JWTPayload): Promise<boolean> {
  const adminId = typeof payload.id === 'string' ? payload.id : null;
  // env-admin / fallback-admin payload — no DB row to compare against.
  if (!adminId || adminId === 'env-admin') return false;
  const iat = typeof payload.iat === 'number' ? payload.iat : null;
  if (!iat) return false;
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { passwordChangedAt: true },
    });
    if (!admin || !admin.passwordChangedAt) return false;
    // jose `iat` is in seconds, Date.getTime() in ms.
    return iat * 1000 < admin.passwordChangedAt.getTime();
  } catch (err) {
    console.error('[auth] AdminUser staleness check failed (fail-open):', (err as Error).message);
    return false;
  }
}

export async function getAdminFromRequest(req: NextRequest) {
  const payload = await getTokenPayload(req, 'admin_token');
  if (!payload || !isAdminRole(payload.role)) {
    return null;
  }
  // Reject tokens issued before the most recent password change for this
  // admin. Stops a stolen / pre-reset cookie from outliving a password
  // rotation that was triggered exactly to neutralise it.
  if (await isAdminTokenStale(payload)) {
    return null;
  }
  return payload;
}

export async function getUserFromRequest(req: NextRequest) {
  const rawToken = req.cookies.get('user_token')?.value || getBearerToken(req);
  if (!rawToken) return null;
  const payload = await verifyJwt(rawToken);
  if (!payload || typeof payload.userId !== 'string') {
    return null;
  }
  // UserSession revoke check — sessions panelinden "Çıkış yap" yapılan token
  // burada engellenir. Cookie hâlâ tarayıcıda olabilir ama bu istek 401 alır.
  if (await isUserSessionRevoked(rawToken)) {
    return null;
  }
  return payload;
}

export async function getPanelActorFromRequest(req: NextRequest): Promise<PanelActor | null> {
  const adminPayload = await getAdminFromRequest(req);
  if (adminPayload) {
    const role = getStringClaim(adminPayload, 'role');
    // Reject tokens without an explicit role — never default to superadmin
    if (!role || !isAdminRole(role)) return null;
    return {
      id: getStringClaim(adminPayload, 'id') || 'env-admin',
      role,
      restaurantId: getStringClaim(adminPayload, 'restaurantId'),
      username: getStringClaim(adminPayload, 'username'),
      // Prefer explicit email claim; fall back to username (legacy admin
      // tokens whose username doubles as the contact identifier).
      email: getStringClaim(adminPayload, 'email') || getStringClaim(adminPayload, 'username'),
      plan: getStringClaim(adminPayload, 'plan'),
      source: 'admin',
    };
  }

  const legacyAdminPayload = await getTokenPayload(req, 'admin_token');
  if (legacyAdminPayload?.role === 'restaurant_owner' && typeof legacyAdminPayload.id === 'string') {
    return {
      id: legacyAdminPayload.id,
      role: 'restaurant_owner',
      restaurantId: getStringClaim(legacyAdminPayload, 'restaurantId'),
      username: getStringClaim(legacyAdminPayload, 'username'),
      email: getStringClaim(legacyAdminPayload, 'email') || getStringClaim(legacyAdminPayload, 'username'),
      plan: getStringClaim(legacyAdminPayload, 'plan'),
      source: 'user',
    };
  }

  const userPayload = await getUserFromRequest(req);
  if (!userPayload) {
    return null;
  }

  return {
    id: userPayload.userId as string,
    role: getStringClaim(userPayload, 'role') || 'restaurant_owner',
    restaurantId: getStringClaim(userPayload, 'restaurantId'),
    username: getStringClaim(userPayload, 'email'),
    email: getStringClaim(userPayload, 'email'),
    plan: getStringClaim(userPayload, 'plan'),
    source: 'user',
  };
}
