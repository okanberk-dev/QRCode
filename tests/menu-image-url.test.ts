// CLAUDE.md §32 — how the public menu refers to stored (base64) photos.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  contentVersion,
  isRasterDataUrl,
  itemImageVersion,
  jsonLdImageUrl,
  menuImagePath,
  parseRasterDataUrl,
  publicImageSrc,
} from '../src/lib/menu-image-url';

const WEBP = 'data:image/webp;base64,UklGRg==';
const JPG = 'data:image/jpg;base64,/9j/4AAQ';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQ';
const SVG = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';

test('parseRasterDataUrl: returns the MIME type and the payload', () => {
  assert.deepEqual(parseRasterDataUrl(WEBP), { mime: 'image/webp', base64: 'UklGRg==' });
  assert.deepEqual(parseRasterDataUrl('data:image/png;base64,iVBOR'), { mime: 'image/png', base64: 'iVBOR' });
  assert.deepEqual(parseRasterDataUrl('data:image/gif;base64,R0lG'), { mime: 'image/gif', base64: 'R0lG' });
  assert.deepEqual(parseRasterDataUrl('data:image/avif;base64,AAAA'), { mime: 'image/avif', base64: 'AAAA' });
});

test('parseRasterDataUrl: image/jpg is normalised to image/jpeg', () => {
  assert.equal(parseRasterDataUrl(JPG)?.mime, 'image/jpeg');
  assert.equal(parseRasterDataUrl(JPEG)?.mime, 'image/jpeg');
});

test('parseRasterDataUrl: case-insensitive prefix, MIME always lower case', () => {
  assert.deepEqual(parseRasterDataUrl('data:image/WEBP;base64,AAAA'), { mime: 'image/webp', base64: 'AAAA' });
  assert.equal(parseRasterDataUrl('DATA:IMAGE/PNG;BASE64,AAAA')?.mime, 'image/png');
});

test('parseRasterDataUrl: SVG, other types, garbage and empty payloads are refused', () => {
  assert.equal(parseRasterDataUrl(SVG), null);
  assert.equal(parseRasterDataUrl('data:text/html;base64,PGgxPg=='), null);
  assert.equal(parseRasterDataUrl('data:image/webp,notbase64'), null);
  assert.equal(parseRasterDataUrl('data:image/webp;base64,'), null);
  assert.equal(parseRasterDataUrl('https://example.com/a.png'), null);
  assert.equal(parseRasterDataUrl(''), null);
  assert.equal(parseRasterDataUrl(null), null);
  assert.equal(parseRasterDataUrl(undefined), null);
});

test('isRasterDataUrl', () => {
  assert.equal(isRasterDataUrl(WEBP), true);
  assert.equal(isRasterDataUrl(SVG), false);
  assert.equal(isRasterDataUrl('https://example.com/a.png'), false);
  assert.equal(isRasterDataUrl(null), false);
});

test('itemImageVersion: changes with the row timestamp, stable otherwise', () => {
  const a = itemImageVersion(new Date('2026-10-12T10:00:00.000Z'));
  const b = itemImageVersion(new Date('2026-10-12T10:00:00.001Z'));
  assert.notEqual(a, b);
  assert.equal(a, itemImageVersion('2026-10-12T10:00:00.000Z'));
  assert.match(a, /^[0-9a-z]+$/);
  assert.equal(itemImageVersion(null), '0');
  assert.equal(itemImageVersion('not a date'), '0');
});

test('contentVersion: derived from the image, short and URL-safe', () => {
  const a = contentVersion(WEBP);
  assert.equal(a, contentVersion(WEBP));
  assert.notEqual(a, contentVersion(`${WEBP}A`));
  assert.match(a, /^[A-Za-z0-9_-]{10}$/);
});

test('menuImagePath: relative, escaped, versioned', () => {
  assert.equal(menuImagePath('mamas-burger', 'abc123', 'k1'), '/api/menu/mamas-burger/img/abc123?v=k1');
  assert.equal(menuImagePath('mamas-burger', 'logo', 'x y'), '/api/menu/mamas-burger/img/logo?v=x%20y');
});

test('publicImageSrc: stored photos go through the image route, links stay as they are', () => {
  const base = { slug: 's', itemIdOrLogo: 'i1', version: 'v1' };
  assert.equal(publicImageSrc({ ...base, imageUrl: WEBP }), '/api/menu/s/img/i1?v=v1');
  assert.equal(publicImageSrc({ ...base, imageUrl: 'https://cdn.example.com/a.jpg' }), 'https://cdn.example.com/a.jpg');
  assert.equal(publicImageSrc({ ...base, imageUrl: null }), null);
  assert.equal(publicImageSrc({ ...base, imageUrl: '' }), null);
});

test('publicImageSrc: a legacy SVG data URL stays inline (the image route refuses to serve SVG)', () => {
  assert.equal(publicImageSrc({ slug: 's', itemIdOrLogo: 'i1', version: 'v1', imageUrl: SVG }), SVG);
});

test('jsonLdImageUrl: absolute URL for stored photos, link passthrough, never a data URL', () => {
  const base = { siteUrl: 'https://www.buaze.com', slug: 's', itemIdOrLogo: 'i1', version: 'v1' };
  assert.equal(jsonLdImageUrl({ ...base, imageUrl: WEBP }), 'https://www.buaze.com/api/menu/s/img/i1?v=v1');
  assert.equal(jsonLdImageUrl({ ...base, imageUrl: 'https://cdn.example.com/a.jpg' }), 'https://cdn.example.com/a.jpg');
  assert.equal(jsonLdImageUrl({ ...base, imageUrl: SVG }), undefined);
  assert.equal(jsonLdImageUrl({ ...base, imageUrl: null }), undefined);
  assert.equal(jsonLdImageUrl({ ...base, imageUrl: '/relative/a.png' }), undefined);
});
