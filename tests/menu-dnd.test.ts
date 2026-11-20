// Menu Studio spec §7.7 / §8.4 — drag and drop within and across categories.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  containerId,
  findContainer,
  isContainerId,
  moveAcross,
  resolveDrop,
  type DndItems,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-dnd';

const start = (): DndItems => ({ a: ['a1', 'a2', 'a3'], b: ['b1', 'b2'], c: [] });

test('containerId / isContainerId', () => {
  assert.equal(containerId('a'), 'container:a');
  assert.equal(isContainerId('container:a'), true);
  assert.equal(isContainerId('a1'), false);
});

test('findContainer: items, section ids, unknown', () => {
  const items = start();
  assert.equal(findContainer(items, 'a2'), 'a');
  assert.equal(findContainer(items, 'b1'), 'b');
  assert.equal(findContainer(items, containerId('c')), 'c');
  assert.equal(findContainer(items, containerId('zzz')), null);
  assert.equal(findContainer(items, 'nope'), null);
});

test('moveAcross into an empty section appends', () => {
  const items = start();
  const out = moveAcross(items, 'a2', containerId('c'));
  assert.deepEqual(out, { a: ['a1', 'a3'], b: ['b1', 'b2'], c: ['a2'] });
  assert.deepEqual(items, start(), 'pure');
});

test('moveAcross onto an item inserts before it', () => {
  const out = moveAcross(start(), 'a1', 'b2');
  assert.deepEqual(out.a, ['a2', 'a3']);
  assert.deepEqual(out.b, ['b1', 'a1', 'b2']);
});

test('moveAcross: same section or unknown ids → same object', () => {
  const items = start();
  assert.equal(moveAcross(items, 'a1', 'a3'), items);
  assert.equal(moveAcross(items, 'nope', 'b1'), items);
  assert.equal(moveAcross(items, 'a1', 'nope'), items);
});

test('resolveDrop: none (no target, or same order)', () => {
  const items = start();
  assert.deepEqual(resolveDrop(items, items, 'a1', null), { kind: 'none' });
  assert.deepEqual(resolveDrop(items, items, 'a1', 'a1'), { kind: 'none' });
  assert.deepEqual(resolveDrop(items, items, 'a1', containerId('a')), { kind: 'none' });
});

test('resolveDrop: reorder within a section with the final ids', () => {
  const items = start();
  assert.deepEqual(resolveDrop(items, items, 'a1', 'a3'), { kind: 'reorder', categoryId: 'a', ids: ['a2', 'a3', 'a1'] });
  assert.deepEqual(resolveDrop(items, items, 'a3', 'a1'), { kind: 'reorder', categoryId: 'a', ids: ['a3', 'a1', 'a2'] });
});

test('resolveDrop: move to another section at the dropped index', () => {
  const original = start();
  const working = moveAcross(original, 'a1', 'b2'); // b: b1, a1, b2
  assert.deepEqual(resolveDrop(original, working, 'a1', 'a1'), {
    kind: 'move',
    itemId: 'a1',
    fromCategoryId: 'a',
    toCategoryId: 'b',
    toIndex: 1,
    targetIds: ['b1', 'a1', 'b2'],
    sourceIds: ['a2', 'a3'],
  });
  // Dropped onto a later item of the new section after crossing over.
  const moved = resolveDrop(original, working, 'a1', 'b2');
  assert.equal(moved.kind, 'move');
  if (moved.kind === 'move') {
    assert.deepEqual(moved.targetIds, ['b1', 'b2', 'a1']);
    assert.equal(moved.toIndex, 2);
  }
});

test('resolveDrop: into an empty or collapsed section (dropped on the section itself)', () => {
  const original = start();
  const working = moveAcross(original, 'b2', containerId('c'));
  assert.deepEqual(resolveDrop(original, working, 'b2', containerId('c')), {
    kind: 'move',
    itemId: 'b2',
    fromCategoryId: 'b',
    toCategoryId: 'c',
    toIndex: 0,
    targetIds: ['b2'],
    sourceIds: ['b1'],
  });
});
