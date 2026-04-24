import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

const VALID_TRIGGERS = new Set(['rating_lte', 'rating_gte', 'keyword', 'platform']);
const VALID_ACTIONS = new Set(['assign', 'email', 'webhook']);

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function serializeRule(rule: {
  id: string;
  restaurantId: string | null;
  trigger: string;
  threshold: string | null;
  action: string;
  target: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rule.id,
    restaurantId: rule.restaurantId,
    trigger: rule.trigger,
    threshold: rule.threshold,
    action: rule.action,
    target: rule.target,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const restaurantId = req.nextUrl.searchParams.get('restaurantId');
  if (restaurantId && !(await canAccessRestaurant(actor, restaurantId))) {
    return NextResponse.json({ error: 'forbidden_restaurant' }, { status: 403 });
  }

  const rules = await prisma.automationRule.findMany({
    where: {
      userId: ownerRef(actor),
      ...(restaurantId ? { restaurantId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ data: rules.map(serializeRule) });
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const trigger = typeof body.trigger === 'string' ? body.trigger : '';
  if (!VALID_TRIGGERS.has(trigger)) return NextResponse.json({ error: 'invalid_trigger' }, { status: 400 });

  const action = typeof body.action === 'string' ? body.action : '';
  if (!VALID_ACTIONS.has(action)) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });

  const threshold = typeof body.threshold === 'string' ? body.threshold.trim().slice(0, 120) || null : null;
  const target = typeof body.target === 'string' ? body.target.trim().slice(0, 500) || null : null;
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

  if ((action === 'email' || action === 'webhook' || action === 'assign') && !target) {
    return NextResponse.json({ error: 'missing_target' }, { status: 400 });
  }
  if (action === 'webhook' && target && !/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: 'invalid_webhook_url' }, { status: 400 });
  }

  let restaurantId: string | null = null;
  if (typeof body.restaurantId === 'string' && body.restaurantId) {
    if (!(await canAccessRestaurant(actor, body.restaurantId))) {
      return NextResponse.json({ error: 'forbidden_restaurant' }, { status: 403 });
    }
    restaurantId = body.restaurantId;
  }

  const rule = await prisma.automationRule.create({
    data: {
      userId: ownerRef(actor),
      restaurantId,
      trigger,
      threshold,
      action,
      target,
      isActive,
    },
  });

  return NextResponse.json({ ok: true, data: serializeRule(rule) }, { status: 201 });
}
