import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PORTAL,
  joinName,
  normalizePortalImage,
  portalPalette,
  readLoyaltyPortal,
  safeExternalUrl,
  splitName,
  telHref,
} from '../src/lib/loyalty-portal';

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('readLoyaltyPortal never throws and falls back to defaults', () => {
  assert.deepEqual(readLoyaltyPortal(null), DEFAULT_PORTAL);
  assert.deepEqual(readLoyaltyPortal('x'), DEFAULT_PORTAL);
  assert.deepEqual(readLoyaltyPortal([]), DEFAULT_PORTAL);
  const p = readLoyaltyPortal({ theme: 'neon', showMenu: false, headline: '   Merhaba   dünya  ' });
  assert.equal(p.theme, 'light');
  assert.equal(p.showMenu, false);
  assert.equal(p.headline, 'Merhaba dünya');
});

test('readLoyaltyPortal trims offers, drops empty ones and caps at 4', () => {
  const offers = Array.from({ length: 7 }, (_, i) => ({ id: `o${i}`, title: i === 1 ? '  ' : `Kampanya ${i}`, body: 'a\n\n\n\nb', badge: 'Yeni' }));
  const p = readLoyaltyPortal({ offers });
  assert.equal(p.offers.length, 4);
  assert.equal(p.offers[0].title, 'Kampanya 0');
  assert.equal(p.offers[1].title, 'Kampanya 2');
  assert.equal(p.offers[0].body, 'a\n\nb');
});

test('readLoyaltyPortal validates the legal e-mail', () => {
  assert.equal(readLoyaltyPortal({ legalEmail: 'KVKK@Ornek.com ' }).legalEmail, 'kvkk@ornek.com');
  assert.equal(readLoyaltyPortal({ legalEmail: 'not an email' }).legalEmail, null);
});

test('normalizePortalImage accepts only stored loyalty images', () => {
  assert.equal(normalizePortalImage('/files/loyalty/abc/logo-1.webp'), '/files/loyalty/abc/logo-1.webp');
  assert.equal(normalizePortalImage('https://www.buaze.com/files/loyalty/abc/cover-2.webp'), '/files/loyalty/abc/cover-2.webp');
  assert.equal(normalizePortalImage('/files/site/logo.webp'), null);
  assert.equal(normalizePortalImage('/files/loyalty/../site/logo.webp'), null);
  assert.equal(normalizePortalImage('/files/loyalty//x.webp'), null);
  assert.equal(normalizePortalImage('javascript:alert(1)'), null);
  assert.equal(normalizePortalImage('http://evil.com/files/loyalty/a.webp'), null);
  assert.equal(normalizePortalImage('data:image/png;base64,AAAA'), null);
});

test('portalPalette keeps button text readable for any card colour', () => {
  const colours = [null, '#C6F24E', '#0A0A0A', '#FFFFFF', '#FFD400', '#1D4ED8', '#E11D48', '#10B981', '#F97316', '#808080'];
  for (const theme of ['light', 'dark', 'brand'] as const) {
    for (const c of colours) {
      const p = portalPalette(theme, c);
      assert.ok(contrast(p.accent, p.onAccent) >= 3, `${theme} ${c}: button ${p.accent}/${p.onAccent}`);
      assert.ok(contrast(p.band, p.onBand) >= 3, `${theme} ${c}: band`);
      assert.ok(contrast(p.text, p.surface) >= 7, `${theme} ${c}: text`);
    }
  }
});

test('names split on the last word and join back', () => {
  assert.deepEqual(splitName('Ayşe Nur Yılmaz'), { firstName: 'Ayşe Nur', lastName: 'Yılmaz' });
  assert.deepEqual(splitName('Cem'), { firstName: 'Cem', lastName: null });
  assert.deepEqual(splitName('  '), { firstName: null, lastName: null });
  assert.equal(joinName('Ayşe', 'Yılmaz'), 'Ayşe Yılmaz');
  assert.equal(joinName(null, ' '), null);
});

test('external links: only http(s); phone links normalised', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('https://instagram.com/kafe'), 'https://instagram.com/kafe');
  assert.equal(safeExternalUrl('not a url'), null);
  assert.equal(telHref('0216 123 45 67'), 'tel:+902161234567');
  assert.equal(telHref('+90 532 000 00 00'), 'tel:+905320000000');
  assert.equal(telHref(''), null);
});
