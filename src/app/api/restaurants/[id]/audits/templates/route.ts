// CLAUDE.md §42 — Owner audit templates (Phase 2).
//
// Owner kendi restoranı için audit şablonları yönetir. Hepsi
// `canWriteRestaurant` ile gate'lenir (team_member viewer hariç).
//
// POST body wizard submit payload'ı (src/lib/audits/wizard-state.ts).
// Assignment alanı doluysa atama da aynı transaction'da oluşturulur
// (atomic — şablon yayınlandı + atama gönderildi mantıksal birim).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant, canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { AuditTemplateSubmitSchema, type AuditTemplateSubmitInput } from '@/lib/audits/wizard-state';
import { generateAuditAssignmentToken } from '@/lib/audits/token';

async function gate(req: NextRequest, restaurantId: string, write: boolean) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { ok: false as const, res: ApiErrors.unauthorized() };
  const allowed = write
    ? await canWriteRestaurant(actor, restaurantId)
    : await canAccessRestaurant(actor, restaurantId);
  if (!allowed) return { ok: false as const, res: ApiErrors.forbidden() };
  return { ok: true as const, actor };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await gate(req, id, false);
  if (!g.ok) return g.res;

  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('drafts') !== 'false';

  const rows = await prisma.auditTemplate.findMany({
    where: {
      restaurantId: id,
      ...(includeDrafts ? {} : { isPublished: true }),
    },
    orderBy: [{ updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      description: true,
      sector: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      isPublished: true,
      isActive: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      categoryId: true,
      category: { select: { id: true, slug: true, labelTr: true, labelEn: true } },
      _count: { select: { questions: true, assignments: true, responses: true } },
    },
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await gate(req, id, true);
  if (!g.ok) return g.res;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<AuditTemplateSubmitInput>(AuditTemplateSubmitSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (data.categoryId) {
    const cat = await prisma.auditCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!cat) return ApiErrors.badRequest('Geçersiz kategori', 'INVALID_CATEGORY');
  }

  // Yayın için en az 1 soru zorunlu (Zod zaten 1+ garantili, defansif).
  if (data.publish && data.questions.length === 0) {
    return ApiErrors.badRequest('Yayın için en az 1 soru gerekli', 'NO_QUESTIONS');
  }

  const result = await prisma.$transaction(async (tx) => {
    const tpl = await tx.auditTemplate.create({
      data: {
        restaurantId: id,
        categoryId: data.categoryId ?? null,
        title: data.title,
        description: data.description ?? null,
        sector: data.sector,
        scoringMode: data.scoringMode,
        passingScore: data.passingScore ?? null,
        locale: data.locale,
        isPublished: data.publish,
        publishedAt: data.publish ? new Date() : null,
        isActive: true,
        createdBy: g.actor.source,
        createdById: g.actor.id,
        questions: {
          create: data.questions.map((q, i) => ({
            type: q.type,
            prompt: q.prompt,
            helpText: q.helpText ?? null,
            options: (q.options ?? undefined) as unknown as object,
            correctAnswer: (q.correctAnswer ?? undefined) as unknown as object,
            weight: q.weight,
            isRequired: q.isRequired,
            sortOrder: q.sortOrder || (i + 1) * 10,
          })),
        },
      },
      select: { id: true, title: true, isPublished: true },
    });

    if (data.assignment?.enabled && data.assignment.assigneeType) {
      const needsToken =
        data.assignment.assigneeType === 'candidate' || data.assignment.assigneeType === 'link';
      const token = needsToken ? await generateAuditAssignmentToken() : null;
      await tx.auditAssignment.create({
        data: {
          templateId: tpl.id,
          restaurantId: id,
          assigneeType: data.assignment.assigneeType,
          assigneeTeamMemberId: data.assignment.assigneeTeamMemberId ?? null,
          assigneeName: data.assignment.assigneeName ?? null,
          assigneeEmail: data.assignment.assigneeEmail ?? null,
          assigneePhone: data.assignment.assigneePhone ?? null,
          dueAt: data.assignment.dueAt ? new Date(data.assignment.dueAt) : null,
          recurrence: data.assignment.recurrence ?? 'once',
          status: 'pending',
          token,
          internalNote: data.assignment.internalNote ?? null,
          createdBy: g.actor.source,
          createdById: g.actor.id,
        },
      });
    }

    return tpl;
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
