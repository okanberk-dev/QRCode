import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { password, role, restaurantId } = body;

    if (role !== 'superadmin' && role !== 'manager') {
      return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 });
    }
    if (role === 'manager' && (typeof restaurantId !== 'string' || !restaurantId)) {
      return NextResponse.json({ error: 'Yönetici rolü için restoran seçilmelidir' }, { status: 400 });
    }

    if (role === 'manager') {
      const target = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
      if (!target) {
        return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
      }
    }

    const data: any = { role, restaurantId: role === 'manager' ? restaurantId : null };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcı güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const { id } = await params;
  
  if (id === admin.id) {
    return NextResponse.json({ error: 'Kendinizi silemezsiniz' }, { status: 400 });
  }

  try {
    await prisma.adminUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcı silinemedi' }, { status: 500 });
  }
}
