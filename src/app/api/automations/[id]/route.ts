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

async function requireOwnedRule(req: NextRequest, id: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };

  const rule = await prisma.automationRule.findUnique({ where: { id } });
  if (!rule) return { error: 'not_found' as const, status: 404 };
  if (rule.userId !== ownerRef(actor)) return { error: 'forbidden' as const, status: 403 };

  return { actor, rule };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedRule(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const updates: {
    restaurantId?: string | null;
    trigger?: string;
    threshold?: string | null;
    action?: string;
    target?: string | null;
    isActive?: boolean;
  } = {};

  if (typeof body.trigger === 'string') {
    if (!VALID_TRIGGERS.has(body.trigger)) return NextResponse.json({ error: 'invalid_trigger' }, { status: 400 });
    updates.trigger = body.trigger;
  }
  if (typeof body.action === 'string') {
    if (!VALID_ACTIONS.has(body.action)) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    updates.action = body.action;
  }
  if ('threshold' in body) {
    updates.threshold = typeof body.threshold === 'string' ? body.threshold.trim().slice(0, 120) || null : null;
  }
  if ('target' in body) {
    updates.target = typeof body.target === 'string' ? body.target.trim().slice(0, 500) || null : null;
  }
  if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;
  if (body.restaurantId === null || body.restaurantId === '') {
    updates.restaurantId = null;
  } else if (typeof body.restaurantId === 'string') {
    if (!(await canAccessRestaurant(access.actor, body.restaurantId))) {
      return NextResponse.json({ error: 'forbidden_restaurant' }, { status: 403 });
    }
    updates.restaurantId = body.restaurantId;
  }

  const nextAction = updates.action ?? access.rule.action;
  const nextTarget = 'target' in updates ? updates.target : access.rule.target;
  if ((nextAction === 'email' || nextAction === 'webhook' || nextAction === 'assign') && !nextTarget) {
    return NextResponse.json({ error: 'missing_target' }, { status: 400 });
  }
  if (nextAction === 'webhook' && nextTarget && !/^https?:\/\//i.test(nextTarget)) {
    return NextResponse.json({ error: 'invalid_webhook_url' }, { status: 400 });
  }

  const rule = await prisma.automationRule.update({ where: { id }, data: updates });
  return NextResponse.json({
    ok: true,
    data: {
      id: rule.id,
      restaurantId: rule.restaurantId,
      trigger: rule.trigger,
      threshold: rule.threshold,
      action: rule.action,
      target: rule.target,
      isActive: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedRule(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.automationRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
