/**
 * Buaze customer accounts — sessions and action links (CLAUDE.md §61).
 *
 * Customers (the businesses' end customers) never share anything with the
 * owner auth: own table (`CustomerAccount`), own cookie (`buaze_customer`)
 * and tokens signed with a key DERIVED from JWT_SECRET for this purpose
 * only, so a customer token can never pass the owner `verifyJwt` (and the
 * other way round). Every token carries the account's `tokenVersion`;
 * password change, "sign out everywhere" and deletion bump it.
 */
import { createHash } from 'node:crypto';
import * as jose from 'jose';
import bcrypt from 'bcryptjs';
import type { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSecret } from '@/lib/auth';
import { BCRYPT_COST } from '@/lib/bcrypt-config';

export const CUSTOMER_COOKIE = 'buaze_customer';
const SESSION_DAYS = 30;

let derived: { from: string; key: Uint8Array } | null = null;
/** HMAC key for customer tokens only: sha256("buaze-customer-v1:" + JWT_SECRET). */
function customerKey(): Uint8Array {
  const base = Buffer.from(getSecret()).toString('base64');
  if (derived?.from === base) return derived.key;
  const key = new Uint8Array(createHash('sha256').update(`buaze-customer-v1:${base}`).digest());
  derived = { from: base, key };
  return key;
}

export const CUSTOMER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  birthMonth: true,
  birthDay: true,
  marketingConsent: true,
  locale: true,
  emailVerifiedAt: true,
  tokenVersion: true,
  googleUid: true,
  passwordHash: true,
  createdAt: true,
} as const;

export interface CustomerSessionAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  marketingConsent: boolean;
  locale: string;
  emailVerifiedAt: Date | null;
  tokenVersion: number;
  googleUid: string | null;
  passwordHash: string | null;
  createdAt: Date;
}

type TokenKind = 'customer' | 'customer-verify' | 'customer-reset';

async function sign(kind: TokenKind, sub: string, claims: Record<string, unknown>, expires: string): Promise<string> {
  return new jose.SignJWT({ kind, ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(customerKey());
}

async function verify(kind: TokenKind, token: string): Promise<(jose.JWTPayload & Record<string, unknown>) | null> {
  if (!token || token.length > 2000) return null;
  try {
    const { payload } = await jose.jwtVerify(token, customerKey(), { algorithms: ['HS256'] });
    if (payload.kind !== kind || typeof payload.sub !== 'string') return null;
    return payload as jose.JWTPayload & Record<string, unknown>;
  } catch {
    return null;
  }
}

export function signCustomerSession(account: { id: string; tokenVersion: number }): Promise<string> {
  return sign('customer', account.id, { v: account.tokenVersion }, `${SESSION_DAYS}d`);
}

/** The signed-in account for a session token, or null (expired, signed out, deleted). */
export async function getCustomerFromToken(token: string | null | undefined): Promise<CustomerSessionAccount | null> {
  if (!token) return null;
  const payload = await verify('customer', token);
  if (!payload) return null;
  const account = await prisma.customerAccount.findUnique({ where: { id: payload.sub! }, select: CUSTOMER_SELECT });
  if (!account || account.tokenVersion !== payload.v) return null;
  return account;
}

export function getCustomerFromRequest(req: NextRequest): Promise<CustomerSessionAccount | null> {
  return getCustomerFromToken(req.cookies.get(CUSTOMER_COOKIE)?.value);
}

/** For server components / pages. */
export async function getCustomerFromCookies(): Promise<CustomerSessionAccount | null> {
  const { cookies } = await import('next/headers');
  return getCustomerFromToken((await cookies()).get(CUSTOMER_COOKIE)?.value);
}

export function setCustomerCookie(res: NextResponse, token: string, req?: NextRequest): void {
  const https =
    process.env.NODE_ENV === 'production' &&
    (!req || req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:');
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: https,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearCustomerCookie(res: NextResponse): void {
  res.cookies.set(CUSTOMER_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

// ─── e-mail action links ──────────────────────────────────────────────────

/** E-mail confirmation link (7 days); bound to the address it was sent to. */
export function signVerifyToken(account: { id: string; email: string }): Promise<string> {
  return sign('customer-verify', account.id, { e: account.email }, '7d');
}

export async function readVerifyToken(token: string): Promise<{ id: string; email: string } | null> {
  const p = await verify('customer-verify', token);
  return p && typeof p.e === 'string' ? { id: p.sub!, email: p.e } : null;
}

/** Password reset link (30 min); dies when the password changes (tokenVersion bump). */
export function signResetToken(account: { id: string; tokenVersion: number }): Promise<string> {
  return sign('customer-reset', account.id, { v: account.tokenVersion }, '30m');
}

export async function readResetToken(token: string): Promise<{ id: string; v: number } | null> {
  const p = await verify('customer-reset', token);
  return p && typeof p.v === 'number' ? { id: p.sub!, v: p.v } : null;
}

// ─── passwords ────────────────────────────────────────────────────────────

export const PASSWORD_MIN = 8;

/** At least 8 characters, a letter and a digit. */
export function isAcceptablePassword(pw: unknown): pw is string {
  return typeof pw === 'string' && pw.length >= PASSWORD_MIN && pw.length <= 200 && /\p{L}/u.test(pw) && /\d/.test(pw);
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_COST);
}

export async function verifyPassword(pw: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(pw, hash);
  } catch {
    return false;
  }
}

/** Constant-ish work for unknown e-mails, so timing does not reveal accounts. */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(pw: string): Promise<void> {
  dummyHash ??= bcrypt.hash('buaze-timing-guard', BCRYPT_COST);
  await verifyPassword(pw, await dummyHash);
}

/** What the client may see about the signed-in account. */
export function toCustomerDto(a: CustomerSessionAccount) {
  return {
    id: a.id,
    email: a.email,
    firstName: a.firstName,
    lastName: a.lastName,
    phone: a.phone,
    birthMonth: a.birthMonth,
    birthDay: a.birthDay,
    marketingConsent: a.marketingConsent,
    locale: a.locale === 'en' ? 'en' : 'tr',
    emailVerified: Boolean(a.emailVerifiedAt),
    hasPassword: Boolean(a.passwordHash),
    hasGoogle: Boolean(a.googleUid),
    createdAt: a.createdAt.toISOString(),
  };
}
export type CustomerDto = ReturnType<typeof toCustomerDto>;

/** Short hash for logs (never the e-mail itself, §37.7). */
export function customerLogRef(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 10);
}
