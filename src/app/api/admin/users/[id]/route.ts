import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { isStrongPassword } from '@/lib/validations';
import bcrypt from 'bcryptjs';

// Append-only audit log. Wrapped in try/catch so a missing table (preview
// deploy before db push) doesn't take down the actual mutation.
async function writeAudit(entry: {
  actorId: string;
  actorSource: 'admin' | 'user';
  action: string;
  targetId?: string | null;
  payload?: unknown;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: entry.actorId,
        actorSource: entry.actorSource,
        action: entry.action,
        targetId: entry.targetId ?? null,
        payload: (entry.payload as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  } catch (err) {
    console.warn('[audit] write failed (non-fatal)', (err as Error).message);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { password, role, restaurantId, email } = body;

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

    const before = await prisma.adminUser.findUnique({
      where: { id },
      select: { role: true, restaurantId: true, email: true },
    });

    const data: Prisma.AdminUserUncheckedUpdateInput = { role, restaurantId: role === 'manager' ? restaurantId : null };

    if (password) {
      // Match the strength bar applied at create-time. The previous PUT
      // route accepted any non-empty string so an admin password reset
      // through this endpoint could downgrade the password to "1".
      if (!isStrongPassword(password)) {
        return NextResponse.json(
          { error: 'Şifre en az 8 karakter olmalı; harf ve rakam içermeli.' },
          { status: 400 },
        );
      }
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    // Recovery email — boş string explicit clear, undefined dokunma sinyali.
    if (email !== undefined) {
      if (typeof email !== 'string') {
        return NextResponse.json({ error: 'Geçersiz e-posta' }, { status: 400 });
      }
      const trimmed = email.trim().toLowerCase();
      if (trimmed === '') {
        data.email = null;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 256) {
        return NextResponse.json({ error: 'Geçerli bir e-posta gir' }, { status: 400 });
      } else {
        data.email = trimmed;
      }
    }

    let user: { id: string; username: string; email: string | null; role: string };
    try {
      user = await prisma.adminUser.update({
        where: { id },
        data,
        select: { id: true, username: true, email: true, role: true },
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      const target = Array.isArray((err as { meta?: { target?: unknown } }).meta?.target)
        ? ((err as { meta: { target: string[] } }).meta.target as string[]).join(',')
        : '';
      if (code === 'P2002' && target.includes('email')) {
        return NextResponse.json(
          { error: 'Bu e-posta zaten başka bir admin tarafından kullanılıyor' },
          { status: 409 },
        );
      }
      throw err;
    }

    await writeAudit({
      actorId: String(admin.id),
      actorSource: 'admin',
      action: 'admin.users.update',
      targetId: id,
      payload: {
        before,
        after: { role: user.role, restaurantId: data.restaurantId, email: user.email },
        passwordChanged: Boolean(password),
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Kullanıcı güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json({ error: 'Kendinizi silemezsiniz' }, { status: 400 });
  }

  try {
    const before = await prisma.adminUser.findUnique({
      where: { id },
      select: { username: true, role: true, restaurantId: true },
    });

    await prisma.adminUser.delete({ where: { id } });

    await writeAudit({
      actorId: String(admin.id),
      actorSource: 'admin',
      action: 'admin.users.delete',
      targetId: id,
      payload: { before },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Kullanıcı silinemedi' }, { status: 500 });
  }
}
