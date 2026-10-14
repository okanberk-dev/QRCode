// Menu builder: overlapping theme saves (spec 4.8). A colour dragged across
// the picker fires many requests and the server answers in any order.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCENT_SWATCHES,
  beginThemeSave,
  createThemeSync,
  findSwatch,
  settleThemeSave,
  type ThemeValues,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-theme';

const start: ThemeValues = { menuTheme: 'classic', menuAccentColor: null, menuLogoUrl: null };

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
