// Pulse AI reply suggestion. Calls OpenAI when `OPENAI_API_KEY` is
// set; otherwise falls back to a deterministic template so the UI keeps
// working in dev/preview without the secret.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, resolveOwnerUserId } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { coerceTone, generateReplyDraft, type AiDraftTone } from '@/lib/ai-draft';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Rate-limit by workspace owner so a team can't bypass the cap by spreading
  // requests across team members. Falls back to actor.id only when we can't
  // resolve an owner (e.g. unattached superadmin).
  const ownerKey = (await resolveOwnerUserId(actor)) ?? actor.id;
  const limit = await rateLimit(`ai-suggest:${ownerKey}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const { id } = await params;
  let body: { locale?: 'tr' | 'en'; tone?: AiDraftTone } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const locale: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      rating: true,
      comment: true,
      name: true,
      platform: true,
      restaurantId: true,
      restaurant: { select: { name: true, category: true, aiDraftTone: true } },
    },
  });

  if (!feedback || !feedback.restaurantId || !feedback.restaurant) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!(await canAccessRestaurant(actor, feedback.restaurantId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Tone precedence: explicit body.tone → restaurant default → 'warm'.
  const tone = coerceTone(body.tone, coerceTone(feedback.restaurant.aiDraftTone, 'warm'));

  const draft = await generateReplyDraft(
    {
      restaurantName: feedback.restaurant.name,
      restaurantCategory: feedback.restaurant.category,
      customerName: feedback.name,
      rating: feedback.rating,
      platform: feedback.platform,
      comment: feedback.comment,
    },
    tone,
    locale,
  );

  // Wire-format `source` matches the existing UI badge expectation:
  //   ai_copilot       → 'openai'        (LIVE badge)
  //   template_fallback (no key)         → 'template'
  //   template_fallback (api fail)       → 'template-fallback'
  // Distinguishing the two fallback reasons keeps the badge accurate.
  const wireSource =
    draft.source === 'ai_copilot'
      ? 'openai'
      : draft.latencyMs === 0
        ? 'template'
        : 'template-fallback';

  return NextResponse.json({
    feedbackId: id,
    suggestion: draft.body,
    source: wireSource,
    tone,
  });
}
