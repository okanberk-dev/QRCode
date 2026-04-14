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
