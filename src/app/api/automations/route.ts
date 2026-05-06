import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';

// Stage 12 §38.82 — automation rules CRUD endpoint hardening.
// Mevcut manuel validation (CLAUDE.md §28.3.3 mix-mode) → Zod `.strict()` migration
// + audit log + rate limit. Mass assignment guard + actor traceability.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_TRIGGERS = ['rating_lte', 'rating_gte', 'keyword', 'platform'] as const;
const VALID_ACTIONS = ['assign', 'email', 'webhook'] as const;

const CreateBody = z
  .object({
    trigger: z.enum(VALID_TRIGGERS),
    action: z.enum(VALID_ACTIONS),
    threshold: z.string().max(120).optional(),
    target: z.string().max(500).optional(),
    isActive: z.boolean().default(true),
    restaurantId: z.string().min(1).optional(),
  })
  .strict();

function ownerRef(actor: PanelActor): string {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function actorAuditFields(actor: PanelActor): { actorId: string; actorSource: 'admin' | 'user' } {
  return { actorId: actor.id, actorSource: actor.source === 'user' ? 'user' : 'admin' };
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

  return NextResponse.json(
    { data: rules.map(serializeRule) },
    {
      // Owner-scoped read, cache (CLAUDE.md §19.3): 30s fresh + 2min SWR.
      // Owner panel polling muhtemel değil ama defansif.
      headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120' },
    },
  );
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Rate limit — 10/dk/actor (CLAUDE.md §14.2).
  const rl = await rateLimit(`automations:create:${actor.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof CreateBody>>(CreateBody, rawBody);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const threshold = body.threshold?.trim() || null;
  const target = body.target?.trim() || null;

  // Action-specific target validation
  if ((body.action === 'email' || body.action === 'webhook' || body.action === 'assign') && !target) {
    return NextResponse.json({ error: 'missing_target' }, { status: 400 });
  }
  if (body.action === 'webhook' && target && !/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: 'invalid_webhook_url' }, { status: 400 });
  }

  let restaurantId: string | null = null;
  if (body.restaurantId) {
    if (!(await canAccessRestaurant(actor, body.restaurantId))) {
      return NextResponse.json({ error: 'forbidden_restaurant' }, { status: 403 });
    }
    restaurantId = body.restaurantId;
  }

  // Atomic create + audit (CLAUDE.md §28.4 paterni — destructive/state-changing
  // owner action audit'siz olmaz).
  const [rule] = await prisma.$transaction([
    prisma.automationRule.create({
      data: {
        userId: ownerRef(actor),
        restaurantId,
        trigger: body.trigger,
        threshold,
        action: body.action,
        target,
        isActive: body.isActive,
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        ...actorAuditFields(actor),
        action: 'automation.create',
        payload: {
          trigger: body.trigger,
          action: body.action,
          threshold,
          target: body.action === 'webhook' ? '[redacted_url]' : target,
          restaurantId,
          isActive: body.isActive,
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, data: serializeRule(rule) }, { status: 201 });
}
