import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { AI_QUOTAS, checkLayeredAiQuota } from '@/lib/ai-quota';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { gateGoogleReviewRoute } from '@/lib/google-review-route';
import { readGoogleReplySettings } from '@/lib/google-reply-settings';
import { draftCommentHash, generateGoogleReviewDraft } from '@/lib/google-review-draft';
import { detectReviewLanguage, splitGoogleTranslation } from '@/lib/google-review-text';

export const dynamic = 'force-dynamic';

// `reviewId` (a stored review) is the normal call. The old free-form body is
// kept for any client still sending it.
const Body = z.union([
  z.object({ reviewId: z.string().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/), locale: z.enum(['tr', 'en']).optional() }).strict(),
  z
    .object({
      customerName: z.string().max(120).nullable().optional(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(4000).nullable().optional(),
      locale: z.enum(['tr', 'en']).optional(),
      tone: z.enum(['warm', 'formal', 'apologetic']).optional(),
    })
    .strict(),
]);

/**
 * One reply draft for a Google review (CLAUDE.md §54): the review's language,
 * the business's reply settings, never sent automatically. Over the AI quota
 * the draft comes from a template (the page keeps working).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Write-level gate: drafting spends the workspace's AI quota.
  const gate = await gateGoogleReviewRoute(req, id, { write: true });
  if (!gate.ok) return gate.response;
  const isTr = gate.locale === 'tr';

  const parsed = validateBody(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-review-draft:${gate.actor.id}:${id}`, 30, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      isTr ? 'Çok fazla taslak denemesi. Biraz bekleyip tekrar deneyin.' : 'Too many draft attempts. Wait a moment and try again.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { name: true, category: true, pulseAiEnabled: true, googleAiEnabled: true, googleReplySettings: true },
  });
  if (!restaurant) return ApiErrors.notFound(isTr ? 'İşletme bulunamadı.' : 'Business not found.');
  if (!restaurant.pulseAiEnabled || !restaurant.googleAiEnabled) {
    return ApiErrors.forbidden(isTr ? 'Pulse AI bu işletme için kapalı.' : 'Pulse AI is off for this business.', 'PULSE_AI_DISABLED');
  }

  const data = parsed.data;
  let review;
  let reviewName: string | null = null;
  let rawComment: string | null = null;
  if ('reviewId' in data) {
    const row = await prisma.googleReview.findUnique({
      where: { restaurantId_reviewId: { restaurantId: id, reviewId: data.reviewId } },
      select: { reviewId: true, reviewName: true, reviewerName: true, rating: true, originalText: true, language: true, comment: true },
    });
    if (!row) return ApiErrors.notFound(isTr ? 'Yorum bulunamadı.' : 'Review not found.', 'REVIEW_NOT_FOUND');
    reviewName = row.reviewName;
    rawComment = row.comment;
    review = row;
  } else {
    const original = splitGoogleTranslation(data.comment ?? null).original;
    review = {
      reviewId: `adhoc-${Date.now()}`,
      reviewerName: data.customerName ?? null,
      rating: data.rating,
      originalText: original,
      language: detectReviewLanguage(original),
    };
  }

  const ownerKey = (await resolveOwnerUserId(gate.actor)) ?? gate.actor.id;
  const quota = await checkLayeredAiQuota([
    { scope: 'suggest-reply:user', identifier: gate.actor.id, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_USER_DAY },
    { scope: 'suggest-reply:ws', identifier: ownerKey, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_WORKSPACE_DAY },
    { scope: 'suggest-reply:global', identifier: 'global', dailyLimit: AI_QUOTAS.SUGGEST_REPLY_GLOBAL_DAY },
  ]);

  const draft = await generateGoogleReviewDraft(
    review,
    {
      name: restaurant.name,
      category: restaurant.category,
      locale: data.locale ?? gate.locale,
      settings: readGoogleReplySettings(restaurant.googleReplySettings),
    },
    { useAi: quota.allowed },
  );

  if (reviewName) {
    const source = draft.source === 'ai' ? 'ai_copilot' : 'template_fallback';
    const commentHash = draftCommentHash(rawComment);
    await prisma.googleReviewAiDraft
      .upsert({
        where: { restaurantId_reviewName: { restaurantId: id, reviewName } },
        create: { restaurantId: id, reviewName, rating: review.rating ?? 5, commentHash, body: draft.body, tone: 'warm', source },
        update: { body: draft.body, source, rating: review.rating ?? 5, commentHash, generatedAt: new Date() },
      })
      .catch(() => undefined);
  }

  return NextResponse.json({
    suggestion: draft.body,
    source: draft.source === 'ai' ? 'openai' : 'template',
    language: draft.language,
    bannedFound: draft.bannedFound,
    ...(quota.allowed ? {} : { quotaExceeded: quota.scope }),
  });
}
