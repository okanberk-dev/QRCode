import { NextRequest, NextResponse } from 'next/server';
import { isAdminRole, verifyJwt } from '@/lib/auth';

const PUBLIC_LOCALES = ['tr', 'en'];
const DEFAULT_LOCALE = 'tr';

function detectLocale(req: NextRequest): string {
  // 1. Cookie preference
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && PUBLIC_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Accept-Language header
  const acceptLang = req.headers.get('accept-language') || '';
  const langs = acceptLang
    .split(',')
    .map((l) => l.split(';')[0].trim().toLowerCase());

  for (const lang of langs) {
    if (lang.startsWith('tr')) return 'tr';
    if (lang.startsWith('en')) return 'en';
  }

  return DEFAULT_LOCALE;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── Admin UI protection ────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get('admin_token')?.value;

    if (pathname === '/admin') {
      if (token) {
        try {
          const payload = await verifyJwt(token);
          if (payload && isAdminRole(payload.role)) {
            return NextResponse.redirect(new URL('/admin/dashboard', req.url));
          }
        } catch {
          // Token invalid — stay on login
        }
      }
    } else {
      if (!token) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      try {
        const payload = await verifyJwt(token);
        if (!payload || !isAdminRole(payload.role)) {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
      } catch {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }
  }

  // ─── Admin API protection ────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin') && !pathname.includes('/login')) {
    const token = req.cookies.get('admin_token')?.value ||
                  req.headers.get('Authorization')?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
    try {
      const payload = await verifyJwt(token);
      if (!payload || !isAdminRole(payload.role)) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
  }

  // ─── Restaurant API protection ──────────────────────────────────────────
  if (pathname.startsWith('/api/restaurants')) {
    if (req.method !== 'GET') {
      const adminToken = req.cookies.get('admin_token')?.value ||
                         req.headers.get('Authorization')?.split(' ')[1];
      const userToken = req.cookies.get('user_token')?.value;

      if (!adminToken && !userToken) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
      }

      try {
        const adminPayload = adminToken ? await verifyJwt(adminToken) as Record<string, unknown> | null : null;
        const userPayload = userToken ? await verifyJwt(userToken) as Record<string, unknown> | null : null;

        if (!(adminPayload && isAdminRole(adminPayload.role)) && !userPayload?.userId) {
          return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
      }
    }
  }

  // ─── i18n locale routing (marketing + auth + dashboard pages) ────────────
  // Skip API, admin, _next, static files
  const isApiOrAdmin =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/menu/');
  const isStaticFile = /\.(ico|png|jpg|jpeg|svg|webp|css|js|woff|woff2|ttf|map|txt|xml)$/.test(pathname);
  const isNextInternal = pathname.startsWith('/_next/');

  if (!isApiOrAdmin && !isStaticFile && !isNextInternal) {
    const pathnameHasLocale = PUBLIC_LOCALES.some(
      (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
    );

    if (!pathnameHasLocale) {
      const locale = detectLocale(req);
      const newUrl = req.nextUrl.clone();
      newUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;

      const response = NextResponse.redirect(newUrl);
      response.cookies.set('NEXT_LOCALE', locale, {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        path: '/',
      });
      return response;
    }

    // ─── User dashboard auth protection ─────────────────────────────────
    const currentLocale = pathname.split('/')[1];
    const pathWithoutLocale = '/' + pathname.split('/').slice(2).join('/');

    if (pathWithoutLocale.startsWith('/dashboard')) {
      const token = req.cookies.get('user_token')?.value;
      let isValid = false;

      if (token) {
        try {
          const payload = await verifyJwt(token);
          isValid = !!payload;
        } catch {
          isValid = false;
        }
      }

      if (!isValid) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = `/${currentLocale}/auth/login`;
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // All routes except _next/static
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
