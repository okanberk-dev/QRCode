// Menu builder: the pure rules of the item editor (spec 4.6) — price field,
// what counts as unsaved, and which fields a PATCH carries.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCreatePayload,
  buildEditPatch,
  checkPrice,
  currencySymbol,
  hasExtraOptions,
  initialItemFormValues,
  isItemFormDirty,
  nextItemFormValues,
  priceEcho,
  priceToInput,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-item-form';

const existing = {
  categoryId: 'cat1',
  name: 'Klasik Burger',
  description: 'Dana köfte',
  priceCents: 18550,
  badges: ['populer'],
  allergens: ['gluten', 'sut'],
  isAvailable: true,
  isOutOfStock: false,
  imageUrl: 'data:image/webp;base64,AAAA',
};

test('currencySymbol: the four common currencies get a symbol, others their code', () => {
  assert.equal(currencySymbol('TRY'), '₺');
  assert.equal(currencySymbol('usd'), '$');
  assert.equal(currencySymbol('EUR'), '€');
  assert.equal(currencySymbol('GBP'), '£');
  assert.equal(currencySymbol('CHF'), 'CHF');
  assert.equal(currencySymbol(undefined), '₺');
});

test('checkPrice: empty, invalid, zero and normal amounts', () => {
  assert.deepEqual(checkPrice(''), { kind: 'empty' });
  assert.deepEqual(checkPrice('   '), { kind: 'empty' });
  assert.deepEqual(checkPrice('abc'), { kind: 'invalid' });
  assert.deepEqual(checkPrice('1,250'), { kind: 'invalid' });
  assert.deepEqual(checkPrice('0'), { kind: 'ok', cents: 0, zero: true });
  assert.deepEqual(checkPrice('185'), { kind: 'ok', cents: 18500, zero: false });
  assert.deepEqual(checkPrice('185,50'), { kind: 'ok', cents: 18550, zero: false });
  assert.deepEqual(checkPrice('1.250'), { kind: 'ok', cents: 125000, zero: false });
});

test('priceEcho: only for text with a dot or comma, shows the amount that was understood', () => {
  assert.equal(priceEcho('185', 'TRY', true), null);
  assert.equal(priceEcho('abc', 'TRY', true), null);
  assert.equal(priceEcho('', 'TRY', true), null);
  const echo = priceEcho('1.250', 'TRY', true);
  assert.ok(echo && echo.includes('1.250') && echo.includes('₺'), `got ${echo}`);
  const sub = priceEcho('185,5', 'TRY', true);
  assert.ok(sub && sub.includes('185,5'), `got ${sub}`);
});

test('priceToInput: whole amounts without decimals, others in the owner’s decimal mark', () => {
  assert.equal(priceToInput(18500, true), '185');
  assert.equal(priceToInput(18550, true), '185,50');
  assert.equal(priceToInput(18550, false), '185.50');
  assert.equal(priceToInput(0, true), '0');
  assert.equal(priceToInput(125000, true), '1250');
  assert.equal(priceToInput(undefined, true), '');
  // What is shown must parse back to the same amount.
  for (const cents of [5, 99, 18550, 125050, 999999]) {
    const text = priceToInput(cents, true);
    assert.equal(checkPrice(text).kind === 'ok' && (checkPrice(text) as { cents: number }).cents, cents, text);
  }
});

test('initialItemFormValues: a new item starts with an empty price, an existing one shows its own', () => {
  const fresh = initialItemFormValues('create', {}, 'catA', true);
  assert.equal(fresh.price, '');
  assert.equal(fresh.categoryId, 'catA');
  assert.equal(fresh.isAvailable, true);
  assert.equal(fresh.isOutOfStock, false);
  const edit = initialItemFormValues('edit', existing, 'catA', true);
  assert.equal(edit.price, '185,50');
  assert.equal(edit.categoryId, 'cat1');
});

test('isItemFormDirty (create): untouched is clean, any of name/price/description/photo is dirty', () => {
  const init = initialItemFormValues('create', {}, 'catA', true);
  assert.equal(isItemFormDirty('create', init, init), false);
  assert.equal(isItemFormDirty('create', init, { ...init, name: 'Çay' }), true);
  assert.equal(isItemFormDirty('create', init, { ...init, price: '20' }), true);
  assert.equal(isItemFormDirty('create', init, { ...init, description: 'x' }), true);
  assert.equal(isItemFormDirty('create', init, { ...init, imageUrl: 'data:image/webp;base64,A' }), true);
  // Only the category changed: nothing worth keeping.
  assert.equal(isItemFormDirty('create', init, { ...init, categoryId: 'catB' }), false);
});

test('isItemFormDirty (edit): any difference from what was loaded', () => {
  const init = initialItemFormValues('edit', existing, 'catA', true);
  assert.equal(isItemFormDirty('edit', init, init), false);
  assert.equal(isItemFormDirty('edit', init, { ...init, name: 'Klasik Burger ' }), false, 'trailing space only');
  assert.equal(isItemFormDirty('edit', init, { ...init, name: 'Klasik' }), true);
  assert.equal(isItemFormDirty('edit', init, { ...init, price: '185.5' }), false, 'same amount, different spelling');
  assert.equal(isItemFormDirty('edit', init, { ...init, price: '190' }), true);
  assert.equal(isItemFormDirty('edit', init, { ...init, price: 'abc' }), true, 'unparseable counts');
  assert.equal(isItemFormDirty('edit', init, { ...init, badges: ['populer'] }), false);
  assert.equal(isItemFormDirty('edit', init, { ...init, badges: [] }), true);
  assert.equal(isItemFormDirty('edit', init, { ...init, allergens: ['sut', 'gluten'] }), false, 'order is irrelevant');
});

test('buildEditPatch: nothing changed → empty patch (the photo is never re-sent)', () => {
  const init = initialItemFormValues('edit', existing, 'catA', true);
  assert.deepEqual(buildEditPatch(init, { ...init }), {});
  const renamed = buildEditPatch(init, { ...init, name: 'Çift Burger' });
  assert.deepEqual(renamed, { name: 'Çift Burger' });
  assert.equal('imageUrl' in renamed, false);
});

test('buildEditPatch: only the changed fields', () => {
  const init = initialItemFormValues('edit', existing, 'catA', true);
  const patch = buildEditPatch(init, {
    ...init,
    price: '200',
    description: '  ',
    isOutOfStock: true,
    categoryId: 'cat2',
    imageUrl: null,
    allergens: ['gluten'],
  });
  assert.deepEqual(patch, {
    categoryId: 'cat2',
    description: null,
    priceCents: 20000,
    imageUrl: null,
    allergens: ['gluten'],
    isOutOfStock: true,
  });
});

test('buildEditPatch: an unparseable price is left out of the patch', () => {
  const init = initialItemFormValues('edit', existing, 'catA', true);
  assert.deepEqual(buildEditPatch(init, { ...init, price: 'abc' }), {});
});

test('buildCreatePayload: every field, text cleaned', () => {
  const values = {
    ...initialItemFormValues('create', {}, 'catA', true),
    name: '  Ayran ',
    description: '   ',
    price: '35',
  };
  assert.deepEqual(buildCreatePayload(values, 3500), {
    categoryId: 'catA',
    name: 'Ayran',
    description: null,
    priceCents: 3500,
    imageUrl: null,
    badges: [],
    allergens: [],
    isAvailable: true,
    isOutOfStock: false,
  });
});

test('nextItemFormValues: keeps the category, blanks everything else', () => {
  const next = nextItemFormValues({
    categoryId: 'catB',
    name: 'Çay',
    description: 'x',
    price: '20',
    badges: ['yeni'],
    allergens: ['sut'],
    isAvailable: false,
    isOutOfStock: true,
    imageUrl: 'data:image/webp;base64,A',
  });
  assert.deepEqual(next, {
    categoryId: 'catB',
    name: '',
    description: '',
    price: '',
    badges: [],
    allergens: [],
    isAvailable: true,
    isOutOfStock: false,
    imageUrl: null,
  });
});

test('hasExtraOptions: opens "more options" only when something in there is set', () => {
  const base = initialItemFormValues('create', {}, 'catA', true);
  assert.equal(hasExtraOptions(base), false);
  assert.equal(hasExtraOptions({ ...base, description: 'x' }), true);
  assert.equal(hasExtraOptions({ ...base, badges: ['yeni'] }), true);
  assert.equal(hasExtraOptions({ ...base, allergens: ['sut'] }), true);
  assert.equal(hasExtraOptions({ ...base, isAvailable: false }), true);
  assert.equal(hasExtraOptions({ ...base, isOutOfStock: true }), true);
  assert.equal(hasExtraOptions({ ...base, imageUrl: 'data:image/webp;base64,A' }), false, 'an uploaded photo shows in the main part');
  assert.equal(hasExtraOptions({ ...base, imageUrl: 'https://example.com/a.jpg' }), true, 'a link lives in the extras');
});
