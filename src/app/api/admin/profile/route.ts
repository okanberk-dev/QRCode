import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isStrongPassword } from '@/lib/validations';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PUT /api/admin/profile
 *
 * Body: { currentPassword?, newPassword?, email? }
 *
 * - Şifre değişikliği için: `currentPassword` + `newPassword` (zorunlu çift).
 * - E-posta güncellemesi için: `email` (kurtarma kodu için kullanılır).
 *
 * Boş body / hiç field yok → 400.
 */
export async function PUT(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);

  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const wantsPasswordChange = body.currentPassword || body.newPassword;
    const wantsEmailChange = typeof body.email === 'string';

    if (!wantsPasswordChange && !wantsEmailChange) {
      return NextResponse.json({ error: 'Güncellenecek alan belirtilmedi.' }, { status: 400 });
    }

    if (wantsPasswordChange && (!body.currentPassword || !body.newPassword)) {
      return NextResponse.json(
        { error: 'Mevcut şifre ve yeni şifre zorunludur.' },
        { status: 400 },
      );
    }

    if (wantsPasswordChange && !isStrongPassword(body.newPassword)) {
      return NextResponse.json(
        { error: 'Yeni şifre en az 8 karakter uzunluğunda olmalı, en az bir büyük harf ve bir rakam içermelidir.' },
        { status: 400 },
      );
    }

    // Validate e-mail (allow null/empty to clear)
    let normalizedEmail: string | null | undefined;
    if (wantsEmailChange) {
      const trimmed = String(body.email || '').trim().toLowerCase();
      if (trimmed === '') {
        normalizedEmail = null; // explicit clear
      } else if (!EMAIL_REGEX.test(trimmed)) {
        return NextResponse.json(
          { error: 'Geçerli bir e-posta adresi gir.' },
          { status: 400 },
        );
      } else {
        normalizedEmail = trimmed;
      }
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true },
    });

    if (!adminUser) {
      if (actor.id === 'env-admin') {
        return NextResponse.json(
          { error: 'Varsayılan çevre (env) yöneticisi profili güncelleyemez.' },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    if (wantsPasswordChange) {
      const isValid = await bcrypt.compare(body.currentPassword, adminUser.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Mevcut şifren hatalı.' }, { status: 400 });
      }
    }

    // Build update payload
    const updateData: {
      passwordHash?: string;
      email?: string | null;
    } = {};

    if (wantsPasswordChange) {
      updateData.passwordHash = await bcrypt.hash(body.newPassword, BCRYPT_COST);
    }
    if (wantsEmailChange) {
      updateData.email = normalizedEmail!;
    }

    try {
      await prisma.adminUser.update({
        where: { id: actor.id },
        data: updateData,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // Unique constraint on email
      if (code === 'P2002') {
        return NextResponse.json(
          { error: 'Bu e-posta başka bir hesapta kayıtlı.' },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_PROFILE_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Güncelleme sırasında bir hata oluştu.' }, { status: 500 });
  }
}
