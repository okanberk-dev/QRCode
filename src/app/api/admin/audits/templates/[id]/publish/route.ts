// CLAUDE.md §42 — Audit template publish toggle (superadmin).
//
// POST { isPublished: true | false } — toggle. Yayınlanan template owner
// kataloğunda görünür ve fork edilebilir; unpublish'te draft'a döner.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return { ok: false as const, res: ApiErrors.unauthorized() };
  if (admin.role !== 'superadmin') return { ok: false as const, res: ApiErrors.forbidden() };
  return { ok: true as const, admin };
}

const Body = z.object({ isPublished: z.boolean() }).strict();

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.auditTemplate.findUnique({
    where: { id },
    select: { id: true, restaurantId: true, isPublished: true },
  });
  if (!existing) return ApiErrors.notFound('Şablon bulunamadı');
  if (existing.restaurantId !== null) {
    return ApiErrors.forbidden('Bu şablon restoran-özel');
  }

  // Yayına alırken en az 1 soru olmalı.
  if (parsed.data.isPublished) {
    const qCount = await prisma.auditQuestion.count({ where: { templateId: id } });
    if (qCount === 0) {
      return ApiErrors.badRequest('Yayın için en az 1 soru gerekli', 'NO_QUESTIONS');
    }
  }

  const now = new Date();
  const updated = await prisma.auditTemplate.update({
    where: { id },
    data: {
      isPublished: parsed.data.isPublished,
      publishedAt: parsed.data.isPublished
        ? existing.isPublished
          ? undefined
          : now
        : null,
    },
    select: { id: true, isPublished: true, publishedAt: true },
  });

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: String(gate.admin.id),
        actorSource: 'admin',
        action: parsed.data.isPublished
          ? 'admin.audits.templates.publish'
          : 'admin.audits.templates.unpublish',
        targetId: id,
        payload: {},
      },
    });
  } catch (err) {
    console.warn('[audit] audits.templates.publish log failed', (err as Error).message);
  }

  return NextResponse.json({ data: updated });
}
