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
import { draftCommentHash, draftOpening, generateGoogleReviewDraft } from '@/lib/google-review-draft';
import { isBulkEligible } from '@/lib/google-review-inbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_DRAFTS_PER_CALL = 10;

const Body = z
  .object({
    reviewIds: z.array(z.string().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/)).min(1).max(MAX_DRAFTS_PER_CALL),
    /** Openings already used by the earlier calls of the same batch. */
    avoidOpenings: z.array(z.string().max(80)).max(40).optional(),
  })
  .strict();

/**
 * Drafts for a bulk reply (CLAUDE.md §54). Only 4–5★ reviews without a reply;
 * each draft is personalized (name, what the customer wrote, varied length
 * and opening) and saved so it survives a reload. Nothing is sent here.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateGoogleReviewRoute(req, id, { write: true });
  if (!gate.ok) return gate.response;
  const isTr = gate.locale === 'tr';

  const parsed = validateBody(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-review-bulk-draft:${gate.actor.id}:${id}`, 12, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      isTr ? 'Çok fazla taslak isteği. Biraz bekleyip tekrar deneyin.' : 'Too many draft requests. Wait a moment and try again.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { name: true, category: true, pulseAiEnabled: true, googleAiEnabled: true, googleReplySettings: true },
  });
  if (!restaurant) return ApiErrors.notFound(isTr ? 'İşletme bulunamadı.' : 'Business not found.');
  const aiOn = restaurant.pulseAiEnabled && restaurant.googleAiEnabled;

  const rows = await prisma.googleReview.findMany({
    where: { restaurantId: id, reviewId: { in: parsed.data.reviewIds } },
    select: {
      reviewId: true,
      reviewName: true,
      reviewerName: true,
      rating: true,
      originalText: true,
      language: true,
      comment: true,
      hasReply: true,
    },
  });
  const byId = new Map(rows.map((r) => [r.reviewId, r]));
  const business = {
    name: restaurant.name,
    category: restaurant.category,
    locale: gate.locale,
    settings: readGoogleReplySettings(restaurant.googleReplySettings),
  };
  const ownerKey = (await resolveOwnerUserId(gate.actor)) ?? gate.actor.id;

  const used = new Set<string>();
  const openings = [...(parsed.data.avoidOpenings ?? [])];
  const drafts: {
    reviewId: string;
    body: string;
    source: 'ai' | 'template';
    language: string;
    bannedFound: string[];
    review: { reviewerName: string | null; rating: number | null; originalText: string | null };
  }[] = [];
  const rejected: { reviewId: string; code: 'NOT_FOUND' | 'NOT_ELIGIBLE' }[] = [];

  for (const reviewId of parsed.data.reviewIds) {
    const row = byId.get(reviewId);
    if (!row) {
      rejected.push({ reviewId, code: 'NOT_FOUND' });
      continue;
    }
    if (!isBulkEligible(row)) {
      rejected.push({ reviewId, code: 'NOT_ELIGIBLE' });
      continue;
    }
    let useAi = false;
    if (aiOn && row.originalText) {
      const quota = await checkLayeredAiQuota([
        { scope: 'suggest-reply:user', identifier: gate.actor.id, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_USER_DAY },
        { scope: 'suggest-reply:ws', identifier: ownerKey, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_WORKSPACE_DAY },
        { scope: 'suggest-reply:global', identifier: 'global', dailyLimit: AI_QUOTAS.SUGGEST_REPLY_GLOBAL_DAY },
      ]);
      useAi = quota.allowed;
    }
    const draft = await generateGoogleReviewDraft(row, business, { useAi, used, avoidOpenings: openings });
    used.add(draft.body);
    openings.push(draftOpening(draft.body));
    drafts.push({
      reviewId,
      ...draft,
      review: { reviewerName: row.reviewerName, rating: row.rating, originalText: row.originalText?.slice(0, 400) ?? null },
    });

    const source = draft.source === 'ai' ? 'ai_copilot' : 'template_fallback';
    await prisma.googleReviewAiDraft
      .upsert({
        where: { restaurantId_reviewName: { restaurantId: id, reviewName: row.reviewName } },
        create: {
          restaurantId: id,
          reviewName: row.reviewName,
          rating: row.rating ?? 5,
          commentHash: draftCommentHash(row.comment),
          body: draft.body,
          tone: business.settings.tone,
          source,
        },
        update: { body: draft.body, source, rating: row.rating ?? 5, commentHash: draftCommentHash(row.comment), generatedAt: new Date() },
      })
      .catch(() => undefined);
  }

  return NextResponse.json({ drafts, rejected });
}
