// Stage 16 §38.86 — Supabase Realtime JWT mint helper.
//
// Buaze custom JWT (jose, CLAUDE.md §4) kullanır — Supabase Auth değil.
// Anon key + filter kombinasyonu güvensiz: anon key public, saldırgan
// kendi browser'ında filter'ı manipüle edip başka restoranlara
// subscribe edebilir. Gerçek security boundary RLS — bu da
// `auth.uid()` veya `request.jwt.claims` üzerinden Supabase'in JWT
// imzasına güvenir.
//
// Çözüm: server-side endpoint Buaze JWT'yi doğrular (getPanelActorFromRequest),
// kullanıcının erişim kapsamındaki restaurant_ids'i fetch eder, sonra
// SUPABASE_JWT_SECRET ile imzalı kısa-ömürlü (1h) Supabase-uyumlu JWT
// mint eder. Client `supabase.realtime.setAuth(token)` ile bu token'ı
// realtime channel auth context'ine yazar; RLS policy
// `request.jwt.claims->>'restaurant_ids'` claim'ini okuyup row-level
// erişimi enforce eder.
//
// JWT shape (Supabase Realtime + PostgREST canonical):
//   sub: <userId>           — auth.uid() bunu döner (UUID cast'i için
//                             User.id CUID; RLS policy auth.uid() yerine
//                             custom claim user_id'i kullanır)
//   role: 'authenticated'   — Supabase RLS bu role'a göre default policy
//                             uygular; anon vs authenticated ayrımı
//   aud: 'authenticated'    — JWT audience claim, supabase-js verify eder
//   exp: now + 1h           — short-lived; client ~55min'de refresh eder
//   iat: now
//   restaurant_ids: [...]   — RLS policy'de membership check için custom
//                             claim. JWT'de paketlendiği için RLS
//                             subquery yapmaz (faster + DB load yok)
//
// Custom claim'lere ekstra alan eklerken (örn. `plan`, `role_label`)
// JWT size'ı izle — token her WebSocket message ile gönderilebilir.

import * as jose from 'jose';

export interface RealtimeTokenClaims {
  sub: string;
  role: 'authenticated';
  aud: 'authenticated';
  exp: number;
  iat: number;
  user_id: string;
  restaurant_ids: string[];
}

export interface MintRealtimeTokenInput {
  /** Buaze user/admin actor id — JWT sub claim. */
  userId: string;
  /** Owner-scoped restaurant id list (getScopedRestaurantIds çıktısı). */
  restaurantIds: string[];
  /** Token TTL in seconds. Default 3600 (1h). */
  ttlSeconds?: number;
  /** Override clock for tests; defaults to Date.now(). */
  now?: () => number;
}

export interface MintRealtimeTokenResult {
  token: string;
  expiresAt: number;
}

/**
 * Sign a Supabase-compatible JWT with the user's restaurant scope.
 *
 * Throws if SUPABASE_JWT_SECRET is unset (intended — caller endpoint should
 * 503 with a clear error instead of issuing tokens signed with a public
 * fallback). Production deploys must set this env var to the value found in
 * Supabase Dashboard → Settings → API → JWT Settings → JWT Secret.
 */
export async function mintRealtimeToken(
  input: MintRealtimeTokenInput,
): Promise<MintRealtimeTokenResult> {
  const secretValue = process.env.SUPABASE_JWT_SECRET;
  if (!secretValue || !secretValue.trim()) {
    throw new Error(
      '[realtime-token] SUPABASE_JWT_SECRET is not configured. Set it in Vercel project env (Production + Preview).',
    );
  }
  const secret = new TextEncoder().encode(secretValue);

  const ttl = Math.max(60, Math.min(input.ttlSeconds ?? 3600, 3600));
  const nowMs = (input.now ?? Date.now)();
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + ttl;

  const claims: RealtimeTokenClaims = {
    sub: input.userId,
    role: 'authenticated',
    aud: 'authenticated',
    iat,
    exp,
    user_id: input.userId,
    restaurant_ids: input.restaurantIds,
  };

  const token = await new jose.SignJWT(claims as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  return { token, expiresAt: exp * 1000 };
}

/**
 * Verify helper — primarily for unit tests. Production verification happens
 * inside Supabase (PostgREST + Realtime) using the same JWT secret.
 */
export async function verifyRealtimeToken(token: string): Promise<RealtimeTokenClaims | null> {
  const secretValue = process.env.SUPABASE_JWT_SECRET;
  if (!secretValue) return null;
  try {
    const secret = new TextEncoder().encode(secretValue);
    const { payload } = await jose.jwtVerify(token, secret, {
      audience: 'authenticated',
    });
    return payload as unknown as RealtimeTokenClaims;
  } catch {
    return null;
  }
}
