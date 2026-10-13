// CLAUDE.md §32 — pure helper, no DB. Pins the price parser used by the menu
// editor and the "Liste yapıştır" bulk parser, including the Turkish
// thousands-dot case ("1.250" = 1250 TL) that used to be rejected.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parsePriceInput } from '../src/lib/format';

test('parsePriceInput: plain integers and decimals', () => {
  assert.equal(parsePriceInput('185'), 18500);
  assert.equal(parsePriceInput('185,50'), 18550);
  assert.equal(parsePriceInput('185.50'), 18550);
  assert.equal(parsePriceInput('1.25'), 125);
  assert.equal(parsePriceInput('0'), 0);
  assert.equal(parsePriceInput('185.'), 18500);
});

test('parsePriceInput: TR thousands dot (single dot + exactly three digits)', () => {
  assert.equal(parsePriceInput('1.250'), 125000);
  assert.equal(parsePriceInput('12.345'), 1234500);
  assert.equal(parsePriceInput('123.456'), 12345600);
  assert.equal(parsePriceInput('1.000'), 100000);
});

test('parsePriceInput: a leading zero is never a thousands group', () => {
  assert.equal(parsePriceInput('0.250'), null);
  assert.equal(parsePriceInput('0.5'), 50);
});

test('parsePriceInput: mixed separators keep their existing meaning', () => {
  assert.equal(parsePriceInput('1.250,50'), 125050);
  assert.equal(parsePriceInput('1,234.56'), 123456);
  assert.equal(parsePriceInput('1.234.567'), 123456700);
});

test('parsePriceInput: comma + three digits is ambiguous and rejected', () => {
  assert.equal(parsePriceInput('1,250'), null);
});

test('parsePriceInput: more than two decimals is not a price', () => {
  assert.equal(parsePriceInput('1.2345'), null);
  assert.equal(parsePriceInput('1.2'), 120);
});

test('parsePriceInput: whitespace inside the number is ignored', () => {
  assert.equal(parsePriceInput('1 250'), 125000);
  assert.equal(parsePriceInput('  185 '), 18500);
});

test('parsePriceInput: invalid input', () => {
  assert.equal(parsePriceInput(''), null);
  assert.equal(parsePriceInput('   '), null);
  assert.equal(parsePriceInput('abc'), null);
  assert.equal(parsePriceInput('-5'), null);
  assert.equal(parsePriceInput('10000001'), null);
  assert.equal(parsePriceInput(undefined as unknown as string), null);
});

test('parsePriceInput: upper bound is inclusive', () => {
  assert.equal(parsePriceInput('10000000'), 1_000_000_000);
});
