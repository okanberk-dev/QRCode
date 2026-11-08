import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countChains, groupByOwner, type FranchiseRestaurantLike } from '../src/lib/admin-franchise';

function r(
  id: string,
  owner: string | null,
  overrides: Partial<FranchiseRestaurantLike> = {},
): FranchiseRestaurantLike {
  return {
    id,
    name: id,
    isActive: true,
    menuEnabled: true,
    menuPublished: false,
    avgRating: null,
    _count: { feedbacks: 0 },
    user: owner ? { id: owner, email: `${owner}@x.com`, name: owner.toUpperCase(), plan: 'monthly', isActive: true } : null,
    ...overrides,
  };
}

test('groupByOwner puts chains first and orphans last', () => {
  const groups = groupByOwner([
    r('Solo', 'single'),
    r('Kadıköy', 'chain'),
    r('Ataşehir', 'chain'),
    r('Yetim', null),
    r('Beşiktaş', 'chain'),
  ]);
  assert.deepEqual(groups.map((g) => g.ownerId), ['chain', 'single', null]);
  // Businesses sorted by name (Turkish collation).
  assert.deepEqual(groups[0].restaurants.map((x) => x.id), ['Ataşehir', 'Beşiktaş', 'Kadıköy']);
  assert.equal(countChains(groups), 1);
});

test('group stats: active count, reviews, weighted rating, published menus', () => {
  const [group] = groupByOwner([
    r('A', 'o', { _count: { feedbacks: 10 }, avgRating: 5, menuPublished: true }),
    r('B', 'o', { _count: { feedbacks: 30 }, avgRating: 4, isActive: false }),
    r('C', 'o', { _count: { feedbacks: 0 }, avgRating: null, menuEnabled: false, menuPublished: true }),
  ]);
  assert.equal(group.restaurants.length, 3);
  assert.equal(group.active, 2);
  assert.equal(group.reviews, 40);
  assert.equal(group.avgRating, 4.3);
  // A published menu needs menuEnabled too.
  assert.equal(group.menuPublished, 1);
});

test('empty input gives no groups', () => {
  assert.deepEqual(groupByOwner([]), []);
});
