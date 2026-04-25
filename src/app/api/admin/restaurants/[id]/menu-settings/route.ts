import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: admin ? 403 : 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const b = body as { menuEnabled?: unknown; menuPublished?: unknown };
  const data: { menuEnabled?: boolean; menuPublished?: boolean; menuUpdatedAt?: Date } = {};
  if (typeof b.menuEnabled === 'boolean') data.menuEnabled = b.menuEnabled;
  if (typeof b.menuPublished === 'boolean') data.menuPublished = b.menuPublished;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
  }

  if (data.menuEnabled === false) {
    data.menuPublished = false;
  }
  data.menuUpdatedAt = new Date();

  try {
    const restaurant = await prisma.restaurant.update({
      where: { id },
      data,
      select: { id: true, menuEnabled: true, menuPublished: true, menuUpdatedAt: true },
    });
    return NextResponse.json({ restaurant });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 });
    }
    console.error('[admin menu-settings]', error);
    return NextResponse.json({ error: 'Ayar güncellenemedi' }, { status: 500 });
  }
}
