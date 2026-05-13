// CLAUDE.md §42 — Audit category CRUD (superadmin only).
//
// Kategori taksonomi: AuditTemplate.categoryId üzerinden join, owner UI
// filter + sektör eşleştirmesi için. List GET herkese açık değil — sadece
// superadmin admin paneli.

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

const CategoryBody = z
  .object({
    slug: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug yalnızca küçük harf, rakam ve - içerir'),
    labelTr: z.string().min(1).max(120),
    labelEn: z.string().min(1).max(120),
    sector: z.enum(AUDIT_SECTORS),
    iconKey: z.string().max(64).optional().nullable(),
    order: z.number().int().min(0).max(99999).optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const categories = await prisma.auditCategory.findMany({
    orderBy: [{ sector: 'asc' }, { order: 'asc' }, { labelTr: 'asc' }],
    select: {
      id: true,
      slug: true,
      labelTr: true,
      labelEn: true,
      sector: true,
      iconKey: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { templates: true } },
    },
  });

  return NextResponse.json({ data: categories });
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof CategoryBody>>(CategoryBody, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // Slug uniqueness — Prisma will throw P2002 but bizden anlamlı message.
  const existing = await prisma.auditCategory.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (existing) return ApiErrors.conflict('Slug zaten kullanılıyor', 'SLUG_TAKEN');

  const created = await prisma.auditCategory.create({
    data: {
      slug: data.slug,
      labelTr: data.labelTr,
      labelEn: data.labelEn,
      sector: data.sector,
      iconKey: data.iconKey ?? null,
      order: data.order ?? 0,
    },
    select: {
      id: true,
      slug: true,
      labelTr: true,
      labelEn: true,
      sector: true,
      iconKey: true,
      order: true,
    },
  });

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: String(gate.admin.id),
        actorSource: 'admin',
        action: 'admin.audits.categories.create',
        targetId: created.id,
        payload: { slug: created.slug, sector: created.sector },
      },
    });
  } catch (err) {
    console.warn('[audit] audits.categories.create log failed', (err as Error).message);
  }

  return NextResponse.json({ data: created }, { status: 201 });
}
