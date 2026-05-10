import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCampaignRestaurantId,
  shouldShowCampaignRestaurantsEmptyState,
} from '../src/lib/campaigns-initial-state';

test('resolveCampaignRestaurantId keeps the current restaurant when it is still available', () => {
  assert.equal(
    resolveCampaignRestaurantId(
      [
        { id: 'rest-1' },
        { id: 'rest-2' },
      ],
      'rest-2',
    ),
    'rest-2',
  );
});

test('resolveCampaignRestaurantId falls back to the first restaurant after bootstrap', () => {
  assert.equal(resolveCampaignRestaurantId([{ id: 'rest-1' }], null), 'rest-1');
  assert.equal(resolveCampaignRestaurantId([{ id: 'rest-1' }], 'missing'), 'rest-1');
  assert.equal(resolveCampaignRestaurantId([], 'missing'), null);
});

test('shouldShowCampaignRestaurantsEmptyState waits until restaurants are loaded', () => {
  assert.equal(
    shouldShowCampaignRestaurantsEmptyState({
      restaurantsLoaded: false,
      restaurantCount: 0,
      campaignsLoading: false,
    }),
    false,
  );
  assert.equal(
    shouldShowCampaignRestaurantsEmptyState({
      restaurantsLoaded: true,
      restaurantCount: 0,
      campaignsLoading: false,
    }),
    true,
  );
});
