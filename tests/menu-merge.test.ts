import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applySavedCategory, applySavedItem, neighbourCategoryId, patchItem, removeCategory, removeItem, withIndexSortOrder,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-merge';

const item = (id: string, sortOrder = 0) => ({ id, name: id, description: null, priceCents: 100, currency: 'TRY', imageUrl: null, badges: [], isAvailable: true, isOutOfStock: false, sortOrder });
const cat = (id: string, items = [] as ReturnType<typeof item>[]) => ({ id, name: id, description: null, sortOrder: 0, isVisible: true, items });
const base = () => [cat('a', [item('a1', 0), item('a2', 10)]), cat('b', [item('b1', 0)]), cat('c')];

test('create item appends to its category', () => {
  const out = applySavedItem(base(), 'create', { ...item('a3', 20), categoryId: 'a' })!;
  assert.deepEqual(out[0].items.map((i) => i.id), ['a1', 'a2', 'a3']);
  assert.equal(out[1].items.length, 1);
});
test('create item falls back to the modal category id; unknown category -> null', () => {
  assert.ok(applySavedItem(base(), 'create', item('x'), 'c'));
  assert.equal(applySavedItem(base(), 'create', { ...item('x'), categoryId: 'zzz' }), null);
  assert.equal(applySavedItem(base(), 'create', item('x')), null);
});
test('edit item replaces in place', () => {
  const out = applySavedItem(base(), 'edit', { ...item('a1', 0), name: 'renamed', categoryId: 'a' })!;
  assert.deepEqual(out[0].items.map((i) => i.name), ['renamed', 'a2']);
});
test('edit item moves to end of the new category', () => {
  const out = applySavedItem(base(), 'edit', { ...item('a1', 1), categoryId: 'b' })!;
  assert.deepEqual(out[0].items.map((i) => i.id), ['a2']);
  assert.deepEqual(out[1].items.map((i) => i.id), ['b1', 'a1']);
});
test('edit item unknown -> null', () => {
  assert.equal(applySavedItem(base(), 'edit', { ...item('nope'), categoryId: 'a' }), null);
});
test('category create appends with empty items; edit keeps items', () => {
  const created = applySavedCategory(base(), 'create', { id: 'd', name: 'd', description: null, sortOrder: 30, isVisible: true });
  assert.equal(created.length, 4);
  assert.deepEqual(created[3].items, []);
  const edited = applySavedCategory(base(), 'edit', { id: 'a', name: 'A2', description: 'x', sortOrder: 0, isVisible: false });
  assert.equal(edited[0].name, 'A2');
  assert.equal(edited[0].isVisible, false);
  assert.equal(edited[0].items.length, 2);
});
test('remove helpers', () => {
  assert.deepEqual(removeItem(base(), 'a2')[0].items.map((i) => i.id), ['a1']);
  assert.deepEqual(removeCategory(base(), 'b').map((c) => c.id), ['a', 'c']);
});
test('patchItem patches wherever the item lives', () => {
  const out = patchItem(base(), 'b1', { isOutOfStock: true });
  assert.equal(out[1].items[0].isOutOfStock, true);
  assert.equal(out[0].items[0].isOutOfStock, false);
});
test('neighbourCategoryId', () => {
  assert.equal(neighbourCategoryId(base(), 'a'), 'b');
  assert.equal(neighbourCategoryId(base(), 'b'), 'c');
  assert.equal(neighbourCategoryId(base(), 'c'), 'b');
  assert.equal(neighbourCategoryId([cat('a')], 'a'), null);
  assert.equal(neighbourCategoryId(base(), 'missing'), 'a');
});
test('withIndexSortOrder', () => {
  assert.deepEqual(withIndexSortOrder([item('x', 10), item('y', 20)]).map((i) => i.sortOrder), [0, 1]);
});
