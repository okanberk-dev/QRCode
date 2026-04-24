import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

async function requireFeedbackAccess(req: NextRequest, feedbackId: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };

  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true, restaurantId: true },
  });
  if (!feedback) return { error: 'not_found' as const, status: 404 };

  if (!feedback.restaurantId) {
    if (actor.role !== 'superadmin') return { error: 'forbidden' as const, status: 403 };
    return { actor, feedback };
  }

  if (!(await canAccessRestaurant(actor, feedback.restaurantId))) {
    return { error: 'forbidden' as const, status: 403 };
  }

  return { actor, feedback };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: { label?: unknown; score?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : '';
  if (!label) return NextResponse.json({ error: 'missing_label' }, { status: 400 });

  let score: number | null = null;
  if (body.score !== undefined && body.score !== null && body.score !== '') {
    const raw = typeof body.score === 'number' ? body.score : Number(body.score);
    if (!Number.isFinite(raw) || raw < -5 || raw > 5) {
      return NextResponse.json({ error: 'invalid_score' }, { status: 400 });
    }
    score = Math.trunc(raw);
  }

  const tag = await prisma.feedbackTag.upsert({
    where: { feedbackId_label: { feedbackId: id, label } },
    create: { feedbackId: id, label, score },
    update: { score },
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: tag.id,
      feedbackId: tag.feedbackId,
      label: tag.label,
      score: tag.score,
      createdAt: tag.createdAt.toISOString(),
    },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const label = req.nextUrl.searchParams.get('label')?.trim();
  if (!label) return NextResponse.json({ error: 'missing_label' }, { status: 400 });

  await prisma.feedbackTag.deleteMany({ where: { feedbackId: id, label } });
  return NextResponse.json({ ok: true });
}
