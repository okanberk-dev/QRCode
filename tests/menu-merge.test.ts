import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applySavedCategory, applySavedItem, neighbourCategoryId, patchItem, removeCategory, removeItem, withIndexSortOrder,
  DRAFT_ITEM_ID, TEMP_PREFIX, insertCategoryBySortOrder, insertItemBySortOrder, isTempId, moveItemLocal, moveItemsToEnd,
  overlayItemDraft, patchItems, removeItems, replaceItem, snapshotItemPositions, withoutTemps, keepPendingRows,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-merge';
import type { ItemFormValues } from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-item-form';

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

// ── Menu Studio additions (spec §5.7, §17) ────────────────────────────────

const ids = (cats: { items: { id: string }[] }[], i: number) => cats[i].items.map((x) => x.id);

test('patchItem keeps the identity of categories that do not hold the item', () => {
  const cats = base();
  const out = patchItem(cats, 'b1', { isOutOfStock: true });
  assert.equal(out[0], cats[0]);
  assert.equal(out[2], cats[2]);
  assert.notEqual(out[1], cats[1]);
});

test('isTempId / TEMP_PREFIX', () => {
  assert.equal(TEMP_PREFIX, 'tmp_');
  assert.equal(isTempId('tmp_1'), true);
  assert.equal(isTempId('a1'), false);
});

test('withoutTemps drops pending rows and keeps untouched categories (and the array when clean)', () => {
  const cats = base();
  assert.equal(withoutTemps(cats), cats, 'no temps → same array');
  const withTemp = [cat('a', [item('a1'), item('tmp_x')]), cats[1]];
  const out = withoutTemps(withTemp);
  assert.deepEqual(out[0].items.map((i) => i.id), ['a1']);
  assert.equal(out[1], withTemp[1]);
});

test('replaceItem swaps the pending row in place', () => {
  const cats = [cat('a', [item('a1', 0), item('tmp_1', 0), item('a2', 10)]), cat('b')];
  const out = replaceItem(cats, 'tmp_1', { ...item('n1', 20), categoryId: 'a' });
  assert.deepEqual(ids(out, 0), ['a1', 'n1', 'a2']);
  assert.equal(out[1], cats[1]);
});

test('replaceItem: temp row gone → appended like a create; unknown category → unchanged', () => {
  const out = replaceItem(base(), 'tmp_gone', { ...item('n1', 20), categoryId: 'b' });
  assert.deepEqual(ids(out, 1), ['b1', 'n1']);
  const cats = base();
  assert.equal(replaceItem(cats, 'tmp_gone', { ...item('n1'), categoryId: 'zzz' }), cats);
});

test('replaceItem: saved id already shown → temp row dropped, no duplicate', () => {
  const cats = [cat('a', [item('a1'), item('n1'), item('tmp_1')])];
  const out = replaceItem(cats, 'tmp_1', { ...item('n1'), categoryId: 'a' });
  assert.deepEqual(ids(out, 0), ['a1', 'n1']);
  const gone = [cat('a', [item('n1')])];
  assert.equal(replaceItem(gone, 'tmp_1', { ...item('n1'), categoryId: 'a' }), gone);
});

test('removeItems removes across categories and keeps the rest', () => {
  const cats = base();
  const out = removeItems(cats, ['a2', 'b1', 'nope']);
  assert.deepEqual(ids(out, 0), ['a1']);
  assert.deepEqual(ids(out, 1), []);
  assert.equal(out[2], cats[2]);
});

test('patchItems applies patches per id (in order) and keeps untouched categories', () => {
  const cats = base();
  const out = patchItems(cats, [
    { id: 'a1', patch: { priceCents: 200 } },
    { id: 'a1', patch: { isOutOfStock: true } },
    { id: 'a2', patch: { priceCents: 300 } },
  ]);
  assert.equal(out[0].items[0].priceCents, 200);
  assert.equal(out[0].items[0].isOutOfStock, true);
  assert.equal(out[0].items[1].priceCents, 300);
  assert.equal(out[1], cats[1]);
  assert.equal(patchItems(cats, []), cats);
});

test('snapshotItemPositions in the order asked, unknown ids left out', () => {
  const snap = snapshotItemPositions(base(), ['b1', 'missing', 'a2']);
  assert.deepEqual(snap.map((s) => [s.item.id, s.categoryId, s.index]), [['b1', 'b', 0], ['a2', 'a', 1]]);
});

test('moveItemsToEnd appends in visual order with MAX+1 sortOrders; target items stay', () => {
  const cats = [cat('a', [item('a1', 0), item('a2', 10)]), cat('b', [item('b1', 5)]), cat('c', [item('c1', 0)])];
  const out = moveItemsToEnd(cats, ['c1', 'a2', 'b1'], 'b');
  assert.deepEqual(ids(out, 0), ['a1']);
  assert.deepEqual(ids(out, 1), ['b1', 'a2', 'c1'], 'b1 already there stays; others in visual order');
  assert.deepEqual(out[1].items.map((i) => i.sortOrder), [5, 6, 7]);
  assert.deepEqual(ids(out, 2), []);
  assert.equal(moveItemsToEnd(cats, ['a1'], 'zzz'), cats, 'unknown target → unchanged');
  assert.equal(moveItemsToEnd(cats, ['b1'], 'b'), cats, 'nothing to move → unchanged');
});

test('insertItemBySortOrder: middle, end, replaces an existing row, unknown category → null', () => {
  const cats = [cat('a', [item('a1', 0), item('a3', 20)]), cat('b')];
  assert.deepEqual(ids(insertItemBySortOrder(cats, 'a', { ...item('a2', 10), categoryId: 'a' })!, 0), ['a1', 'a2', 'a3']);
  assert.deepEqual(ids(insertItemBySortOrder(cats, 'a', item('a4', 30))!, 0), ['a1', 'a3', 'a4']);
  assert.deepEqual(ids(insertItemBySortOrder(cats, 'a', item('a0', 20))!, 0), ['a1', 'a3', 'a0'], 'after equal sortOrders');
  assert.deepEqual(ids(insertItemBySortOrder(cats, 'b', item('a1', 0))!, 0), ['a3'], 'same id moves');
  assert.equal(insertItemBySortOrder(cats, 'zzz', item('x')), null);
});

test('insertCategoryBySortOrder puts a restored category back in place (replacing the same id)', () => {
  const cats = [{ ...cat('a'), sortOrder: 0 }, { ...cat('c'), sortOrder: 20 }];
  const out = insertCategoryBySortOrder(cats, { id: 'b', name: 'B', description: null, sortOrder: 10, isVisible: true, items: [item('b1')] });
  assert.deepEqual(out.map((c) => c.id), ['a', 'b', 'c']);
  assert.deepEqual(out[1].items.map((i) => i.id), ['b1']);
  const last = insertCategoryBySortOrder(cats, { id: 'z', name: 'Z', sortOrder: 99, isVisible: false, description: null, items: [] });
  assert.deepEqual(last.map((c) => c.id), ['a', 'c', 'z']);
  const replaced = insertCategoryBySortOrder(out, { id: 'b', name: 'B2', description: 'd', sortOrder: 10, isVisible: true, items: [] });
  assert.deepEqual(replaced.map((c) => c.id), ['a', 'b', 'c']);
  assert.equal(replaced[1].name, 'B2');
});

test('moveItemLocal: to the end of another category (MAX+1)', () => {
  const out = moveItemLocal(base(), 'a1', 'b')!;
  assert.deepEqual(ids(out, 0), ['a2']);
  assert.deepEqual(ids(out, 1), ['b1', 'a1']);
  assert.equal(out[1].items[1].sortOrder, 1);
});

test('moveItemLocal: to an index in another category renumbers both lists', () => {
  const out = moveItemLocal(base(), 'a2', 'b', 0)!;
  assert.deepEqual(ids(out, 1), ['a2', 'b1']);
  assert.deepEqual(out[1].items.map((i) => i.sortOrder), [0, 1]);
  assert.deepEqual(out[0].items.map((i) => i.sortOrder), [0]);
});

test('moveItemLocal: same category with an index reorders; without one it is a no-op; unknown → null', () => {
  const cats = [cat('a', [item('a1', 0), item('a2', 1), item('a3', 2)])];
  assert.deepEqual(ids(moveItemLocal(cats, 'a1', 'a', 2)!, 0), ['a2', 'a3', 'a1']);
  assert.equal(moveItemLocal(cats, 'a1', 'a'), cats);
  assert.equal(moveItemLocal(cats, 'nope', 'a'), null);
  assert.equal(moveItemLocal(cats, 'a1', 'zzz'), null);
});

const formValues = (over: Partial<ItemFormValues> = {}): ItemFormValues => ({
  categoryId: 'a', name: 'a1', description: '', price: '1', badges: [], allergens: [],
  isAvailable: true, isOutOfStock: false, imageUrl: null, ...over,
});

test('overlayItemDraft (edit) patches the item in place', () => {
  const out = overlayItemDraft(base(), {
    mode: 'edit', itemId: 'a1', categoryId: 'a', fallbackName: 'a1', currency: 'TRY',
    values: formValues({ name: 'Ayran ', price: '35,50', description: ' soğuk ', isOutOfStock: true }),
  });
  const a1 = out[0].items[0];
  assert.equal(a1.name, 'Ayran');
  assert.equal(a1.priceCents, 3550);
  assert.equal(a1.description, 'soğuk');
  assert.equal(a1.isOutOfStock, true);
  assert.equal(a1.sortOrder, 0);
});

test('overlayItemDraft (edit): invalid price keeps the saved one; empty name shows the fallback', () => {
  const out = overlayItemDraft(base(), {
    mode: 'edit', itemId: 'a1', categoryId: 'a', fallbackName: 'Kayıtlı ad', currency: 'TRY',
    values: formValues({ name: '  ', price: 'abc' }),
  });
  assert.equal(out[0].items[0].priceCents, 100);
  assert.equal(out[0].items[0].name, 'Kayıtlı ad');
});

test('overlayItemDraft (edit) with a category change moves it to the end of the new category', () => {
  const out = overlayItemDraft(base(), {
    mode: 'edit', itemId: 'a1', categoryId: 'a', fallbackName: 'a1', currency: 'TRY',
    values: formValues({ categoryId: 'b' }),
  });
  assert.deepEqual(ids(out, 0), ['a2']);
  assert.deepEqual(ids(out, 1), ['b1', 'a1']);
});

test('overlayItemDraft (create) appends a __draft__ row; unknown item → unchanged', () => {
  const out = overlayItemDraft(base(), {
    mode: 'create', categoryId: 'c', fallbackName: 'Yeni ürün', currency: 'TRY',
    values: formValues({ categoryId: 'c', name: '', price: '' }),
  });
  assert.equal(out[2].items.length, 1);
  assert.equal(out[2].items[0].id, DRAFT_ITEM_ID);
  assert.equal(out[2].items[0].name, 'Yeni ürün');
  assert.equal(out[2].items[0].priceCents, 0);
  assert.equal(out[2].items[0].currency, 'TRY');
  const cats = base();
  assert.equal(
    overlayItemDraft(cats, { mode: 'edit', itemId: 'nope', categoryId: 'a', fallbackName: '', currency: 'TRY', values: formValues() }),
    cats,
  );
});

test('keepPendingRows: a refetch snapshot keeps failed / saving quick-add rows at the end of their category (REG-5)', () => {
  const row = (id: string, sortOrder: number) => ({
    id, name: id, description: null, priceCents: 100, currency: 'TRY', imageUrl: null,
    badges: [], allergens: [], isAvailable: true, isOutOfStock: false, sortOrder,
  });
  const snapshot = [
    { id: 'c1', name: 'A', description: null, isVisible: true, sortOrder: 0, items: [row('i1', 0), row('i2', 1)] },
    { id: 'c2', name: 'B', description: null, isVisible: true, sortOrder: 1, items: [] },
  ] as unknown as Parameters<typeof keepPendingRows>[0];
  const temp = { ...row(`${TEMP_PREFIX}x`, 0), name: 'Sütlaç' };
  const gone = row(`${TEMP_PREFIX}y`, 0);
  const next = keepPendingRows(snapshot, [{ categoryId: 'c1', item: temp }, { categoryId: 'deleted', item: gone }]);
  assert.deepEqual(next[0].items.map((i) => [i.id, i.sortOrder, i.name]), [['i1', 0, 'i1'], ['i2', 1, 'i2'], [temp.id, 2, 'Sütlaç']]);
  assert.equal(next[1], snapshot[1], 'untouched categories keep their identity');
  assert.equal(keepPendingRows(next, [{ categoryId: 'c1', item: temp }])[0].items.length, 3, 'never duplicated');
  assert.equal(keepPendingRows(snapshot, []), snapshot);
});
