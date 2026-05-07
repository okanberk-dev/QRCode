// Pulse AI auto-draft access. The owner reply form pre-fills from this
// endpoint when auto-draft is enabled and a pending draft exists. Manual
// on-demand suggest-reply stays available even when auto-draft is off.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteFeedback } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

// Stage 28 §38.104 Fix O1 — composer mount repeat-fetch path.
// AI draft mutation rare (suggest-reply trigger sonrası 1 PUT veya manuel
// dismiss DELETE). Composer açılınca + tab switch + cross-tab focus repeat
// fetch'leri 15s fresh + 60s SWR window'unda CDN edge'den döner. `private`
// directive owner-isolated (CLAUDE.md §38.100 Stage 24 paterni reuse).
// Mutation endpoint'leri (suggest-reply POST + bu DELETE) intact origin
// always fresh.
const DRAFT_CACHE_HEADERS = {
  'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=60',
};

async function requireFeedbackAccess(req: NextRequest, id: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      restaurant: { select: { pulseAiEnabled: true, enableAiDraft: true } },
    },
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

  if (access.feedback.restaurant?.pulseAiEnabled !== true) {
    return NextResponse.json(
      { draft: null, pulseAiDisabled: true },
      { headers: DRAFT_CACHE_HEADERS },
    );
  }

  if (access.feedback.restaurant?.enableAiDraft !== true) {
    return NextResponse.json(
      { draft: null, autoDraftDisabled: true },
      { headers: DRAFT_CACHE_HEADERS },
    );
  }

  // Defensive: if the FeedbackAiDraft table hasn't been pushed to this DB
  // yet (preview before schema migration), don't 500 — return null so the
  // reply form gracefully falls back to on-demand suggest-reply.
  try {
    const draft = await prisma.feedbackAiDraft.findUnique({
      where: { feedbackId: id },
      select: { body: true, tone: true, source: true, generatedAt: true },
    });
    if (!draft) {
      return NextResponse.json({ draft: null }, { headers: DRAFT_CACHE_HEADERS });
    }
    return NextResponse.json({ draft }, { headers: DRAFT_CACHE_HEADERS });
  } catch (err) {
    console.error('[feedback-draft GET] table missing or query failed:', err);
    return NextResponse.json(
      { draft: null, degraded: true },
      { headers: DRAFT_CACHE_HEADERS },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // TeamMember 'viewer' rolü AI draft silemez (write op).
  if (access.feedback.restaurantId) {
    const canWrite = await canWriteFeedback(access.actor, access.feedback.restaurantId);
    if (!canWrite) {
      return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
    }
  }

  try {
    await prisma.feedbackAiDraft.deleteMany({ where: { feedbackId: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[feedback-draft DELETE] failed:', err);
    return NextResponse.json({ ok: true, degraded: true });
  }
}
