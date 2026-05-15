// Stage 119 §38.199 — Admin single-template GET/PATCH/DELETE.
// Superadmin-only. Operates ONLY on global templates (restaurantId=null).
// Owner-saved templates rejected with 403 to keep admin/owner boundaries
// clean (admin can't reach into an owner's private library).

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

const PatchSchema = z
  .object({
    key: z.string().min(1).max(120).nullable().optional(),
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    sector: z.enum(VALID_SECTORS).optional(),
    locale: z.enum(VALID_LOCALES).optional(),
    category: z.enum(VALID_CATEGORIES).optional(),
    subject: z.string().min(1).max(150).optional(),
    body: z.string().min(1).max(10000).optional(),
    isPublished: z.boolean().optional(),
  })
  .strict();

type PatchBody = z.infer<typeof PatchSchema>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  const template = await prisma.customerCampaignTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (template.restaurantId !== null) {
    return NextResponse.json({ error: 'owner_template_out_of_scope' }, { status: 403 });
  }

  return NextResponse.json({
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
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();
  const adminId = String(admin.id);

  const rl = await rateLimit(`admin:campaign-templates:${adminId}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { id } = await params;
  const existing = await prisma.customerCampaignTemplate.findUnique({
    where: { id },
    select: { id: true, restaurantId: true, key: true },
  });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.restaurantId !== null) {
    return NextResponse.json({ error: 'owner_template_out_of_scope' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<PatchBody>(PatchSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 });
  }

  // Key uniqueness re-check on rename (avoid P2002 crash).
  if (data.key !== undefined && data.key !== null && data.key !== existing.key) {
    const collision = await prisma.customerCampaignTemplate.findUnique({
      where: { key: data.key },
      select: { id: true },
    });
    if (collision && collision.id !== id) {
      return NextResponse.json({ error: 'key_already_exists' }, { status: 409 });
    }
  }

  const updated = await prisma.customerCampaignTemplate.update({
    where: { id },
    data: {
      ...(data.key !== undefined ? { key: data.key } : {}),
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description === null ? null : data.description.trim() || null }
        : {}),
      ...(data.sector !== undefined ? { sector: data.sector } : {}),
      ...(data.locale !== undefined ? { locale: data.locale } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.subject !== undefined ? { subject: data.subject.trim() } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      updatedById: adminId,
    },
  });

  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.campaign_templates.update',
    targetId: id,
    payload: { fields: Object.keys(data) },
  }).catch(() => undefined);

  return NextResponse.json({
    template: {
      id: updated.id,
      key: updated.key,
      title: updated.title,
      description: updated.description,
      sector: updated.sector,
      locale: updated.locale,
      category: updated.category,
      subject: updated.subject,
      body: updated.body,
      isPublished: updated.isPublished,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();
  const adminId = String(admin.id);

  const rl = await rateLimit(`admin:campaign-templates:${adminId}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { id } = await params;
  const existing = await prisma.customerCampaignTemplate.findUnique({
    where: { id },
    select: { id: true, restaurantId: true, key: true, title: true },
  });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.restaurantId !== null) {
    return NextResponse.json({ error: 'owner_template_out_of_scope' }, { status: 403 });
  }

  await prisma.customerCampaignTemplate.delete({ where: { id } });

  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.campaign_templates.delete',
    targetId: id,
    payload: { key: existing.key, title: existing.title },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
