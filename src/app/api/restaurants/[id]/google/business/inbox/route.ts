import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gateGoogleReviewRoute } from '@/lib/google-review-route';
import { buildInboxWhere, parseInboxFilter } from '@/lib/google-review-inbox';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { MAX_BULK_ITEMS } from '@/lib/google-reply-jobs';
import { loadGoogleInboxPage } from '@/lib/google-inbox-page';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';

/**
 * Reply inbox list (CLAUDE.md §54). Reads ONLY the stored reviews — never
 * calls Google. Query: status, stars, text, from, to, q, cursor, limit.
 * `?mode=bulk-ids` returns the ids of the bulk-eligible reviews (4–5★, no
 * reply, not already queued) matching the filter, for "Select all".
 */
async function handleGET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  return NextResponse.json(await loadGoogleInboxPage(id, filter, { limit, cursor }), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
