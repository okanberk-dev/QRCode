// Menu Studio spec §5.7 — Satışta / Tükendi / Gizli, one-flag row actions, badges, nudges.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  customerVisibility,
  flagPatch,
  itemStatus,
  menuNudges,
  rowBadge,
  statusPatch,
  type ItemStatus,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-status';

const flags = (isAvailable: boolean, isOutOfStock: boolean) => ({ isAvailable, isOutOfStock });
const AVAILABLE = flags(true, false);
const SOLD_OUT = flags(true, true);
const HIDDEN = flags(false, false);
const HIDDEN_SOLD_OUT = flags(false, true);

test('itemStatus truth table', () => {
  assert.equal(itemStatus(AVAILABLE), 'available');
  assert.equal(itemStatus(SOLD_OUT), 'soldOut');
  assert.equal(itemStatus(HIDDEN), 'hidden');
  assert.equal(itemStatus(HIDDEN_SOLD_OUT), 'hidden', 'hidden wins over sold out');
});

test('statusPatch: minimal diffs for all 9 transitions', () => {
  const cases: [typeof AVAILABLE, ItemStatus, object][] = [
    [AVAILABLE, 'available', {}],
    [AVAILABLE, 'soldOut', { isOutOfStock: true }],
    [AVAILABLE, 'hidden', { isAvailable: false }],
    [SOLD_OUT, 'available', { isOutOfStock: false }],
    [SOLD_OUT, 'soldOut', {}],
    [SOLD_OUT, 'hidden', { isAvailable: false }],
    [HIDDEN, 'available', { isAvailable: true }],
    [HIDDEN, 'soldOut', { isAvailable: true, isOutOfStock: true }],
    [HIDDEN, 'hidden', {}],
  ];
  for (const [current, target, expected] of cases) {
    assert.deepEqual(statusPatch(target, current), expected, `${itemStatus(current)} → ${target}`);
  }
  // A hidden item that was also sold out comes back as it is asked.
  assert.deepEqual(statusPatch('available', HIDDEN_SOLD_OUT), { isAvailable: true, isOutOfStock: false });
  assert.deepEqual(statusPatch('soldOut', HIDDEN_SOLD_OUT), { isAvailable: true });
  // The patched result always has the target status.
  for (const current of [AVAILABLE, SOLD_OUT, HIDDEN, HIDDEN_SOLD_OUT]) {
    for (const target of ['available', 'soldOut', 'hidden'] as ItemStatus[]) {
      assert.equal(itemStatus({ ...current, ...statusPatch(target, current) }), target);
    }
  }
});

test('flagPatch: one flag per op, null when nothing changes', () => {
  assert.deepEqual(flagPatch('markAvailable', SOLD_OUT), { isOutOfStock: false });
  assert.equal(flagPatch('markAvailable', AVAILABLE), null);
  assert.deepEqual(flagPatch('markSoldOut', AVAILABLE), { isOutOfStock: true });
  assert.equal(flagPatch('markSoldOut', SOLD_OUT), null);
  assert.deepEqual(flagPatch('hide', SOLD_OUT), { isAvailable: false });
  assert.equal(flagPatch('hide', HIDDEN), null);
  assert.deepEqual(flagPatch('show', HIDDEN_SOLD_OUT), { isAvailable: true });
  assert.equal(flagPatch('show', AVAILABLE), null);
});

test('flagPatch: markAvailable never touches isAvailable (restocking never un-hides)', () => {
  const patch = flagPatch('markAvailable', HIDDEN_SOLD_OUT);
  assert.deepEqual(patch, { isOutOfStock: false });
  assert.equal(Object.prototype.hasOwnProperty.call(patch, 'isAvailable'), false);
  assert.equal(flagPatch('markAvailable', HIDDEN), null);
  // show keeps the sold-out flag as it is
  assert.deepEqual(flagPatch('show', HIDDEN_SOLD_OUT), { isAvailable: true });
});

test('rowBadge priority: category hidden > hidden > sold out', () => {
  const visible = { isVisible: true };
  const hiddenCat = { isVisible: false };
  assert.equal(rowBadge(HIDDEN_SOLD_OUT, hiddenCat), 'categoryHidden');
  assert.equal(rowBadge(HIDDEN_SOLD_OUT, visible), 'hidden');
  assert.equal(rowBadge(SOLD_OUT, visible), 'soldOut');
  assert.equal(rowBadge(AVAILABLE, visible), null);
  assert.equal(rowBadge(AVAILABLE, hiddenCat), 'categoryHidden');
});

test('customerVisibility', () => {
  assert.equal(customerVisibility(AVAILABLE, { isVisible: true }), 'visible');
  assert.equal(customerVisibility(SOLD_OUT, { isVisible: true }), 'soldOut');
  assert.equal(customerVisibility(HIDDEN, { isVisible: true }), 'hiddenItem');
  assert.equal(customerVisibility(SOLD_OUT, { isVisible: false }), 'hiddenCategory');
});

test('menuNudges counts like the filter chips and skips pending rows', () => {
  const row = (id: string, over: Record<string, unknown> = {}) => ({
    id, isAvailable: true, isOutOfStock: false, imageUrl: 'data:x', description: 'd', priceCents: 100, ...over,
  });
  const nudges = menuNudges([
    {
      isVisible: true,
      items: [
        row('a', { imageUrl: null }),
        row('b', { isOutOfStock: true, description: '  ' }),
        row('c', { priceCents: 0, isAvailable: false }),
        row('d', { isAvailable: false, isOutOfStock: true }), // hidden, not counted as sold out
        row('tmp_1', { imageUrl: null, priceCents: 0, description: null }),
      ],
    },
    { isVisible: false, items: [row('e', { description: null })] },
  ]);
  assert.deepEqual(nudges, { noPhoto: 1, soldOut: 1, zeroPrice: 1, noDescription: 2, hidden: 3 });
});
