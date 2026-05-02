import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Mirror of lib/auth.ts secret resolution. Kept inline so the middleware
// (edge runtime) doesn't pull in Prisma or Node-only deps. In production
// we refuse to verify against the public dev key — getSecretBytes throws
// and middleware downgrades to "treat as no/invalid token" (= redirect to
// /admin login). Better to fail closed than to verify against a value
// anyone with repo access already knows.
const DEV_FALLBACK_SECRET = 'cldqlkmC72MfL/WvllPYQq9O0puMk4j+LxrEtzm8PVs=';

function getSecretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Buaze] JWT_SECRET is not configured in production.');
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

// `admin_token` JWT'si sadece admin login flow'unda (superadmin / manager için)
// issue edilir; `restaurant_owner` `user_token` taşır. Yine de defensive
// olarak owner role'ünü buradan çıkarıyoruz: bir şekilde admin_token'lı
// restaurant_owner görürse (örn. eski/migrate edilmiş cookie) admin paneline
// girmesin — `/api/admin/*` endpoint'leri zaten 403 dönüyordu, UX confusion
// yaratıyordu. Şimdi middleware seviyesinde redirect'lenir.
function isAllowedAdminPanelRole(role: unknown): boolean {
  return role === 'superadmin' || role === 'manager';
}

// Admin sub-routes that DO NOT require auth.
// - `/admin` itself is the login page.
// - `/admin/trial-expired` is an informational page shown to users whose
//   trial ended, no live session needed.
// - `/admin/forgot-password` and `/admin/reset-password` must be reachable
//   while logged out — that's the entire point of password recovery.
const PUBLIC_ADMIN_PATHS = new Set<string>([
  '/admin',
  '/admin/trial-expired',
  '/admin/forgot-password',
  '/admin/reset-password',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin (login page): if the visitor is already authenticated, send
  // them straight to the dashboard. Otherwise the AdminLayout would still
  // render its sidebar around the login form (since the layout reads the
  // cookie itself), producing the broken "logged in but seeing login"
  // screen the user reported.
  if (pathname === '/admin') {
    const token = req.cookies.get('admin_token')?.value;
    if (token) {
      try {
        const { payload } = await jose.jwtVerify(token, getSecretBytes());
        if (isAllowedAdminPanelRole(payload.role)) {
          return NextResponse.redirect(new URL('/admin/dashboard', req.url));
        }
      } catch {
        // Invalid / expired token — fall through and let the login page
        // render so the user can re-authenticate.
      }
    }
    return NextResponse.next();
  }

  // Only guard admin sub-routes. `/admin/trial-expired` stays public.
  if (!pathname.startsWith('/admin') || PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('admin_token')?.value;
  if (!token) {
    const loginUrl = new URL('/admin', req.url);
    loginUrl.searchParams.set('redirect', encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search));
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jose.jwtVerify(token, getSecretBytes());
    if (!isAllowedAdminPanelRole(payload.role)) {
      const loginUrl = new URL('/admin', req.url);
      loginUrl.searchParams.set('redirect', encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search));
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set('admin_token', '', { path: '/', maxAge: 0 });
      return res;
    }
    return NextResponse.next();
  } catch {
    // Invalid / expired / tampered token — clear it and send to login
    const loginUrl = new URL('/admin', req.url);
    loginUrl.searchParams.set('redirect', encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search));
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set('admin_token', '', { path: '/', maxAge: 0 });
    return res;
  }
}

export const config = {
  // Protect only /admin/* (not the marketing /[locale]/* pages).
  matcher: ['/admin/:path*'],
};
