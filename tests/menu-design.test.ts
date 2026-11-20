// menu-design-final.md §5, §7.1, §7.4, §7.5 (R1–R14, R17) — presets, reader,
// normaliser and the pure resolver.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contrastRatio } from '../src/lib/qr-colors';
import { MENU_THEMES } from '../src/lib/validations';
import {
  MENU_FONT_STACKS, MENU_KNOB_KEYS, MENU_PRESET_LABELS, MENU_PRESET_ORDER, MENU_PRESETS, MENU_TAGLINE_MAX,
  MENU_TYPEFACES, PRESETS, STYLE_VALUE_RE, TYPEFACES, countOverrides, designKey, effectivePresetId,
  normalizeMenuDesign, readMenuDesign, resolveMenuDesign, sanitizeTagline, type MenuDesign,
} from '../src/lib/menu-design';

const base = { menuAccentColor: null, primaryColor: '#1a73e8', menuDesign: null, hasCover: false };
const resolve = (over: Partial<Parameters<typeof resolveMenuDesign>[0]> & { menuTheme: string }) =>
  resolveMenuDesign({ ...base, ...over });

// ─── reader ─────────────────────────────────────────────────────────────────

test('readMenuDesign: rejects non-designs, never throws', () => {
  for (const raw of [undefined, null, 0, 'x', true, [], [{ v: 1, preset: 'classic' }], { v: 2, preset: 'classic' },
    { v: '1', preset: 'classic' }, { v: 1 }, { v: 1, preset: 'bogus' }, { v: 1, preset: '__proto__' }]) {
    assert.equal(readMenuDesign(raw), null, JSON.stringify(raw));
  }
  const hostile = { get v() { throw new Error('boom'); } };
  assert.equal(readMenuDesign(hostile), null);
});

test('readMenuDesign: keeps valid knobs, drops invalid knobs + unknown keys, sanitises the tagline', () => {
  assert.deepEqual(
    readMenuDesign({ v: 1, preset: 'sokak', density: 'airy', surface: 'pink', corners: 'round', css: 'x', tagline: '  Ev\n yapımı lezzet ' }),
    { v: 1, preset: 'sokak', density: 'airy', corners: 'round', tagline: 'Ev yapımı lezzet' },
  );
  assert.deepEqual(readMenuDesign({ v: 1, preset: 'classic', tagline: 'a'.repeat(81) }), { v: 1, preset: 'classic' });
  assert.deepEqual(readMenuDesign({ v: 1, preset: 'classic', tagline: 42 }), { v: 1, preset: 'classic' });
});

test('sanitizeTagline: control chars, separators, length', () => {
  assert.equal(sanitizeTagline('A\u0000B​C\tD\r\nE F'), 'A B C D E F');
  assert.equal(sanitizeTagline('   '), null);
  assert.equal(sanitizeTagline('\u0007'), null);
  assert.equal(sanitizeTagline(null), null);
  assert.equal(sanitizeTagline('<b>x</b>'), '<b>x</b>'); // plain text; React escapes it
  assert.equal(sanitizeTagline('ı'.repeat(MENU_TAGLINE_MAX)), 'ı'.repeat(MENU_TAGLINE_MAX));
  assert.equal(sanitizeTagline('ı'.repeat(MENU_TAGLINE_MAX + 1)), null);
  assert.equal(sanitizeTagline('Café'), 'Café'); // NFC
});

// ─── normaliser ─────────────────────────────────────────────────────────────

test('normalizeMenuDesign: legacy look → null, defaults dropped, tagline kept, canonical order', () => {
  assert.equal(normalizeMenuDesign('classic', null), null);
  assert.equal(normalizeMenuDesign('classic', { v: 1, preset: 'classic' }), null);
  assert.equal(normalizeMenuDesign('classic', { v: 1, preset: 'classic', surface: 'white', items: 'list' }), null);
  assert.equal(normalizeMenuDesign('classic', { v: 1, preset: 'classic', tagline: '   ' }), null);
  assert.deepEqual(normalizeMenuDesign('modern', { v: 1, preset: 'sokak' }), { v: 1, preset: 'sokak' });
  const out = normalizeMenuDesign('classic', {
    tagline: ' Ev ', badges: 'quiet', surface: 'white', density: 'airy', preset: 'classic', v: 1,
  } as MenuDesign);
  assert.deepEqual(out, { v: 1, preset: 'classic', density: 'airy', badges: 'quiet', tagline: 'Ev' });
  assert.deepEqual(Object.keys(out!), ['v', 'preset', 'density', 'badges', 'tagline']);
});

test('designKey: order-independent; null → "null"', () => {
  const a: MenuDesign = { v: 1, preset: 'classic', density: 'airy', surface: 'ink', tagline: 'x' };
  const b = { tagline: 'x', surface: 'ink', density: 'airy', preset: 'classic', v: 1 } as MenuDesign;
  assert.equal(designKey(a), designKey(b));
  assert.equal(designKey(null), 'null');
  assert.notEqual(designKey(a), designKey({ ...a, density: 'compact' }));
});

test('effectivePresetId + countOverrides', () => {
  assert.equal(effectivePresetId('modern', { v: 1, preset: 'sokak' }), 'sokak');
  assert.equal(effectivePresetId('classic', { v: 1, preset: 'sokak' }), 'classic');
  assert.equal(effectivePresetId('bogus', { v: 1, preset: 'sokak' }), 'classic');
  assert.equal(effectivePresetId('bistro', null), 'bistro');
  assert.equal(countOverrides(null), 0);
  assert.equal(countOverrides({ v: 1, preset: 'classic', tagline: 'x' }), 0);
  assert.equal(countOverrides({ v: 1, preset: 'classic', density: 'airy', price: 'mono' }), 2);
});

// ─── parity ─────────────────────────────────────────────────────────────────

test('parity: themes, presets, order, labels, knob enums', () => {
  for (const theme of MENU_THEMES) assert.equal(PRESETS[theme].family, theme);
  for (const id of MENU_PRESETS) {
    assert.ok((MENU_THEMES as readonly string[]).includes(PRESETS[id].family), id);
    const l = MENU_PRESET_LABELS[id];
    assert.ok(l.tr && l.en && l.vibeTr && l.vibeEn, id);
    for (const key of MENU_KNOB_KEYS) {
      assert.equal(readMenuDesign({ v: 1, preset: id, [key]: PRESETS[id].knobs[key] })?.[key], PRESETS[id].knobs[key], `${id}.${key}`);
    }
  }
  assert.deepEqual([...MENU_PRESET_ORDER].sort(), [...MENU_PRESETS].sort());
  assert.equal(new Set(MENU_PRESET_ORDER).size, MENU_PRESETS.length);
});

test('typeface stacks: OFL only, every var() has a fallback, generic family last', () => {
  for (const key of MENU_TYPEFACES) {
    for (const stack of [TYPEFACES[key].display, TYPEFACES[key].body]) {
      assert.doesNotMatch(stack, /clash/i, key);
      assert.doesNotMatch(stack, /--font-heading/, key);
      assert.doesNotMatch(stack, /var\(--[a-z0-9-]+\s*\)/, `${key}: var() without fallback`);
      assert.match(stack, /(sans-serif|serif|monospace)$/, key);
    }
  }
  for (const stack of MENU_FONT_STACKS) assert.doesNotMatch(stack, /clash|--font-heading/i);
});

// ─── resolver ───────────────────────────────────────────────────────────────

test('R1: classic with the default blue', () => {
  const d = resolve({ menuTheme: 'classic' });
  assert.equal(d.presetId, 'classic');
  assert.equal(d.colors.accent, '#1A73E8');
  assert.deepEqual([d.colors.accentText, d.colors.accentUi, d.colors.accentFill], ['#1A73E8', '#1A73E8', '#1A73E8']);
  assert.equal(d.colors.onAccent, '#FFFFFF');
  assert.equal(d.colors.banner, '#1A73E8');
  assert.equal(d.colors.onBanner, '#FFFFFF');
  assert.equal(d.themeColor, '#1A73E8');
  assert.deepEqual(d.adjusted, { text: false, ui: false, fill: false, banner: false });
  assert.equal(d.structure.header, 'banner');
  assert.equal(d.knobs.surface, 'white');
});

test('R2: classic with lime', () => {
  const d = resolve({ menuTheme: 'classic', menuAccentColor: '#C6F24E' });
  assert.equal(d.colors.accentText, '#677E29');
  assert.equal(d.colors.accentUi, '#738C2D');
  assert.equal(d.colors.accentFill, '#C6F24E');
  assert.equal(d.colors.onAccent, '#141210');
  assert.equal(d.colors.accentEdge, '#738C2D');
  assert.equal(d.adjusted.text, true);
  assert.equal(d.adjusted.fill, false);
});

test('R3: bistro (cream) with lime → ink pill, lime text', () => {
  const d = resolve({ menuTheme: 'bistro', menuAccentColor: '#C6F24E' });
  assert.equal(d.colors.accentFill, '#241D14');
  assert.equal(d.colors.onAccent, '#C6F24E');
  assert.equal(d.adjusted.fill, true);
});

test('R4: gastronomy (ink) with black', () => {
  const d = resolve({ menuTheme: 'gastronomy', menuAccentColor: '#0A0A0A' });
  assert.deepEqual(
    [d.colors.accentText, d.colors.accentUi, d.colors.accentFill, d.colors.onAccent],
    ['#808080', '#6C6C6C', '#626262', '#FFFFFF'],
  );
});

test('R5: classic with violet nudges the fill', () => {
  const d = resolve({ menuTheme: 'classic', menuAccentColor: '#8B5CF6' });
  assert.equal(d.colors.accentFill, '#8D5FF6');
  assert.equal(d.colors.onAccent, '#141210');
  assert.ok(contrastRatio(d.colors.onAccent, d.colors.accentFill) >= 4.5);
});

test('R6–R8: #RGB expansion, invalid colours, invalid theme', () => {
  assert.deepEqual(
    resolve({ menuTheme: 'classic', menuAccentColor: '#abc' }),
    resolve({ menuTheme: 'classic', menuAccentColor: '#AABBCC' }),
  );
  assert.equal(resolve({ menuTheme: 'classic', menuAccentColor: 'nope', primaryColor: 'x' }).colors.accent, '#1A73E8');
  assert.equal(resolve({ menuTheme: 'classic', menuAccentColor: '', primaryColor: '#123' }).colors.accent, '#112233');
  const bogus = resolve({ menuTheme: 'bogus' });
  assert.equal(bogus.family, 'classic');
  assert.equal(bogus.presetId, 'classic');
});

test('R9–R10: preset of the family vs a mismatched preset', () => {
  const sokak = resolve({ menuTheme: 'modern', menuDesign: { v: 1, preset: 'sokak' } });
  assert.equal(sokak.presetId, 'sokak');
  assert.equal(sokak.knobs.surface, 'stone');
  assert.equal(sokak.knobs.items, 'feature');
  const mismatch = resolve({ menuTheme: 'classic', menuDesign: { v: 1, preset: 'sokak', density: 'airy', tagline: 'Ev' } });
  assert.equal(mismatch.presetId, 'classic');
  assert.equal(mismatch.knobs.density, 'airy');
  assert.equal(mismatch.knobs.surface, 'white');
  assert.equal(mismatch.tagline, 'Ev');
});

test('R11: cover header falls back to centered without a cover', () => {
  const design = { v: 1, preset: 'gallery' };
  assert.equal(resolve({ menuTheme: 'modern', menuDesign: design, hasCover: false }).structure.header, 'centered');
  assert.equal(resolve({ menuTheme: 'modern', menuDesign: design, hasCover: true }).structure.header, 'cover');
});

test('R12: pulse ink banner', () => {
  const d = resolve({ menuTheme: 'pulse' });
  assert.equal(d.colors.banner, '#141210');
  assert.equal(d.colors.onBanner, '#FFFFFF');
  assert.equal(d.themeColor, '#141210');
  assert.equal(d.adjusted.banner, false);
});

test('R13–R14: noir blue text, dark surface override', () => {
  assert.equal(
    resolve({ menuTheme: 'gastronomy', menuDesign: { v: 1, preset: 'noir' }, menuAccentColor: '#1D4ED8' }).colors.accentText,
    '#5C80E3',
  );
  const dark = resolve({ menuTheme: 'classic', menuDesign: { v: 1, preset: 'classic', surface: 'ink' } });
  assert.equal(dark.scheme, 'dark');
  assert.equal(dark.style.colorScheme, 'dark');
  assert.equal(dark.colors.bg, '#0F0E0D');
});

test('R17: every style value is whitelisted; deterministic', () => {
  const stacks = new Set(MENU_FONT_STACKS);
  const cases: Parameters<typeof resolveMenuDesign>[0][] = [];
  for (const id of MENU_PRESETS) {
    for (const accent of [null, '#C6F24E', '#0A0A0A', '#A26F33', 'javascript:alert(1)', 'red;}']) {
      cases.push({ menuTheme: PRESETS[id].family, menuAccentColor: accent, primaryColor: '#1a73e8',
        menuDesign: { v: 1, preset: id, price: 'mono', tagline: '</style><script>' }, hasCover: true });
    }
  }
  cases.push({ menuTheme: 'classic', menuAccentColor: null, primaryColor: null, menuDesign: { v: 1, preset: 'atelier' }, hasCover: false });
  for (const input of cases) {
    const d = resolveMenuDesign(input);
    for (const [key, value] of Object.entries(d.style)) {
      assert.equal(typeof value, 'string', key);
      assert.ok(STYLE_VALUE_RE.test(value) || stacks.has(value), `${key}: ${value}`);
      assert.doesNotMatch(value, /[;{}<>]|url\(|expression/i, key);
    }
    assert.deepEqual(resolveMenuDesign(input), d);
  }
  const arch = resolve({ menuTheme: 'bistro', menuDesign: { v: 1, preset: 'atelier' } });
  assert.equal(arch.style['--m-r-thumb'], '999px 999px 20px 20px');
  assert.equal(resolve({ menuTheme: 'minimal' }).style['--m-font-price'].includes('monospace'), true);
});
