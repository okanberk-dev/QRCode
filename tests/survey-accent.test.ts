import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio } from '../src/lib/qr-colors';
import {
  DEFAULT_SURVEY_ACCENT,
  MIN_FILL_CONTRAST_ON_DARK,
  MIN_FILL_CONTRAST_ON_LIGHT,
  SURVEY_INK,
  SURVEY_WHITE,
  resolveSurveyAccent,
} from '../src/lib/survey-accent';

// Surveys Phase 0 (P0-7). The public survey page paints the owner's accent as
// a fill on a dark (#0A0A0A) and a light (#FFFFFF) surface and puts text on
// it. `resolveSurveyAccent` must keep the fill visible per surface and the
// text readable on the fill — WITHOUT turning the default lime black (lime is
// only 1.30:1 on white; the rev-2 spec correction).

const LIME = '#C6F24E';

// The old 5-step wizard offered these 7 swatches plus #0A0A0A; the single-page
// editor keeps the 7 and drops the ink one, but live surveys still carry it.
const NEW_SWATCHES = ['#C6F24E', '#1A73E8', '#F97316', '#EF4444', '#10B981', '#A855F7', '#0EA5E9'];
const LEGACY_INK_SWATCH = '#0A0A0A';

function hex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Deterministic PRNG so the "random" scan is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── fallback + normalisation ────────────────────────────────────────────

test('missing, empty or invalid colours fall back to the lime default', () => {
  const bad: Array<string | null | undefined> = [
    null,
    undefined,
    '',
    '   ',
    'red',
    '#12345',
    '#GGGGGG',
    'rgb(0, 0, 0)',
    '#12345678',
    'C6F24E',
  ];
  for (const raw of bad) {
    const r = resolveSurveyAccent(raw);
    assert.equal(r.accent, DEFAULT_SURVEY_ACCENT, `accent for ${JSON.stringify(raw)}`);
    assert.equal(DEFAULT_SURVEY_ACCENT, LIME);
    assert.deepEqual(r.onDark, { fill: LIME, text: SURVEY_INK });
    assert.deepEqual(r.onLight, { fill: LIME, text: SURVEY_INK });
  }
});

test('the accent is normalised to uppercase #RRGGBB (shorthand expanded, trimmed)', () => {
  assert.equal(resolveSurveyAccent('#c6f24e').accent, '#C6F24E');
  assert.equal(resolveSurveyAccent('#abc').accent, '#AABBCC');
  assert.equal(resolveSurveyAccent('  #1a73e8 ').accent, '#1A73E8');
});

// ── dark surface (intro + thanks, #0A0A0A) ──────────────────────────────

test('dark surface: ink accent turns white, lime stays lime, navy turns white', () => {
  assert.deepEqual(resolveSurveyAccent('#0A0A0A').onDark, {
    fill: SURVEY_WHITE,
    text: SURVEY_INK,
  });
  assert.deepEqual(resolveSurveyAccent('#C6F24E').onDark, { fill: LIME, text: SURVEY_INK });
  assert.equal(resolveSurveyAccent('#0B2545').onDark.fill, SURVEY_WHITE);
  assert.equal(resolveSurveyAccent('#0B2545').onDark.text, SURVEY_INK);
});

// ── light surface (question + contact, #FFFFFF) ─────────────────────────

test('light surface: the default lime KEEPS its fill (lock for the unchanged default look)', () => {
  const light = resolveSurveyAccent('#C6F24E').onLight;
  assert.equal(light.fill, LIME, 'lime must NOT turn black on the light surface');
  assert.equal(light.text, SURVEY_INK);
  // Why the floor is 1.15 and not the earlier 1.4: lime is 1.30:1 on white.
  const lime = contrastRatio(LIME, SURVEY_WHITE);
  assert.ok(lime > 1.25 && lime < 1.4, `lime vs white = ${lime}`);
  assert.ok(lime >= MIN_FILL_CONTRAST_ON_LIGHT);
});

test('light surface: strong accents keep their fill with the better text colour', () => {
  assert.deepEqual(resolveSurveyAccent('#1A73E8').onLight, {
    fill: '#1A73E8',
    text: SURVEY_WHITE, // white 4.51:1 beats ink 4.39:1
  });
  assert.equal(resolveSurveyAccent('#F97316').onLight.fill, '#F97316');
  assert.equal(resolveSurveyAccent('#F97316').onLight.text, SURVEY_INK);
});

test('light surface: washed-out colours fall back to ink', () => {
  for (const washed of ['#FFFFFF', '#F5F5F5', '#EAF9B8']) {
    const light = resolveSurveyAccent(washed).onLight;
    assert.equal(light.fill, SURVEY_INK, `${washed} would vanish on white`);
    assert.equal(light.text, SURVEY_WHITE);
  }
  assert.deepEqual(resolveSurveyAccent('#0A0A0A').onLight, {
    fill: SURVEY_INK,
    text: SURVEY_WHITE,
  });
});

test('every wizard swatch keeps its own colour on the light surface (all >= 1.30:1)', () => {
  for (const sw of NEW_SWATCHES) {
    assert.equal(resolveSurveyAccent(sw).onLight.fill, sw, sw);
  }
});

// ── contrast guarantees ─────────────────────────────────────────────────

test('swatch set: text-on-fill is >= 4.5:1 on BOTH surfaces (incl. legacy ink)', () => {
  for (const sw of [...NEW_SWATCHES, LEGACY_INK_SWATCH]) {
    const r = resolveSurveyAccent(sw);
    for (const [surface, pair] of [
      ['dark', r.onDark],
      ['light', r.onLight],
    ] as const) {
      const ratio = contrastRatio(pair.text, pair.fill);
      assert.ok(ratio >= 4.5, `${sw} on ${surface}: ${pair.text} on ${pair.fill} = ${ratio}`);
    }
  }
});

test('the intro CTA of an ink survey is visible: fill differs from the dark page and text is readable', () => {
  const dark = resolveSurveyAccent('#0A0A0A').onDark;
  assert.ok(contrastRatio(dark.fill, SURVEY_INK) >= MIN_FILL_CONTRAST_ON_DARK);
  assert.ok(contrastRatio(dark.text, dark.fill) >= 4.5);
});

test('max(ink, white) text contrast can never reach 4.5:1 for every colour (documents the scan bound)', () => {
  // L ≈ 0.186 is where ink and white contrast equally: ~4.45:1 for both.
  // So "every pair >= 4.5" is mathematically impossible; the scans below use 4.4.
  const worst = Math.max(contrastRatio(SURVEY_INK, '#C841A0'), contrastRatio(SURVEY_WHITE, '#C841A0'));
  assert.ok(worst < 4.5 && worst >= 4.44, `#C841A0 best text contrast = ${worst}`);
});

function assertInvariants(raw: string): void {
  const r = resolveSurveyAccent(raw);
  assert.match(r.accent, /^#[0-9A-F]{6}$/);
  for (const [surface, pair, surfaceHex] of [
    ['dark', r.onDark, SURVEY_INK],
    ['light', r.onLight, SURVEY_WHITE],
  ] as const) {
    assert.match(pair.fill, /^#[0-9A-F]{6}$/, `${raw} ${surface} fill format`);
    assert.ok(
      [r.accent, SURVEY_WHITE, SURVEY_INK].includes(pair.fill),
      `${raw} ${surface}: fill must be the accent, white or ink`,
    );
    assert.ok([SURVEY_INK, SURVEY_WHITE].includes(pair.text), `${raw} ${surface} text`);
    const ratio = contrastRatio(pair.text, pair.fill);
    assert.ok(ratio >= 4.4, `${raw} ${surface}: text ${pair.text} on ${pair.fill} = ${ratio}`);
    // 8-digit hex tints (`fill + '24'`) are derived from the fill.
    assert.match(pair.fill + '24', /^#[0-9A-F]{8}$/);
    assert.ok(contrastRatio(pair.fill, surfaceHex) > 1, `${raw} ${surface}: fill differs from the surface`);
  }
  assert.ok(
    contrastRatio(r.onDark.fill, SURVEY_INK) >= MIN_FILL_CONTRAST_ON_DARK,
    `${raw}: dark fill vs #0A0A0A`,
  );
  assert.ok(
    contrastRatio(r.onLight.fill, SURVEY_WHITE) >= MIN_FILL_CONTRAST_ON_LIGHT,
    `${raw}: light fill vs #FFFFFF`,
  );
}

test('17^3 colour grid (step 15): text >= 4.4:1, fills stay visible on both surfaces', () => {
  const steps = Array.from({ length: 17 }, (_, i) => i * 15);
  let n = 0;
  for (const r of steps) for (const g of steps) for (const b of steps) {
    assertInvariants(hex(r, g, b));
    n++;
  }
  assert.equal(n, 17 ** 3);
});

test('2000 seeded random colours: same guarantees', () => {
  const rnd = mulberry32(20261013);
  for (let i = 0; i < 2000; i++) {
    assertInvariants(hex(Math.floor(rnd() * 256), Math.floor(rnd() * 256), Math.floor(rnd() * 256)));
  }
});
