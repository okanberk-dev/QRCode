// CLAUDE.md §42 — Soru sıralama. MenuBuilder reorder paterniyle aynı.
//
// Body: { questions: [{ id, sortOrder }] } — sadece sortOrder atomik update.
// Transaction: tek $transaction içinde batch updateMany.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';

type Params = { id: string; tplId: string };

const Body = z
  .object({
    questions: z
      .array(
        z.object({
          id: z.string().min(1),
          sortOrder: z.number().int().min(0).max(99999),
        }),
      )
      .min(1)
      .max(200),
  })
  .strict();

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;

  // Şablonun bu restorana ait olduğunu doğrula.
  const tpl = await prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId: id },
    select: { id: true },
  });
  if (!tpl) return ApiErrors.notFound('Şablon bulunamadı');

  // Question id'lerinin tümü bu şablona ait mi? (cross-template tampering guard)
  const ids = parsed.data.questions.map((q) => q.id);
  const valid = await prisma.auditQuestion.findMany({
    where: { id: { in: ids }, templateId: tplId },
    select: { id: true },
  });
  if (valid.length !== ids.length) {
    return ApiErrors.badRequest('Bazı soru id\'leri bu şablona ait değil', 'CROSS_TEMPLATE');
  }

  await prisma.$transaction(
    parsed.data.questions.map((q) =>
      prisma.auditQuestion.update({
        where: { id: q.id },
        data: { sortOrder: q.sortOrder },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
