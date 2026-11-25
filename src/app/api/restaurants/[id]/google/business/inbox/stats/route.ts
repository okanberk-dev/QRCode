import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gateGoogleReviewRoute } from '@/lib/google-review-route';
import { computeInsights } from '@/lib/google-review-inbox';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';

/** Analysis of ALL stored reviews (distribution, reply time, keywords). DB only. */
async function handleGET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateGoogleReviewRoute(req, id);
  if (!gate.ok) return gate.response;

  const rows = await prisma.googleReview.findMany({
    where: { restaurantId: id },
    select: {
      rating: true,
      createTime: true,
      hasReply: true,
      replyUpdateTime: true,
      originalText: true,
      language: true,
    },
    orderBy: { createTime: { sort: 'desc', nulls: 'last' } },
    take: 5000,
  });

  return NextResponse.json(computeInsights(rows), {
    headers: { 'Cache-Control': 'private, max-age=0, s-maxage=30, stale-while-revalidate=60' },
  });
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
