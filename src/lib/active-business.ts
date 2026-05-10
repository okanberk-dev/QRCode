export const ACTIVE_BUSINESS_STORAGE_KEY = 'buaze.owner.activeRestaurantId';

export interface ActiveBusinessRestaurant {
  id: string;
}

export function normalizeRestaurantParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'all') return null;
  return trimmed;
}

export function resolveActiveRestaurantId<T extends ActiveBusinessRestaurant>({
  restaurants,
  queryRestaurantId,
  storedRestaurantId,
}: {
  restaurants: T[];
  queryRestaurantId?: string | null;
  storedRestaurantId?: string | null;
}): string | null {
  const ids = new Set(restaurants.map((restaurant) => restaurant.id));
  const queryId = normalizeRestaurantParam(queryRestaurantId);
  if (queryId && ids.has(queryId)) return queryId;

  const storedId = normalizeRestaurantParam(storedRestaurantId);
  if (storedId && ids.has(storedId)) return storedId;

  return restaurants[0]?.id ?? null;
}

export function setRestaurantParam(
  currentSearch: string,
  restaurantId: string | null,
): string {
  const params = new URLSearchParams(currentSearch);
  params.delete('restaurant');
  if (restaurantId) {
    params.set('restaurantId', restaurantId);
  } else {
    params.delete('restaurantId');
  }
  return params.toString();
}
