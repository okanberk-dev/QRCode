import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isStrongPassword } from '@/lib/validations';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);

  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mevcut şifre ve yeni şifre zorunludur' }, { status: 400 });
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        { error: 'Yeni şifre en az 8 karakter uzunluğunda olmalı, en az bir büyük harf ve bir rakam içermelidir' },
        { status: 400 },
      );
    }

    // Check if actor is AdminUser. Explicit select keeps this resilient
    // to schema/DB drift on unrelated columns (CLAUDE.md §14.1).
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true },
    });

    if (!adminUser) {
      // Fallback env admin cannot change password
      if (actor.id === 'env-admin') {
        return NextResponse.json({ error: 'Varsayılan çevre (env) yöneticisi şifre değiştiremez.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, adminUser.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Mevcut şifreniz hatalı' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.adminUser.update({
      where: { id: actor.id },
      data: { passwordHash: newHash }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_PROFILE_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Güncelleme sırasında bir hata oluştu' }, { status: 500 });
  }
}
