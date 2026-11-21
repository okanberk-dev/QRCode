// Owner (member) detail behind GET /api/admin/members/[id] and the
// server-rendered /admin/members/[id] page (§40.10 hydration). One loader,
// so the first render and every later refetch return the same payload.
import { prisma } from '@/lib/prisma';

/**
 * Full detail: user fields + counts (restaurants, feedback last 30 days,
 * invoices, team) + the linked subscription summary. Null when the user
 * does not exist.
 *
 * One $transaction (CLAUDE.md §14.1, connection_limit=1). The 30-day
 * feedback count filters through the business relation (`restaurant.userId`)
 * instead of first reading the owner's business ids, which is the same set
 * of rows and saves the dependent round-trip.
 */
export async function loadAdminMemberDetail(id: string, now: Date = new Date()) {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [user, feedbackCount30d, invoiceCount, teamCount, subscription] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        trialEndsAt: true,
        isActive: true,
        deactivatedAt: true,
        scheduledDeletionAt: true,
        lastInvitedAt: true,
        lastTrialReminderAt: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { restaurants: true } },
      },
    }),
    // Feedback count last 30d across owned restaurants.
    prisma.feedback.count({
      where: { restaurant: { userId: id }, createdAt: { gte: since } },
    }),
    prisma.billingInvoice.count({ where: { userId: id } }),
    prisma.teamMember.count({ where: { ownerId: id } }),
    prisma.billingSubscription.findUnique({
      where: { userId: id },
      select: {
        plan: true,
        status: true,
        renewsAt: true,
        amount: true,
        currency: true,
        billingCycle: true,
      },
    }),
  ]);
  if (!user) return null;

  return {
    user,
    counts: {
      restaurants: user._count.restaurants,
      feedbackLast30d: feedbackCount30d,
      invoices: invoiceCount,
      teamMembers: teamCount,
    },
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          renewsAt: subscription.renewsAt?.toISOString() ?? null,
          amount: subscription.amount ? Number(subscription.amount) : null,
          currency: subscription.currency,
          billingCycle: subscription.billingCycle,
        }
      : null,
  };
}
