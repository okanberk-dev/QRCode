import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';

// Stage 12 §38.82 — automation rule PATCH/DELETE hardening.
// Zod `.strict()` (mass assignment guard) + audit log + rate limit.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_TRIGGERS = ['rating_lte', 'rating_gte', 'keyword', 'platform'] as const;
const VALID_ACTIONS = ['assign', 'email', 'webhook'] as const;

const PatchBody = z
  .object({
    trigger: z.enum(VALID_TRIGGERS).optional(),
    action: z.enum(VALID_ACTIONS).optional(),
    threshold: z.string().max(120).nullable().optional(),
    target: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
    restaurantId: z.string().min(1).nullable().optional(),
  })
  .strict();

function ownerRef(actor: PanelActor): string {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function actorAuditFields(actor: PanelActor): { actorId: string; actorSource: 'admin' | 'user' } {
  return { actorId: actor.id, actorSource: actor.source === 'user' ? 'user' : 'admin' };
}

async function requireOwnedRule(req: NextRequest, id: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };

  const rule = await prisma.automationRule.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      restaurantId: true,
      trigger: true,
      threshold: true,
      action: true,
      target: true,
      isActive: true,
      lastFiredAt: true,
      lastFireStatus: true,
      lastFireResponseMs: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!rule) return { error: 'not_found' as const, status: 404 };
  if (rule.userId !== ownerRef(actor)) return { error: 'forbidden' as const, status: 403 };

  return { actor, rule };
}

function serializeRule(rule: {
  id: string;
  restaurantId: string | null;
  trigger: string;
  threshold: string | null;
  action: string;
  target: string | null;
  isActive: boolean;
  lastFiredAt: Date | null;
  lastFireStatus: string | null;
  lastFireResponseMs: number | null;
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
    lastFiredAt: rule.lastFiredAt ? rule.lastFiredAt.toISOString() : null,
    lastFireStatus: rule.lastFireStatus,
    lastFireResponseMs: rule.lastFireResponseMs,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedRule(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  // Rate limit: 20/dk/actor (PATCH frequency higher than create)
  const rl = await rateLimit(`automations:patch:${access.actor.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof PatchBody>>(PatchBody, rawBody);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 400 });
  }

  const updates: {
    restaurantId?: string | null;
    trigger?: string;
    threshold?: string | null;
    action?: string;
    target?: string | null;
    isActive?: boolean;
  } = {};

  if (body.trigger !== undefined) updates.trigger = body.trigger;
  if (body.action !== undefined) updates.action = body.action;
  if (body.threshold !== undefined) updates.threshold = body.threshold ? body.threshold.trim() : null;
  if (body.target !== undefined) updates.target = body.target ? body.target.trim() : null;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.restaurantId !== undefined) {
    if (body.restaurantId === null) {
      updates.restaurantId = null;
    } else {
      if (!(await canAccessRestaurant(access.actor, body.restaurantId))) {
        return NextResponse.json({ error: 'forbidden_restaurant' }, { status: 403 });
      }
      updates.restaurantId = body.restaurantId;
    }
  }

  const nextAction = updates.action ?? access.rule.action;
  const nextTarget = 'target' in updates ? updates.target : access.rule.target;
  if ((nextAction === 'email' || nextAction === 'webhook' || nextAction === 'assign') && !nextTarget) {
    return NextResponse.json({ error: 'missing_target' }, { status: 400 });
  }
  if (nextAction === 'webhook' && nextTarget && !/^https?:\/\//i.test(nextTarget)) {
    return NextResponse.json({ error: 'invalid_webhook_url' }, { status: 400 });
  }

  const [rule] = await prisma.$transaction([
    prisma.automationRule.update({ where: { id }, data: updates }),
    prisma.adminAuditLog.create({
      data: {
        ...actorAuditFields(access.actor),
        action: 'automation.update',
        targetId: id,
        payload: {
          before: {
            trigger: access.rule.trigger,
            action: access.rule.action,
            threshold: access.rule.threshold,
            target: access.rule.action === 'webhook' ? '[redacted_url]' : access.rule.target,
            isActive: access.rule.isActive,
            restaurantId: access.rule.restaurantId,
          },
          after: {
            trigger: updates.trigger ?? access.rule.trigger,
            action: updates.action ?? access.rule.action,
            threshold: 'threshold' in updates ? updates.threshold : access.rule.threshold,
            target:
              nextAction === 'webhook'
                ? '[redacted_url]'
                : 'target' in updates
                  ? updates.target
                  : access.rule.target,
            isActive: 'isActive' in updates ? updates.isActive : access.rule.isActive,
            restaurantId:
              'restaurantId' in updates ? updates.restaurantId : access.rule.restaurantId,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, data: serializeRule(rule) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedRule(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  // Atomic delete + audit. Hard delete (CLAUDE.md §38.82 Karar 4 — schema'ya
  // deletedAt eklenmedi, audit log entry yeterli forensic trail).
  await prisma.$transaction([
    prisma.automationRule.delete({ where: { id } }),
    prisma.adminAuditLog.create({
      data: {
        ...actorAuditFields(access.actor),
        action: 'automation.delete',
        targetId: id,
        payload: {
          trigger: access.rule.trigger,
          action: access.rule.action,
          threshold: access.rule.threshold,
          target: access.rule.action === 'webhook' ? '[redacted_url]' : access.rule.target,
          restaurantId: access.rule.restaurantId,
          isActive: access.rule.isActive,
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
