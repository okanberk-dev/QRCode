// Pulse AI per-restaurant settings (CLAUDE.md §15). Owner opt-in toggle +
// default tone for auto-drafts.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { coerceTone, isValidTone } from '@/lib/ai-draft';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireRestaurantAccess(req, id);
  if (!access.ok) return access.res;

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, enableAiDraft: true, googleAiEnabled: true, aiDraftTone: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({
      enableAiDraft: restaurant.enableAiDraft,
      googleAiEnabled: restaurant.googleAiEnabled,
      aiDraftTone: coerceTone(restaurant.aiDraftTone, 'warm'),
    });
  } catch (err) {
    console.error('[ai-settings GET] failed:', err);
    // Schema drift fallback — pretend disabled so UI renders.
    return NextResponse.json({ enableAiDraft: false, googleAiEnabled: true, aiDraftTone: 'warm', degraded: true });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireRestaurantAccess(req, id);
  if (!access.ok) return access.res;

  let body: { enableAiDraft?: unknown; googleAiEnabled?: unknown; aiDraftTone?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: { enableAiDraft?: boolean; googleAiEnabled?: boolean; aiDraftTone?: string } = {};
  if (typeof body.enableAiDraft === 'boolean') {
    data.enableAiDraft = body.enableAiDraft;
  }
  if (typeof body.googleAiEnabled === 'boolean') {
    data.googleAiEnabled = body.googleAiEnabled;
  }
  if (body.aiDraftTone !== undefined) {
    if (!isValidTone(body.aiDraftTone)) {
      return NextResponse.json(
        { error: 'invalid_tone', allowed: ['warm', 'formal', 'apologetic'] },
        { status: 400 },
      );
    }
    data.aiDraftTone = body.aiDraftTone;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  try {
    const updated = await prisma.restaurant.update({
      where: { id },
      data,
      select: { enableAiDraft: true, googleAiEnabled: true, aiDraftTone: true },
    });
    let clearedPendingDrafts: number | null = null;
    if (data.enableAiDraft === false) {
      try {
        const result = await prisma.feedbackAiDraft.deleteMany({
          where: { feedback: { is: { restaurantId: id } } },
        });
        clearedPendingDrafts = result.count;
      } catch (draftErr) {
        // A fresh preview DB might not have feedback_ai_drafts yet. The setting
        // save must still succeed; the inbox will also hide drafts while off.
        console.warn('[ai-settings PATCH] pending draft cleanup skipped:', draftErr);
      }
    }
    return NextResponse.json({
      enableAiDraft: updated.enableAiDraft,
      googleAiEnabled: updated.googleAiEnabled,
      aiDraftTone: updated.aiDraftTone,
      clearedPendingDrafts,
    });
  } catch (err) {
    console.error('[ai-settings PATCH] failed:', err);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
