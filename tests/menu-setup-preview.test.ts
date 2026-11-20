// Menu Studio spec §10 — the setup plan rendered as preview categories.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { planToPreviewCategories } from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-setup-preview';

test('planToPreviewCategories: ids, order and flags', () => {
  const out = planToPreviewCategories([
    { name: 'Çorbalar', items: [{ name: 'Mercimek', priceCents: 9000 }, { name: 'Ezogelin', priceCents: 9500 }] },
    { name: 'Tatlılar', items: [] },
  ]);
  assert.deepEqual(out.map((c) => [c.id, c.name, c.sortOrder]), [['setup-0', 'Çorbalar', 0], ['setup-1', 'Tatlılar', 1]]);
  assert.deepEqual(out[0].items.map((i) => [i.id, i.name, i.priceCents, i.sortOrder]), [
    ['setup-0-0', 'Mercimek', 9000, 0],
    ['setup-0-1', 'Ezogelin', 9500, 1],
  ]);
  assert.deepEqual(out[1].items, []);
  for (const c of out) {
    assert.equal(c.isVisible, true);
    assert.equal(c.description, null);
    for (const i of c.items) {
      assert.equal(i.currency, 'TRY');
      assert.equal(i.isAvailable, true);
      assert.equal(i.isOutOfStock, false);
      assert.equal(i.imageUrl, null);
      assert.deepEqual(i.badges, []);
    }
  }
  assert.deepEqual(planToPreviewCategories([]), []);
});
