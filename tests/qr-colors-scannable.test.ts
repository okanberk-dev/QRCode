// CLAUDE.md §32 — the menu QR is drawn in the owner's accent colour; this
// guarantees it stays scannable (contrast floor 3:1) without touching colours
// that already scan fine.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contrastRatio, ensureScannableDark, isContrastRisky } from '../src/lib/qr-colors';

const WHITE = '#FFFFFF';

test('ensureScannableDark: pale lime is darkened until it scans (≈ #77912F, 3.57:1)', () => {
  const r = ensureScannableDark('#C6F24E', WHITE);
  assert.equal(r.adjusted, true);
  assert.equal(r.color, '#77912F');
  assert.ok(contrastRatio(r.color, WHITE) >= 3);
  assert.ok(Math.abs(contrastRatio(r.color, WHITE) - 3.57) < 0.02);
});

test('ensureScannableDark: sky blue gets one step darker (#0D98D6, 3.24:1) and keeps its hue', () => {
  const r = ensureScannableDark('#0EA5E9', WHITE);
  assert.equal(r.adjusted, true);
  assert.equal(r.color, '#0D98D6');
  assert.ok(contrastRatio(r.color, WHITE) >= 3);
  // Same hue family: blue stays the dominant channel, red the weakest.
  const [rr, gg, bb] = [1, 3, 5].map((i) => parseInt(r.color.slice(i, i + 2), 16));
  assert.ok(bb > gg && gg > rr);
});

test('ensureScannableDark: colours that already scan are returned unchanged', () => {
  const keep: [string, string][] = [
    ['#0A0A0A', '#0A0A0A'],
    ['#1a73e8', '#1A73E8'], // 4.51:1 — only normalised to upper case
    ['#E85A4F', '#E85A4F'], // 3.50:1
    ['#D97706', '#D97706'], // 3.19:1
    ['#8B5CF6', '#8B5CF6'], // 4.23:1
    ['#000000', '#000000'],
  ];
  for (const [input, expected] of keep) {
    const r = ensureScannableDark(input, WHITE);
    assert.equal(r.adjusted, false, input);
    assert.equal(r.color, expected, input);
  }
});

test('ensureScannableDark: the 12 menu accent swatches — only lime and sky blue change', () => {
  const swatches = [
    '#C6F24E', '#E85A4F', '#D97706', '#9A3412', '#0A0A0A', '#1F2937',
    '#0E7C66', '#15803D', '#0EA5E9', '#1D4ED8', '#8B5CF6', '#BE185D',
  ];
  const changed = swatches.filter((hex) => ensureScannableDark(hex, WHITE).adjusted);
  assert.deepEqual(changed, ['#C6F24E', '#0EA5E9']);
});

test('ensureScannableDark: invalid foreground falls back to #0A0A0A', () => {
  for (const bad of ['', 'nope', '#12', '#GGGGGG', 'rgb(0,0,0)', undefined as unknown as string]) {
    const r = ensureScannableDark(bad, WHITE);
    assert.equal(r.color, '#0A0A0A');
    assert.equal(r.adjusted, false);
  }
});

test('ensureScannableDark: 3-digit hex is expanded', () => {
  assert.deepEqual(ensureScannableDark('#036', WHITE), { color: '#003366', adjusted: false });
  const r = ensureScannableDark('#abc', WHITE);
  assert.equal(r.adjusted, true);
  assert.match(r.color, /^#[0-9A-F]{6}$/);
  assert.ok(contrastRatio(r.color, WHITE) >= 3);
});

test('ensureScannableDark: works on an off-white background too', () => {
  const r = ensureScannableDark('#C6F24E', '#FAF7F0');
  assert.equal(r.adjusted, true);
  assert.ok(contrastRatio(r.color, '#FAF7F0') >= 3);
});

test('ensureScannableDark: an invalid background is treated as white', () => {
  assert.deepEqual(ensureScannableDark('#C6F24E', 'not-a-colour'), ensureScannableDark('#C6F24E', WHITE));
});

test('ensureScannableDark: dark background pulls the foreground towards white, never makes it worse', () => {
  const light = '#0A0A0A';
  const before = contrastRatio('#555555', light);
  assert.ok(before < 3);
  const r = ensureScannableDark('#555555', light);
  assert.equal(r.adjusted, true);
  assert.ok(contrastRatio(r.color, light) > before);
  assert.ok(contrastRatio(r.color, light) >= 3);
  // Lighter than the original (moved towards white).
  assert.ok(parseInt(r.color.slice(1, 3), 16) > 0x55);
});

test('ensureScannableDark: an inverted pair that already contrasts is left alone', () => {
  assert.deepEqual(ensureScannableDark('#FFFFFF', '#0A0A0A'), { color: '#FFFFFF', adjusted: false });
});

test('ensureScannableDark: terminates and always meets the floor, even for foreground == background', () => {
  for (const hex of ['#FFFFFF', '#808080', '#C6F24E', '#000000']) {
    for (const bg of ['#FFFFFF', '#808080', '#000000']) {
      const r = ensureScannableDark(hex, bg);
      assert.ok(contrastRatio(r.color, bg) >= 3, `${hex} on ${bg} → ${r.color}`);
    }
  }
});

test('ensureScannableDark: custom floor', () => {
  // #E85A4F is 3.50:1 — fine at 3, adjusted at 4.5.
  assert.equal(ensureScannableDark('#E85A4F', WHITE, 3).adjusted, false);
  const strict = ensureScannableDark('#E85A4F', WHITE, 4.5);
  assert.equal(strict.adjusted, true);
  assert.ok(contrastRatio(strict.color, WHITE) >= 4.5);
});

test('ensureScannableDark: agrees with isContrastRisky (the QR wizard guard)', () => {
  for (const hex of ['#C6F24E', '#0EA5E9', '#F59E0B', '#A8D62E', '#8CB81E']) {
    const r = ensureScannableDark(hex, WHITE);
    assert.equal(isContrastRisky(r.color, WHITE), false, hex);
  }
});
