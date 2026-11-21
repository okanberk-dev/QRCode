import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserIdentity } from '@/lib/panel-access';

// Request-memoised reads shared by the owner dashboard layout and its pages
// (React `cache`, keyed by primitives). On a hard load the layout and the
// page render in the same request, so the signed-in user and the business
// list are read once instead of once per segment. Each request starts with
// an empty cache; nothing is shared between requests or users.

const PANEL_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  plan: true,
  trialEndsAt: true,
  createdAt: true,
  isActive: true,
  role: true,
} satisfies Prisma.UserSelect;

/**
 * The fields the layout and the pages read from the signed-in user. A page
 * that needs another column queries it itself rather than widening this.
 */
export const getPanelUser = cache(async (userId: string) =>
  prisma.user.findUnique({ where: { id: userId }, select: PANEL_USER_SELECT }),
);

// Union of the business columns the layout (shell switcher), the dashboard
// home, the analytics page and the account page render. Small scalar columns
// only — never the base64 logo / cover (CLAUDE.md §3).
const PANEL_RESTAURANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  category: true,
  primaryColor: true,
  isActive: true,
  menuEnabled: true,
  externalPlatformsEnabled: true,
  initialGoogleRating: true,
  currentGoogleRating: true,
  aiAnalyticsEnabled: true,
  targetRating: true,
  googleReviewUrl: true,
  googleEnabled: true,
  _count: { select: { feedbacks: true } },
} satisfies Prisma.RestaurantSelect;

export type PanelRestaurant = Prisma.RestaurantGetPayload<{
  select: typeof PANEL_RESTAURANT_SELECT;
}>;

const panelRestaurantsForIdentity = cache(
  async (userId: string, role: string, email: string | null): Promise<PanelRestaurant[]> => {
    // Owner fast path: the owner's scope is exactly "every business with
    // userId = owner" (getScopedRestaurantIds), so one query replaces the
    // id-only scope query plus `id IN (...)`.
    if (role === 'restaurant_owner') {
      return prisma.restaurant.findMany({
        where: { userId },
        select: PANEL_RESTAURANT_SELECT,
        orderBy: { createdAt: 'asc' },
      });
    }
    const ids = await getScopedRestaurantIdsForUserIdentity(userId, role, email);
    if (!ids || ids.length === 0) return [];
    return prisma.restaurant.findMany({
      where: { id: { in: ids } },
      select: PANEL_RESTAURANT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  },
);

/**
 * Every business this identity can see (team members: their assigned
 * subset), oldest first — the order the shell's switcher and the pages'
 * "first active business" default rely on. Returns a fresh array; the row
 * objects are shared within the request, so do not mutate them.
 */
export async function getPanelRestaurants(
  userId: string,
  role: string,
  email: string | null,
): Promise<PanelRestaurant[]> {
  return [...(await panelRestaurantsForIdentity(userId, role, email))];
}
