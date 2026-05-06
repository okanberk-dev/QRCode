import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { invalidatePermissionCache } from '@/lib/rbac';

// Stage A2 §38.94 — DELETE /api/admin/users/[id]/permissions/[permissionId]
// — revoke a single permission grant. Superadmin only.
//
// Idempotent: 404 returned if permission row not found (caller can ignore).

export const dynamic = 'force-dynamic';

async function writeAudit(entry: {
  actorId: string;
  action: string;
  targetId: string;
  payload?: unknown;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: entry.actorId,
        actorSource: 'admin',
        action: entry.action,
        targetId: entry.targetId,
        payload: (entry.payload as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  } catch (err) {
    console.warn('[audit] write failed (non-fatal)', (err as Error).message);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; permissionId: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, permissionId } = await params;

  try {
    // Validate path consistency — permission must belong to the user in URL
    // (forensic — prevents cross-user revoke via crafted permissionId).
    const existing = await prisma.adminPermission.findUnique({
      where: { id: permissionId },
      select: { id: true, adminUserId: true, resource: true, action: true },
    });
    if (!existing || existing.adminUserId !== id) {
      return NextResponse.json({ error: 'Yetki bulunamadı' }, { status: 404 });
    }

    await prisma.adminPermission.delete({ where: { id: permissionId } });

    invalidatePermissionCache(id);

    await writeAudit({
      actorId: adminId,
      action: 'admin.permission.revoke',
      targetId: id,
      payload: {
        resource: existing.resource,
        action: existing.action,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users/permissions DELETE]', err);
    return NextResponse.json({ error: 'Yetki kaldırılamadı' }, { status: 500 });
  }
}
