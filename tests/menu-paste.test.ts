// Menu Studio spec §5.7 / §8.3 — pasted lists with category headers.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isMultiLinePaste,
  parsePasteBlock,
  parseSingleLine,
  pastePlan,
  revalidateRow,
  setupCategoriesFromPaste,
  type PasteSection,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-paste';

const summary = (sections: PasteSection[]) =>
  sections.map((s) => ({
    header: s.header,
    rows: s.rows.map((r) => (r.error ? `${r.line} !${r.error}` : `${r.name}=${r.priceCents}`)),
  }));

test('isMultiLinePaste: two or more non-blank lines', () => {
  assert.equal(isMultiLinePaste('Ayran 35\nÇay 20'), true);
  assert.equal(isMultiLinePaste('Ayran 35\r\n\r\nÇay 20'), true);
  assert.equal(isMultiLinePaste('Ayran 35'), false);
  assert.equal(isMultiLinePaste('Ayran 35\n\n   \n'), false);
  assert.equal(isMultiLinePaste('- \nAyran 35'), false, 'a bullet-only line is blank');
  assert.equal(isMultiLinePaste(''), false);
});

test('parseSingleLine: one readable line fills name and price', () => {
  assert.deepEqual(parseSingleLine('Mercimek Çorbası 90'), { name: 'Mercimek Çorbası', priceCents: 9000 });
  assert.deepEqual(parseSingleLine('  Ayran 35,50 TL \n'), { name: 'Ayran', priceCents: 3550 });
  assert.equal(parseSingleLine('Ayran'), null, 'no price');
  assert.equal(parseSingleLine('Kola 1,250'), null, 'ambiguous price');
  assert.equal(parseSingleLine('Ayran 35\nÇay 20'), null, 'multi-line');
  assert.equal(parseSingleLine(''), null);
});

test('parsePasteBlock: colon header, header followed by a priced line, trailing no-price line is an error', () => {
  const { sections } = parsePasteBlock('Çorbalar:\nMercimek 90\nEzogelin 95\nTatlılar\nBaklava 180\nKünefe', true);
  assert.deepEqual(summary(sections), [
    { header: 'Çorbalar', rows: ['Mercimek=9000', 'Ezogelin=9500'] },
    { header: 'Tatlılar', rows: ['Baklava=18000', 'Künefe !no_price'] },
  ]);
  assert.equal(sections[0].asCategory, true);
  assert.equal(sections[0].overLimit, false);
  assert.equal(sections[0].rows[0].price, '90');
});

test('parsePasteBlock: lines before the first header form a headerless section', () => {
  const { sections } = parsePasteBlock('Ayran 35\nÇay 20\n\n## Tatlılar:\n- Baklava 180', false);
  assert.deepEqual(summary(sections), [
    { header: null, rows: ['Ayran=3500', 'Çay=2000'] },
    { header: 'Tatlılar', rows: ['Baklava=18000'] },
  ]);
  assert.equal(sections[0].asCategory, false);
});

test('parsePasteBlock: a no-price line followed by another no-price line is an error, not a header', () => {
  const { sections } = parsePasteBlock('Notlar\nİçecekler\nAyran 35', true);
  assert.deepEqual(summary(sections), [
    { header: null, rows: ['Notlar !no_price'] },
    { header: 'İçecekler', rows: ['Ayran=3500'] },
  ]);
});

test('parsePasteBlock: unreadable rows keep a best-effort name / price split for editing', () => {
  const { sections } = parsePasteBlock('Kola 1,250\nAyran 35', true);
  const kola = sections[0].rows[0];
  assert.equal(kola.error, 'bad_price');
  assert.equal(kola.name, 'Kola');
  assert.equal(kola.price, '1,250');
  assert.equal(kola.priceCents, null);
});

test('parsePasteBlock: overLimit per section beyond 30 readable items', () => {
  const lines = Array.from({ length: 31 }, (_, i) => `Ürün ${i + 1} - ${10 + i}`).join('\n');
  const { sections } = parsePasteBlock(`${lines}\nTatlılar:\nBaklava 180`, true);
  assert.equal(sections[0].rows.length, 31);
  assert.equal(sections[0].overLimit, true);
  assert.equal(sections[1].overLimit, false);
  const plan = pastePlan(sections);
  assert.equal(plan.intoTarget.length, 30, 'capped at 30 per list');
  assert.deepEqual(plan.newCategories.map((c) => c.items.length), [1]);
});

test('revalidateRow: re-reads edited rows', () => {
  const { sections } = parsePasteBlock('Kola 1,250\nAyran 35', true);
  const fixed = revalidateRow({ ...sections[0].rows[0], price: '12,50' }, true);
  assert.equal(fixed.error, null);
  assert.equal(fixed.priceCents, 1250);
  assert.equal(fixed.price, '12,50');
  const fixedEn = revalidateRow({ ...sections[0].rows[0], price: '1250' }, false);
  assert.equal(fixedEn.priceCents, 125000);

  const ayran = sections[0].rows[1];
  assert.equal(revalidateRow({ ...ayran, name: '   ' }, true).error, 'no_name');
  assert.equal(revalidateRow({ ...ayran, name: 'x'.repeat(121) }, true).error, 'name_too_long');
  assert.equal(revalidateRow({ ...ayran, price: '' }, true).error, 'no_price');
  const bad = revalidateRow({ ...ayran, price: 'abc' }, true);
  assert.equal(bad.error, 'bad_price');
  assert.equal(bad.priceCents, null);
  assert.equal(bad.price, 'abc', 'the typed text is kept');
  assert.equal(revalidateRow({ ...ayran, name: '  Soğuk   Ayran ' }, true).name, 'Soğuk Ayran');
});

test('pastePlan: headers become categories; unticked headers merge; errors and empty headers dropped', () => {
  const { sections } = parsePasteBlock(
    'Ayran 35\nÇorbalar:\nMercimek 90\nBoş:\nTatlılar\nBaklava 180\nKünefe',
    true,
  );
  const plan = pastePlan(sections);
  assert.deepEqual(plan.intoTarget, [{ name: 'Ayran', priceCents: 3500 }]);
  assert.deepEqual(plan.newCategories, [
    { name: 'Çorbalar', items: [{ name: 'Mercimek', priceCents: 9000 }] },
    { name: 'Tatlılar', items: [{ name: 'Baklava', priceCents: 18000 }] },
  ]);

  const merged = pastePlan(sections.map((s) => (s.header === 'Tatlılar' ? { ...s, asCategory: false } : s)));
  assert.deepEqual(merged.intoTarget.map((i) => i.name), ['Ayran', 'Baklava']);
  assert.deepEqual(merged.newCategories.map((c) => c.name), ['Çorbalar']);
});

test('setupCategoriesFromPaste: one category per section, default name for headerless lines', () => {
  const { sections } = parsePasteBlock('Ayran 35\nÇay 20,50\nTatlılar:\nBaklava 180\nKünefe', true);
  const tr = setupCategoriesFromPaste(sections, true);
  assert.deepEqual(tr.map((c) => [c.name, c.itemsText]), [
    ['Ürünler', 'Ayran 35\nÇay 20,50'],
    ['Tatlılar', 'Baklava 180\nKünefe'],
  ]);
  assert.ok(tr.every((c) => typeof c.key === 'string' && c.key.length > 0));
  assert.equal(setupCategoriesFromPaste(sections, false)[0].name, 'Items');
  assert.deepEqual(setupCategoriesFromPaste(parsePasteBlock('', true).sections, true), []);
});
