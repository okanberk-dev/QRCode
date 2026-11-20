// CLAUDE.md §32 — the menu builder never shows raw server text or raw codes.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mapMenuApiError } from '../src/lib/menu-api-error';

const GENERIC_TR = 'Bir şey ters gitti. Tekrar dene.';
const GENERIC_EN = 'Something went wrong. Try again.';

test('mapMenuApiError: forbidden_role (arrives as { error } with a 403)', () => {
  assert.equal(
    mapMenuApiError({ status: 403, error: 'forbidden_role' }, true),
    'Bu işlem için yetkin yok (yalnızca görüntüleme).',
  );
  assert.equal(
    mapMenuApiError({ status: 403, error: 'forbidden_role' }, false),
    "You don't have permission for this (view-only).",
  );
});

test('mapMenuApiError: MENU_MODULE_DISABLED', () => {
  const input = { status: 403, code: 'MENU_MODULE_DISABLED', error: 'Menü modülü bu işletme için kapalı.' };
  assert.equal(mapMenuApiError(input, true), 'Menü düzenleme bu işletme için kapalı.');
  assert.equal(mapMenuApiError(input, false), 'Menu editing is turned off for this business.');
});

test('mapMenuApiError: MENU_EMPTY', () => {
  const input = { status: 409, code: 'MENU_EMPTY' };
  assert.equal(mapMenuApiError(input, true), 'Yayına almak için en az bir ürün ekle.');
  assert.equal(mapMenuApiError(input, false), 'Add at least one item to publish.');
});

test('mapMenuApiError: CATEGORY_NOT_EMPTY', () => {
  const input = { status: 409, code: 'CATEGORY_NOT_EMPTY', error: 'Kategoride aktif ürünler var. Önce taşıyın veya silin.' };
  assert.equal(
    mapMenuApiError(input, true),
    'Bu kategoride ürün var. Kategoriyi ürünleriyle birlikte silebilir ya da önce ürünleri başka kategoriye taşıyabilirsin.',
  );
  assert.equal(
    mapMenuApiError(input, false),
    'This category has items. Delete it together with its items, or move the items to another category first.',
  );
});

test('mapMenuApiError: IMAGE_TOO_LARGE (code, and a bare 413)', () => {
  const tr = 'Fotoğraf çok büyük. Daha küçük bir fotoğraf dene.';
  const en = 'The photo is too large. Try a smaller one.';
  assert.equal(mapMenuApiError({ status: 413, code: 'IMAGE_TOO_LARGE' }, true), tr);
  assert.equal(mapMenuApiError({ status: 413, code: 'IMAGE_TOO_LARGE' }, false), en);
  assert.equal(mapMenuApiError({ status: 413 }, true), tr);
  assert.equal(mapMenuApiError({ status: 413, error: 'Görsel 5 MB\'dan büyük olamaz' }, false), en);
});

test('mapMenuApiError: IMAGE_UNPROCESSABLE', () => {
  const input = { status: 400, code: 'IMAGE_UNPROCESSABLE', error: 'Görsel işlenemedi' };
  assert.equal(mapMenuApiError(input, true), 'Bu fotoğraf işlenemedi. Başka bir fotoğraf dene.');
  assert.equal(mapMenuApiError(input, false), "This photo couldn't be processed. Try another.");
});

test('mapMenuApiError: 429', () => {
  assert.equal(mapMenuApiError({ status: 429, error: 'Çok fazla yükleme.' }, true), 'Çok fazla istek. Birazdan tekrar dene.');
  assert.equal(mapMenuApiError({ status: 429 }, false), 'Too many requests. Try again shortly.');
});

test('mapMenuApiError: network failures (a rejected fetch is a TypeError)', () => {
  assert.equal(mapMenuApiError(new TypeError('Failed to fetch'), true), 'Bağlantı sorunu. Tekrar dene.');
  assert.equal(mapMenuApiError(new TypeError('anything'), false), 'Connection problem. Try again.');
  assert.equal(mapMenuApiError(new Error('NetworkError when attempting to fetch resource.'), false), 'Connection problem. Try again.');
  assert.equal(mapMenuApiError({ status: 0 }, true), 'Bağlantı sorunu. Tekrar dene.');
  assert.equal(mapMenuApiError({ name: 'TypeError', message: 'Load failed' }, true), 'Bağlantı sorunu. Tekrar dene.');
});

test('mapMenuApiError: an Error whose message is exactly a known token still resolves', () => {
  assert.equal(
    mapMenuApiError(new Error('forbidden_role'), true),
    'Bu işlem için yetkin yok (yalnızca görüntüleme).',
  );
  assert.equal(mapMenuApiError(new Error('MENU_EMPTY'), false), 'Add at least one item to publish.');
});

test('mapMenuApiError: unknown errors become the generic sentence', () => {
  assert.equal(mapMenuApiError({ status: 500, error: 'Analitik hesaplanamadı' }, true), GENERIC_TR);
  assert.equal(mapMenuApiError({ status: 500 }, false), GENERIC_EN);
  assert.equal(mapMenuApiError({ status: 400, code: 'SOMETHING_NEW' }, true), GENERIC_TR);
  assert.equal(mapMenuApiError(new Error('boom'), false), GENERIC_EN);
  assert.equal(mapMenuApiError(null, true), GENERIC_TR);
  assert.equal(mapMenuApiError(undefined, false), GENERIC_EN);
  assert.equal(mapMenuApiError({}, true), GENERIC_TR);
});

test('mapMenuApiError: a server sentence that merely contains Turkish "ağ" is not a network error', () => {
  assert.equal(mapMenuApiError({ status: 500, error: 'Sağlık kontrolü başarısız' }, true), GENERIC_TR);
  assert.equal(mapMenuApiError(new Error('Bağlam hatası'), true), GENERIC_TR);
});

test('mapMenuApiError: raw server text and raw codes never reach the user', () => {
  const raw = [
    { status: 400, error: 'Geçersiz fiyat' },
    { status: 400, code: 'SOMETHING_NEW', error: 'Kategori bu restorana ait değil' },
    { status: 403, error: 'Bu restorana erişiminiz yok' },
    { status: 401, error: 'Yetkisiz erişim' },
    { status: 500, error: 'Internal Server Error' },
    { status: 400, error: 'validation_error' },
  ];
  const forbidden = [
    'Geçersiz fiyat', 'Kategori bu restorana', 'erişiminiz', 'Yetkisiz', 'Internal Server',
    'validation_error', 'SOMETHING_NEW', 'forbidden_role', 'MENU_', 'IMAGE_', 'CATEGORY_',
  ];
  for (const input of raw) {
    for (const isTr of [true, false]) {
      const message = mapMenuApiError(input, isTr);
      for (const needle of forbidden) {
        assert.ok(!message.includes(needle), `${JSON.stringify(input)} leaked "${needle}": ${message}`);
      }
    }
  }
  for (const code of ['forbidden_role', 'MENU_MODULE_DISABLED', 'MENU_EMPTY', 'CATEGORY_NOT_EMPTY', 'IMAGE_TOO_LARGE', 'IMAGE_UNPROCESSABLE']) {
    for (const isTr of [true, false]) {
      const message = mapMenuApiError({ code }, isTr);
      assert.ok(!message.includes(code), `${code} leaked: ${message}`);
      assert.ok(message.length > 10);
    }
  }
});

test('mapMenuApiError: Turkish and English strings differ for every known failure', () => {
  const inputs = [
    { error: 'forbidden_role' },
    { code: 'MENU_MODULE_DISABLED' },
    { code: 'MENU_EMPTY' },
    { code: 'CATEGORY_NOT_EMPTY' },
    { code: 'IMAGE_TOO_LARGE' },
    { code: 'IMAGE_UNPROCESSABLE' },
    { status: 429 },
    new TypeError('x'),
    {},
  ];
  for (const input of inputs) {
    assert.notEqual(mapMenuApiError(input, true), mapMenuApiError(input, false));
  }
});

test('mapMenuApiError: RESTORE_EXPIRED (410 from the restore endpoint, or a skipped code)', () => {
  assert.equal(mapMenuApiError({ status: 410, code: 'RESTORE_EXPIRED', error: 'Geri alma süresi doldu' }, true), 'Bu işlem artık geri alınamıyor.');
  assert.equal(mapMenuApiError({ status: 410, code: 'RESTORE_EXPIRED' }, false), 'This can no longer be undone.');
  assert.equal(mapMenuApiError({ code: 'RESTORE_EXPIRED' }, true), 'Bu işlem artık geri alınamıyor.');
});

test('mapMenuApiError: CATEGORY_DELETED (a skipped code of an item restore)', () => {
  assert.equal(
    mapMenuApiError({ status: 200, code: 'CATEGORY_DELETED' }, true),
    'Ürünün kategorisi silinmiş. Önce kategoriyi geri al.',
  );
  assert.equal(
    mapMenuApiError({ code: 'CATEGORY_DELETED' }, false),
    "This item's category was deleted. Restore the category first.",
  );
});

test('mapMenuApiError: DESIGN_CONFLICT (theme PATCH 409)', () => {
  const input = { status: 409, error: 'DESIGN_CONFLICT' };
  assert.equal(mapMenuApiError(input, true), 'Görünüm başka bir yerden değişti. Sayfayı yenileyip tekrar dene.');
  assert.equal(mapMenuApiError(input, false), 'The design was changed somewhere else. Refresh the page and try again.');
});
