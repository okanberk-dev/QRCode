// CLAUDE.md §42 — Audit assignment by-id (PATCH + DELETE).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { AUDIT_ASSIGNMENT_STATUSES } from '@/lib/audits/types';

type Params = { id: string; asgId: string };

const PatchBody = z
  .object({
    status: z.enum(AUDIT_ASSIGNMENT_STATUSES).optional(),
    dueAt: z.string().nullable().optional(),
    internalNote: z.string().max(2000).nullable().optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, asgId } = await ctx.params;
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof PatchBody>>(PatchBody, body);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.auditAssignment.findFirst({
    where: { id: asgId, restaurantId: id },
    select: { id: true },
  });
  if (!existing) return ApiErrors.notFound('Atama bulunamadı');

  const updated = await prisma.auditAssignment.update({
    where: { id: asgId },
    data: {
      status: parsed.data.status,
      dueAt: parsed.data.dueAt === undefined ? undefined : parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      internalNote: parsed.data.internalNote,
    },
    select: { id: true, status: true, dueAt: true, internalNote: true },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, asgId } = await ctx.params;
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const existing = await prisma.auditAssignment.findFirst({
    where: { id: asgId, restaurantId: id },
    select: { id: true },
  });
  if (!existing) return ApiErrors.notFound('Atama bulunamadı');

  // Soft revoke — yanıt history korunsun. Token geçersiz, status='cancelled'.
  await prisma.auditAssignment.update({
    where: { id: asgId },
    data: { status: 'cancelled', tokenRevoked: true },
  });

  return NextResponse.json({ ok: true });
}
