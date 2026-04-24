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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: { body?: string; channel?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) return NextResponse.json({ error: 'empty_body' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'body_too_long' }, { status: 413 });

  const channel =
    body.channel === 'google' || body.channel === 'email' || body.channel === 'internal'
      ? body.channel
      : 'internal';

  const reply = await prisma.feedbackReply.create({
    data: {
      feedbackId: id,
      authorUserId: access.actor.id,
      body: text.slice(0, 2000),
      channel,
      status: 'sent',
    },
  });

  return NextResponse.json({
    ok: true,
    reply: {
      id: reply.id,
      body: reply.body,
      channel: reply.channel,
      status: reply.status,
      createdAt: reply.createdAt.toISOString(),
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const replies = await prisma.feedbackReply.findMany({
    where: { feedbackId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    feedbackId: id,
    replies: replies.map((r) => ({
      id: r.id,
      body: r.body,
      channel: r.channel,
      status: r.status,
      authorUserId: r.authorUserId,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
