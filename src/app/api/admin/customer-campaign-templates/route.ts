// Stage 119 §38.199 — Admin CRUD for global customer-campaign templates.
// Superadmin manages the global catalog (restaurantId=null). Owner-saved
// templates (restaurantId set) are out of scope here — they belong to the
// owner workspace and are mutable only via /api/customer-campaigns/templates.
//
// Patterns:
// - Auth: getAdminFromRequest → superadmin role gate (§37.2.A).
// - Validation: Zod .strict() (§28.3.1 + §40.5).
// - Audit log: AdminAuditLog row on every mutation (§37.2.C).
// - Rate limit: 20/min/admin on POST/PATCH/DELETE (§37.2.C + §40.4.C).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { writeAdminAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_SECTORS = [
  'food',
  'delivery',
  'hospitality',
  'clinic',
  'legal',
  'spa',
  'retail',
  'fitness',
  'education',
  'other',
] as const;
const VALID_CATEGORIES = [
  'reactivation',
  'special-offer',
  'feedback-request',
  'custom',
] as const;
const VALID_LOCALES = ['tr', 'en'] as const;

const ListQuerySchema = z.object({
  sector: z.enum(VALID_SECTORS).optional(),
  locale: z.enum(VALID_LOCALES).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  status: z.enum(['published', 'draft', 'all']).default('all').optional(),
});

const CreateBodySchema = z
  .object({
    key: z.string().min(1).max(120).optional(),
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    sector: z.enum(VALID_SECTORS),
    locale: z.enum(VALID_LOCALES),
    category: z.enum(VALID_CATEGORIES),
    subject: z.string().min(1).max(150),
    body: z.string().min(1).max(10000),
    isPublished: z.boolean().default(false).optional(),
  })
  .strict();

type CreateBody = z.infer<typeof CreateBodySchema>;

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const url = new URL(req.url);
  const queryRaw = {
    sector: url.searchParams.get('sector') ?? undefined,
    locale: url.searchParams.get('locale') ?? undefined,
    category: url.searchParams.get('category') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
  };
  const parsed = ListQuerySchema.safeParse(queryRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { sector, locale, category, status = 'all' } = parsed.data;

  const where = {
    restaurantId: null,
    ...(sector ? { sector } : {}),
    ...(locale ? { locale } : {}),
    ...(category ? { category } : {}),
    ...(status === 'published'
      ? { isPublished: true }
      : status === 'draft'
        ? { isPublished: false }
        : {}),
  };

  const [rows, total, forkCounts] = await prisma.$transaction([
    prisma.customerCampaignTemplate.findMany({
      where,
      orderBy: [{ sector: 'asc' }, { category: 'asc' }, { locale: 'asc' }, { title: 'asc' }],
      take: 500,
    }),
    prisma.customerCampaignTemplate.count({ where }),
    prisma.customerCampaignTemplate.groupBy({
      by: ['forkedFromId'],
      where: { forkedFromId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const forkCountMap = new Map(
    forkCounts.map((g) => [g.forkedFromId as string, g._count._all]),
  );

  const templates = rows.map((row) => ({
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description,
    sector: row.sector,
    locale: row.locale,
    category: row.category,
    subject: row.subject,
    body: row.body,
    isPublished: row.isPublished,
    forkCount: forkCountMap.get(row.id) ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  // Stats for admin dashboard tile.
  const stats = {
    total,
    published: rows.filter((r) => r.isPublished).length,
    draft: rows.filter((r) => !r.isPublished).length,
    bySector: VALID_SECTORS.map((sec) => ({
      sector: sec,
      count: rows.filter((r) => r.sector === sec).length,
    })),
  };

  return NextResponse.json(
    { templates, stats },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();
  const adminId = String(admin.id);

  const rl = await rateLimit(`admin:campaign-templates:${adminId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<CreateBody>(CreateBodySchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // Optional unique key guard (UI shows toast on conflict).
  if (data.key) {
    const existing = await prisma.customerCampaignTemplate.findUnique({
      where: { key: data.key },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'key_already_exists' }, { status: 409 });
    }
  }

  const template = await prisma.customerCampaignTemplate.create({
    data: {
      key: data.key ?? null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      sector: data.sector,
      locale: data.locale,
      category: data.category,
      subject: data.subject.trim(),
      body: data.body,
      isPublished: data.isPublished ?? false,
      restaurantId: null,
      createdById: adminId,
      updatedById: adminId,
    },
  });

  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.campaign_templates.create',
    targetId: template.id,
    payload: {
      key: data.key ?? null,
      sector: data.sector,
      locale: data.locale,
      category: data.category,
      isPublished: data.isPublished ?? false,
    },
  }).catch(() => undefined);

  return NextResponse.json(
    {
      template: {
        id: template.id,
        key: template.key,
        title: template.title,
        description: template.description,
        sector: template.sector,
        locale: template.locale,
        category: template.category,
        subject: template.subject,
        body: template.body,
        isPublished: template.isPublished,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
