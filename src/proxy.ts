import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin/* routes EXCEPT the login page (/admin)
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const token = req.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }

    try {
      const payload = await verifyJwt(token);
      if (!payload) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  // Protect admin API routes (except login)
  if (pathname.startsWith('/api/admin') && !pathname.includes('/login')) {
    const token = req.cookies.get('admin_token')?.value ||
                  req.headers.get('Authorization')?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
      const payload = await verifyJwt(token);
      if (!payload) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
  }

  // Protect restaurant API routes (CRUD operations)
  if (pathname.startsWith('/api/restaurants')) {
    const method = req.method;
    // Allow GET for public restaurant lookups (used by [slug] page)
    // Protect POST, PUT, DELETE
    if (method !== 'GET') {
      const token = req.cookies.get('admin_token')?.value ||
                    req.headers.get('Authorization')?.split(' ')[1];

      if (!token) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
      }

      try {
        const payload: any = await verifyJwt(token);
        if (!payload) {
          return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
        }
        if (payload.role !== 'superadmin') {
          return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path+',
    '/api/admin/:path*',
    '/api/restaurants/:path*',
  ],
};
