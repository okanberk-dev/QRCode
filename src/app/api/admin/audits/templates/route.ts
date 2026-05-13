// CLAUDE.md §42 — Audit template catalog API (superadmin).
//
// GET: tüm template'leri liste (global + restoran-özel hepsi); filter:
//   ?sector=...&isPublished=true|false&restaurantId=...|null
// POST: yeni global template oluştur (restaurantId null). Owner kendi
// template'i için /api/restaurants/[id]/audits/templates (Faz 2) endpoint'i
// kullanır.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
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

const TemplateBody = z
  .object({
    categoryId: z.string().min(1).optional().nullable(),
    title: z.string().min(1).max(200),
    description: z.string().max(4000).optional().nullable(),
    sector: z.enum(AUDIT_SECTORS),
    scoringMode: z.enum(AUDIT_SCORING_MODES).optional(),
    passingScore: z.number().int().min(0).max(100).optional().nullable(),
    locale: z.enum(AUDIT_LOCALES).optional(),
    questions: z.array(QuestionInput).max(100).optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const { searchParams } = new URL(req.url);
  const sector = searchParams.get('sector');
  const isPublished = searchParams.get('isPublished');
  const restaurantIdParam = searchParams.get('restaurantId');

  const where: Record<string, unknown> = {};
  if (sector && (AUDIT_SECTORS as readonly string[]).includes(sector)) {
    where.sector = sector;
  }
  if (isPublished === 'true') where.isPublished = true;
  if (isPublished === 'false') where.isPublished = false;
  if (restaurantIdParam === 'null') where.restaurantId = null;
  else if (restaurantIdParam) where.restaurantId = restaurantIdParam;

  const templates = await prisma.auditTemplate.findMany({
    where,
    orderBy: [{ sector: 'asc' }, { isPublished: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      restaurantId: true,
      categoryId: true,
      category: { select: { id: true, slug: true, labelTr: true, labelEn: true } },
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
      createdAt: true,
      updatedAt: true,
      _count: { select: { questions: true, responses: true, assignments: true } },
    },
    take: 500,
  });

  return NextResponse.json({ data: templates });
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof TemplateBody>>(TemplateBody, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (data.categoryId) {
    const cat = await prisma.auditCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!cat) return ApiErrors.badRequest('Geçersiz kategori', 'INVALID_CATEGORY');
  }

  const questions = data.questions ?? [];

  const created = await prisma.auditTemplate.create({
    data: {
      restaurantId: null, // superadmin global katalog
      categoryId: data.categoryId ?? null,
      title: data.title,
      description: data.description ?? null,
      sector: data.sector,
      scoringMode: data.scoringMode ?? 'percentage',
      passingScore: data.passingScore ?? null,
      locale: data.locale ?? 'tr',
      isPublished: false, // draft, ayrı PATCH ile publish
      isActive: true,
      createdBy: 'admin',
      createdById: String(gate.admin.id),
      questions: questions.length
        ? {
            create: questions.map((q, i) => ({
              type: q.type,
              prompt: q.prompt,
              helpText: q.helpText ?? null,
              options: (q.options ?? undefined) as unknown as object,
              correctAnswer: (q.correctAnswer === undefined
                ? undefined
                : q.correctAnswer) as unknown as object,
              weight: q.weight ?? 1,
              isRequired: q.isRequired ?? true,
              sortOrder: q.sortOrder ?? (i + 1) * 10,
            })),
          }
        : undefined,
    },
    select: {
      id: true,
      title: true,
      sector: true,
      scoringMode: true,
      isPublished: true,
    },
  });

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: String(gate.admin.id),
        actorSource: 'admin',
        action: 'admin.audits.templates.create',
        targetId: created.id,
        payload: { title: created.title, sector: created.sector },
      },
    });
  } catch (err) {
    console.warn('[audit] audits.templates.create log failed', (err as Error).message);
  }

  return NextResponse.json({ data: created }, { status: 201 });
}
