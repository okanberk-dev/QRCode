// CLAUDE.md §42 — Global şablonu owner restoranına fork et.
//
// Source: AuditTemplate where restaurantId=null AND isPublished=true.
// Output: yeni AuditTemplate where restaurantId=<owner restoran>,
// isPublished=false (taslak). Owner sonra düzenler veya yayınlar.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';

type Params = { id: string; tplId: string };

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const src = await prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId: null, isPublished: true, isActive: true },
    select: {
      title: true,
      description: true,
      sector: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      categoryId: true,
      questions: {
        orderBy: { sortOrder: 'asc' },
        select: {
          type: true,
          prompt: true,
          helpText: true,
          options: true,
          correctAnswer: true,
          weight: true,
          isRequired: true,
          sortOrder: true,
        },
      },
    },
  });
  if (!src) return ApiErrors.notFound('Yayınlanmış global şablon bulunamadı');

  const created = await prisma.auditTemplate.create({
    data: {
      restaurantId: id,
      categoryId: src.categoryId,
      title: src.title,
      description: src.description,
      sector: src.sector,
      scoringMode: src.scoringMode,
      passingScore: src.passingScore,
      locale: src.locale,
      isPublished: false,
      isActive: true,
      createdBy: actor.source,
      createdById: actor.id,
      questions: {
        create: src.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          helpText: q.helpText,
          options: q.options === null ? undefined : (q.options as unknown as object),
          correctAnswer:
            q.correctAnswer === null ? undefined : (q.correctAnswer as unknown as object),
          weight: q.weight,
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
        })),
      },
    },
    select: { id: true, title: true },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
