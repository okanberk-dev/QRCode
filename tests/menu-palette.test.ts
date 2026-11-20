// menu-design-final.md §7.3 / §7.5 R15–R16 — the accent contrast resolver.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contrastRatio } from '../src/lib/qr-colors';
import {
  BLACK, NAV_WORST_MIX, ON_DARK, WHITE, ensureAll, mixHex, resolveAccentRoles,
} from '../src/lib/menu-palette';
import { COLOR_BADGE_PAIRS, MENU_SURFACES, QUIET_BADGE_HUES, SURFACES } from '../src/lib/menu-design';

const HEX = /^#[0-9A-F]{6}$/;
const EPS = 1e-9;
const min = (fg: string, refs: string[]) => Math.min(...refs.map((r) => contrastRatio(fg, r)));

test('mixHex: endpoints, rounding, uppercase', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(mixHex('#000000', '#ffffff', 1), '#FFFFFF');
  assert.equal(mixHex('#000000', '#FFFFFF', 0.5), '#808080'); // 127.5 rounds up
  assert.equal(mixHex('#abc', '#AABBCC', 0.3), '#AABBCC');
});

test('ensureAll: unchanged when it already passes, total otherwise', () => {
  assert.deepEqual(ensureAll('#000000', ['#FFFFFF'], 4.5, BLACK), { color: '#000000', adjusted: false });
  const r = ensureAll('#FFFFFF', ['#FFFFFF'], 4.5, BLACK);
  assert.equal(r.adjusted, true);
  assert.ok(contrastRatio(r.color, '#FFFFFF') >= 4.5);
  // Impossible floor: still returns the extreme instead of throwing.
  assert.equal(ensureAll('#777777', ['#808080'], 30, BLACK).color, '#000000');
});

// Reference outcomes (§7.3 table): [accent, surface, text, ui, fill, on]
const REFERENCE: [string, string, string, string, string, string][] = [
  ['#C6F24E', 'white', '#677E29', '#738C2D', '#C6F24E', '#141210'],
  ['#E85A4F', 'white', '#C84D44', '#E3584D', '#E85A4F', '#141210'],
  ['#D97706', 'white', '#B26205', '#C86D06', '#D97706', '#141210'],
  ['#9A3412', 'white', '#9A3412', '#9A3412', '#9A3412', '#FFFFFF'],
  ['#9A3412', 'ink', '#B66D54', '#AA5438', '#A24425', '#FFFFFF'],
  ['#0A0A0A', 'ink', '#808080', '#6C6C6C', '#626262', '#FFFFFF'],
  ['#0A0A0A', 'night', '#858585', '#717171', '#626262', '#FFFFFF'],
  ['#1F2937', 'ink', '#7D838B', '#676D77', '#59616B', '#FFFFFF'],
  ['#0EA5E9', 'white', '#0B7DB1', '#0C8EC8', '#0EA5E9', '#141210'],
  ['#1D4ED8', 'ink', '#587CE2', '#3863DD', '#2252D9', '#FFFFFF'],
  ['#1D4ED8', 'night', '#5C80E3', '#3D67DD', '#2655DA', '#FFFFFF'],
  ['#8B5CF6', 'white', '#8558EC', '#8B5CF6', '#8D5FF6', '#141210'],
  ['#8B5CF6', 'ink', '#9063F6', '#8B5CF6', '#8D5FF6', '#141210'],
  ['#BE185D', 'ink', '#D0598A', '#C52F6D', '#BE185D', '#FFFFFF'],
  ['#1A73E8', 'white', '#1A73E8', '#1A73E8', '#1A73E8', '#FFFFFF'],
  ['#1A73E8', 'ink', '#2C7EEA', '#1A73E8', '#1A73E8', '#FFFFFF'],
  ['#1A73E8', 'night', '#3181EA', '#1A73E8', '#1A73E8', '#FFFFFF'],
  ['#C6F24E', 'ink', '#C6F24E', '#C6F24E', '#C6F24E', '#141210'],
];

test('swatch reference table (fixtures)', () => {
  for (const [accent, surface, text, ui, fill, on] of REFERENCE) {
    const r = resolveAccentRoles(accent, SURFACES[surface as keyof typeof SURFACES], 'accent');
    assert.deepEqual([r.accentText, r.accentUi, r.accentFill, r.onAccent], [text, ui, fill, on], `${accent} on ${surface}`);
  }
  const lime = resolveAccentRoles('#C6F24E', SURFACES.white, 'accent');
  assert.equal(lime.accentEdge, '#738C2D');
  assert.equal(resolveAccentRoles('#0EA5E9', SURFACES.white, 'accent').accentEdge, '#0C8EC8');
  // Cream: lime falls back to an ink pill with lime text; blue text darkens.
  const cream = resolveAccentRoles('#C6F24E', SURFACES.cream, 'accent');
  assert.equal(cream.accentFill, '#241D14');
  assert.equal(cream.onAccent, '#C6F24E');
  assert.equal(cream.banner, '#241D14');
  assert.equal(resolveAccentRoles('#1A73E8', SURFACES.cream, 'accent').accentText, '#1768D1');
});

function fuzzAccents(): string[] {
  const out: string[] = [];
  for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17) {
    out.push(`#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase());
  }
  let seed = 20261121; // seeded LCG — deterministic
  for (let i = 0; i < 3000; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    out.push(`#${(seed >>> 8).toString(16).padStart(6, '0').slice(-6)}`.toUpperCase());
  }
  out.push('#A26F33', '#F5F5F5', '#EAF9B8', '#777777', '#808080', '#112233');
  return out;
}

test('R15: every guarantee holds for 7,102 accents × 8 surfaces × 2 banner tones', () => {
  const accents = fuzzAccents();
  assert.equal(accents.length, 7102);
  for (const key of MENU_SURFACES) {
    const s = SURFACES[key];
    const navWorst = mixHex(s.bg, s.scheme === 'light' ? BLACK : WHITE, NAV_WORST_MIX);
    for (const accent of accents) {
      for (const tone of ['accent', 'ink'] as const) {
        const r = resolveAccentRoles(accent, s, tone);
        const where = `${accent} ${key} ${tone}`;
        for (const [name, value] of Object.entries(r)) {
          if (name !== 'adjusted') assert.match(value as string, HEX, `${where} ${name}`);
        }
        assert.ok(min(r.accentText, [s.bg, s.surface]) >= 4.5 - EPS, `${where} text`);
        assert.ok(min(r.accentUi, [s.bg, s.surface, navWorst]) >= 3 - EPS, `${where} ui`);
        assert.ok(contrastRatio(r.onAccent, r.accentFill) >= 4.5 - EPS, `${where} on`);
        assert.ok(contrastRatio(r.accentEdge, s.bg) >= 3 - EPS, `${where} edge`);
        assert.ok(min(r.onBanner, [r.banner, r.bannerEnd]) >= 4.5 - EPS, `${where} banner`);
        assert.ok(contrastRatio(r.onAccentSoft, r.accentSoft) >= 4.5 - EPS, `${where} soft`);
        assert.ok(contrastRatio(r.accentMark, r.accentSoft) >= 3 - EPS, `${where} mark`);
        assert.equal(r.focus, r.accentUi);
      }
    }
  }
});

test('R16: static surface tokens, badges', () => {
  for (const key of MENU_SURFACES) {
    const s = SURFACES[key];
    const navWorst = mixHex(s.bg, s.scheme === 'light' ? BLACK : WHITE, NAV_WORST_MIX);
    for (const t of [s.bg, s.surface, s.surface2, s.ink, s.ink2, s.muted, s.rule, s.ruleStrong]) assert.match(t, HEX);
    assert.ok(min(s.ink, [s.bg, s.surface, s.surface2, navWorst]) >= 4.5, `${key} ink`);
    assert.ok(min(s.ink2, [s.bg, s.surface, s.surface2, navWorst]) >= 4.5, `${key} ink2`);
    assert.ok(min(s.muted, [s.bg, s.surface, s.surface2]) >= 4.5, `${key} muted`);
    assert.ok(min(s.ruleStrong, [s.bg, s.surface, s.surface2]) >= 3, `${key} ruleStrong`);
    // Banner sheen / blend direction terminates (§3.1).
    assert.ok(contrastRatio(s.scheme === 'light' ? BLACK : WHITE, s.bg) > contrastRatio(s.scheme === 'light' ? WHITE : BLACK, s.bg));
  }
  const light = MENU_SURFACES.filter((k) => SURFACES[k].scheme === 'light').map((k) => SURFACES[k]);
  const dark = MENU_SURFACES.filter((k) => SURFACES[k].scheme === 'dark').map((k) => SURFACES[k]);
  for (const [badge, hue] of Object.entries(QUIET_BADGE_HUES)) {
    for (const s of light) assert.ok(min(hue.light, [s.bg, s.surface, s.surface2]) >= 3.78 - 0.005, `${badge} light`);
    for (const s of dark) assert.ok(min(hue.dark, [s.bg, s.surface, s.surface2]) >= 6.27 - 0.005, `${badge} dark`);
  }
  for (const [badge, pair] of Object.entries(COLOR_BADGE_PAIRS)) {
    assert.ok(contrastRatio(pair.light.fg, pair.light.bg) >= 4.5, `${badge} light pair`);
    assert.ok(contrastRatio(pair.dark.fg, pair.dark.bg) >= 4.5, `${badge} dark pair`);
    assert.equal(pair.dark.border, `${pair.dark.fg}4D`);
  }
  assert.equal(ON_DARK, '#141210');
});
