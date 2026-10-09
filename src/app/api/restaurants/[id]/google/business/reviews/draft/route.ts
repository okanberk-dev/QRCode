import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant, resolveOwnerUserId } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { AI_QUOTAS, checkLayeredAiQuota } from '@/lib/ai-quota';
import { coerceTone, generateReplyDraft } from '@/lib/ai-draft';
import { buildReplyTemplate } from '@/lib/scaffolding';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const Body = z.object({
  customerName: z.string().max(120).nullable().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(4000).nullable().optional(),
  locale: z.enum(['tr', 'en']).optional(),
  tone: z.enum(['warm', 'formal', 'apologetic']).optional(),
}).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  // Write-level gate (not just access): drafting spends the workspace's AI
  // quota and only writers can send the reply anyway — a viewer team member
  // must not burn AI quota.
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const body = await req.json().catch(() => null);
  const parsed = validateBody(Body, body);
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-review-draft:${actor.id}:${id}`, 20, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      'Çok fazla taslak denemesi. Biraz bekleyip tekrar deneyin.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      name: true,
      category: true,
      aiDraftTone: true,
      googleReviewManagementEnabled: true,
      pulseAiEnabled: true,
      googleAiEnabled: true,
    },
  });
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı.');
  if (!restaurant.googleReviewManagementEnabled) {
    return ApiErrors.forbidden(
      'Google yorum yönetimi bu işletme için kapalı.',
      'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
    );
  }
  if (!restaurant.pulseAiEnabled || !restaurant.googleAiEnabled) {
    return ApiErrors.forbidden(
      'Pulse AI bu işletme için kapalı.',
      'PULSE_AI_DISABLED',
    );
  }

  const locale = parsed.data.locale ?? 'tr';
  const tone = coerceTone(parsed.data.tone, coerceTone(restaurant.aiDraftTone, 'warm'));

  // 3-layer AI quota guard (audit §38.B H3). Per-minute rate limit above is
  // burst protection; this is the daily spend ceiling that every other AI
  // callsite enforces (CLAUDE.md §15.1) but this endpoint was missing. On
  // overflow → deterministic template fallback (UI keeps working, no 429).
  const ownerKey = (await resolveOwnerUserId(actor)) ?? actor.id;
  const quota = await checkLayeredAiQuota([
    { scope: 'suggest-reply:user', identifier: actor.id, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_USER_DAY },
    { scope: 'suggest-reply:ws', identifier: ownerKey, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_WORKSPACE_DAY },
    { scope: 'suggest-reply:global', identifier: 'global', dailyLimit: AI_QUOTAS.SUGGEST_REPLY_GLOBAL_DAY },
  ]);
  if (!quota.allowed) {
    return NextResponse.json({
      suggestion: buildReplyTemplate({
        name: parsed.data.customerName ?? null,
        rating: parsed.data.rating,
        locale,
      }),
      source: 'template',
      tone,
      quotaExceeded: quota.scope,
    });
  }

  const draft = await generateReplyDraft(
    {
      restaurantName: restaurant.name,
      restaurantCategory: restaurant.category,
      customerName: parsed.data.customerName ?? null,
      rating: parsed.data.rating,
      platform: 'Google',
      comment: parsed.data.comment ?? null,
    },
    tone,
    locale,
  );

  return NextResponse.json({
    suggestion: draft.body,
    source: draft.source === 'ai_copilot' ? 'openai' : 'template',
    tone,
  });
}
