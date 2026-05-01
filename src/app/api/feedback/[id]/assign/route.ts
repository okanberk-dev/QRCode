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
    body = await req.json();
  } catch {
    /* fallback to self */
  }

  const raw = typeof body.assigneeId === 'string' ? body.assigneeId.trim() : '';
  const assigneeId = !raw || raw === 'self' ? access.actor.id : raw.slice(0, 128);

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
