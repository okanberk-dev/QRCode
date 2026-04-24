import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId, canAccessRestaurant } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

const VALID_PLACEMENT = new Set(['table', 'receipt', 'door', 'pack']);
const VALID_TEMPLATE = new Set(['lime', 'white', 'dark', 'minimal']);
const VALID_STATUS = new Set(['draft', 'live', 'archived']);

async function requireOwnedCampaign(req: NextRequest, id: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };

  const ownerId = await resolveOwnerUserId(actor);
  if (!ownerId) return { error: 'forbidden' as const, status: 403 };

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return { error: 'not_found' as const, status: 404 };
  if (campaign.userId !== ownerId) return { error: 'forbidden' as const, status: 403 };

  return { actor, campaign };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedCampaign(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  return NextResponse.json({
    id: access.campaign.id,
    name: access.campaign.name,
    placement: access.campaign.placement,
    count: access.campaign.count,
    template: access.campaign.template,
    color: access.campaign.color,
    status: access.campaign.status,
    restaurantId: access.campaign.restaurantId,
    createdAt: access.campaign.createdAt.toISOString(),
    updatedAt: access.campaign.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedCampaign(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const updates: {
    name?: string;
    placement?: string;
    template?: string;
    color?: string;
    status?: string;
    count?: number;
    restaurantId?: string | null;
  } = {};

  if (typeof body.name === 'string') {
    const trimmed = body.name.trim().slice(0, 120);
    if (!trimmed) return NextResponse.json({ error: 'empty_name' }, { status: 400 });
    updates.name = trimmed;
  }
  if (typeof body.placement === 'string' && VALID_PLACEMENT.has(body.placement)) updates.placement = body.placement;
  if (typeof body.template === 'string' && VALID_TEMPLATE.has(body.template)) updates.template = body.template;
  if (typeof body.status === 'string' && VALID_STATUS.has(body.status)) updates.status = body.status;
  if (typeof body.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(body.color)) updates.color = body.color;
  if (typeof body.count === 'number' && Number.isFinite(body.count) && body.count > 0) {
    updates.count = Math.floor(Math.min(body.count, 10000));
  }
  if (body.restaurantId === null) {
    updates.restaurantId = null;
  } else if (typeof body.restaurantId === 'string' && body.restaurantId) {
    const ok = await canAccessRestaurant(access.actor, body.restaurantId);
    if (!ok) return NextResponse.json({ error: 'forbidden_restaurant' }, { status: 403 });
    updates.restaurantId = body.restaurantId;
  }

  const updated = await prisma.campaign.update({ where: { id }, data: updates });

  return NextResponse.json({
    ok: true,
    campaign: {
      id: updated.id,
      name: updated.name,
      placement: updated.placement,
      count: updated.count,
      template: updated.template,
      color: updated.color,
      status: updated.status,
      restaurantId: updated.restaurantId,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedCampaign(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
