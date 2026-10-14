// Menu builder: which starter template leads for a business sector (spec 4.3).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STARTER_FEATURED_COUNT,
  STARTER_PRESETS,
  orderStarterPresets,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-starter-data';

const SECTORS = [
  'food', 'delivery', 'hospitality', 'clinic', 'legal', 'spa', 'retail', 'fitness', 'education', 'other',
] as const;

const ids = (list: { id: string }[]) => list.map((p) => p.id);

test('orderStarterPresets: a hotel sees the hotel template first', () => {
  assert.equal(orderStarterPresets('hospitality')[0].id, 'hotel');
  assert.deepEqual(ids(orderStarterPresets('hospitality')).slice(0, STARTER_FEATURED_COUNT), [
    'hotel', 'restaurant', 'cafe', 'bar',
  ]);
});

test('orderStarterPresets: a delivery business sees fast food first', () => {
  assert.equal(orderStarterPresets('delivery')[0].id, 'fastfood');
  assert.deepEqual(ids(orderStarterPresets('delivery')).slice(0, STARTER_FEATURED_COUNT), [
    'fastfood', 'restaurant', 'foodtruck', 'bakery',
  ]);
});

test('orderStarterPresets: food and unknown sectors lead with restaurant, cafe, fast food, bakery', () => {
  for (const sector of ['food', 'other', 'clinic', null, undefined] as const) {
    assert.deepEqual(ids(orderStarterPresets(sector)).slice(0, STARTER_FEATURED_COUNT), [
      'restaurant', 'cafe', 'fastfood', 'bakery',
    ]);
  }
});

test('orderStarterPresets: no sector loses or repeats a template', () => {
  assert.equal(new Set(ids(STARTER_PRESETS)).size, 9);
  for (const sector of SECTORS) {
    const ordered = ids(orderStarterPresets(sector));
    assert.equal(ordered.length, STARTER_PRESETS.length, sector);
    assert.equal(new Set(ordered).size, STARTER_PRESETS.length, sector);
    assert.deepEqual([...ordered].sort(), ids(STARTER_PRESETS).sort(), sector);
  }
});

test('orderStarterPresets: the templates after the featured ones keep their original order', () => {
  const original = ids(STARTER_PRESETS);
  for (const sector of SECTORS) {
    const ordered = ids(orderStarterPresets(sector));
    const rest = ordered.slice(STARTER_FEATURED_COUNT);
    const expected = original.filter((id) => !ordered.slice(0, STARTER_FEATURED_COUNT).includes(id));
    assert.deepEqual(rest, expected, sector);
  }
});
