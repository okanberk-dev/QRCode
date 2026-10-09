import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteFeedback } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

async function requireFeedbackAccess(req: NextRequest, id: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: { id: true, restaurantId: true },
  });
  if (!feedback) return { error: 'not_found' as const, status: 404 };

  if (actor.role !== 'superadmin') {
    if (!feedback.restaurantId) return { error: 'forbidden' as const, status: 403 };
    const ok = await canAccessRestaurant(actor, feedback.restaurantId);
    if (!ok) return { error: 'forbidden' as const, status: 403 };
  }

  return { actor, feedback };
}

/**
 * `assigneeId` must belong to the workspace that owns the feedback's
 * restaurant — previously any string was stored verbatim, so a writer could
 * "assign" feedback to an arbitrary user id from another tenant (and the
 * `isAssigned=me` filter would surface it in that user's inbox).
 *
 * Allowed (id space = panel actor ids): the actor itself, the restaurant
 * owner's User id, or a User whose email matches an ACTIVE TeamMember of
 * that owner with access to this restaurant (empty `locations` = all).
 */
async function isValidAssignee(
  actorId: string,
  restaurantId: string | null,
  assigneeId: string,
): Promise<boolean> {
  if (assigneeId === actorId) return true;
  if (!restaurantId) return false;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { userId: true },
  });
  const ownerId = restaurant?.userId;
  if (!ownerId) return false;
  if (assigneeId === ownerId) return true;

  const user = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { email: true },
  });
  const email = user?.email?.toLowerCase().trim();
  if (!email) return false;

  const member = await prisma.teamMember.findFirst({
    where: { ownerId, email, status: 'active' },
    select: { locations: true },
  });
  if (!member) return false;
  const locations = Array.isArray(member.locations)
    ? member.locations.filter((l): l is string => typeof l === 'string')
    : [];
  return locations.length === 0 || locations.includes(restaurantId);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // TeamMember 'viewer' rolü atama yapamaz (write op).
  if (access.feedback.restaurantId) {
    const canWrite = await canWriteFeedback(access.actor, access.feedback.restaurantId);
    if (!canWrite) {
      return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
    }
  }

  let body: { assigneeId?: string } = {};
  try {
    const parsed: unknown = await req.json();
    // JSON `null` used to crash on `body.assigneeId` → 500.
    if (parsed && typeof parsed === 'object') body = parsed as { assigneeId?: string };
  } catch {
    /* fallback to self */
  }

  const raw = typeof body.assigneeId === 'string' ? body.assigneeId.trim() : '';
  const assigneeId = !raw || raw === 'self' ? access.actor.id : raw.slice(0, 128);

  if (!(await isValidAssignee(access.actor.id, access.feedback.restaurantId, assigneeId))) {
    return NextResponse.json({ error: 'invalid_assignee' }, { status: 400 });
  }

  const assignment = await prisma.feedbackAssignment.upsert({
    where: { feedbackId: id },
    create: {
      feedbackId: id,
      assigneeId,
      assignedById: access.actor.id,
    },
    update: {
      assigneeId,
      assignedById: access.actor.id,
    },
  });

  return NextResponse.json({
    ok: true,
    assignment: {
      id: assignment.id,
      assigneeId: assignment.assigneeId,
      assignedById: assignment.assignedById,
      createdAt: assignment.createdAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // Unassign de write op — viewer yapamaz.
  if (access.feedback.restaurantId) {
    const canWrite = await canWriteFeedback(access.actor, access.feedback.restaurantId);
    if (!canWrite) {
      return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
    }
  }

  await prisma.feedbackAssignment.deleteMany({ where: { feedbackId: id } });
  return NextResponse.json({ ok: true });
}
