import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Mirror of lib/auth.ts secret resolution. Kept inline so the middleware
// (edge runtime) doesn't pull in Prisma or Node-only deps.
// In production NODE_ENV this will throw if JWT_SECRET is missing — which is
// the desired behaviour: without a stable secret we cannot verify tokens.
const DEV_FALLBACK_SECRET = 'cldqlkmC72MfL/WvllPYQq9O0puMk4j+LxrEtzm8PVs=';

function getSecretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    const maybeBase64 = /^[A-Za-z0-9+/=]+$/.test(secret) && secret.length % 4 === 0;
    if (maybeBase64) {
      const binary = atob(secret);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Buaze] JWT_SECRET is required in production.');
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

function isAdminRole(role: unknown): boolean {
  return role === 'superadmin' || role === 'manager';
}

// Admin sub-routes that DO NOT require auth.
// - `/admin` itself is the login page.
// - `/admin/trial-expired` is an informational page shown to users whose
//   trial ended, no live session needed.
const PUBLIC_ADMIN_PATHS = new Set<string>(['/admin', '/admin/trial-expired']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard admin sub-routes. `/admin` itself (the login page) and
  // `/admin/trial-expired` are public.
  if (!pathname.startsWith('/admin') || PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('admin_token')?.value;
  if (!token) {
    const loginUrl = new URL('/admin', req.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jose.jwtVerify(token, getSecretBytes());
    if (!isAdminRole(payload.role)) {
      const loginUrl = new URL('/admin', req.url);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete('admin_token');
      return res;
    }
    return NextResponse.next();
  } catch {
    // Invalid / expired / tampered token — clear it and send to login
    const loginUrl = new URL('/admin', req.url);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete('admin_token');
    return res;
  }
}

export const config = {
  // Protect only /admin/* (not the marketing /[locale]/* pages).
  matcher: ['/admin/:path*'],
};
