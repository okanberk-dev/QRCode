/**
 * One page of the Google review reply inbox (CLAUDE.md §54, §56). Reads ONLY
 * the stored reviews — never calls Google. Shared by
 * `GET /api/restaurants/[id]/google/business/inbox` and the Google Reviews
 * page, which prepares the first page on the server.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buildInboxWhere, type InboxFilter } from '@/lib/google-review-inbox';
import { resolveDisplayTimeZone } from '@/lib/timezone';

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

export type GoogleInboxPage = Awaited<ReturnType<typeof loadGoogleInboxPage>>;

export async function loadGoogleInboxPage(
  id: string,
  filter: InboxFilter,
  opts: { limit: number; cursor?: string | null },
) {
  const where = buildInboxWhere(id, filter, resolveDisplayTimeZone());
  const { limit } = opts;
  const cursor = opts.cursor ?? null;

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

  return {
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
    };
}
