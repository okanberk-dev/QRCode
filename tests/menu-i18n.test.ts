// Menu Studio spec §14 — one TR/EN copy module with full parity.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { count, getMenuCopy } from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-i18n';

type Leaf = { path: string; value: unknown };

function leaves(node: unknown, path = ''): Leaf[] {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    return Object.keys(node as Record<string, unknown>)
      .sort()
      .flatMap((key) => leaves((node as Record<string, unknown>)[key], path ? `${path}.${key}` : key));
  }
  return [{ path, value: node }];
}

const tr = getMenuCopy('tr');
const en = getMenuCopy('en');

test('TR and EN have the same deep key set', () => {
  assert.deepEqual(
    leaves(en).map((l) => l.path),
    leaves(tr).map((l) => l.path),
  );
  assert.ok(leaves(tr).length > 300, 'the module is complete, not a stub');
});

test('every leaf is a non-empty string or a function; function leaves have equal arity', () => {
  const enByPath = new Map(leaves(en).map((l) => [l.path, l.value]));
  for (const { path, value } of leaves(tr)) {
    const other = enByPath.get(path);
    assert.equal(typeof other, typeof value, `${path}: same kind`);
    if (typeof value === 'string') {
      assert.ok(value.trim().length > 0, `tr.${path} is empty`);
      assert.ok((other as string).trim().length > 0, `en.${path} is empty`);
    } else {
      assert.equal(typeof value, 'function', `${path} is a string or a function`);
      assert.equal((value as () => unknown).length, (other as () => unknown).length, `${path}: same arity`);
    }
  }
});

test('function leaves return non-empty text', () => {
  for (const copy of [tr, en]) {
    for (const { path, value } of leaves(copy)) {
      if (typeof value !== 'function') continue;
      const args = Array.from({ length: (value as () => unknown).length }, (_, i) => (i % 2 === 0 ? 2 : 'Ayran'));
      const out = (value as (...a: unknown[]) => unknown)(...args);
      assert.equal(typeof out, 'string', path);
      assert.ok((out as string).trim().length > 0, path);
    }
  }
});

test('EN plurals; TR has none', () => {
  assert.equal(en.fmt.itemCount(1), '1 item');
  assert.equal(en.fmt.itemCount(2), '2 items');
  assert.equal(en.fmt.categoryCount(1), '1 category');
  assert.equal(tr.fmt.itemCount(1), '1 ürün');
  assert.equal(tr.fmt.itemCount(5), '5 ürün');
  assert.equal(count(1, 'line', 'lines'), '1 line');
  assert.equal(count(0, 'line', 'lines'), '0 lines');
  assert.equal(en.fmt.bulkPrice.apply(1), 'Update 1 item');
  assert.equal(en.selection.count(3), '3 selected');
});

test('glossary strings are present (§14.2)', () => {
  assert.deepEqual([tr.item.available, tr.item.soldOut, tr.item.hidden], ['Satışta', 'Tükendi', 'Gizli']);
  assert.deepEqual([en.item.available, en.item.soldOut, en.item.hidden], ['Available', 'Sold out', 'Hidden']);
  assert.deepEqual([tr.category.visible, tr.category.hidden, tr.category.categoryHidden], ['Menüde', 'Gizli', 'Kategori gizli']);
  assert.deepEqual([tr.status.liveBadge, tr.status.draftBadge, tr.status.publish, tr.status.unpublish], ['Yayında', 'Taslak', 'Yayına al', 'Yayından kaldır']);
  assert.deepEqual([tr.view.edit, tr.view.service, tr.view.preview], ['Düzenle', 'Servis', 'Önizle']);
  assert.deepEqual([tr.header.design, tr.design.apply, tr.toast.undo, tr.item.details], ['Görünüm', 'Uygula', 'Geri al', 'Ayrıntılar']);
  assert.deepEqual([tr.save.live, en.save.live], ['Canlı', 'Live']);
  assert.deepEqual(
    [tr.selection.markAvailable, tr.selection.markSoldOut, tr.item.hide, tr.item.show],
    ['Satışa aç', 'Tükendi yap', 'Gizle', 'Göster'],
  );
  assert.equal(tr.header.share, 'Paylaş ve QR');
  assert.equal(en.header.share, 'Share & QR');
});

test('banned wording never appears (§14.2)', () => {
  for (const { path, value } of leaves(tr)) {
    if (typeof value !== 'string') continue;
    assert.doesNotMatch(value, /Menüde gizle|Menüden gizle/i, path);
  }
  for (const { path, value } of leaves(tr.category)) {
    if (typeof value === 'string') assert.doesNotMatch(value, /Menüde göster/, `category.${path}`);
  }
});

test('key strings from §14.3', () => {
  assert.equal(tr.status.liveBody, 'Burada kaydettiğin her değişiklik müşterilere hemen görünür.');
  assert.equal(tr.save.savedLive, 'Kaydedildi · canlı');
  assert.equal(tr.item.switchAria('Ayran'), 'Ayran: satışta');
  assert.equal(tr.item.hideAria('Ayran'), '“Ayran” menüden gizle');
  assert.equal(tr.fmt.bulkDeleteTitle(5), '5 ürün silinsin mi?');
  assert.equal(tr.fmt.bulkPrice.zeroWarning(2), '2 ürün 0 ₺ olacak');
  assert.equal(tr.shortcuts.singleKeysHint, 'Kapalıyken yalnızca ⌘/Ctrl ve Alt ile çalışan kısayollar etkin kalır.');
  assert.equal(tr.fmt.toast.statusChanged('Ayran', tr.item.soldOut), '“Ayran”: Tükendi');
  assert.equal(en.context.completionHint, 'Items leave this list as you complete them.');
});

test('getMenuCopy falls back to Turkish for anything but en', () => {
  assert.equal(getMenuCopy('tr'), tr);
  assert.equal(getMenuCopy('en'), en);
  assert.equal(getMenuCopy('de' as 'tr'), tr);
});
