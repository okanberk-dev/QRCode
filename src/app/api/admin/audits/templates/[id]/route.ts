// CLAUDE.md §42 — Audit template by-id (superadmin).
//
// GET: full template + questions (admin edit form için).
// PATCH: meta + question list replace (full replace pattern — Survey paterniyle
//        aynı). Draft template'lerde her şey serbest; published'ta yine
//        düzenlenebilir ama owner fork edilmiş kopyalar etkilenmez (her fork
//        bağımsız).
// DELETE: hard delete — cascade question + assignments + responses.

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors, getErrorCode } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import {
  AUDIT_LOCALES,
  AUDIT_QUESTION_TYPES,
  AUDIT_SCORING_MODES,
  AUDIT_SECTORS,
} from '@/lib/audits/types';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return { ok: false as const, res: ApiErrors.unauthorized() };
  if (admin.role !== 'superadmin') return { ok: false as const, res: ApiErrors.forbidden() };
  return { ok: true as const, admin };
}

const QuestionInput = z
  .object({
    type: z.enum(AUDIT_QUESTION_TYPES),
    prompt: z.string().min(1).max(2000),
    helpText: z.string().max(2000).optional().nullable(),
    options: z.array(z.string().min(1).max(200)).max(20).optional().nullable(),
    correctAnswer: z.unknown().optional().nullable(),
    weight: z.number().int().min(1).max(10).optional(),
    isRequired: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(99999).optional(),
  })
  .strict();

const PatchBody = z
  .object({
    categoryId: z.string().min(1).nullable().optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    sector: z.enum(AUDIT_SECTORS).optional(),
    scoringMode: z.enum(AUDIT_SCORING_MODES).optional(),
    passingScore: z.number().int().min(0).max(100).nullable().optional(),
    locale: z.enum(AUDIT_LOCALES).optional(),
    isActive: z.boolean().optional(),
    // null = sorulara dokunma. Array = full replace.
    questions: z.array(QuestionInput).max(100).nullable().optional(),
  })
  .strict();

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;
  const { id } = await ctx.params;

  const tpl = await prisma.auditTemplate.findUnique({
    where: { id },
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
      _count: { select: { responses: true, assignments: true } },
    },
  });

  if (!tpl) return ApiErrors.notFound('Şablon bulunamadı');
  return NextResponse.json({ data: tpl });
}

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
  const data = parsed.data;

  const existing = await prisma.auditTemplate.findUnique({
    where: { id },
    select: { id: true, restaurantId: true },
  });
  if (!existing) return ApiErrors.notFound('Şablon bulunamadı');

  // Bu admin endpoint sadece GLOBAL template'leri yönetir. Owner template'leri
  // owner endpoint'inden (Faz 2) yönetilir.
  if (existing.restaurantId !== null) {
    return ApiErrors.forbidden('Bu şablon restoran-özel, admin endpoint üzerinden düzenlenemez');
  }

  if (data.categoryId !== undefined && data.categoryId !== null) {
    const cat = await prisma.auditCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!cat) return ApiErrors.badRequest('Geçersiz kategori', 'INVALID_CATEGORY');
  }

  // Aynı koruma owner endpoint'inde (RESPONSES_LOCK_QUESTIONS) zaten vardı,
  // burada YOKTU. `AuditAnswer.question` onDelete: Cascade olduğu için aşağıdaki
  // full-replace (deleteMany + createMany) yanıt almış bir şablonda TÜM geçmiş
  // cevapları siliyordu — ve bu endpoint GLOBAL şablonları yönetiyor, yani tek
  // bir yazım hatası düzeltmesi bütün kiracıların denetim geçmişini yok ediyordu.
  if (Array.isArray(data.questions)) {
    const responseCount = await prisma.auditResponse.count({ where: { templateId: id } });
    if (responseCount > 0) {
      return ApiErrors.badRequest(
        'Yanıt almış şablonun soruları değiştirilemez — geçmiş cevaplar silinirdi. Yeni versiyon için şablonu çoğaltın.',
        'RESPONSES_LOCK_QUESTIONS',
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.auditTemplate.update({
      where: { id },
      data: {
        categoryId: data.categoryId === undefined ? undefined : data.categoryId,
        title: data.title,
        description: data.description,
        sector: data.sector,
        scoringMode: data.scoringMode,
        passingScore: data.passingScore,
        locale: data.locale,
        isActive: data.isActive,
      },
      select: { id: true, title: true, isPublished: true },
    });

    // Question list full-replace (array verildiyse)
    if (Array.isArray(data.questions)) {
      await tx.auditQuestion.deleteMany({ where: { templateId: id } });
      if (data.questions.length > 0) {
        await tx.auditQuestion.createMany({
          data: data.questions.map((q, i) => ({
            templateId: id,
            type: q.type,
            prompt: q.prompt,
            helpText: q.helpText ?? null,
            options: q.options === undefined ? undefined : (q.options as unknown as object),
            correctAnswer:
              q.correctAnswer === undefined ? undefined : (q.correctAnswer as unknown as object),
            weight: q.weight ?? 1,
            isRequired: q.isRequired ?? true,
            sortOrder: q.sortOrder ?? (i + 1) * 10,
          })),
        });
      }
    }

    return updated;
  });

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: String(gate.admin.id),
        actorSource: 'admin',
        action: 'admin.audits.templates.update',
        targetId: id,
        payload: {
          title: result.title,
          questionsReplaced: Array.isArray(data.questions),
        },
      },
    });
  } catch (err) {
    console.error('[audit] audits.templates.update log failed', (err as Error).message);
    Sentry.captureMessage('admin audit log create failed', {
      level: 'warning',
      tags: { action: 'admin.audits.templates.update', prismaCode: getErrorCode(err) },
      extra: { targetId: id, actorId: String(gate.admin.id) },
    });
  }

  return NextResponse.json({ data: result });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;
  const { id } = await ctx.params;

  const existing = await prisma.auditTemplate.findUnique({
    where: { id },
    select: { id: true, restaurantId: true, title: true },
  });
  if (!existing) return ApiErrors.notFound('Şablon bulunamadı');
  if (existing.restaurantId !== null) {
    return ApiErrors.forbidden('Bu şablon restoran-özel, admin endpoint üzerinden silinemez');
  }

  await prisma.auditTemplate.delete({ where: { id } });

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: String(gate.admin.id),
        actorSource: 'admin',
        action: 'admin.audits.templates.delete',
        targetId: id,
        payload: { title: existing.title },
      },
    });
  } catch (err) {
    console.error('[audit] audits.templates.delete log failed', (err as Error).message);
    Sentry.captureMessage('admin audit log create failed', {
      level: 'warning',
      tags: { action: 'admin.audits.templates.delete', prismaCode: getErrorCode(err) },
      extra: { targetId: id, actorId: String(gate.admin.id) },
    });
  }

  return NextResponse.json({ ok: true });
}
