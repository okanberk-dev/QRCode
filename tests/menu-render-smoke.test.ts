// menu-design-final.md §15.1 (chunk 2) — server-render smoke test: every
// preset, and every value of every knob, renders PublicMenuView with
// renderToString without throwing, with the public DOM contract intact.
//
// next/font/google is an empty module outside Next, so the five menu font
// loaders are stubbed before PublicMenuView is imported. The project compiles
// JSX with the classic runtime under tsx, so React is exposed globally.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { MENU_KNOB_KEYS, MENU_PRESETS, PRESETS, type MenuDesign, type MenuPresetId } from '../src/lib/menu-design';
import { MENU_THEMES } from '../src/lib/validations';

const requireCjs = createRequire(__filename);
const fontStub = (name: string) => () => ({ className: `font-${name}`, variable: `var-${name}`, style: { fontFamily: name } });
const google = requireCjs('next/font/google') as Record<string, unknown>;
for (const name of ['Fraunces', 'Newsreader', 'Instrument_Serif', 'Bricolage_Grotesque', 'Playfair_Display']) {
  google[name] = fontStub(name);
}

type Props = Record<string, unknown>;
let render: (props: Props) => string;

async function load() {
  if (render) return render;
  const React = await import('react');
  const reactNs = ((React as unknown as { default?: typeof React }).default ?? React) as typeof React;
  (globalThis as unknown as { React: typeof React }).React = reactNs;
  const { renderToString } = await import('react-dom/server');
  const mod = await import('../src/components/menu/PublicMenuView');
  const modNs = mod as unknown as { default: unknown };
  const View = ((modNs.default as { default?: unknown }).default ?? modNs.default) as Parameters<typeof reactNs.createElement>[0];
  render = (props) => renderToString(reactNs.createElement(View, props));
  return render;
}

const item = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: `Ürün ${id}`, description: 'Közlenmiş patlıcan, süzme yoğurt, tereyağı.', priceCents: 24500, currency: 'TRY',
  imageUrl: null, badges: [], allergens: [], isAvailable: true, isOutOfStock: false, sortOrder: 0, ...over,
});

const CATEGORIES = [
  {
    id: 'c1', name: 'Başlangıçlar', description: 'Günün mezeleri', sortOrder: 0, isVisible: true,
    items: [
      item('i1', { imageUrl: '/api/menu/demo/img/i1?v=1', badges: ['sef_onerisi', 'populer', 'vegan', 'aci', 'yeni', 'glutensiz'],
        allergens: ['gluten', 'sut', 'yumurta', 'fistik', 'soya', 'balik', 'kabuklu', 'susam'] }),
      item('i2', { name: 'İSKENDER · Şiş · ığüşöç çok uzun bir Türkçe ürün adı', sortOrder: 1 }),
      item('i3', { isOutOfStock: true, sortOrder: 2 }),
      item('i4', { isAvailable: false, sortOrder: 3 }),
    ],
  },
  { id: 'c2', name: 'Tatlılar', description: null, sortOrder: 1, isVisible: true, items: [item('i5'), item('i6', { sortOrder: 1 })] },
  { id: 'c3', name: 'Gizli', description: null, sortOrder: 2, isVisible: false, items: [item('i7')] },
];

function restaurant(menuTheme: string, menuDesign: MenuDesign | null, over: Record<string, unknown> = {}) {
  return {
    id: 'r1', slug: 'demo', name: 'Lokanta Demo', category: 'Restoran', address: 'Kadıköy, İstanbul',
    phone: '+90 555 000 00 00', workingHours: '09:00–23:00', primaryColor: '#1A73E8', menuTheme,
    menuAccentColor: null, menuLogoUrl: '/api/menu/demo/img/logo?v=1', menuDesign,
    menuCoverUrl: '/api/menu/demo/img/cover?v=2', ...over,
  };
}

function assertContract(html: string, label: string) {
  assert.match(html, /data-menu-root/, `${label}: scope root`);
  assert.match(html, /id="cat-c1"[^>]*data-cat-id="c1"|data-cat-id="c1"[^>]*id="cat-c1"/, `${label}: section anchor`);
  assert.match(html, /href="#cat-c2"/, `${label}: nav link`);
  assert.match(html, /data-pid="i1"/, `${label}: product article`);
  assert.doesNotMatch(html, /data-pid="i4"/, `${label}: unavailable item hidden`);
  assert.doesNotMatch(html, /data-cat-id="c3"/, `${label}: hidden category hidden`);
  assert.doesNotMatch(html, /data:image/, `${label}: no data URL`);
  assert.doesNotMatch(html, /clash/i, `${label}: no Clash Display`);
  assert.doesNotMatch(html, /\binert\b/, `${label}: inert is never in the SSR HTML`);
  assert.match(html, /Powered by Buaze/, `${label}: footer attribution`);
  assert.match(html, /Alerjen/, `${label}: allergen line`);
}

test('every preset renders server-side with the DOM contract intact', async () => {
  const r = await load();
  for (const preset of MENU_PRESETS) {
    const family = PRESETS[preset].family;
    const html = r({ restaurant: restaurant(family, { v: 1, preset }), categories: CATEGORIES, disableAnalytics: true });
    assertContract(html, preset);
    assert.match(html, new RegExp(`data-preset="${preset}"`), `${preset}: resolved preset`);
  }
});

test('legacy rows (menuDesign NULL) render their family preset', async () => {
  const r = await load();
  for (const theme of MENU_THEMES) {
    const html = r({ restaurant: restaurant(theme, null, { menuCoverUrl: null }), categories: CATEGORIES, disableAnalytics: true });
    assertContract(html, `legacy ${theme}`);
    assert.match(html, new RegExp(`data-preset="${theme}"`));
  }
});

test('every value of every knob renders', async () => {
  const r = await load();
  const values: Record<string, readonly string[]> = {
    surface: ['white', 'ivory', 'cream', 'stone', 'sage', 'ink', 'night', 'forest'],
    typeface: ['grotesk', 'soft-serif', 'book-serif', 'display-serif', 'bold-sans', 'classic-serif'],
    items: ['list', 'grid', 'feature', 'text'],
    header: ['banner', 'centered', 'cover', 'compact'],
    nav: ['pills', 'underline'],
    cardStyle: ['cards', 'rows'],
    density: ['airy', 'regular', 'compact'],
    corners: ['sharp', 'soft', 'round'],
    price: ['plain', 'accent', 'mono'],
    badges: ['quiet', 'color'],
  };
  assert.deepEqual(Object.keys(values), [...MENU_KNOB_KEYS]);
  for (const key of MENU_KNOB_KEYS) {
    for (const value of values[key]) {
      const design = { v: 1, preset: 'classic' as MenuPresetId, [key]: value } as MenuDesign;
      const html = r({ restaurant: restaurant('classic', design), categories: CATEGORIES, disableAnalytics: true });
      assertContract(html, `${key}=${value}`);
    }
  }
});

test('accents, tagline escaping, EN copy and the empty state', async () => {
  const r = await load();
  for (const accent of ['#C6F24E', '#0A0A0A', '#FFFFFF', null]) {
    const html = r({ restaurant: restaurant('pulse', { v: 1, preset: 'pulse' }, { menuAccentColor: accent }), categories: CATEGORIES, disableAnalytics: true });
    assertContract(html, `accent ${accent}`);
  }

  const tagged = r({
    restaurant: restaurant('elegant', { v: 1, preset: 'meyhane', tagline: '<b>x</b> & ocakbaşı' }),
    categories: CATEGORIES, disableAnalytics: true,
  });
  assert.match(tagged, /&lt;b&gt;x&lt;\/b&gt; &amp; ocakbaşı/, 'tagline renders as escaped text');
  assert.doesNotMatch(tagged, /<b>x<\/b>/);

  const en = r({ restaurant: restaurant('classic', null), categories: CATEGORIES, locale: 'en', disableAnalytics: true });
  assert.match(en, /lang="en"/);
  assert.match(en, /Skip to menu/);
  assert.doesNotMatch(en, /PİCK/);

  for (const preset of MENU_PRESETS) {
    const family = PRESETS[preset].family;
    const empty = r({ restaurant: restaurant(family, { v: 1, preset }), categories: [], disableAnalytics: true });
    assert.match(empty, /data-menu-root/, `${preset}: empty state renders`);
    assert.match(empty, /Lokanta Demo/, `${preset}: masthead always renders on the empty state`);
    assert.doesNotMatch(empty, /data-pid=/);
  }
});

test('the QR splash is in the SSR HTML, outside the container query element', async () => {
  const r = await load();
  const html = r({ restaurant: restaurant('classic', null), categories: CATEGORIES, initialSplash: true });
  assert.match(html, /data-menu-splash/);
  const canvasAt = html.indexOf('data-menu-canvas');
  const splashAt = html.indexOf('data-menu-splash');
  assert.ok(canvasAt > 0 && splashAt > canvasAt, 'splash follows the canvas');
  // The splash is never in a preview (disableAnalytics turns it off).
  const preview = r({ restaurant: restaurant('classic', null), categories: CATEGORIES, initialSplash: true, disableAnalytics: true });
  assert.doesNotMatch(preview, /data-menu-splash/);
});

test('the scope style carries only custom properties and color-scheme', async () => {
  const r = await load();
  for (const preset of MENU_PRESETS) {
    const family = PRESETS[preset].family;
    const html = r({ restaurant: restaurant(family, { v: 1, preset }, { menuAccentColor: '#C6F24E' }), categories: CATEGORIES, disableAnalytics: true });
    const raw = html.match(/<div data-menu-root[^>]*?style="([^"]*)"/)?.[1];
    assert.ok(raw, `${preset}: scope has a style`);
    const style = raw.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    for (const decl of style.split(';').map((s) => s.trim()).filter(Boolean)) {
      const prop = decl.slice(0, decl.indexOf(':')).trim();
      assert.ok(prop.startsWith('--') || prop === 'color-scheme', `${preset}: unexpected style property ${prop}`);
    }
  }
});
