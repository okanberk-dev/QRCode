import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, resolveOwnerUserId } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

const VALID_PLACEMENT = new Set(['table', 'receipt', 'door', 'pack']);
const VALID_TEMPLATE = new Set(['lime', 'white', 'dark', 'minimal']);
const VALID_STATUS = new Set(['draft', 'live', 'archived']);

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ownerId = await resolveOwnerUserId(actor);
  if (!ownerId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const restaurantIdFilter = req.nextUrl.searchParams.get('restaurantId');

  // Explicit IDOR check on the filter param. Without this, the implicit
  // "userId scoping" already blocks data leakage but lets the caller probe
  // for restaurant existence by inspecting empty vs. populated responses.
  if (restaurantIdFilter && !(await canAccessRestaurant(actor, restaurantIdFilter))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const items = await prisma.campaign.findMany({
    where: {
      userId: ownerId,
      ...(restaurantIdFilter ? { restaurantId: restaurantIdFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  const restaurantIds = Array.from(new Set(items.map((i) => i.restaurantId).filter(Boolean))) as string[];
  const restaurants =
    restaurantIds.length > 0
      ? await prisma.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true },
        })
      : [];
  const nameById = new Map(restaurants.map((r) => [r.id, r.name]));

  return NextResponse.json({
    data: items.map((c) => ({
      id: c.id,
      name: c.name,
      placement: c.placement,
      count: c.count,
      template: c.template,
      color: c.color,
      status: c.status,
      restaurantId: c.restaurantId,
      restaurantName: c.restaurantId ? nameById.get(c.restaurantId) ?? null : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ownerId = await resolveOwnerUserId(actor);
  if (!ownerId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: {
    name?: string;
    placement?: string;
    count?: number;
    template?: string;
    color?: string;
    status?: string;
    restaurantId?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  if (!name) return NextResponse.json({ error: 'missing_name' }, { status: 400 });

  const placement = body.placement && VALID_PLACEMENT.has(body.placement) ? body.placement : 'table';
  const template = body.template && VALID_TEMPLATE.has(body.template) ? body.template : 'lime';
  const status = body.status && VALID_STATUS.has(body.status) ? body.status : 'draft';
  const color =
    typeof body.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(body.color) ? body.color : '#C6F24E';
  const count =
    typeof body.count === 'number' && Number.isFinite(body.count) && body.count > 0
      ? Math.floor(Math.min(body.count, 10000))
      : 1;

  let restaurantId: string | null = null;
  if (typeof body.restaurantId === 'string' && body.restaurantId) {
    const ok = await canAccessRestaurant(actor, body.restaurantId);
    if (!ok) return NextResponse.json({ error: 'forbidden_restaurant' }, { status: 403 });
    restaurantId = body.restaurantId;
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId: ownerId,
      restaurantId,
      name,
      placement,
      template,
      color,
      status,
      count,
    },
  });

  return NextResponse.json({
    ok: true,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      placement: campaign.placement,
      count: campaign.count,
      template: campaign.template,
      color: campaign.color,
      status: campaign.status,
      restaurantId: campaign.restaurantId,
      restaurantName: null,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    },
  });
}
