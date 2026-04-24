import { prisma } from '@/lib/prisma';
import type { PanelActor } from '@/lib/auth';

export async function getScopedRestaurantIds(actor: PanelActor) {
  if (actor.role === 'manager') {
    return actor.restaurantId ? [actor.restaurantId] : [];
  }

  if (actor.role === 'restaurant_owner') {
    const restaurants = await prisma.restaurant.findMany({
      where: { userId: actor.id },
      select: { id: true },
    });

    return restaurants.map((restaurant) => restaurant.id);
  }

  return null;
}

export async function canAccessRestaurant(actor: PanelActor, restaurantId: string) {
  if (actor.role === 'superadmin') {
    return true;
  }

  if (actor.role === 'manager') {
    return actor.restaurantId === restaurantId;
  }

  if (actor.role === 'restaurant_owner') {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { userId: true },
    });

    return restaurant?.userId === actor.id;
  }

  return false;
}

/**
 * Resolves the owning User.id for workspace-scoped features
 * (billing, team, campaigns, notification prefs).
 *
 * - `actor.source === 'user'` → the actor itself owns the workspace.
 * - `manager` → resolve via their scoped restaurant's owner.
 * - `superadmin` (admin source, no restaurant scope) → null; callers
 *   should 403 since superadmin doesn't have a personal workspace.
 */
export async function resolveOwnerUserId(actor: PanelActor): Promise<string | null> {
  if (actor.source === 'user') return actor.id;
  if (actor.role === 'manager' && actor.restaurantId) {
    const r = await prisma.restaurant.findUnique({
      where: { id: actor.restaurantId },
      select: { userId: true },
    });
    return r?.userId ?? null;
  }
  return null;
}
