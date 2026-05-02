// Pulse AI reply suggestion. Calls OpenAI when `OPENAI_API_KEY` is
// set; otherwise falls back to a deterministic template so the UI keeps
// working in dev/preview without the secret.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, resolveOwnerUserId } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { AI_QUOTAS, checkLayeredAiQuota } from '@/lib/ai-quota';
import { coerceTone, generateReplyDraft, type AiDraftTone } from '@/lib/ai-draft';
import { buildReplyTemplate } from '@/lib/scaffolding';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // İki katmanlı rate limit:
  //  1. Workspace owner: 30/dk — ekip tek kullanıcının üst sınırını şişiremesin
  //     (workspace adına paylaşımlı budget). Owner null ise actor.id fallback.
  //  2. Actor: 10/dk — viewer/staff tek başına workspace budget'ını sömürmesin
  //     (fairness). canWriteFeedback yan-etki'sini görmemesi için viewer da
  //     suggest-reply'ı çağırabilir (read-adjacent: taslak görsün ama
  //     gönderemez), ama 10/dk üst limiti rağmen.
  const ownerKey = (await resolveOwnerUserId(actor)) ?? actor.id;
  const wsLimit = await rateLimit(`ai-suggest:ws:${ownerKey}`, 30, 60_000);
  if (!wsLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: wsLimit.retryAfterSeconds },
      { status: 429 },
    );
  }
  const actorLimit = await rateLimit(`ai-suggest:actor:${actor.id}`, 10, 60_000);
  if (!actorLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: actorLimit.retryAfterSeconds },
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

  // 3-katmanlı AI quota guard (CLAUDE.md §15.1 ai-quota.ts). Rate limit
  // (per-minute) burst-protection; AI quota (per-day) credential leak ya
  // da kötü niyetli loop senaryosunda OpenAI cost'u sınırlar. Quota
  // dolarsa template fallback döner — UI çalışmaya devam eder.
  const quota = await checkLayeredAiQuota([
    { scope: 'suggest-reply:user', identifier: actor.id, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_USER_DAY },
    { scope: 'suggest-reply:ws', identifier: ownerKey, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_WORKSPACE_DAY },
    { scope: 'suggest-reply:global', identifier: 'global', dailyLimit: AI_QUOTAS.SUGGEST_REPLY_GLOBAL_DAY },
  ]);

  if (!quota.allowed) {
    // Fail-safe: template fallback. UI mevcut akışı tamamlar; kullanıcı
    // yine "Yeniden öner" deneyebilir (yarın quota reset olunca AI'ya
    // geri döner).
    const suggestion = buildReplyTemplate({
      name: feedback.name,
      rating: feedback.rating,
      locale,
    });
    return NextResponse.json({
      suggestion,
      tone,
      source: 'template-fallback',
      quotaExceeded: quota.scope,
    });
  }

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
