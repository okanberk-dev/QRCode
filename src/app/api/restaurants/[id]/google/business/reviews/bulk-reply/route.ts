import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { writePanelAuditLog } from '@/lib/audit-log';
import { gateConnectedGoogleReviewRoute } from '@/lib/google-review-route';
import { moderateReplyContents } from '@/lib/content-safety';
import { loadReplyAllowedHosts } from '@/lib/reply-allowed-hosts';
import { isReplyRiskKind, replyRiskMessages } from '@/lib/reply-risk';
import { findBannedPhrases, readGoogleReplySettings } from '@/lib/google-reply-settings';
import { isBulkEligible } from '@/lib/google-review-inbox';
import { ACTIVE_ITEM_STATUSES, MAX_BULK_ITEMS, processReplyJob } from '@/lib/google-reply-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const Body = z
  .object({
    items: z
      .array(
        z
          .object({
            reviewId: z.string().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/),
            comment: z.string().trim().min(2).max(4096),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_BULK_ITEMS),
    // One responsibility confirmation for the whole batch (§45). Required.
    confirmResponsibility: z.literal(true),
  })
  .strict();

type Rejection = { reviewId: string; code: string; messages?: string[]; phrases?: string[] };

/**
 * Starts a bulk Google reply job (CLAUDE.md §54). Every item is checked
 * first; if any fails (1–3★, already replied, already queued, risky text,
 * banned phrase) nothing is queued and the problems come back per review.
 * The send itself runs on the server queue (sequential, quota-aware,
 * retried, idempotent); the page polls the job for progress.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await gateConnectedGoogleReviewRoute(req, id, { write: true });
  if (!ctx.ok) return ctx.response;
  const isTr = ctx.locale === 'tr';

  const parsed = validateBody(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-review-bulk-reply:${ctx.actor.id}:${id}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      isTr ? 'Kısa sürede çok fazla toplu gönderim. Biraz bekleyin.' : 'Too many bulk sends in a short time. Please wait.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  const items = parsed.data.items;
  const ids = items.map((i) => i.reviewId);
  if (new Set(ids).size !== ids.length) {
    return ApiErrors.badRequest(isTr ? 'Aynı yorum iki kez seçilmiş.' : 'The same review was selected twice.', 'DUPLICATE_REVIEW');
  }

  const allowedHosts = await loadReplyAllowedHosts(id);
  const [rows, queued, restaurant] = await prisma.$transaction([
    prisma.googleReview.findMany({
      where: { restaurantId: id, reviewId: { in: ids } },
      select: { reviewId: true, rating: true, hasReply: true },
    }),
    prisma.googleReplyJobItem.findMany({
      where: { reviewId: { in: ids }, status: { in: [...ACTIVE_ITEM_STATUSES] }, job: { restaurantId: id } },
      select: { reviewId: true },
    }),
    prisma.restaurant.findUnique({ where: { id }, select: { googleReplySettings: true } }),
  ]);
  const byId = new Map(rows.map((r) => [r.reviewId, r]));
  const queuedIds = new Set(queued.map((q) => q.reviewId));
  const banned = readGoogleReplySettings(restaurant?.googleReplySettings).bannedPhrases;

  const rejected: Rejection[] = [];
  const toModerate: typeof items = [];
  for (const item of items) {
    const row = byId.get(item.reviewId);
    if (!row) {
      rejected.push({ reviewId: item.reviewId, code: 'REVIEW_NOT_FOUND' });
      continue;
    }
    if (row.hasReply) {
      rejected.push({ reviewId: item.reviewId, code: 'ALREADY_REPLIED' });
      continue;
    }
    if (!isBulkEligible(row)) {
      rejected.push({ reviewId: item.reviewId, code: 'LOW_RATING_NOT_ALLOWED' });
      continue;
    }
    if (queuedIds.has(item.reviewId)) {
      rejected.push({ reviewId: item.reviewId, code: 'ALREADY_QUEUED' });
      continue;
    }
    const phrases = findBannedPhrases(item.comment, banned);
    if (phrases.length > 0) {
      rejected.push({ reviewId: item.reviewId, code: 'BANNED_PHRASE', phrases });
      continue;
    }
    toModerate.push(item);
  }
  // One batched check (word lists + AI) for every reply that passed the rest.
  const safety = await moderateReplyContents(
    toModerate.map((i) => i.comment),
    { allowedHosts },
  );
  safety.forEach((result, k) => {
    if (!result.blocked) return;
    const issues = result.categories.filter(isReplyRiskKind);
    rejected.push({
      reviewId: toModerate[k].reviewId,
      code: 'CONTENT_BLOCKED',
      messages: replyRiskMessages(issues, isTr ? 'tr' : 'en'),
    });
  });
  if (rejected.length > 0) {
    return NextResponse.json(
      {
        error: isTr ? 'Bazı yanıtlar gönderilemez. Düzeltip tekrar deneyin.' : 'Some replies cannot be sent. Fix them and try again.',
        code: 'ITEMS_REJECTED',
        rejected,
      },
      { status: 400 },
    );
  }

  const confirmedAt = new Date();
  const job = await prisma.googleReplyJob.create({
    data: {
      restaurantId: id,
      actorId: ctx.actor.id,
      actorSource: ctx.actor.source === 'admin' ? 'admin' : 'user',
      total: items.length,
      confirmedAt,
      items: { create: items.map((i) => ({ reviewId: i.reviewId, comment: i.comment })) },
    },
    select: { id: true },
  });

  await writePanelAuditLog(ctx.actor, 'owner.google.review.bulk_reply_start', id, {
    jobId: job.id,
    count: items.length,
    reviewIds: ids,
    confirmedResponsibility: true,
    confirmedAt: confirmedAt.toISOString(),
  });

  // Start sending right after the response; the page polls the job, and the
  // review-refresh cron resumes it if this run is cut short.
  after(async () => {
    await processReplyJob(job.id, { budgetMs: 280_000 }).catch((err) => {
      console.error('[google bulk reply] run failed', { jobId: job.id, message: (err as Error)?.message });
    });
  });

  return NextResponse.json({ jobId: job.id, total: items.length }, { status: 202 });
}
