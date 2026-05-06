import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { validateBody } from '@/lib/api/validate';
import { invalidatePermissionCache, RESOURCES, ACTIONS } from '@/lib/rbac';

// Stage A2 §38.94 — admin permission CRUD.
//
// Superadmin-only (manager kendi permission'unu yönetemez — circular grant
// önlenir). High-risk endpoint per CLAUDE.md §28.3.2 → Zod .strict() must-have.

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

// GET /api/admin/users/[id]/permissions — list grants for the manager.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // Permission management is superadmin-only intentionally — manager cannot
  // self-elevate or modify peer permissions.
  if (admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const target = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Yönetici bulunamadı' }, { status: 404 });
    }

    const permissions = await prisma.adminPermission.findMany({
      where: { adminUserId: id },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      select: {
        id: true,
        resource: true,
        action: true,
        grantedById: true,
        grantedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      target: {
        id: target.id,
        username: target.username,
        role: target.role,
      },
      permissions: permissions.map((p) => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
        grantedById: p.grantedById,
        grantedAt: p.grantedAt.toISOString(),
        expiresAt: p.expiresAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    console.error('[admin/users/permissions GET]', err);
    return NextResponse.json({ error: 'Yetkiler yüklenemedi' }, { status: 500 });
  }
}

// POST /api/admin/users/[id]/permissions — grant a single permission.
// Idempotent: existing (resource, action) record is updated (refresh
// expiresAt + grantedById). UNIQUE constraint guarantees no duplicate row.
const GrantSchema = z
  .object({
    resource: z.enum(RESOURCES),
    action: z.enum(ACTIONS),
    expiresAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = validateBody(GrantSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  try {
    // Verify target manager exists (no permission grants for nonexistent users).
    const target = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Yönetici bulunamadı' }, { status: 404 });
    }
    if (target.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin için permission grant gereksiz (helper bypass eder)' },
        { status: 400 },
      );
    }

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    const granted = await prisma.adminPermission.upsert({
      where: {
        adminUserId_resource_action: {
          adminUserId: id,
          resource: data.resource,
          action: data.action,
        },
      },
      create: {
        adminUserId: id,
        resource: data.resource,
        action: data.action,
        grantedById: adminId,
        expiresAt,
      },
      update: {
        // Re-grant: refresh grantedBy + expiresAt; grantedAt updates implicitly.
        grantedById: adminId,
        expiresAt,
        grantedAt: new Date(),
      },
      select: {
        id: true,
        resource: true,
        action: true,
        grantedById: true,
        grantedAt: true,
        expiresAt: true,
      },
    });

    invalidatePermissionCache(id);

    await writeAudit({
      actorId: adminId,
      action: 'admin.permission.grant',
      targetId: id,
      payload: {
        resource: data.resource,
        action: data.action,
        expiresAt: data.expiresAt ?? null,
      },
    });

    return NextResponse.json({
      permission: {
        id: granted.id,
        resource: granted.resource,
        action: granted.action,
        grantedById: granted.grantedById,
        grantedAt: granted.grantedAt.toISOString(),
        expiresAt: granted.expiresAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    console.error('[admin/users/permissions POST]', err);
    return NextResponse.json({ error: 'Yetki verilemedi' }, { status: 500 });
  }
}
