import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { gateGoogleReviewRoute } from '@/lib/google-review-route';
import { buildInboxWhere, parseInboxFilter } from '@/lib/google-review-inbox';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { MAX_BULK_ITEMS } from '@/lib/google-reply-jobs';

export const dynamic = 'force-dynamic';

const ITEM_SELECT = {
  id: true,
  reviewId: true,
  reviewName: true,
  reviewerName: true,
  reviewerPhotoUrl: true,
  isAnonymous: true,
  rating: true,
  originalText: true,
  translatedText: true,
  language: true,
  createTime: true,
  updateTime: true,
  hasReply: true,
  replyComment: true,
  replyUpdateTime: true,
} satisfies Prisma.GoogleReviewSelect;

/**
 * Reply inbox list (CLAUDE.md §54). Reads ONLY the stored reviews — never
 * calls Google. Query: status, stars, text, from, to, q, cursor, limit.
 * `?mode=bulk-ids` returns the ids of the bulk-eligible reviews (4–5★, no
 * reply, not already queued) matching the filter, for "Select all".
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateGoogleReviewRoute(req, id);
  if (!gate.ok) return gate.response;

  const sp = req.nextUrl.searchParams;
  const filter = parseInboxFilter(sp);
  const where = buildInboxWhere(id, filter, resolveDisplayTimeZone());

  if (sp.get('mode') === 'bulk-ids') {
    const queued = await prisma.googleReplyJobItem.findMany({
      where: { status: { in: ['pending', 'sending'] }, job: { restaurantId: id } },
      select: { reviewId: true },
    });
    const rows = await prisma.googleReview.findMany({
      where: {
        AND: [
          where,
          { hasReply: false, rating: { gte: 4 } },
          queued.length > 0 ? { reviewId: { notIn: queued.map((q) => q.reviewId) } } : {},
        ],
      },
      orderBy: [{ createTime: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      select: { reviewId: true },
      take: MAX_BULK_ITEMS,
    });
    return NextResponse.json(
      { reviewIds: rows.map((r) => r.reviewId), limit: MAX_BULK_ITEMS },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const limit = Math.min(50, Math.max(1, Number.parseInt(sp.get('limit') ?? '', 10) || 20));
  const cursor = sp.get('cursor');

  const [items, matching, stored, unreplied, cache, activeJob] = await prisma.$transaction([
    prisma.googleReview.findMany({
      where,
      orderBy: [{ createTime: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      select: ITEM_SELECT,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.googleReview.count({ where }),
    prisma.googleReview.count({ where: { restaurantId: id } }),
    prisma.googleReview.count({ where: { restaurantId: id, hasReply: false } }),
    prisma.googleReviewCache.findUnique({
      where: { restaurantId: id },
      select: {
        averageRating: true,
        totalReviewCount: true,
        fetchedAt: true,
        lastAttemptAt: true,
        lastErrorCode: true,
        reviewsUrl: true,
      },
    }),
    prisma.googleReplyJob.findFirst({
      where: { restaurantId: id, status: { in: ['running', 'paused'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
  ]);

  const page = items.slice(0, limit);
  const nextCursor = items.length > limit ? page[page.length - 1]?.id ?? null : null;

  const names = page.filter((r) => !r.hasReply).map((r) => r.reviewName);
  const draftRows =
    names.length > 0
      ? await prisma.googleReviewAiDraft.findMany({
          where: { restaurantId: id, reviewName: { in: names } },
          select: { reviewName: true, body: true, source: true, generatedAt: true },
        })
      : [];
  const drafts = new Map(draftRows.map((d) => [d.reviewName, d]));

  const replied = stored - unreplied;
  const leaseActive = Boolean(cache?.lastAttemptAt && Date.now() - cache.lastAttemptAt.getTime() < 5 * 60_000);

  return NextResponse.json(
    {
      items: page.map((r) => {
        const draft = drafts.get(r.reviewName);
        return {
          ...r,
          createTime: r.createTime?.toISOString() ?? null,
          updateTime: r.updateTime?.toISOString() ?? null,
          replyUpdateTime: r.replyUpdateTime?.toISOString() ?? null,
          draft: draft
            ? { body: draft.body, source: draft.source, generatedAt: draft.generatedAt.toISOString() }
            : null,
        };
      }),
      nextCursor,
      matching,
      summary: {
        averageRating: cache?.averageRating ?? null,
        totalReviewCount: cache?.totalReviewCount ?? stored,
        stored,
        unreplied,
        replied,
        replyRate: stored > 0 ? Math.round((replied / stored) * 100) : null,
        fetchedAt: cache?.fetchedAt?.toISOString() ?? null,
        syncing: leaseActive && (!cache?.fetchedAt || cache.lastAttemptAt! > cache.fetchedAt),
        lastErrorCode: cache?.lastErrorCode ?? null,
        reviewsUrl: cache?.reviewsUrl ?? null,
        // Nothing stored yet (first visit after connecting, or a business
        // synced before the inbox existed): the page asks for a sync once.
        needsSync: stored === 0 && (!cache?.fetchedAt || (cache?.totalReviewCount ?? 0) > 0),
        activeJobId: activeJob?.id ?? null,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
