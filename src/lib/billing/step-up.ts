import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UNUSABLE_PASSWORD_BCRYPT_COST } from '@/lib/bcrypt-config';
import { RENEWAL_POLICY } from './renewal-policy';

/**
 * Step-up authentication before the auto-renew instruction (billing spec D14,
 * §8.3, §8.7). Turning auto-renew ON is a payment instruction, so the owner
 * proves it is them again, with exactly one method:
 *  - `totp`     when two-factor is on (6-digit code from the authenticator);
 *  - `password` when the account has a usable password;
 *  - `google`   otherwise (Google-only accounts): a Firebase ID token whose
 *               sign-in happened within the last 5 minutes and whose e-mail is
 *               the account's.
 *
 * A successful proof sets the `bz_bsu` cookie: `b64u(payload) "." b64u(mac)`
 * with payload `{ u: userId, s: session key, m: method, t: unix seconds }` and
 * mac = HMAC-SHA256(HKDF(JWT_SECRET, "billing-step-up"), payload). It is
 * HttpOnly, Secure, SameSite=Strict, Path=/api/billing and lives 5 minutes;
 * the enable route clears it after use. The session key is a hash of the
 * current session cookie, so a step-up never carries over to another session.
 * Turning auto-renew OFF never needs a step-up.
 *
 * Pure apart from bcrypt and the injected verifiers; nothing here logs a
 * proof, a code or a password.
 */

export type StepUpMethod = 'totp' | 'password' | 'google';
export const STEP_UP_COOKIE = 'bz_bsu';
const MAX_AGE_S = Math.floor(RENEWAL_POLICY.stepUpMaxAgeMs / 1000);
const FIREBASE_AUTH_MAX_AGE_S = 5 * 60;

export interface StepUpUser {
  id: string;
  email: string;
  twoFactorEnabled: boolean;
  totpSecret: string | null;
  passwordHash: string;
}

/** A bcrypt hash made with the "unusable" cost belongs to a Google-only account (random password nobody knows). */
export function hasUsablePassword(passwordHash: string): boolean {
  try {
    return !!passwordHash && bcrypt.getRounds(passwordHash) !== UNUSABLE_PASSWORD_BCRYPT_COST;
  } catch {
    return false;
  }
}

/** Exactly one method is offered (D14). */
export function stepUpMethodFor(user: Pick<StepUpUser, 'twoFactorEnabled' | 'totpSecret' | 'passwordHash'>): StepUpMethod {
  if (user.twoFactorEnabled && user.totpSecret) return 'totp';
  if (hasUsablePassword(user.passwordHash)) return 'password';
  return 'google';
}

export type StepUpProof =
  | { method: 'totp'; code: string }
  | { method: 'password'; password: string }
  | { method: 'google'; idToken: string };

export interface StepUpVerifiers {
  verifyTotp(secret: string, code: string): boolean;
  verifyFirebase(idToken: string): Promise<{ email?: string; email_verified?: boolean; auth_time?: number; firebase?: { sign_in_provider?: string } } | null>;
}

function keyFrom(jwtSecret: Uint8Array): Buffer {
  return Buffer.from(hkdfSync('sha256', Buffer.from(jwtSecret), Buffer.alloc(0), 'billing-step-up', 32));
}

function b64u(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function mac(key: Buffer, payload: string): Buffer {
  return createHmac('sha256', key).update(payload).digest();
}

/** The session key bound into the cookie: the first 32 hex chars of the session cookie's hash. */
export function stepUpSessionKey(sessionTokenHash: string): string {
  return sessionTokenHash.slice(0, 32);
}

export function serializeStepUpCookie(value: string, maxAge: number, secure: boolean): string {
  return `${STEP_UP_COOKIE}=${value}; Path=/api/billing; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
}

/** Set-Cookie that removes the step-up cookie. */
export function clearStepUpCookie(secure: boolean): string {
  return serializeStepUpCookie('', 0, secure);
}

export function issueStepUpCookie(
  input: { userId: string; sessionKey: string; method: StepUpMethod; now: Date },
  jwtSecret: Uint8Array,
): string {
  const payload = b64u(JSON.stringify({ u: input.userId, s: input.sessionKey, m: input.method, t: Math.floor(input.now.getTime() / 1000) }));
  return `${payload}.${b64u(mac(keyFrom(jwtSecret), payload))}`;
}

/**
 * Valid when the signature holds, u is the user, s is the current session key
 * and the proof is at most 5 minutes old (and not from the future).
 */
export function readStepUp(
  cookieValue: string | null | undefined,
  expect: { userId: string; sessionKey: string; now: Date },
  jwtSecret: Uint8Array,
): { method: StepUpMethod } | null {
  if (!cookieValue || cookieValue.length > 512) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = mac(keyFrom(jwtSecret), parts[0]);
  let given: Buffer;
  try {
    given = Buffer.from(parts[1], 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let data: { u?: unknown; s?: unknown; m?: unknown; t?: unknown };
  try {
    data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (data.u !== expect.userId || data.s !== expect.sessionKey) return null;
  if (data.m !== 'totp' && data.m !== 'password' && data.m !== 'google') return null;
  if (typeof data.t !== 'number' || !Number.isFinite(data.t)) return null;
  const age = Math.floor(expect.now.getTime() / 1000) - data.t;
  if (age < -60 || age > MAX_AGE_S) return null;
  return { method: data.m };
}

/**
 * Checks the proof for the method offered to this user. `method_mismatch`
 * when another method was sent; `invalid_proof` (generic) for any wrong proof.
 */
export async function verifyStepUpProof(
  user: StepUpUser,
  proof: StepUpProof,
  verifiers: StepUpVerifiers,
  now: Date,
): Promise<{ ok: true; method: StepUpMethod } | { ok: false; error: 'invalid_proof' | 'method_mismatch' }> {
  const method = stepUpMethodFor(user);
  if (proof.method !== method) return { ok: false, error: 'method_mismatch' };
  switch (proof.method) {
    case 'totp': {
      const ok = !!user.totpSecret && /^\d{6}$/.test(proof.code) && verifiers.verifyTotp(user.totpSecret, proof.code);
      return ok ? { ok: true, method } : { ok: false, error: 'invalid_proof' };
    }
    case 'password': {
      let ok = false;
      try {
        ok = await bcrypt.compare(proof.password, user.passwordHash);
      } catch {
        ok = false;
      }
      return ok ? { ok: true, method } : { ok: false, error: 'invalid_proof' };
    }
    case 'google': {
      const claims = await verifiers.verifyFirebase(proof.idToken);
      const fresh =
        !!claims &&
        claims.firebase?.sign_in_provider === 'google.com' &&
        typeof claims.auth_time === 'number' &&
        Math.floor(now.getTime() / 1000) - claims.auth_time <= FIREBASE_AUTH_MAX_AGE_S &&
        Math.floor(now.getTime() / 1000) - claims.auth_time >= -60;
      const sameEmail =
        !!claims?.email && claims.email_verified === true && claims.email.trim().toLowerCase() === user.email.trim().toLowerCase();
      return fresh && sameEmail ? { ok: true, method } : { ok: false, error: 'invalid_proof' };
    }
  }
}
