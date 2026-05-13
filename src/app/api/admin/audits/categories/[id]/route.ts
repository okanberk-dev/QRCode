// CLAUDE.md §42 — Audit category by-id (superadmin).
//
// PATCH (partial) + DELETE. Category silindiğinde template.categoryId SetNull
// (history preserve, FK migration'da tanımlandı).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
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

  const updated = await prisma.auditCategory
    .update({
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
    })
    .catch(() => null);

  if (!updated) return ApiErrors.notFound('Kategori bulunamadı');

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
    console.warn('[audit] audits.categories.update log failed', (err as Error).message);
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

  const deleted = await prisma.auditCategory
    .delete({ where: { id }, select: { id: true, slug: true } })
    .catch(() => null);

  if (!deleted) return ApiErrors.notFound('Kategori bulunamadı');

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
    console.warn('[audit] audits.categories.delete log failed', (err as Error).message);
  }

  return NextResponse.json({ ok: true });
}
