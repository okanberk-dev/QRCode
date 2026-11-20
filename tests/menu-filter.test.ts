// Menu Studio spec §5.7 / §8.5 — Turkish-folding search, filter chips, completion linger.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  filterCounts,
  filterMenu,
  foldSearch,
  itemMatches,
  searchTokens,
  visibleItemIds,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-filter';

const item = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: id,
  description: null as string | null,
  priceCents: 100,
  currency: 'TRY',
  imageUrl: 'data:image/png;base64,x' as string | null,
  badges: [] as string[],
  isAvailable: true,
  isOutOfStock: false,
  sortOrder: 0,
  ...over,
});
const cat = (id: string, name: string, items: ReturnType<typeof item>[], isVisible = true) => ({
  id, name, description: null, sortOrder: 0, isVisible, items,
});

const menu = () => [
  cat('hot', 'Sıcak İçecekler', [
    item('cay', { name: 'Çay', description: 'Demlik çay' }),
    item('kahve', { name: 'Türk Kahvesi', isOutOfStock: true }),
    item('salep', { name: 'Salep', isAvailable: false, imageUrl: null }),
  ]),
  cat('cold', 'Soğuk', [
    item('ayran', { name: 'Ayran', priceCents: 0, description: '  ' }),
    item('tmp_1', { name: 'Ayran bekleyen', imageUrl: null }),
  ]),
  cat('secret', 'Gizli Menü', [item('x', { name: 'Işık Tatlısı' })], false),
  cat('empty', 'Boş', []),
];

test('foldSearch: Turkish letters fold to ASCII, case and spaces normalised', () => {
  assert.equal(foldSearch('ÇAY'), 'cay');
  assert.equal(foldSearch('ışık'), 'isik');
  assert.equal(foldSearch('IŞIK'), 'isik');
  assert.equal(foldSearch('İstanbul'), 'istanbul');
  assert.equal(foldSearch('i̇stanbul'), 'istanbul', 'i + combining dot');
  assert.equal(foldSearch('  Şiş   Köfte  '), 'sis kofte');
  assert.equal(foldSearch('Güveç Âşık Îmâ Ûmut'), 'guvec asik ima umut');
  assert.deepEqual(searchTokens('  '), []);
  assert.deepEqual(searchTokens('Türk  kahve'), ['turk', 'kahve']);
});

test('itemMatches: every token must match name, description or category name', () => {
  const cay = menu()[0].items[0];
  assert.equal(itemMatches(cay, 'Sıcak İçecekler', ['cay'], 'all', true), true);
  assert.equal(itemMatches(cay, 'Sıcak İçecekler', ['demlik'], 'all', true), true, 'description');
  assert.equal(itemMatches(cay, 'Sıcak İçecekler', ['icecek'], 'all', true), true, 'category name');
  assert.equal(itemMatches(cay, 'Sıcak İçecekler', ['cay', 'sicak'], 'all', true), true, 'AND');
  assert.equal(itemMatches(cay, 'Sıcak İçecekler', ['cay', 'soguk'], 'all', true), false);
  assert.equal(itemMatches(cay, 'Sıcak İçecekler', [], 'soldOut', true), false, 'filter applies too');
});

test('each filter', () => {
  const [hot, cold, secret] = menu();
  const [cay, kahve, salep] = hot.items;
  const ayran = cold.items[0];
  const isik = secret.items[0];
  assert.equal(itemMatches(kahve, hot.name, [], 'soldOut', true), true);
  assert.equal(itemMatches(cay, hot.name, [], 'soldOut', true), false);
  assert.equal(itemMatches({ ...kahve, isAvailable: false }, hot.name, [], 'soldOut', true), false, 'hidden is not sold out');
  assert.equal(itemMatches(salep, hot.name, [], 'hidden', true), true);
  assert.equal(itemMatches(isik, secret.name, [], 'hidden', false), true, 'hidden category');
  assert.equal(itemMatches(salep, hot.name, [], 'noPhoto', true), true);
  assert.equal(itemMatches(ayran, cold.name, [], 'noDescription', true), true, 'blank description');
  assert.equal(itemMatches(cay, hot.name, [], 'noDescription', true), false);
  assert.equal(itemMatches(ayran, cold.name, [], 'zeroPrice', true), true);
  assert.equal(itemMatches(cay, hot.name, [], 'zeroPrice', true), false);
});

test('filterCounts: whole menu, pending rows excluded', () => {
  assert.deepEqual(filterCounts(menu()), { soldOut: 1, hidden: 2, noPhoto: 1, noDescription: 4, zeroPrice: 1 });
});

test('filterMenu inactive: every section (empty ones too), all rows', () => {
  const result = filterMenu(menu(), '  ', 'all');
  assert.equal(result.active, false);
  assert.deepEqual(result.sections.map((s) => s.category.id), ['hot', 'cold', 'secret', 'empty']);
  assert.equal(result.total, 6);
});

test('filterMenu active: matching rows only, empty sections dropped, pending rows hidden', () => {
  const search = filterMenu(menu(), 'ayran', 'all');
  assert.equal(search.active, true);
  assert.deepEqual(search.sections.map((s) => s.category.id), ['cold']);
  assert.deepEqual(search.sections[0].items.map((i) => i.id), ['ayran']);
  assert.equal(search.total, 1);

  const hidden = filterMenu(menu(), '', 'hidden');
  assert.deepEqual(hidden.sections.map((s) => [s.category.id, s.items.map((i) => i.id)]), [['hot', ['salep']], ['secret', ['x']]]);

  const both = filterMenu(menu(), 'işik', 'hidden');
  assert.deepEqual(both.sections.map((s) => s.items.map((i) => i.id)), [['x']]);
});

test('filterMenu keepIds: a row that stopped matching lingers', () => {
  const m = menu();
  m[0].items[2] = { ...m[0].items[2], imageUrl: 'data:new' }; // Salep just got a photo
  const without = filterMenu(m, '', 'noPhoto');
  assert.deepEqual(without.sections.map((s) => s.items.map((i) => i.id)), []);
  const lingering = filterMenu(m, '', 'noPhoto', { keepIds: new Set(['salep']) });
  assert.deepEqual(lingering.sections.map((s) => s.items.map((i) => i.id)), [['salep']]);
});

test('visibleItemIds: visual order, collapsed sections and pending rows skipped', () => {
  const { sections } = filterMenu(menu(), '', 'all');
  assert.deepEqual(visibleItemIds(sections, new Set()), ['cay', 'kahve', 'salep', 'ayran', 'x']);
  assert.deepEqual(visibleItemIds(sections, new Set(['hot'])), ['ayran', 'x']);
});
