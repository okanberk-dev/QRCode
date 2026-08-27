import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { isStrongPassword } from '@/lib/validations';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';

// Append-only audit log. Wrapped in try/catch so a missing table (preview
// deploy before schema migration) doesn't take down the actual mutation.
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

// CLAUDE.md §38.93 (Stage A1) — admin user detail GET. /admin/users/[id]
// page kullanır: AdminUser fields (username/email/role/passwordChangedAt) +
// scoped restaurant adı (manager) + audit history sayım. Detail page ayrıca
// `actorId` üzerinden audit log endpoint'ini çağırır (mevcut helper reuse).
//
// Resilient — table missing (P2021/P2022 schema drift) durumlarında 404 değil
// 500 dönerken Prisma error code preserve edilir; UI graceful degrade.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Stage A2 §38.94 — RBAC: users:read.
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'users', 'read'))) {
    return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
  }

  const { id } = await params;

  try {
    // AdminUser model'inde `createdAt` / `updatedAt` field'ı yok (CLAUDE.md
    // §37.3 #1 closure — sadece `passwordChangedAt` staleness pivot'u var).
    // UI'da tarih bilgisi olarak yalnız son şifre değişimi tarihi sunulur.
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        restaurantId: true,
        passwordChangedAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    let restaurant: { id: string; name: string; slug: string; isActive: boolean } | null = null;
    if (user.restaurantId) {
      restaurant = await prisma.restaurant.findUnique({
        where: { id: user.restaurantId },
        select: { id: true, name: true, slug: true, isActive: true },
      });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
          passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
        },
        restaurant,
      },
      {
        headers: {
          // Owner scope, IDOR-gated, KVKK-safe (no PII beyond admin email).
          // Short cache + revalidate keeps detail fresh for admin edits.
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
        },
      },
    );
  } catch (err) {
    console.error('[ADMIN_USERS_GET]', err);
    return NextResponse.json({ error: 'Kullanıcı yüklenemedi' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Stage A2 §38.94 — RBAC: users:write.
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'users', 'write'))) {
    return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
  }

  const { id } = await params;

  // Privilege-escalation guard. `users:write` is a grantable permission, so a
  // non-superadmin `staff` admin could reach this handler. Without these checks
  // it could PUT `role: 'superadmin'` on its own id and take over the panel,
  // or rotate a superadmin's password and lock them out. DELETE already had the
  // self-guard; PUT did not.
  if (id === admin.id) {
    return NextResponse.json(
      { error: 'Kendi hesabınızı buradan düzenleyemezsiniz. Profil sayfasını kullanın.' },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { password, role, restaurantId, email } = body;

    // Stage: staff role added (CLAUDE.md §37.2 granular RBAC). Staff
    // doesn't need a restaurantId — its scope is per-resource grants in
    // AdminPermission, not workspace boundary.
    if (role !== 'superadmin' && role !== 'manager' && role !== 'staff') {
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
    if (!before) {
      return NextResponse.json({ error: 'Yönetici bulunamadı' }, { status: 404 });
    }

    // Only a superadmin may grant the superadmin role or touch an existing one.
    if (admin.role !== 'superadmin' && (role === 'superadmin' || before.role === 'superadmin')) {
      return NextResponse.json(
        { error: 'Süperadmin rolünü yalnızca bir süperadmin yönetebilir' },
        { status: 403 },
      );
    }

    const data: Prisma.AdminUserUncheckedUpdateInput = {
      role,
      restaurantId: role === 'manager' ? restaurantId : null,
    };

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
      data.passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      // Stamp the staleness pivot — `getAdminFromRequest` rejects every
      // admin_token issued before this moment for this user (CLAUDE.md
      // §37.2 A). One admin can't change another's password and have
      // the victim's existing cookie keep loading the panel.
      data.passwordChangedAt = new Date();
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
  // Stage A2 §38.94 — RBAC: users:delete (destructive — admin role removal).
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'users', 'delete'))) {
    return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
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
