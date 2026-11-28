/**
 * Reply coverage for the health score (CLAUDE.md §58): 1–3★ private
 * feedback the owner can answer (the customer left an e-mail; redirects are
 * not reviews) plus Google reviews, weighted by volume.
 */
import { prisma } from '@/lib/prisma';
import { HAS_EMAIL } from '@/lib/feedback-metrics';

export interface ReplyCoverage {
  total: number;
  replied: number;
}

export async function loadReplyCoverage(restaurantId: string): Promise<ReplyCoverage> {
  const [low, lowReplied, google, googleReplied] = await prisma.$transaction([
    prisma.feedback.count({ where: { restaurantId, redirected: false, rating: { lte: 3 }, ...HAS_EMAIL } }),
    prisma.feedback.count({
      where: { restaurantId, redirected: false, rating: { lte: 3 }, replies: { some: {} }, ...HAS_EMAIL },
    }),
    prisma.googleReview.count({ where: { restaurantId } }),
    prisma.googleReview.count({ where: { restaurantId, hasReply: true } }),
  ]);
  return { total: low + google, replied: lowReplied + googleReplied };
}

/** QR part only: answerable 1–3★ feedback and how many got a reply. */
export async function loadQrReplyCoverage(restaurantId: string): Promise<ReplyCoverage> {
  const where = { restaurantId, redirected: false, rating: { lte: 3 }, ...HAS_EMAIL };
  const [total, replied] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: { ...where, replies: { some: {} } } }),
  ]);
  return { total, replied };
}
