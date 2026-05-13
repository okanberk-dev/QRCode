// CLAUDE.md §42 — Owner audit template by-id (Phase 2).
//
// GET: detay (sorular dahil) — wizard edit + detay sayfa.
// PATCH: meta + soru-listesi full replace (Survey paterniyle aynı).
// DELETE: hard delete yalnız sıfır yanıt olunca; aksi halde isActive=false
//         soft-disable (history korunur). Yanıt akışı Phase 3'te bağlanır.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { AuditTemplatePatchSchema, type AuditTemplateSubmitInput } from '@/lib/audits/wizard-state';

type Params = { id: string; tplId: string };

async function gate(req: NextRequest, restaurantId: string, write: boolean) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { ok: false as const, res: ApiErrors.unauthorized() };
  const allowed = write
    ? await canWriteRestaurant(actor, restaurantId)
    : await canAccessRestaurant(actor, restaurantId);
  if (!allowed) return { ok: false as const, res: ApiErrors.forbidden() };
  return { ok: true as const, actor };
}

async function findTemplate(tplId: string, restaurantId: string) {
  return prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId },
    select: { id: true, restaurantId: true },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;
  const g = await gate(req, id, false);
  if (!g.ok) return g.res;

  const tpl = await prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId: id },
    select: {
      id: true,
      restaurantId: true,
      categoryId: true,
      title: true,
      description: true,
      sector: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      isPublished: true,
      publishedAt: true,
      isActive: true,
      createdBy: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, slug: true, labelTr: true, labelEn: true } },
      questions: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
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
      _count: { select: { assignments: true, responses: true } },
    },
  });

  if (!tpl) return ApiErrors.notFound('Şablon bulunamadı');
  return NextResponse.json({ data: tpl });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;
  const g = await gate(req, id, true);
  if (!g.ok) return g.res;

  const existing = await findTemplate(tplId, id);
  if (!existing) return ApiErrors.notFound('Şablon bulunamadı');

  const body = await req.json().catch(() => null);
  const parsed = validateBody<Partial<AuditTemplateSubmitInput>>(AuditTemplatePatchSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (data.categoryId !== undefined && data.categoryId !== null) {
    const cat = await prisma.auditCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!cat) return ApiErrors.badRequest('Geçersiz kategori', 'INVALID_CATEGORY');
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.auditTemplate.update({
      where: { id: tplId },
      data: {
        categoryId: data.categoryId === undefined ? undefined : data.categoryId,
        title: data.title,
        description: data.description,
        sector: data.sector,
        scoringMode: data.scoringMode,
        passingScore: data.passingScore,
        locale: data.locale,
        ...(data.publish !== undefined
          ? {
              isPublished: data.publish,
              publishedAt: data.publish ? new Date() : null,
            }
          : {}),
      },
      select: { id: true, title: true, isPublished: true },
    });

    if (Array.isArray(data.questions)) {
      await tx.auditQuestion.deleteMany({ where: { templateId: tplId } });
      if (data.questions.length > 0) {
        await tx.auditQuestion.createMany({
          data: data.questions.map((q, i) => ({
            templateId: tplId,
            type: q.type,
            prompt: q.prompt,
            helpText: q.helpText ?? null,
            options: (q.options ?? undefined) as unknown as object,
            correctAnswer: (q.correctAnswer ?? undefined) as unknown as object,
            weight: q.weight ?? 1,
            isRequired: q.isRequired ?? true,
            sortOrder: q.sortOrder ?? (i + 1) * 10,
          })),
        });
      }
    }

    return updated;
  });

  return NextResponse.json({ data: result });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;
  const g = await gate(req, id, true);
  if (!g.ok) return g.res;

  const existing = await findTemplate(tplId, id);
  if (!existing) return ApiErrors.notFound('Şablon bulunamadı');

  const responseCount = await prisma.auditResponse.count({ where: { templateId: tplId } });

  if (responseCount > 0) {
    // Soft-disable — history korunur.
    await prisma.auditTemplate.update({
      where: { id: tplId },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true, mode: 'soft-disabled', responses: responseCount });
  }

  await prisma.auditTemplate.delete({ where: { id: tplId } });
  return NextResponse.json({ ok: true, mode: 'deleted' });
}
