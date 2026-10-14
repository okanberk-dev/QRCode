// CLAUDE.md §32 — "Liste yapıştır" line parser. Pure, deterministic.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MENU_BULK_MAX_ITEMS,
  parseMenuLines,
  type ParsedMenuLine,
} from '../src/lib/menu-bulk-parse';

function one(line: string): ParsedMenuLine {
  const { rows } = parseMenuLines(line);
  assert.equal(rows.length, 1, `expected exactly one row for ${JSON.stringify(line)}`);
  return rows[0];
}

function ok(line: string, name: string, priceCents: number) {
  const row = one(line);
  assert.equal(row.error, undefined, `unexpected error ${row.error} for ${JSON.stringify(line)}`);
  assert.equal(row.name, name);
  assert.equal(row.priceCents, priceCents);
}

function bad(line: string, error: string) {
  const row = one(line);
  assert.equal(row.error, error, `for ${JSON.stringify(line)}`);
  assert.equal(row.name, undefined);
  assert.equal(row.priceCents, undefined);
}

test('parseMenuLines: name followed by an integer or decimal price', () => {
  ok('Klasik Burger 185', 'Klasik Burger', 18500);
  ok('Cheeseburger 215,50', 'Cheeseburger', 21550);
  ok('Latte 62.5', 'Latte', 6250);
});

test('parseMenuLines: separators between name and price are dropped', () => {
  ok('Ayran - 35', 'Ayran', 3500);
  ok('Ayran: 35', 'Ayran', 3500);
  ok('Ayran | 35', 'Ayran', 3500);
  ok('Ayran – 35', 'Ayran', 3500);
  ok('Ayran — 35', 'Ayran', 3500);
  ok('Ayran; 35', 'Ayran', 3500);
  ok('Coca-Cola - 40', 'Coca-Cola', 4000);
});

test('parseMenuLines: dot leaders are separators', () => {
  ok('Burger ........ 185', 'Burger', 18500);
  ok('Burger........185', 'Burger', 18500);
});

test('parseMenuLines: currency markers are accepted before or after the price', () => {
  ok('Çay 20 TL', 'Çay', 2000);
  ok('Çay 20TL', 'Çay', 2000);
  ok('Çay 20 tl', 'Çay', 2000);
  ok('Kahve 45,5 ₺', 'Kahve', 4550);
  ok('Kahve 45,50₺', 'Kahve', 4550);
  ok('Su 10 TRY', 'Su', 1000);
  ok('Su ₺10', 'Su', 1000);
  ok('Su TL 10', 'Su', 1000);
  ok('Su ₺ 10', 'Su', 1000);
});

test('parseMenuLines: only the LAST number is the price', () => {
  ok('Pizza 30 cm 250', 'Pizza 30 cm', 25000);
  ok('Su 0,5 lt 15', 'Su 0,5 lt', 1500);
});

test('parseMenuLines: TR thousands formats', () => {
  ok('Menü 1.250,00', 'Menü', 125000);
  ok('Menü 1.250', 'Menü', 125000);
  ok('Tabak 12.345,50 TL', 'Tabak', 1234550);
});

test('parseMenuLines: ambiguous 1,250 is a bad price, never guessed', () => {
  bad('Kola 1,250', 'bad_price');
});

test('parseMenuLines: leading bullets are stripped', () => {
  ok('- Su 10', 'Su', 1000);
  ok('• Su 10', 'Su', 1000);
  ok('* Su 10', 'Su', 1000);
  ok('· Su 10', 'Su', 1000);
  ok('– Su 10', 'Su', 1000);
  ok('— Su 10', 'Su', 1000);
  ok('  -  Su 10', 'Su', 1000);
});

test('parseMenuLines: blank and bullet-only lines are ignored, order is kept', () => {
  const { rows, overLimit } = parseMenuLines('\n\nÇay 20\n   \n-\nAyran 35\n\n');
  assert.equal(overLimit, false);
  assert.deepEqual(
    rows.map((r) => r.name),
    ['Çay', 'Ayran'],
  );
});

test('parseMenuLines: empty input', () => {
  assert.deepEqual(parseMenuLines(''), { rows: [], overLimit: false });
  assert.deepEqual(parseMenuLines('  \n \n'), { rows: [], overLimit: false });
});

test('parseMenuLines: a line without a price', () => {
  bad('Sadece Ad', 'no_price');
  bad('Çay (bardak)', 'no_price');
  bad('Kola 330ml', 'no_price');
});

test('parseMenuLines: a price glued to the name is not a price', () => {
  bad('Ayran35', 'no_price');
});

test('parseMenuLines: a price without a name', () => {
  bad('250', 'no_name');
  bad('₺250', 'no_name');
  bad('- 250', 'no_name');
});

test('parseMenuLines: names longer than 120 characters', () => {
  assert.equal(one(`${'A'.repeat(120)} 10`).error, undefined);
  bad(`${'A'.repeat(121)} 10`, 'name_too_long');
});

test('parseMenuLines: error rows keep the cleaned line for display', () => {
  const row = one('- Sadece Ad');
  assert.equal(row.error, 'no_price');
  assert.equal(row.line, 'Sadece Ad');
});

test('parseMenuLines: more than 30 non-blank lines flags overLimit and keeps the first 30', () => {
  const lines = Array.from({ length: 31 }, (_, i) => `Ürün ${i + 1} ${i + 10}`);
  const { rows, overLimit } = parseMenuLines(lines.join('\n'));
  assert.equal(overLimit, true);
  assert.equal(rows.length, MENU_BULK_MAX_ITEMS);
  assert.equal(rows[0].name, 'Ürün 1');
  assert.equal(rows[29].name, 'Ürün 30');
});

test('parseMenuLines: exactly 30 lines is fine; blank lines do not count', () => {
  const lines: string[] = [];
  for (let i = 0; i < 30; i += 1) {
    lines.push(`Ürün ${i + 1} ${i + 10}`, '');
  }
  const { rows, overLimit } = parseMenuLines(lines.join('\n'));
  assert.equal(overLimit, false);
  assert.equal(rows.length, 30);
});

test('parseMenuLines: custom limit', () => {
  const { rows, overLimit } = parseMenuLines('A 1\nB 2\nC 3', 2);
  assert.equal(overLimit, true);
  assert.equal(rows.length, 2);
});

test('parseMenuLines: Windows and old-Mac line endings', () => {
  const { rows } = parseMenuLines('Çay 20\r\nAyran 35\rKahve 45\n');
  assert.deepEqual(
    rows.map((r) => [r.name, r.priceCents]),
    [
      ['Çay', 2000],
      ['Ayran', 3500],
      ['Kahve', 4500],
    ],
  );
});

test('parseMenuLines: extra spaces, tabs and non-breaking spaces collapse', () => {
  ok('  Klasik   Burger \t 185  ', 'Klasik Burger', 18500);
  ok('Klasik\u00a0Burger\u00a0185', 'Klasik Burger', 18500);
});

test('parseMenuLines: price 0 is allowed; absurd prices are not', () => {
  ok('Ücretsiz çay 0', 'Ücretsiz çay', 0);
  bad('Altın tabak 99999999', 'bad_price');
});
