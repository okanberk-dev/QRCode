// Menu Studio spec §5.7 / §7.7 — "Fiyatları değiştir" (bulk price changes).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyPriceOp,
  parsePercentInput,
  previewPriceOp,
  roundTo,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-bulk-price';

test('parsePercentInput: "10", "7,5", "7.5", with a % sign', () => {
  assert.equal(parsePercentInput('10'), 10);
  assert.equal(parsePercentInput('7,5'), 7.5);
  assert.equal(parsePercentInput('7.5'), 7.5);
  assert.equal(parsePercentInput(' %10 '), 10);
  assert.equal(parsePercentInput('12,5 %'), 12.5);
  assert.equal(parsePercentInput('500'), 500);
});

test('parsePercentInput: invalid, zero, negative, above 500 → null', () => {
  for (const raw of ['', 'abc', '0', '0,0', '-5', '1.2.3', '10%%', '501', '1e3', '7,5,1']) {
    assert.equal(parsePercentInput(raw), null, raw);
  }
});

test('roundTo: half up to the step; 0 = no rounding', () => {
  assert.equal(roundTo(12345, 0), 12345);
  assert.equal(roundTo(12349, 100), 12300);
  assert.equal(roundTo(12350, 100), 12400);
  assert.equal(roundTo(12249, 500), 12000);
  assert.equal(roundTo(12250, 500), 12500);
  assert.equal(roundTo(12499, 1000), 12000);
  assert.equal(roundTo(12500, 1000), 13000);
});

test('applyPriceOp: percent up / down', () => {
  assert.equal(applyPriceOp(10000, { kind: 'percent', direction: 'up', value: 10 }, 0), 11000);
  assert.equal(applyPriceOp(10000, { kind: 'percent', direction: 'down', value: 7.5 }, 0), 9250);
  assert.equal(applyPriceOp(1999, { kind: 'percent', direction: 'up', value: 10 }, 0), 2199, '2198.9 rounds to 2199');
  assert.equal(applyPriceOp(1000, { kind: 'percent', direction: 'up', value: 0.05 }, 0), 1001, '1000.5 rounds half up');
  // +10 % rounded to 5 ₺
  assert.equal(applyPriceOp(32000, { kind: 'percent', direction: 'up', value: 10 }, 500), 35000);
  assert.equal(applyPriceOp(18500, { kind: 'percent', direction: 'up', value: 10 }, 500), 20500);
});

test('applyPriceOp: amount up / down, fixed, clamp at 0', () => {
  assert.equal(applyPriceOp(10000, { kind: 'amount', direction: 'up', cents: 1500 }, 0), 11500);
  assert.equal(applyPriceOp(10000, { kind: 'amount', direction: 'down', cents: 2550 }, 100), 7500);
  assert.equal(applyPriceOp(1000, { kind: 'amount', direction: 'down', cents: 5000 }, 0), 0);
  assert.equal(applyPriceOp(10000, { kind: 'percent', direction: 'down', value: 150 }, 0), 0);
  assert.equal(applyPriceOp(4321, { kind: 'fixed', cents: 9900 }, 0), 9900);
  assert.equal(applyPriceOp(4321, { kind: 'fixed', cents: 0 }, 500), 0);
});

const items = [
  { id: 'a', name: 'Adana Kebap', priceCents: 32000, currency: 'TRY' },
  { id: 'b', name: 'Ayran', priceCents: 3500, currency: 'TRY' },
  { id: 'c', name: 'Su', priceCents: 0, currency: 'TRY' },
];

test('previewPriceOp: changes, unchanged count, zero warning', () => {
  const up = previewPriceOp(items, { kind: 'percent', direction: 'up', value: 10 }, 500);
  assert.deepEqual(up.changes, [
    { id: 'a', name: 'Adana Kebap', from: 32000, to: 35000 },
    { id: 'b', name: 'Ayran', from: 3500, to: 4000 },
  ]);
  assert.equal(up.unchanged, 1, '0 stays 0');
  assert.equal(up.zeroCount, 0);
  assert.equal(up.mixedCurrency, false);

  const zero = previewPriceOp(items, { kind: 'fixed', cents: 0 }, 0);
  assert.equal(zero.changes.length, 2);
  assert.equal(zero.zeroCount, 2);
  assert.equal(zero.unchanged, 1);

  const same = previewPriceOp(items, { kind: 'fixed', cents: 3500 }, 0);
  assert.equal(same.unchanged, 1);
  assert.deepEqual(same.changes.map((c) => c.id), ['a', 'c']);
});

test('previewPriceOp: mixedCurrency', () => {
  const mixed = previewPriceOp([...items, { id: 'd', name: 'Wine', priceCents: 1000, currency: 'EUR' }], {
    kind: 'percent', direction: 'up', value: 5,
  }, 0);
  assert.equal(mixed.mixedCurrency, true);
  assert.equal(previewPriceOp([{ ...items[0], currency: 'try' }, items[1]], { kind: 'fixed', cents: 1 }, 0).mixedCurrency, false);
});
