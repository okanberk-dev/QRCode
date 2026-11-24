import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeFilePath, publicFileUrl, sha256Hex, STORED_FILE_TYPES } from '../src/lib/file-store';

test('accepts the stored file path shapes', () => {
  for (const p of ['site/logo-1776886785992.webp', 'site/favicon-1.png', 'site/og-1777149503286.webp', 'a.png']) {
    assert.equal(isSafeFilePath(p), true, p);
  }
});

test('rejects traversal, empty segments and odd characters', () => {
  for (const p of ['', '../etc/passwd', 'site/../x.png', 'site//x.png', '/site/x.png', 'site/.hidden', 'site/x y.png', 'site/%2e%2e/x', 'a/b/c/d/e/f.png', 'site/x.png?x=1']) {
    assert.equal(isSafeFilePath(p), false, p);
  }
});

test('public URL is under /files on the canonical host', () => {
  assert.equal(publicFileUrl('site/logo-1.webp', 'https://www.buaze.com'), 'https://www.buaze.com/files/site/logo-1.webp');
  assert.equal(publicFileUrl('site/logo-1.webp', 'https://www.buaze.com/'), 'https://www.buaze.com/files/site/logo-1.webp');
});

test('only raster image types are stored and served', () => {
  assert.equal(STORED_FILE_TYPES.has('image/svg+xml'), false);
  assert.equal(STORED_FILE_TYPES.has('text/html'), false);
  assert.equal(STORED_FILE_TYPES.has('image/webp'), true);
  assert.equal(sha256Hex(new Uint8Array([1, 2, 3])).length, 64);
});
