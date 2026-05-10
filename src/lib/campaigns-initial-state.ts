export interface CampaignRestaurantOption {
  id: string;
}

export function resolveCampaignRestaurantId<T extends CampaignRestaurantOption>(
  restaurants: T[],
  currentRestaurantId: string | null,
) {
  if (currentRestaurantId && restaurants.some((restaurant) => restaurant.id === currentRestaurantId)) {
    return currentRestaurantId;
  }
  return restaurants[0]?.id ?? null;
}

export function shouldShowCampaignRestaurantsEmptyState({
  restaurantsLoaded,
  restaurantCount,
  campaignsLoading,
}: {
  restaurantsLoaded: boolean;
  restaurantCount: number;
  campaignsLoading: boolean;
}) {
  return restaurantsLoaded && restaurantCount === 0 && !campaignsLoading;
}
