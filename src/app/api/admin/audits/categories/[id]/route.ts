// CLAUDE.md §42 — Audit category by-id (superadmin).
//
// PATCH (partial) + DELETE. Category silindiğinde template.categoryId SetNull
// (history preserve, FK migration'da tanımlandı).

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors, getErrorCode } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { AUDIT_SECTORS } from '@/lib/audits/types';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return { ok: false as const, res: ApiErrors.unauthorized() };
  if (admin.role !== 'superadmin') return { ok: false as const, res: ApiErrors.forbidden() };
  return { ok: true as const, admin };
}

const PatchBody = z
  .object({
    labelTr: z.string().min(1).max(120).optional(),
    labelEn: z.string().min(1).max(120).optional(),
    sector: z.enum(AUDIT_SECTORS).optional(),
    iconKey: z.string().max(64).nullable().optional(),
    order: z.number().int().min(0).max(99999).optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof PatchBody>>(PatchBody, body);
  if (!parsed.ok) return parsed.response;

  // Sadece P2025 (not found) silent yakalanır; diğer Prisma error'lar
  // (P2002 unique, P2003 FK, network) Sentry'ye düşmeli — observability
  // gap kapatma (CLAUDE.md §40.4).
  let updated;
  try {
    updated = await prisma.auditCategory.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        slug: true,
        labelTr: true,
        labelEn: true,
        sector: true,
        iconKey: true,
        order: true,
      },
    });
  } catch (err) {
    const code = getErrorCode(err);
    if (code === 'P2025') return ApiErrors.notFound('Kategori bulunamadı');
    console.error('[audit] auditCategory PATCH failed', { code });
    Sentry.captureException(err, {
      tags: { route: 'admin/audits/categories/[id]', method: 'PATCH', prismaCode: code },
      extra: { categoryId: id, actorId: String(gate.admin.id) },
    });
    if (code === 'P2002') return ApiErrors.conflict('Çakışan slug mevcut', 'UNIQUE_VIOLATION');
    return NextResponse.json(
      { error: 'Kategori güncellenemedi', code: code || 'INTERNAL_SERVER_ERROR' },
      { status: 500 },
    );
  }

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: String(gate.admin.id),
        actorSource: 'admin',
        action: 'admin.audits.categories.update',
        targetId: id,
        payload: parsed.data,
      },
    });
  } catch (err) {
    // KVKK trail integrity riski — log fail'ı görünür yap (CLAUDE.md §37.7).
    console.error('[audit] audits.categories.update log failed', (err as Error).message);
    Sentry.captureMessage('admin audit log create failed', {
      level: 'warning',
      tags: { action: 'admin.audits.categories.update', prismaCode: getErrorCode(err) },
      extra: { targetId: id, actorId: String(gate.admin.id) },
    });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;
  const { id } = await ctx.params;

  let deleted;
  try {
    deleted = await prisma.auditCategory.delete({
      where: { id },
      select: { id: true, slug: true },
    });
  } catch (err) {
    const code = getErrorCode(err);
    if (code === 'P2025') return ApiErrors.notFound('Kategori bulunamadı');
    console.error('[audit] auditCategory DELETE failed', { code });
    Sentry.captureException(err, {
      tags: { route: 'admin/audits/categories/[id]', method: 'DELETE', prismaCode: code },
      extra: { categoryId: id, actorId: String(gate.admin.id) },
    });
    if (code === 'P2003') {
      return ApiErrors.conflict('Kategoriye bağlı şablonlar var', 'FK_VIOLATION');
    }
    return NextResponse.json(
      { error: 'Kategori silinemedi', code: code || 'INTERNAL_SERVER_ERROR' },
      { status: 500 },
    );
  }

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: String(gate.admin.id),
        actorSource: 'admin',
        action: 'admin.audits.categories.delete',
        targetId: id,
        payload: { slug: deleted.slug },
      },
    });
  } catch (err) {
    console.error('[audit] audits.categories.delete log failed', (err as Error).message);
    Sentry.captureMessage('admin audit log create failed', {
      level: 'warning',
      tags: { action: 'admin.audits.categories.delete', prismaCode: getErrorCode(err) },
      extra: { targetId: id, actorId: String(gate.admin.id) },
    });
  }

  return NextResponse.json({ ok: true });
}
