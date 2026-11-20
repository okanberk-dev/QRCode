// Menu builder: overlapping theme saves (spec 4.8). A colour dragged across
// the picker fires many requests and the server answers in any order.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCENT_SWATCHES,
  THEME_KEYS,
  beginThemeSave,
  createThemeSync,
  draftPresetId,
  findSwatch,
  isThemeDirty,
  settleThemeSave,
  themeDiff,
  withKnob,
  withoutKnobs,
  withPreset,
  withPresetRestored,
  withTagline,
  type ThemeValues,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-theme';
import { PRESETS, type MenuDesign } from '../src/lib/menu-design';

const start: ThemeValues = { menuTheme: 'classic', menuAccentColor: null, menuLogoUrl: null, menuDesign: null, menuCoverUrl: null };

test('ACCENT_SWATCHES: twelve distinct, valid, named colours', () => {
  assert.equal(ACCENT_SWATCHES.length, 12);
  assert.equal(new Set(ACCENT_SWATCHES.map((s) => s.hex)).size, 12);
  for (const s of ACCENT_SWATCHES) {
    assert.match(s.hex, /^#[0-9A-F]{6}$/);
    assert.ok(s.tr && s.en);
    assert.doesNotMatch(s.tr, /^#/);
  }
});

test('findSwatch: matches ignoring case, custom colours are not swatches', () => {
  assert.equal(findSwatch('#c6f24e')?.tr, 'Limon');
  assert.equal(findSwatch('#3F3F46'), null, 'a saved colour outside the list is a custom colour');
  assert.equal(findSwatch(null), null);
});

test('one save that succeeds: the screen shows the saved value', () => {
  let s = createThemeSync(start);
  const a = beginThemeSave(s);
  s = a.state;
  const done = settleThemeSave(s, a.seq, { menuAccentColor: '#112233' }, true);
  assert.equal(done.state.inFlight, 0);
  assert.equal(done.ui?.menuAccentColor, '#112233');
});

test('a slow old answer never writes an old colour back', () => {
  let s = createThemeSync(start);
  const first = beginThemeSave(s); s = first.state;
  const second = beginThemeSave(s); s = second.state;
  // The newer request answers first.
  const r2 = settleThemeSave(s, second.seq, { menuAccentColor: '#222222' }, true); s = r2.state;
  assert.equal(r2.ui, null, 'the first request is still running — no sync yet');
  // Then the older one arrives.
  const r1 = settleThemeSave(s, first.seq, { menuAccentColor: '#111111' }, true); s = r1.state;
  assert.equal(r1.ui?.menuAccentColor, '#222222');
});

test('a failed save is taken back once nothing else is running', () => {
  let s = createThemeSync({ ...start, menuAccentColor: '#AAAAAA' });
  const a = beginThemeSave(s); s = a.state;
  const failed = settleThemeSave(s, a.seq, { menuAccentColor: '#BBBBBB' }, false);
  assert.equal(failed.ui?.menuAccentColor, '#AAAAAA');
});

test('different fields do not interfere: an older theme save still counts when the newer accent save answers first', () => {
  let s = createThemeSync(start);
  const theme = beginThemeSave(s); s = theme.state;
  const accent = beginThemeSave(s); s = accent.state;
  s = settleThemeSave(s, accent.seq, { menuAccentColor: '#222222' }, true).state;
  const last = settleThemeSave(s, theme.seq, { menuTheme: 'modern' }, true);
  assert.equal(last.ui?.menuTheme, 'modern');
  assert.equal(last.ui?.menuAccentColor, '#222222');
});

test('an older failure while a newer save succeeded: the failed field is reverted, the new one kept', () => {
  let s = createThemeSync(start);
  const theme = beginThemeSave(s); s = theme.state;
  const accent = beginThemeSave(s); s = accent.state;
  s = settleThemeSave(s, theme.seq, { menuTheme: 'modern' }, false).state;
  const last = settleThemeSave(s, accent.seq, { menuAccentColor: '#222222' }, true);
  assert.equal(last.ui?.menuTheme, 'classic');
  assert.equal(last.ui?.menuAccentColor, '#222222');
});

// ── Local design draft (Menu Studio spec §5.7, §17) ──────────────────────

test('themeDiff: no change → {}', () => {
  assert.deepEqual(themeDiff(start, { ...start }), {});
  const saved: ThemeValues = { ...start, menuTheme: 'modern', menuAccentColor: '#C6F24E', menuLogoUrl: 'data:image/png;base64,AAA' };
  assert.deepEqual(themeDiff(saved, { ...saved }), {});
  assert.equal(isThemeDirty(saved, { ...saved }), false);
});

test('themeDiff: only the changed keys', () => {
  assert.deepEqual(themeDiff(start, { ...start, menuTheme: 'pulse' }), { menuTheme: 'pulse' });
  assert.deepEqual(
    themeDiff(start, { ...start, menuTheme: 'bistro', menuAccentColor: '#0E7C66', menuLogoUrl: null }),
    { menuTheme: 'bistro', menuAccentColor: '#0E7C66' },
  );
});

test('themeDiff: accent compared after normaliseHex (case, shorthand) and sent normalised', () => {
  const saved: ThemeValues = { ...start, menuAccentColor: '#C6F24E' };
  assert.deepEqual(themeDiff(saved, { ...saved, menuAccentColor: '#c6f24e' }), {});
  assert.deepEqual(themeDiff({ ...start, menuAccentColor: '#AABBCC' }, { ...start, menuAccentColor: '#abc' }), {});
  assert.deepEqual(themeDiff(saved, { ...saved, menuAccentColor: '#e85a4f' }), { menuAccentColor: '#E85A4F' });
  assert.deepEqual(themeDiff(saved, { ...saved, menuAccentColor: null }), { menuAccentColor: null }, 'back to default');
});

test('themeDiff: logo by string equality; removal → null', () => {
  const saved: ThemeValues = { ...start, menuLogoUrl: 'data:image/png;base64,AAA' };
  assert.deepEqual(themeDiff(saved, { ...saved, menuLogoUrl: null }), { menuLogoUrl: null });
  assert.deepEqual(themeDiff(saved, { ...saved, menuLogoUrl: 'data:image/png;base64,BBB' }), { menuLogoUrl: 'data:image/png;base64,BBB' });
  assert.deepEqual(themeDiff(start, { ...start, menuLogoUrl: '' }), {}, 'empty string counts as no logo');
});

test('isThemeDirty follows themeDiff', () => {
  assert.equal(isThemeDirty(start, { ...start, menuTheme: 'elegant' }), true);
  assert.equal(isThemeDirty({ ...start, menuAccentColor: '#0a0a0a' }, { ...start, menuAccentColor: '#0A0A0A' }), false);
});

// ── Menu design keys (menu-design-final §11.2, §13 chunk 3) ──────────────

test('confirmedSeq covers every THEME_KEY (a missing key would never confirm)', () => {
  assert.deepEqual(Object.keys(createThemeSync(start).confirmedSeq), [...THEME_KEYS]);
  for (const key of THEME_KEYS) assert.equal(createThemeSync(start).confirmedSeq[key], 0);
});

test('themeDiff: equivalent designs with a different key order → no diff', () => {
  const a: MenuDesign = { v: 1, preset: 'classic', surface: 'cream', density: 'airy', tagline: 'Odun ateşinde' };
  const b = JSON.parse('{"tagline":"Odun ateşinde","density":"airy","surface":"cream","preset":"classic","v":1}') as MenuDesign;
  assert.deepEqual(themeDiff({ ...start, menuDesign: a }, { ...start, menuDesign: b }), {});
});

test('themeDiff: a knob change → menuDesign only, normalised', () => {
  const diff = themeDiff(start, withKnob(start, 'surface', 'sage'));
  assert.deepEqual(Object.keys(diff), ['menuDesign']);
  assert.deepEqual(diff.menuDesign, { v: 1, preset: 'classic', surface: 'sage' });
});

test('themeDiff: a cross-family preset → menuTheme and menuDesign', () => {
  const { values } = withPreset(start, 'sokak');
  assert.deepEqual(themeDiff(start, values), { menuTheme: 'modern', menuDesign: { v: 1, preset: 'sokak' } });
});

test('themeDiff: picking the preset default → no diff; back to the family preset → null design', () => {
  assert.deepEqual(themeDiff(start, withKnob(start, 'surface', PRESETS.classic.knobs.surface)), {});
  const saved: ThemeValues = { ...start, menuTheme: 'modern', menuDesign: { v: 1, preset: 'sokak' } };
  assert.deepEqual(themeDiff(saved, withPreset(saved, 'modern').values), { menuDesign: null });
});

test('themeDiff: cover by string; removal → { menuCoverUrl: null }', () => {
  const saved: ThemeValues = { ...start, menuCoverUrl: 'data:image/webp;base64,AAA' };
  assert.deepEqual(themeDiff(saved, { ...saved, menuCoverUrl: null }), { menuCoverUrl: null });
  assert.deepEqual(themeDiff(start, { ...start, menuCoverUrl: 'data:image/webp;base64,BBB' }), { menuCoverUrl: 'data:image/webp;base64,BBB' });
});

test('withPreset: drops knobs, keeps the tagline, reports what it dropped', () => {
  const custom = withTagline(withKnob(start, 'density', 'compact'), '  1987’den beri  ');
  assert.equal(custom.menuDesign?.tagline, '1987’den beri');
  const switched = withPreset(custom, 'atelier');
  assert.equal(switched.dropped, true);
  assert.equal(switched.values.menuTheme, 'bistro');
  assert.deepEqual(switched.values.menuDesign, { v: 1, preset: 'atelier', tagline: '1987’den beri' });
  assert.equal(withPreset(start, 'pulse').dropped, false);
  assert.equal(withPreset(start, 'classic').values, start, 'the current preset is a no-op');
});

test('withPresetRestored: undo of a preset switch keeps the tagline typed after it', () => {
  const custom = withTagline(withKnob(start, 'density', 'compact'), 'Eski slogan');
  const before = { menuTheme: custom.menuTheme, menuDesign: custom.menuDesign };
  const switched = withTagline(withPreset(custom, 'atelier').values, 'Yeni slogan');
  const restored = withPresetRestored(switched, before);
  assert.equal(restored.menuTheme, custom.menuTheme);
  assert.deepEqual(restored.menuDesign, { ...custom.menuDesign, tagline: 'Yeni slogan' });
  // A tagline cleared after the switch stays cleared.
  const cleared = withPresetRestored(withTagline(switched, ''), before);
  assert.equal(cleared.menuDesign?.tagline, undefined);
  assert.equal(cleared.menuDesign?.density, 'compact');
  // Restoring a legacy (null) design with a new tagline keeps the tagline.
  const fromNull = withPresetRestored(withTagline(withPreset(start, 'noir').values, 'Kokteyl'), {
    menuTheme: start.menuTheme,
    menuDesign: null,
  });
  assert.equal(fromNull.menuTheme, start.menuTheme);
  assert.equal(fromNull.menuDesign?.tagline, 'Kokteyl');
});

test('withoutKnobs + withTagline: reset keeps content; empty tagline removes the key', () => {
  const custom = withTagline(withKnob(withPreset(start, 'noir').values, 'items', 'list'), 'Kokteyl');
  assert.deepEqual(withoutKnobs(custom).menuDesign, { v: 1, preset: 'noir', tagline: 'Kokteyl' });
  assert.equal(withTagline(withPreset(start, 'classic').values, '   ').menuDesign, null);
});

test('knob edits on a design from another family rebase on the preset that renders', () => {
  const stale: ThemeValues = { ...start, menuTheme: 'classic', menuDesign: { v: 1, preset: 'noir', density: 'compact' } };
  assert.equal(draftPresetId(stale), 'classic');
  assert.deepEqual(withKnob(stale, 'corners', 'round').menuDesign, { v: 1, preset: 'classic', density: 'compact', corners: 'round' });
});

test('settleThemeSave confirms menuDesign; an out-of-order old answer never overwrites it', () => {
  let s = createThemeSync(start);
  const first = beginThemeSave(s); s = first.state;
  const second = beginThemeSave(s); s = second.state;
  const newer: MenuDesign = { v: 1, preset: 'classic', surface: 'ink' };
  const older: MenuDesign = { v: 1, preset: 'classic', surface: 'sage' };
  s = settleThemeSave(s, second.seq, { menuDesign: newer }, true).state;
  const last = settleThemeSave(s, first.seq, { menuDesign: older }, true);
  assert.deepEqual(last.ui?.menuDesign, newer);
});
