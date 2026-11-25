/**
 * Reply coverage for the health score (CLAUDE.md §58): 1–3★ private
 * feedback (the ones that need an answer; redirects are not reviews) plus
 * Google reviews, weighted by volume.
 */
import { prisma } from '@/lib/prisma';

export interface ReplyCoverage {
  total: number;
  replied: number;
}

export async function loadReplyCoverage(restaurantId: string): Promise<ReplyCoverage> {
  const [low, lowReplied, google, googleReplied] = await prisma.$transaction([
    prisma.feedback.count({ where: { restaurantId, redirected: false, rating: { lte: 3 } } }),
    prisma.feedback.count({
      where: { restaurantId, redirected: false, rating: { lte: 3 }, replies: { some: {} } },
    }),
    prisma.googleReview.count({ where: { restaurantId } }),
    prisma.googleReview.count({ where: { restaurantId, hasReply: true } }),
  ]);
  return { total: low + google, replied: lowReplied + googleReplied };
}
