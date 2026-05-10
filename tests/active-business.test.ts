import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRestaurantParam,
  resolveActiveRestaurantId,
  setRestaurantParam,
} from '../src/lib/active-business';

const restaurants = [{ id: 'rest-1' }, { id: 'rest-2' }];

test('resolveActiveRestaurantId prefers a valid URL restaurantId', () => {
  assert.equal(
    resolveActiveRestaurantId({
      restaurants,
      queryRestaurantId: 'rest-2',
      storedRestaurantId: 'rest-1',
    }),
    'rest-2',
  );
});

test('resolveActiveRestaurantId falls back to localStorage and then single restaurant', () => {
  assert.equal(
    resolveActiveRestaurantId({
      restaurants,
      queryRestaurantId: 'missing',
      storedRestaurantId: 'rest-1',
    }),
    'rest-1',
  );
  assert.equal(
    resolveActiveRestaurantId({
      restaurants: [{ id: 'only' }],
      queryRestaurantId: null,
      storedRestaurantId: null,
    }),
    'only',
  );
});

test('resolveActiveRestaurantId returns all-business mode for multi-location fallback', () => {
  assert.equal(
    resolveActiveRestaurantId({
      restaurants,
      queryRestaurantId: null,
      storedRestaurantId: null,
    }),
    null,
  );
});

test('normalizeRestaurantParam treats all and empty values as aggregate mode', () => {
  assert.equal(normalizeRestaurantParam('all'), null);
  assert.equal(normalizeRestaurantParam('  '), null);
  assert.equal(normalizeRestaurantParam('rest-1'), 'rest-1');
});

test('setRestaurantParam writes canonical restaurantId and removes legacy restaurant', () => {
  assert.equal(
    setRestaurantParam('scope=7d&restaurant=old', 'rest-2'),
    'scope=7d&restaurantId=rest-2',
  );
  assert.equal(setRestaurantParam('scope=7d&restaurantId=rest-2', null), 'scope=7d');
});

