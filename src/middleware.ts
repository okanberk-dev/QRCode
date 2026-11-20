import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';
import { BILLING_PAGE_PREFIX, billingLocaleOf, billingPageCsp, generateNonce } from './lib/billing/page-csp';

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
//
// `staff` (CLAUDE.md §37.2 granular RBAC) MUST be here too: /api/admin/login
// issues a JWT carrying `role: 'staff'`, AdminSidebar renders staff-scoped
// nav items, and every /api/admin/* handler gates on `hasPermission`. Only
// this middleware did not know the role — so a staff admin was redirected to
// the login page AND had their cookie deleted on every /admin/* request, an
// unbreakable login loop that made the whole tier unusable. Per-resource
// authorization stays with hasPermission; this gate is only panel entry.
function isAllowedAdminPanelRole(role: unknown): boolean {
  return role === 'superadmin' || role === 'manager' || role === 'staff';
}

// Admin sub-routes that DO NOT require auth.
// - `/admin` itself is the login page.
// - `/admin/forgot-password` and `/admin/reset-password` must be reachable
//   while logged out — that's the entire point of password recovery.
const PUBLIC_ADMIN_PATHS = new Set<string>([
  '/admin',
  '/admin/forgot-password',
  '/admin/reset-password',
]);

// `/` → `/tr` or `/en`. Runs here at the edge instead of in a server
// function (src/app/page.tsx keeps the same logic as a fallback), so the
// first hop of every visit no longer waits on a serverless cold start.
// Order: NEXT_LOCALE cookie → Accept-Language → no header at all (crawlers;
// Googlebot sends none) → /tr, matching hreflang x-default → anything else
// → /en for international visitors.
function rootLocaleRedirect(req: NextRequest): NextResponse {
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  let locale: 'tr' | 'en' | null =
    cookieLocale === 'tr' || cookieLocale === 'en' ? cookieLocale : null;
  if (!locale) {
    const acceptLanguage = req.headers.get('accept-language') || '';
    if (!acceptLanguage.trim()) {
      locale = 'tr';
    } else {
      for (const part of acceptLanguage.split(',')) {
        const lang = part.split(';')[0].trim().toLowerCase();
        if (lang.startsWith('tr')) { locale = 'tr'; break; }
        if (lang.startsWith('en')) { locale = 'en'; break; }
      }
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${locale ?? 'en'}`;
  const res = NextResponse.redirect(url);
  res.headers.set('Vary', 'Accept-Language, Cookie');
  return res;
}

/**
 * Billing pages (`/billing/{locale}/…`, billing spec D12 / §3.4): an enforced
 * per-request nonce CSP with 'strict-dynamic'. The policy is also set on the
 * REQUEST headers so Next.js puts the nonce on its own scripts. An unknown
 * locale segment goes to the Turkish page of the same path.
 */
function billingPage(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;
  const segments = pathname.slice(BILLING_PAGE_PREFIX.length).split('/');
  if (!billingLocaleOf(segments[0])) {
    const url = req.nextUrl.clone();
    // `/billing/de/result` → `/billing/tr/result`; `/billing/result` → `/billing/tr/result`.
    const first = segments[0] ?? '';
    const rest = (/^[a-z]{2}$/i.test(first) ? segments.slice(1) : segments).join('/');
    url.pathname = `${BILLING_PAGE_PREFIX}tr/${rest || 'checkout'}`;
    url.search = search;
    return NextResponse.redirect(url);
  }
  const nonce = generateNonce();
  const csp = billingPageCsp(nonce, { dev: process.env.NODE_ENV === 'development' });
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/') return rootLocaleRedirect(req);
  if (pathname === '/billing' || pathname.startsWith(BILLING_PAGE_PREFIX)) {
    if (pathname === '/billing') return NextResponse.redirect(new URL(`${BILLING_PAGE_PREFIX}tr/checkout`, req.url));
    return billingPage(req);
  }

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

  // Only guard admin sub-routes; the public ones above stay open.
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
  // `/` for the edge locale redirect, /admin/* for the admin gate and
  // /billing/* for the billing pages' nonce CSP (not the marketing
  // /[locale]/* pages).
  matcher: ['/', '/admin/:path*', '/billing', '/billing/:path*'],
};
