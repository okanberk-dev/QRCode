/**
 * Business list query shared by GET /api/restaurants (panel list branch)
 * and the server-rendered /admin/restaurants page
 * (src/lib/admin-restaurants-list.ts). Only the paths that do not touch the
 * database (everything except attention=quota_full) are exercised here.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRestaurantListWhere,
  parseRestaurantListQuery,
} from '../src/lib/admin-restaurants-list';

const q = (s: string) => parseRestaurantListQuery(new URLSearchParams(s));

test('parseRestaurantListQuery: defaults', () => {
  assert.deepEqual(q(''), {
    page: 1,
    limit: 20,
    skip: 0,
    status: 'active',
    planFilter: 'all',
    attention: '',
    requestedRestaurantId: null,
    ownerId: null,
  });
});

test('parseRestaurantListQuery: page/limit clamps and skip', () => {
  const parsed = q('page=3&limit=500');
  assert.equal(parsed.limit, 100);
  assert.equal(parsed.page, 3);
  assert.equal(parsed.skip, 200);
  assert.equal(q('page=0&limit=0').page, 1);
  assert.equal(q('page=0&limit=0').limit, 20);
  assert.equal(q('page=abc').page, 1);
});

test('parseRestaurantListQuery: empty status/plan fall back like the API', () => {
  const parsed = q('status=&plan=');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.planFilter, 'all');
});

test('parseRestaurantListQuery: owner id shape check and restaurant param', () => {
  assert.equal(q('ownerId=abc').ownerId, null);
  assert.equal(q('ownerId=cl0wner123').ownerId, 'cl0wner123');
  assert.equal(q('ownerId=bad%20id%3B').ownerId, null);
  assert.equal(q('restaurant=r_1').requestedRestaurantId, 'r_1');
  assert.equal(q('restaurantId=all').requestedRestaurantId, null);
});

test('buildRestaurantListWhere: status, scope, plan, owner', async () => {
  assert.deepEqual(await buildRestaurantListWhere(q('status=active'), null), { isActive: true });
  assert.deepEqual(await buildRestaurantListWhere(q('status=passive'), null), { isActive: false });
  assert.deepEqual(await buildRestaurantListWhere(q('status=all'), ['a', 'b']), { id: { in: ['a', 'b'] } });
  assert.deepEqual(await buildRestaurantListWhere(q('status=all&plan=trial'), null), {
    user: { plan: 'trial' },
  });
  // Legacy tier ids and unknown values mean "no plan filter".
  assert.deepEqual(await buildRestaurantListWhere(q('status=all&plan=pro'), null), {});
  assert.deepEqual(await buildRestaurantListWhere(q('status=all&ownerId=owner_123'), null), {
    userId: 'owner_123',
  });
});

test('buildRestaurantListWhere: unverified_platform overrides status', async () => {
  assert.deepEqual(await buildRestaurantListWhere(q('status=active&attention=unverified_platform'), null), {
    googleReviewUrl: { not: null },
    googlePlaceId: null,
  });
});

test('buildRestaurantListWhere: requested restaurant respects scope', async () => {
  assert.deepEqual(await buildRestaurantListWhere(q('status=all&restaurantId=r1'), null), { id: 'r1' });
  assert.deepEqual(await buildRestaurantListWhere(q('status=all&restaurantId=r1'), ['r1', 'r2']), { id: 'r1' });
  assert.deepEqual(await buildRestaurantListWhere(q('status=all&restaurantId=r9'), ['r1']), { id: { in: [] } });
});
