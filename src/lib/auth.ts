import * as jose from 'jose';
import * as Sentry from '@sentry/nextjs';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { hashToken } from './session-hash';
import { getClientIp } from './rate-limit';
import { timed } from './server-timing';

// Phase: admin panel — `staff` is the granular sub-tier (Stage A2 §38.94 RBAC
// infrastructure). `superadmin` bypasses all permission checks; `manager` and
// `staff` go through `AdminPermission` DB lookup (rbac.ts). UI-wise, `manager`
// is restaurant-scoped (legacy semantics) while `staff` is "blank canvas":
// superadmin grants per-resource read/write/delete via the existing 39-cell
// matrix at /admin/users/[id]/permissions.
export type AdminRole = 'superadmin' | 'manager' | 'staff';

/**
 * Stage 18 §38.89 — pre-Stage-14-hotfix cookie boundary.
 *
 * 2026-05-06T01:34:47 UTC = Stage 14 §38.84 hotfix production deploy
 * (PR #494 commit `429dc6c1`). User cookies issued before this timestamp
 * predate the Stage 18 §38.89 login `prisma.userSession.create`
 * assertion. Pre-boundary cookies receive fail-open silent pass (no warn,
 * no Sentry capture). Post-boundary cookies that hit `row missing` mean
 * a real silent failure in the login session-create path — those still
 * warn + capture so the Stage 9 re-introduce signal is preserved.
 *
 * Why a fixed timestamp instead of a backfill script:
 * - The backfill script (`scripts/backfill-user-sessions.ts` §38.79)
 *   inserts synthetic placeholder rows whose `tokenHash` cannot match
 *   any real cookie's hash — backfilling does NOT silence warns for
 *   pre-Stage-14 cookies. The only honest signal is JWT iat.
 * - jose `setIssuedAt()` stamps `iat` server-side at sign time, so the
 *   value can't be forged without invalidating the HS256 signature.
 *
 * If/when Stage 9 fail-closed flip is re-introduced, this constant
 * becomes the boundary for "tokens that pre-date the fix can still
 * pass" — same shape, different return value (silent pass vs revoke).
 */
const STAGE_14_HOTFIX_BOUNDARY_MS = 1778052887680;

/**
 * Stage 19 §38.103 — fail-closed re-introduce.
 *
 * Production deploy timestamp ~2026-05-06T17:00:00 UTC. Cookies issued
 * AFTER this boundary, when their UserSession row is missing, MUST be
 * treated as revoked (return true) — restoring §37.2 D force-logout /
 * password-reset bypass protection.
 *
 * Three-tier matrix (cumulative):
 *   1. iat < STAGE_14_HOTFIX_BOUNDARY_MS  → silent pass (legacy intact,
 *      max 30 days natural expiry from 2026-05-06)
 *   2. iat < STAGE_19_FAILCLOSED_BOUNDARY_MS → warn + Sentry + fail-open
 *      (Stage 18 §38.89 pattern; Stage 14↔Stage 19 transition window)
 *   3. iat >= STAGE_19_FAILCLOSED_BOUNDARY_MS → fail-closed (return true)
 *
 * Layer 2 (Stage 18 fail-open) preserved as a safety bridge: existing
 * live cookies issued between Stage 14 hotfix and Stage 19 deploy keep
 * their original behavior (warn-only) until they naturally expire. No
 * re-login storm on flip-day.
 */
const STAGE_19_FAILCLOSED_BOUNDARY_MS = 1778086800000;

/**
 * 2026-05-07 hotfix boundary for sessionless token issuers.
 *
 * Stage 19 fail-closed was correct, but it exposed older token issuers
 * (`/api/auth/google`, `/api/auth/register`, verify-email, refresh and
 * impersonation) that still set `user_token` without a matching UserSession
 * row. Tokens issued before this hotfix can be safely self-healed once by
 * inserting the missing session row; tokens issued after this boundary must
 * already have the row and remain fail-closed if it is absent.
 */
const SESSIONLESS_ISSUER_FIX_BOUNDARY_MS = 1778198400000; // 2026-05-08T00:00:00Z

export interface PanelActor {
  id: string;
  role: string;
  restaurantId: string | null;
  username: string | null;
  email: string | null;
  plan: string | null;
  source: 'admin' | 'user';
  // Stage A4 §38.96 — admin impersonation flow.
  // Owner panel'inde admin gibi davranan superadmin/manager için JWT payload'ı
  // taşır. `source = 'user'` olarak görünür (owner endpoint'leri normal çalışır)
  // ama `realAdminId` set ise bu actor aslında bir admin — UI banner + audit
  // tag bu alana göre karar verir.
  realAdminId?: string | null;
  impersonationSessionId?: string | null;
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
  return role === 'superadmin' || role === 'manager' || role === 'staff';
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
 * Burada her user_token isteği DB'ya 1 PK lookup atar (tokenHash UNIQUE index).
 * Maliyet: ~1ms. Cache yok — revoke etkisi anında.
 *
 * Stage 18 §38.89 — pre-Stage-14-hotfix cookie boundary:
 * Pre-boundary cookies (iat * 1000 < STAGE_14_HOTFIX_BOUNDARY_MS) silent
 * pass — no warn, no Sentry. They predate the login session-create
 * assertion and have no real way to land in `user_sessions`.
 * Post-boundary cookies that hit `row missing` mean a real silent
 * failure in `issueLoginSession` — those warn + Sentry capture so
 * the Stage 9 re-introduce signal is preserved.
 *
 * Backward compat: UserSession kaydı YOKSA (eski login'ler) izin verilir.
 * Sadece revokedAt non-null ise reddedilir. Bu sayede Faz 3 öncesi cookie'ler
 * deploy sonrası kırılmaz.
 *
 * Auth.ts'ye bilinçli olarak prisma import edildi — middleware (edge) auth.ts
 * import etmiyor, kendi inline jwt verify'sini kullanıyor.
 */
async function recoverMissingUserSession(
  req: NextRequest,
  rawToken: string,
  payload: jose.JWTPayload,
): Promise<boolean> {
  const userId = typeof payload.userId === 'string' ? payload.userId : null;
  if (!userId) return false;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });
    if (!user?.isActive) return false;

    await prisma.userSession.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        ipAddress: getClientIp(req.headers) ?? null,
      },
    });
    Sentry.captureMessage('UserSession row missing self-healed', {
      level: 'warning',
      tags: {
        kind: 'auth-session-missing',
        stage: 'sessionless-issuer-hotfix',
      },
      extra: {
        userId,
        iatMs: typeof payload.iat === 'number' ? payload.iat * 1000 : null,
      },
    });
    return true;
  } catch (err) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj.code === 'P2002') return true;
    console.error('[auth] UserSession self-heal failed:', errorObj.message ?? 'unknown', {
      code: errorObj.code ?? null,
      userId,
    });
    Sentry.captureException(err, {
      tags: {
        kind: 'auth-session-self-heal-failure',
        prismaCode: errorObj.code ?? 'unknown',
      },
      extra: {
        userId,
      },
    });
    return false;
  }
}

// Stage 25 §38.101 Phase A #2 — process-local LRU cache.
// Sadece happy-path (session var + revokedAt null) için kısa TTL cache.
// 3-tier boundary check + self-heal (recoverMissingUserSession) ve DB
// error fail-closed mantığı CACHE'lenmez — sadece "geçerli aktif token"
// kararı 10s pencere ile cached.
//
// Drift trade-off: force-logout effect 10s gecikebilir (kullanıcı cihaz
// revoke ettikten sonra max 10s geçerli kalır). 1ms tasarruf per dashboard
// request × yüksek cache hit ratio (%95+) için kabul edilebilir.
//
// Manual invalidation: revoke endpoint'leri (logout, sessions/revoke,
// password-reset) `userSessionRevocationCache.delete(tokenHash)` çağırarak
// gecikmeyi anında giderebilir — gelecek scope.
const USER_SESSION_REVOCATION_CACHE_TTL_MS = 10_000;
const userSessionRevocationCache = new Map<string, number>();

async function isUserSessionRevoked(
  req: NextRequest,
  rawToken: string,
  payload: jose.JWTPayload,
): Promise<boolean> {
  // Stage 25 §38.101 Phase A #2 — happy-path cache hit: cached "active"
  // marker var ve henüz expire olmamış → DB hit'i atla.
  const tokenHash = hashToken(rawToken);
  const cachedExpiresAt = userSessionRevocationCache.get(tokenHash);
  if (cachedExpiresAt && cachedExpiresAt > Date.now()) {
    return false;
  }
  if (cachedExpiresAt) {
    // Expired entry; temizle (LRU eviction inline)
    userSessionRevocationCache.delete(tokenHash);
  }
  try {
    const session = await prisma.userSession.findUnique({
      where: { tokenHash },
      select: { revokedAt: true },
    });
    // Stage 14 hotfix (CLAUDE.md §38.84): Stage 9 flip (`!session → true`)
    // production'da yeni login'lerin UserSession row create akışıyla
    // tutarsızlık çıkardı — re-login sonrası bile cookie 401 alıyordu
    // (`prisma.userSession.create` silently fail mi yoksa tokenHash drift
    // mi olduğu belirsiz). Acute fix: legacy fail-open (`return false`)
    // ile panel restore + missing-row warn ile prod log diagnostic.
    //
    // Stage 18 §38.89: pre-boundary cookies silent pass; post-boundary
    // cookies still warn + Sentry capture so a real silent fail in
    // `issueLoginSession` is visible. Stage 9 re-introduce path: bump
    // STAGE_14_HOTFIX_BOUNDARY_MS to Stage 18 deploy timestamp, flip
    // post-boundary branch to `return true` (force re-login on stale
    // cookies whose token row was never created).
    if (!session) {
      const iatSeconds = typeof payload.iat === 'number' ? payload.iat : null;
      const iatMs = iatSeconds ? iatSeconds * 1000 : null;
      // Tier 1 — pre-Stage-14 cookies (max 30-day natural expiry from
      // 2026-05-06). No diagnostic; legacy fail-open intact.
      if (iatMs !== null && iatMs < STAGE_14_HOTFIX_BOUNDARY_MS) {
        return false;
      }
      // Tier 2 — Stage 14↔Stage 19 transition window. Existing live
      // cookies issued between hotfix and re-introduce keep Stage 18
      // warn-only fail-open behavior. No re-login storm on flip-day.
      // PII guard (§37.7): userId/iatMs only, no email/phone/ipAddress.
      if (iatMs !== null && iatMs < STAGE_19_FAILCLOSED_BOUNDARY_MS) {
        console.warn(
          '[auth] UserSession row missing for Stage 14↔19 transition cookie — ' +
            'fail-open per Stage 18 §38.89 pattern. Cookie will naturally ' +
            'expire; no action required.',
          { iatMs, hasIat: iatSeconds !== null },
        );
        Sentry.captureMessage('UserSession row missing (Stage 18 transition window)', {
          level: 'warning',
          tags: {
            kind: 'auth-session-missing',
            stage: '18-transition',
          },
          extra: {
            iatMs,
            hasIat: iatSeconds !== null,
            userId: typeof payload.userId === 'string' ? payload.userId : null,
          },
        });
        return false;
      }
      // Hotfix bridge — known sessionless issuer window. Create the missing
      // row once so existing production tabs recover without forcing logout.
      if (iatMs !== null && iatMs < SESSIONLESS_ISSUER_FIX_BOUNDARY_MS) {
        const recovered = await recoverMissingUserSession(req, rawToken, payload);
        return !recovered;
      }
      // Tier 3 — post-Stage-19 cookies with no UserSession row → real
      // silent failure in issueLoginSession after the assertion. Fail
      // CLOSED (return true) to restore §37.2 D force-logout /
      // password-reset bypass protection. User is forced to re-login;
      // Sentry escalates to error level for ops investigation.
      console.error(
        '[auth] UserSession row missing for post-Stage-19 token — fail-closed. ' +
          'Real silent fail in issueLoginSession assertion. Investigate immediately.',
        { iatMs, hasIat: iatSeconds !== null },
      );
      Sentry.captureMessage('UserSession row missing (post-Stage-19, fail-closed)', {
        level: 'error',
        tags: {
          kind: 'auth-session-missing',
          stage: '19-failclosed',
        },
        extra: {
          iatMs,
          hasIat: iatSeconds !== null,
          userId: typeof payload.userId === 'string' ? payload.userId : null,
        },
      });
      return true;
    }
    if (session.revokedAt !== null) {
      // Revoke kayıtlı — cache'e koymayalım, her request fresh check.
      return true;
    }
    // Stage 25 §38.101 Phase A #2 — happy-path cache write: aktif token,
    // 10s pencere boyunca DB hit'i atla. Force-logout sonrası 10s drift
    // kabul; manuel invalidation gelecek scope.
    userSessionRevocationCache.set(
      tokenHash,
      Date.now() + USER_SESSION_REVOCATION_CACHE_TTL_MS,
    );
    return false;
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
    // §38.238 — a MISSING row means the AdminUser was deleted. AdminUser has
    // no `isActive` column and no per-token session table, so this staleness
    // check is the only revocation pivot admins have. Folding `!admin` into
    // the same `return false` as "no passwordChangedAt yet" meant deleting a
    // compromised or departing admin did not log them out: their 7-day JWT
    // kept passing `getAdminFromRequest`, and every route that gates on the
    // JWT claim alone (site-settings, plans, announcements, feature-access)
    // still granted full write. A deleted admin is revoked, not fresh.
    if (!admin) return true;
    if (!admin.passwordChangedAt) return false;
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

/**
 * Layout-friendly verifier — same gate as `getUserFromRequest` minus the
 * NextRequest dependency. Server components use `cookies()` from
 * `next/headers` and don't have a NextRequest, so this is the shape they
 * can call before deciding to `redirect()`.
 *
 * Returns the JWT payload when:
 *   - signature valid
 *   - `userId` claim present
 *   - UserSession row not revoked (or missing within the legacy tiers /
 *     sessionless-issuer recovery window — same matrix as
 *     `isUserSessionRevoked`)
 *
 * Returns null when:
 *   - signature invalid / missing claim
 *   - UserSession row revoked
 *   - post-Stage-19 token with no UserSession row (fail-closed)
 *   - DB error (fail-closed, mirroring API behaviour)
 *
 * Recovery path (`recoverMissingUserSession`) is NOT triggered here —
 * it needs user-agent + IP from the request. If a token is in the
 * recovery window with no session row, the layout passes through and
 * the next API call (with NextRequest) handles the self-heal. The
 * trade-off: one extra page load before the row is recreated, but the
 * user is never bounced to login during the legitimate recovery window.
 *
 * CLAUDE.md §38 audit-api-401 fix — without this, dashboard layout +
 * APIs disagreed on whether a token was still valid. Users with revoked
 * sessions could land on the dashboard but every fetch returned 401
 * (NotificationBell polling, live feed reconnects, audits/templates,
 * etc.). Layout now matches API; revoked sessions redirect to login.
 */
export async function verifyUserTokenForLayout(
  rawToken: string,
): Promise<jose.JWTPayload | null> {
  const payload = await verifyJwt(rawToken);
  if (!payload || typeof payload.userId !== 'string') return null;

  try {
    const tokenHash = hashToken(rawToken);
    const session = await prisma.userSession.findUnique({
      where: { tokenHash },
      select: { revokedAt: true },
    });

    if (session) {
      if (session.revokedAt !== null) return null;
      return payload;
    }

    // Session row missing — replicate tier matrix from
    // `isUserSessionRevoked`. Keep these branches in sync if the API
    // helper changes; the two MUST agree, otherwise the 401-spam bug
    // re-emerges.
    const iatSeconds = typeof payload.iat === 'number' ? payload.iat : null;
    const iatMs = iatSeconds ? iatSeconds * 1000 : null;

    // Tier 1 — pre-Stage-14 legacy cookies: silent pass.
    if (iatMs !== null && iatMs < STAGE_14_HOTFIX_BOUNDARY_MS) return payload;
    // Tier 2 — Stage 14↔Stage 19 transition window: silent pass.
    if (iatMs !== null && iatMs < STAGE_19_FAILCLOSED_BOUNDARY_MS) return payload;
    // Recovery window — pass through; next API call self-heals.
    if (iatMs !== null && iatMs < SESSIONLESS_ISSUER_FIX_BOUNDARY_MS) return payload;

    // Tier 3 — post-Stage-19, post-hotfix, no session row: fail closed.
    return null;
  } catch {
    // DB error → fail closed (consistent with API helper).
    return null;
  }
}

/**
 * Layout-friendly admin verifier — same gate as `getAdminFromRequest`
 * minus the NextRequest dependency. Used by `admin/layout.tsx` and the
 * admin-as-owner branch in `dashboard/layout.tsx` so a token rotated
 * after a password reset can't keep a logged-in admin floating on a
 * page where every API call 401s.
 */
export async function verifyAdminTokenForLayout(
  rawToken: string,
): Promise<jose.JWTPayload | null> {
  const payload = await verifyJwt(rawToken);
  if (!payload || !isAdminRole(payload.role)) return null;
  if (await isAdminTokenStale(payload)) return null;
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
  // Stage 18 §38.89: payload geçirildi — pre-boundary cookies silent pass,
  // post-boundary missing rows warn + Sentry capture.
  if (await isUserSessionRevoked(req, rawToken, payload)) {
    return null;
  }
  const userPayload = payload as jose.JWTPayload & { userId: string; impersonating?: unknown };
  return {
    ...userPayload,
    userId: userPayload.userId,
    id: userPayload.userId,
    sub: userPayload.userId,
    impersonating: userPayload.impersonating,
  };
}

/** Resolves the panel actor; timed as `auth` in Server-Timing (CLAUDE.md §56). */
export function getPanelActorFromRequest(req: NextRequest): Promise<PanelActor | null> {
  return timed('auth', () => resolvePanelActor(req));
}

async function resolvePanelActor(req: NextRequest): Promise<PanelActor | null> {
  // Impersonation takes precedence over the retained admin cookie.
  //
  // `/api/admin/impersonate` deliberately KEEPS the admin's own `admin_token`
  // so the banner and `/end` keep working, and sets a `user_token` carrying an
  // `impersonating` claim. But this resolver checked `admin_token` first, so
  // every request made while impersonating resolved to the ADMIN actor: the
  // panel showed superadmin-wide data instead of reproducing the owner's view
  // (the entire point of the feature), and actions were recorded without the
  // impersonation session id, losing the audit trail it exists to provide.
  // The impersonation branch further down validates the DB session and fails
  // closed, and resolves to the scoped OWNER — strictly less privilege than
  // the admin actor it replaces here.
  const impersonationPeek = await getTokenPayload(req, 'user_token');
  const isImpersonating =
    !!impersonationPeek &&
    typeof impersonationPeek.impersonating === 'object' &&
    impersonationPeek.impersonating !== null;

  const adminPayload = isImpersonating ? null : await getAdminFromRequest(req);
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

  const legacyAdminPayload = isImpersonating ? null : await getTokenPayload(req, 'admin_token');
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

  // Stage A4 §38.96 — impersonation flow detection. JWT payload'ı taşıyan
  // `impersonating` claim varsa bu actor aslında bir admin'dir; owner gibi
  // davranır ama UI banner + audit tag için real admin id kayıt edilir.
  // Güvenlik: ImpersonationSession DB row'u hâlâ aktif (ended_at null + ends_at
  // gelecekte) olmalı — aksi halde claim ignore edilir (forge / expired token
  // koruma).
  const impersonating = userPayload.impersonating as
    | { adminId?: unknown; sessionId?: unknown }
    | undefined;
  let realAdminId: string | null = null;
  let impersonationSessionId: string | null = null;
  if (
    impersonating &&
    typeof impersonating === 'object' &&
    typeof impersonating.adminId === 'string' &&
    typeof impersonating.sessionId === 'string'
  ) {
    try {
      const session = await prisma.impersonationSession.findUnique({
        where: { id: impersonating.sessionId },
        select: {
          id: true,
          adminId: true,
          targetUserId: true,
          endedAt: true,
          endsAt: true,
        },
      });
      const stillActive =
        !!session &&
        session.adminId === impersonating.adminId &&
        session.targetUserId === userPayload.userId &&
        session.endedAt === null &&
        session.endsAt.getTime() > Date.now();
      if (stillActive) {
        realAdminId = impersonating.adminId;
        impersonationSessionId = impersonating.sessionId;
      } else {
        return null;
      }
    } catch (err) {
      // DB error → fail closed. An impersonation token must never degrade
      // into a plain owner token in the admin browser.
      console.warn('[auth] impersonation session lookup failed', (err as Error).message);
      return null;
    }
  }

  // QR wizard root-cause fix: `userPayload.userId` runtime check.
  // Önceki davranış: `userId as string` cast'i userId taşımayan token'ları
  // sessizce kabul ediyor, `actor.id = undefined` oluyordu. Sonraki
  // Prisma query'lerinde `where: { id: undefined }` → P2025 → owner "QR
  // oluşturulamadı (PrismaClientKnownRequestError ...)" hatası alıyordu.
  // PR #646 closure log'unda bu guard'ın eklendiği yazılmıştı ama
  // aslında uygulanmamıştı (commit text yanıltıcı). Şimdi runtime guard:
  // userId şekil bozuksa null döner → endpoint 401 görür, actionable
  // "oturum bilgisi eksik" mesajı çıkar.
  const userId = userPayload.userId;
  if (typeof userId !== 'string' || userId.length === 0) {
    console.warn('[auth] getPanelActorFromRequest: userPayload missing userId', {
      hasUserId: 'userId' in (userPayload as Record<string, unknown>),
      userIdType: typeof userId,
    });
    return null;
  }

  return {
    id: userId,
    role: getStringClaim(userPayload, 'role') || 'restaurant_owner',
    restaurantId: getStringClaim(userPayload, 'restaurantId'),
    username: getStringClaim(userPayload, 'email'),
    email: getStringClaim(userPayload, 'email'),
    plan: getStringClaim(userPayload, 'plan'),
    source: 'user',
    realAdminId,
    impersonationSessionId,
  };
}
