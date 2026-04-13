import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('user_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 });
    }

    const { locale } = await req.json();
    if (!locale || !['en', 'tr'].includes(locale)) {
      return NextResponse.json({ error: 'Geçersiz dil seçimi' }, { status: 400 });
    }

    // Update user locale in db
    await prisma.user.update({
      where: { id: payload.userId as string },
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
