// Stage 119 §38.199 — Owner CRUD on a single template (own templates only).
// GET allowed on both global + own (so owner can fetch detail before forking).
// PATCH + DELETE require the template to be an owner-saved row (restaurantId
// in scopedIds). Global templates are managed via /api/admin/customer-campaign-templates.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, getScopedRestaurantIds } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
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

const PatchSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    sector: z.enum(VALID_SECTORS).optional(),
    locale: z.enum(['tr', 'en']).optional(),
    category: z
      .enum(['reactivation', 'special-offer', 'feedback-request', 'custom'])
      .optional(),
    subject: z.string().min(1).max(150).optional(),
    body: z.string().min(1).max(10000).optional(),
  })
  .strict();

type PatchBody = z.infer<typeof PatchSchema>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const template = await prisma.customerCampaignTemplate.findUnique({
    where: { id },
  });
  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Global templates: readable by any authenticated panel actor (catalog).
  // Owner templates: only readable by the owning workspace.
  if (template.restaurantId !== null) {
    const access = await canAccessRestaurant(actor, template.restaurantId);
    if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  } else if (!template.isPublished) {
    // Unpublished global — admin draft, not visible to owners.
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const scopedIds = (await getScopedRestaurantIds(actor)) ?? [];
  const isOwn = template.restaurantId !== null && scopedIds.includes(template.restaurantId);

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
      restaurantId: template.restaurantId,
      forkedFromId: template.forkedFromId,
      isOwn,
      isGlobal: template.restaurantId === null,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const template = await prisma.customerCampaignTemplate.findUnique({
    where: { id },
    select: { id: true, restaurantId: true },
  });
  if (!template) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Global templates are admin-managed; owner PATCH only on own.
  if (template.restaurantId === null) {
    return NextResponse.json({ error: 'global_template_immutable_via_owner_api' }, { status: 403 });
  }

  const access = await canAccessRestaurant(actor, template.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<PatchBody>(PatchSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 });
  }

  const updated = await prisma.customerCampaignTemplate.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description === null ? null : data.description.trim() || null }
        : {}),
      ...(data.sector !== undefined ? { sector: data.sector } : {}),
      ...(data.locale !== undefined ? { locale: data.locale } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.subject !== undefined ? { subject: data.subject.trim() } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      updatedById: actor.id,
    },
  });

  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: actor.source,
    action: 'owner.campaign_templates.update',
    targetId: id,
    payload: { fields: Object.keys(data) },
  }).catch(() => undefined);

  return NextResponse.json({
    template: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      sector: updated.sector,
      locale: updated.locale,
      category: updated.category,
      subject: updated.subject,
      body: updated.body,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const template = await prisma.customerCampaignTemplate.findUnique({
    where: { id },
    select: { id: true, restaurantId: true },
  });
  if (!template) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (template.restaurantId === null) {
    return NextResponse.json({ error: 'global_template_immutable_via_owner_api' }, { status: 403 });
  }

  const access = await canAccessRestaurant(actor, template.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.customerCampaignTemplate.delete({ where: { id } });

  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: actor.source,
    action: 'owner.campaign_templates.delete',
    targetId: id,
    payload: { restaurantId: template.restaurantId },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
