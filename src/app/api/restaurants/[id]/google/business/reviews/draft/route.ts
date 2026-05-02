import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { coerceTone, generateReplyDraft } from '@/lib/ai-draft';
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
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

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
    },
  });
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı.');
  if (!restaurant.googleReviewManagementEnabled) {
    return ApiErrors.forbidden(
      'Google yorum yönetimi bu işletme için kapalı.',
      'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
    );
  }

  const locale = parsed.data.locale ?? 'tr';
  const tone = coerceTone(parsed.data.tone, coerceTone(restaurant.aiDraftTone, 'warm'));
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
