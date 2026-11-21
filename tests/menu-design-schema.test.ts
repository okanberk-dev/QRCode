// menu-design-final.md §7.2 — write-side validation (server only).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AccentWrite, CoverWrite, MENU_COVER_MAX_CHARS, MenuDesignWriteSchema } from '../src/lib/menu-design-schema';

test('MenuDesignWriteSchema: strict, enumerated, sanitised tagline', () => {
  assert.deepEqual(MenuDesignWriteSchema.parse({ v: 1, preset: 'sokak', density: 'airy', tagline: ' Ev\nyapımı ' }), {
    v: 1, preset: 'sokak', density: 'airy', tagline: 'Ev yapımı',
  });
  for (const bad of [
    { v: 1, preset: 'classic', css: 'color:red' },
    { v: 2, preset: 'classic' },
    { v: 1, preset: 'bogus' },
    { v: 1, preset: 'classic', surface: '#FF0000' },
    { v: 1, preset: 'classic', typeface: 'clash' },
    { v: 1, preset: 'classic', tagline: '' },
    { v: 1, preset: 'classic', tagline: ' \n​ ' },
    { v: 1, preset: 'classic', tagline: 'x'.repeat(81) },
    { v: 1, preset: 'classic', tagline: 'x'.repeat(401) },
    null,
  ]) {
    assert.equal(MenuDesignWriteSchema.safeParse(bad).success, false, JSON.stringify(bad));
  }
  // HTML-looking text is plain text, stored as such (rendered escaped).
  assert.equal(MenuDesignWriteSchema.parse({ v: 1, preset: 'classic', tagline: '<b>x</b>' }).tagline, '<b>x</b>');
});

test('AccentWrite: #RGB → #RRGGBB, rejects non-hex', () => {
  assert.equal(AccentWrite.parse('#abc'), '#AABBCC');
  assert.equal(AccentWrite.parse(' #c6f24e '), '#C6F24E');
  for (const bad of ['rgb(0,0,0)', 'red', '#12345', '#1234567', '', 'url(x)']) {
    assert.equal(AccentWrite.safeParse(bad).success, false, bad);
  }
});

test('CoverWrite: raster data URLs only; "" → null', () => {
  assert.equal(CoverWrite.parse(null), null);
  assert.equal(CoverWrite.parse(''), null);
  const ok = 'data:image/webp;base64,AAAA';
  assert.equal(CoverWrite.parse(ok), ok);
  for (const bad of [
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/gif;base64,AAAA',
    'data:image/webp;base64,',
    'data:image/webp;base64,AA AA',
    'data:image/png;base64,AAAA"><script>',
    'https://example.com/cover.jpg',
    'data:image/webp;base64,' + 'A'.repeat(MENU_COVER_MAX_CHARS),
  ]) {
    assert.equal(CoverWrite.safeParse(bad).success, false, bad.slice(0, 40));
  }
});
