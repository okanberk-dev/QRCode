// Public menu polish (review F4, F8, F9, F12; visual F15): pure helpers only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPEFACES, resolveMenuDesign, sanitizeTagline } from '../src/lib/menu-design';
import { menuEyebrow } from '../src/components/menu/menu-labels';
import { isScrollableOverflow, jumpTarget } from '../src/components/menu/parts/nav-jump';

const base = { menuAccentColor: null, primaryColor: '#1a73e8', menuDesign: null, hasCover: false };

test('sanitizeTagline keeps joined emoji and ZWNJ, still strips bidi controls', () => {
  assert.equal(sanitizeTagline('Şef 🧑‍🍳 mutfağı'), 'Şef 🧑‍🍳 mutfağı');
  assert.equal(sanitizeTagline('🏳️‍🌈 herkese açık'), '🏳️‍🌈 herkese açık');
  assert.equal(sanitizeTagline('می‌خواهم'), 'می‌خواهم');
  // Right-to-left override / isolates / marks become spaces.
  assert.equal(sanitizeTagline('A‮B⁦C‏D'), 'A B C D');
  // A stray joiner at an edge or beside a space renders as nothing: dropped.
  assert.equal(sanitizeTagline('‍Taze ‍ ekmek‌'), 'Taze ekmek');
  assert.equal(sanitizeTagline('‍‌'), null);
});

test('soft-serif display weight is one Fraunces actually ships', () => {
  assert.equal(TYPEFACES['soft-serif'].displaySize.weight, 500);
});

test('book-serif prices use the sans stack (Newsreader draws ₺ as Ł)', () => {
  const elegant = resolveMenuDesign({ ...base, menuTheme: 'elegant', menuDesign: { v: 1, preset: 'elegant', typeface: 'book-serif' } });
  assert.equal(elegant.style['--m-font-price'], TYPEFACES['soft-serif'].body, 'the shared sans stack');
  assert.notEqual(elegant.style['--m-font-price'], TYPEFACES['book-serif'].body);
  // Other faces keep their body face for prices.
  const classic = resolveMenuDesign({ ...base, menuTheme: 'classic' });
  assert.ok(
    classic.style['--m-font-price'] === classic.style['--m-font-body'] ||
      classic.style['--m-font-price'].includes('mono'),
  );
});

test('menuEyebrow hides generic categories, keeps real ones', () => {
  for (const generic of ['Restoran', ' restaurant ', 'RESTORAN', 'Diğer', 'other', '', '   ', null, undefined]) {
    assert.equal(menuEyebrow(generic), null, String(generic));
  }
  assert.equal(menuEyebrow('Kahve · Tatlı'), 'Kahve · Tatlı');
  assert.equal(menuEyebrow('  Meyhane '), 'Meyhane');
});

test('nav jump: only real scroll containers, target under the sticky nav', () => {
  assert.equal(isScrollableOverflow('auto'), true);
  assert.equal(isScrollableOverflow('scroll'), true);
  assert.equal(isScrollableOverflow('visible'), false);
  assert.equal(isScrollableOverflow('hidden'), false);
  assert.equal(jumpTarget({ scrollTop: 100, sectionTop: 500, scrollerTop: 0, scale: 1, margin: 72 }), 528);
  // A zoomed preview frame (rects are scaled by 0.5): convert to scroller px.
  assert.equal(jumpTarget({ scrollTop: 100, sectionTop: 300, scrollerTop: 50, scale: 0.5, margin: 72 }), 528);
  // Never negative; a bad scale falls back to 1.
  assert.equal(jumpTarget({ scrollTop: 0, sectionTop: 10, scrollerTop: 0, scale: 1, margin: 72 }), 0);
  assert.equal(jumpTarget({ scrollTop: 0, sectionTop: 200, scrollerTop: 0, scale: 0, margin: 0 }), 200);
});
