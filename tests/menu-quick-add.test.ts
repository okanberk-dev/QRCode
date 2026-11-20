// Menu Studio QA: quick-add name ⏎ splits a typed "name price" line.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { splitTypedQuickAdd } from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-paste';

test('splitTypedQuickAdd: typed "name price" with an empty price field splits', () => {
  assert.deepEqual(splitTypedQuickAdd('Mocha 130', ''), { name: 'Mocha', priceCents: 13000 });
  assert.deepEqual(splitTypedQuickAdd('Flat White 115', '  '), { name: 'Flat White', priceCents: 11500 });
  assert.deepEqual(splitTypedQuickAdd('Americano 95,50', ''), { name: 'Americano', priceCents: 9550 });
});

test('splitTypedQuickAdd: leaves the fields alone otherwise', () => {
  assert.equal(splitTypedQuickAdd('Mocha 130', '140'), null, 'price already typed');
  assert.equal(splitTypedQuickAdd('Cortado', ''), null, 'no trailing price');
  assert.equal(splitTypedQuickAdd('Kola 330 ml', ''), null, 'number not at the end');
  assert.equal(splitTypedQuickAdd('', ''), null);
});
