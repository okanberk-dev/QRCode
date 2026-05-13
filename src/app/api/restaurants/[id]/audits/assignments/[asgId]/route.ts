// CLAUDE.md §42 — Audit assignment by-id (PATCH + DELETE).

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors, getErrorCode, getErrorMessage } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { AUDIT_ASSIGNMENT_STATUSES } from '@/lib/audits/types';
import { parseAuditDueAt } from '@/lib/audits/datetime';

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

  // dueAt guard. `undefined` ise Prisma'da unset (mevcut değer korunur);
  // `null` veya boş string ise null'a set; valid ISO ise Date; invalid ise 400.
  let dueAtUpdate: Date | null | undefined = undefined;
  if (parsed.data.dueAt !== undefined) {
    const r = parseAuditDueAt(parsed.data.dueAt);
    if (!r.ok) return ApiErrors.badRequest('Geçersiz tarih', 'INVALID_DUE_AT');
    dueAtUpdate = r.date;
  }

  try {
    const updated = await prisma.auditAssignment.update({
      where: { id: asgId },
      data: {
        status: parsed.data.status,
        dueAt: dueAtUpdate,
        internalNote: parsed.data.internalNote,
      },
      select: { id: true, status: true, dueAt: true, internalNote: true },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    const code = getErrorCode(err);
    console.error('[audit] assignments PATCH failed', { code, message: getErrorMessage(err) });
    Sentry.captureException(err, {
      tags: { route: 'restaurants/audits/assignments/[asgId]', method: 'PATCH', prismaCode: code },
      extra: { restaurantId: id, asgId, actorId: actor.id },
    });
    if (code === 'P2025') return ApiErrors.notFound('Atama bulunamadı');
    return NextResponse.json(
      { error: 'Atama güncellenemedi', code: code || 'INTERNAL_SERVER_ERROR' },
      { status: 500 },
    );
  }
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
