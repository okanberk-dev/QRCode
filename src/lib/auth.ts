import * as jose from 'jose';
import { NextRequest } from 'next/server';

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

// Fallback so that existing deployments (e.g. Vercel previews where the env
// var has not been wired up yet) keep functioning. It is intentionally a long,
// opaque string and is logged loudly — but we do not hard-fail, because that
// would lock users out of the admin panel immediately after deploy.
const DEFAULT_FALLBACK_SECRET = 'cldqlkmC72MfL/WvllPYQq9O0puMk4j+LxrEtzm8PVs=';
let warnedAboutFallback = false;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (!warnedAboutFallback) {
      warnedAboutFallback = true;
      console.warn('[Buaze] JWT_SECRET is not configured. Using the insecure fallback — set JWT_SECRET in your environment to a 32+ byte random value as soon as possible.');
    }
    return new TextEncoder().encode(DEFAULT_FALLBACK_SECRET);
  }
  if (secret.length < 24 && !warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn('[Buaze] JWT_SECRET is too short (< 24 chars). Use a 32+ byte random value.');
  }
  return new TextEncoder().encode(secret);
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

export async function getAdminFromRequest(req: NextRequest) {
  const payload = await getTokenPayload(req, 'admin_token');
  if (!payload || !isAdminRole(payload.role)) {
    return null;
  }
  return payload;
}

export async function getUserFromRequest(req: NextRequest) {
  const payload = await getTokenPayload(req, 'user_token');
  if (!payload || typeof payload.userId !== 'string') {
    return null;
  }
  return payload;
}

export async function getPanelActorFromRequest(req: NextRequest): Promise<PanelActor | null> {
  const adminPayload = await getAdminFromRequest(req);
  if (adminPayload) {
    return {
      id: getStringClaim(adminPayload, 'id') || 'env-admin',
      role: getStringClaim(adminPayload, 'role') || 'superadmin',
      restaurantId: getStringClaim(adminPayload, 'restaurantId'),
      username: getStringClaim(adminPayload, 'username'),
      email: getStringClaim(adminPayload, 'username'),
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
      email: getStringClaim(legacyAdminPayload, 'username'),
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
