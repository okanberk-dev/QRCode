import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    // §38.189 / §37.2.A / §40.4.A — session-aware auth (UserSession revoke check);
    // bare verifyJwt would accept a logged-out / password-reset session until expiry.
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Malformed / non-object body used to throw into the outer catch → 500.
    const raw: unknown = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }
    const { locale } = raw as { locale?: unknown };
    if (typeof locale !== 'string' || !['en', 'tr'].includes(locale)) {
      return NextResponse.json({ error: 'Geçersiz dil seçimi' }, { status: 400 });
    }

    // Update user locale in db
    await prisma.user.update({
      where: { id: auth.userId },
      data: { locale },
    });

    const res = NextResponse.json({ success: true, locale });
    
    // Optionally we can set a NEXT_LOCALE cookie from here, or let the client do it.
    // Setting it in cookie will help next-intl or any other middleware if added later.
    res.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });

    return res;
  } catch (error) {
    console.error('[LOCALE_PUT]', error);
    return NextResponse.json({ error: 'Dil güncellenirken hata oluştu' }, { status: 500 });
  }
}
