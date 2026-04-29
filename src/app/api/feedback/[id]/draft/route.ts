// Pulse AI auto-draft access. The owner reply form pre-fills from this
// endpoint when a pending draft exists; otherwise the form falls back to
// on-demand suggest-reply.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // Defensive: if the FeedbackAiDraft table hasn't been pushed to this DB
  // yet (preview without `prisma db push`), don't 500 — return null so the
  // reply form gracefully falls back to on-demand suggest-reply.
  try {
    const draft = await prisma.feedbackAiDraft.findUnique({
      where: { feedbackId: id },
      select: { body: true, tone: true, source: true, generatedAt: true },
    });
    if (!draft) return NextResponse.json({ draft: null });
    return NextResponse.json({ draft });
  } catch (err) {
    console.error('[feedback-draft GET] table missing or query failed:', err);
    return NextResponse.json({ draft: null, degraded: true });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  try {
    await prisma.feedbackAiDraft.deleteMany({ where: { feedbackId: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[feedback-draft DELETE] failed:', err);
    return NextResponse.json({ ok: true, degraded: true });
  }
}
