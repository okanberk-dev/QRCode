import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SETUP_MAX_CATEGORIES,
  buildSetupPlan,
  categoriesFromPreset,
  emptySetupCategory,
  moveSetupCategory,
  planTotals,
  previewSetupItems,
  validateSetupCategories,
  type SetupCategory,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-setup';
import { STARTER_PRESETS } from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-starter-data';

const row = (name: string, itemsText = ''): SetupCategory => ({ ...emptySetupCategory(), name, itemsText });

describe('menu setup wizard', () => {
  it('turns a preset into editable rows in the menu language', () => {
    const restaurant = STARTER_PRESETS.find((p) => p.id === 'restaurant')!;
    const tr = categoriesFromPreset(restaurant, true);
    assert.equal(tr[0].name, 'Başlangıçlar');
    assert.equal(new Set(tr.map((c) => c.key)).size, tr.length);
    assert.equal(categoriesFromPreset(restaurant, false)[0].name, 'Starters');
  });

  it('moves rows and ignores out-of-range moves', () => {
    const list = [row('A'), row('B'), row('C')];
    assert.deepEqual(moveSetupCategory(list, 0, 1).map((c) => c.name), ['B', 'A', 'C']);
    assert.deepEqual(moveSetupCategory(list, 0, -1).map((c) => c.name), ['A', 'B', 'C']);
  });

  it('skips blank rows, flags duplicates, long names and orphan items', () => {
    const blank = row('   ');
    const dupe = row('tatlılar');
    const long = row('x'.repeat(81));
    const orphan = row('', 'Baklava 120');
    const v = validateSetupCategories([row('Tatlılar'), blank, dupe, long, orphan], true);
    assert.equal(v.ok, false);
    assert.equal(v.errors[blank.key], undefined);
    assert.equal(v.errors[dupe.key], 'duplicate');
    assert.equal(v.errors[long.key], 'too_long');
    assert.equal(v.errors[orphan.key], 'empty');

    assert.equal(validateSetupCategories([row(''), row(' ')], true).noCategories, true);
    const many = Array.from({ length: SETUP_MAX_CATEGORIES + 1 }, (_, i) => row(`K${i}`));
    assert.equal(validateSetupCategories(many, true).tooMany, true);
    assert.equal(validateSetupCategories([row('Çorbalar'), row('İçecekler')], true).ok, true);
  });

  it('reads pasted item lines and reports unreadable ones', () => {
    const p = previewSetupItems('Mercimek Çorbası 85\nEzogelin 90,50\nÇorba');
    assert.deepEqual(p.items, [
      { name: 'Mercimek Çorbası', priceCents: 8500 },
      { name: 'Ezogelin', priceCents: 9050 },
    ]);
    assert.equal(p.unreadable, 1);
    assert.deepEqual(previewSetupItems('   '), { items: [], unreadable: 0, overLimit: false });
  });

  it('builds the plan in order without blank rows', () => {
    const plan = buildSetupPlan([row('  Çorbalar  ', 'Mercimek 85'), row(''), row('Tatlılar')]);
    assert.deepEqual(plan, [
      { name: 'Çorbalar', items: [{ name: 'Mercimek', priceCents: 8500 }] },
      { name: 'Tatlılar', items: [] },
    ]);
    assert.deepEqual(planTotals(plan), { categories: 2, items: 1 });
  });
});
