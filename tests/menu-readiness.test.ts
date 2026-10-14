// CLAUDE.md §32 — menu readiness (which setup step is next, can it be published).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getMenuReadiness } from '../src/lib/menu-readiness';

const item = (over: Record<string, unknown> = {}) => ({ isAvailable: true, isOutOfStock: false, ...over });
const category = (items: ReturnType<typeof item>[], over: Record<string, unknown> = {}) => ({
  isVisible: true,
  items,
  ...over,
});

test('getMenuReadiness: no categories → next step is "category"', () => {
  for (const input of [[], null, undefined]) {
    const r = getMenuReadiness(input);
    assert.deepEqual(r, {
      categories: 0,
      items: 0,
      publishableItems: 0,
      nextStep: 'category',
      canPublish: false,
    });
  }
});

test('getMenuReadiness: categories but no items → "items", cannot publish', () => {
  const r = getMenuReadiness([category([]), category([])]);
  assert.equal(r.categories, 2);
  assert.equal(r.items, 0);
  assert.equal(r.nextStep, 'items');
  assert.equal(r.canPublish, false);
});

test('getMenuReadiness: items that are all unavailable do not count', () => {
  const r = getMenuReadiness([category([item({ isAvailable: false }), item({ isAvailable: false })])]);
  assert.equal(r.items, 2);
  assert.equal(r.publishableItems, 0);
  assert.equal(r.nextStep, 'items');
  assert.equal(r.canPublish, false);
});

test('getMenuReadiness: items in a hidden category are not publishable', () => {
  const r = getMenuReadiness([category([item(), item()], { isVisible: false })]);
  assert.equal(r.items, 2);
  assert.equal(r.publishableItems, 0);
  assert.equal(r.canPublish, false);
  assert.equal(r.nextStep, 'items');
});

test('getMenuReadiness: a sold-out item is still shown to customers, so it counts', () => {
  const r = getMenuReadiness([category([item({ isOutOfStock: true })])]);
  assert.equal(r.publishableItems, 1);
  assert.equal(r.canPublish, true);
  assert.equal(r.nextStep, 'publish');
});

test('getMenuReadiness: everything in place → "publish"', () => {
  const r = getMenuReadiness([
    category([item(), item({ isAvailable: false })]),
    category([item()], { isVisible: false }),
    category([item({ isOutOfStock: true })]),
  ]);
  assert.equal(r.categories, 3);
  assert.equal(r.items, 4);
  assert.equal(r.publishableItems, 2);
  assert.equal(r.nextStep, 'publish');
  assert.equal(r.canPublish, true);
});

test('getMenuReadiness: soft-deleted rows are ignored', () => {
  const r = getMenuReadiness([
    category([item({ deletedAt: '2026-01-01T00:00:00.000Z' }), item()]),
    category([item()], { deletedAt: new Date() }),
  ]);
  assert.equal(r.categories, 1);
  assert.equal(r.items, 1);
  assert.equal(r.publishableItems, 1);
});

test('getMenuReadiness: missing flags default to visible / available (API rows omit nothing, partial objects stay safe)', () => {
  const r = getMenuReadiness([{ items: [{}] }]);
  assert.equal(r.publishableItems, 1);
  assert.equal(r.canPublish, true);
  assert.equal(getMenuReadiness([{}]).nextStep, 'items');
});
