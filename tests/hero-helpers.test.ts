/**
 * Stage 41 §38.122 — HANDOFF §8 step 8 (Heroes) — Hero helper unit tests.
 *
 * Saf fonksiyonlar (RAF/DOM bağımsız) — `normalizeCursorOffset`,
 * `layerTransform`, `generateClimbCurve`, scene timing constants.
 * Reduced-motion + tab pause davranışları Stage primitive'inde test
 * edilmiş (CLAUDE.md §38.115 + tests/anim-easing/interpolate).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CINEMATIC_DURATION,
  CINEMATIC_SCENES,
  STAR_CLIMB_DURATION,
  generateClimbCurve,
  layerTransform,
  normalizeCursorOffset,
} from '../src/components/marketing/heroes/hero-helpers';

// ─────────────────────────────────────────────────────────────
// normalizeCursorOffset
// ─────────────────────────────────────────────────────────────

test('normalizeCursorOffset: clamps to [0, 1] within rect', () => {
  const rect = { left: 100, top: 200, width: 400, height: 300 };
  const center = normalizeCursorOffset(300, 350, rect);
  assert.equal(center.x, 0.5);
  assert.equal(center.y, 0.5);

  const topLeft = normalizeCursorOffset(100, 200, rect);
  assert.equal(topLeft.x, 0);
  assert.equal(topLeft.y, 0);

  const bottomRight = normalizeCursorOffset(500, 500, rect);
  assert.equal(bottomRight.x, 1);
  assert.equal(bottomRight.y, 1);
});

test('normalizeCursorOffset: clamps cursor outside rect to [0, 1]', () => {
  const rect = { left: 0, top: 0, width: 100, height: 100 };
  const left = normalizeCursorOffset(-50, 50, rect);
  assert.equal(left.x, 0);
  assert.equal(left.y, 0.5);

  const right = normalizeCursorOffset(200, 50, rect);
  assert.equal(right.x, 1);
  assert.equal(right.y, 0.5);
});

test('normalizeCursorOffset: zero-size rect returns 0.5 center', () => {
  const rect = { left: 0, top: 0, width: 0, height: 0 };
  const result = normalizeCursorOffset(50, 50, rect);
  assert.equal(result.x, 0.5);
  assert.equal(result.y, 0.5);
});

// ─────────────────────────────────────────────────────────────
// layerTransform
// ─────────────────────────────────────────────────────────────

test('layerTransform: cursor at center yields zero translate', () => {
  const result = layerTransform({ x: 0.5, y: 0.5 }, 1.0);
  // tx = (0.5-0.5) * 30 = 0, ty = (0.5-0.5) * 18 = 0, rot = 0
  assert.match(result, /translate3d\(0\.00px, 0\.00px, 0\)/);
  assert.match(result, /rotate\(0\.00deg\)/);
});

test('layerTransform: cursor right yields positive X translate + rotate', () => {
  const result = layerTransform({ x: 1, y: 0.5 }, 1.0);
  // tx = 0.5 * 30 = 15, ty = 0, rot = 0.5 * 8 * 0.25 = 1
  assert.match(result, /translate3d\(15\.00px, 0\.00px, 0\)/);
  assert.match(result, /rotate\(1\.00deg\)/);
});

test('layerTransform: multiplier 0.3 (back layer) attenuates parallax', () => {
  const result = layerTransform({ x: 1, y: 1 }, 0.3);
  // tx = 0.5 * 30 * 0.3 = 4.5, ty = 0.5 * 18 * 0.3 = 2.7, rot = 0.5 * 8 * 0.3 * 0.25 = 0.3
  assert.match(result, /translate3d\(4\.50px, 2\.70px, 0\)/);
  assert.match(result, /rotate\(0\.30deg\)/);
});

test('layerTransform: multiplier 0 yields static (no parallax)', () => {
  const result = layerTransform({ x: 0, y: 0 }, 0);
  assert.match(result, /translate3d\(0\.00px, 0\.00px, 0\)/);
  assert.match(result, /rotate\(0\.00deg\)/);
});

test('layerTransform: custom rotateScale overrides default', () => {
  const result = layerTransform({ x: 1, y: 0.5 }, 1.0, 0);
  // rotate = 0 with rotateScale=0
  assert.match(result, /rotate\(0\.00deg\)/);
});

// ─────────────────────────────────────────────────────────────
// generateClimbCurve
// ─────────────────────────────────────────────────────────────

test('generateClimbCurve: default 12 points 3.6→4.8', () => {
  const curve = generateClimbCurve();
  assert.equal(curve.length, 12);
  assert.equal(curve[0].week, 1);
  assert.equal(curve[curve.length - 1].week, 12);

  // First point should be near start (3.6) — small variance OK
  assert.ok(curve[0].value >= 3.5 && curve[0].value <= 3.8, `start point: ${curve[0].value}`);
  // Last point should be near end (4.8)
  assert.ok(curve[curve.length - 1].value >= 4.6 && curve[curve.length - 1].value <= 4.9, `end point: ${curve[curve.length - 1].value}`);
});

test('generateClimbCurve: deterministic — same args produce same output', () => {
  const a = generateClimbCurve(3.0, 4.5, 8);
  const b = generateClimbCurve(3.0, 4.5, 8);
  assert.deepEqual(a, b);
});

test('generateClimbCurve: clamps values to [1, 5] star scale', () => {
  // Even if variance overshoots, all values must stay in [1, 5]
  const curve = generateClimbCurve(4.5, 4.95, 12);
  for (const point of curve) {
    assert.ok(point.value >= 1 && point.value <= 5, `out of range: ${point.value}`);
  }
});

test('generateClimbCurve: empty when points < 2', () => {
  assert.deepEqual(generateClimbCurve(3, 5, 0), []);
  assert.deepEqual(generateClimbCurve(3, 5, 1), []);
});

test('generateClimbCurve: 2 points returns endpoints only', () => {
  const curve = generateClimbCurve(3.6, 4.8, 2);
  assert.equal(curve.length, 2);
  assert.equal(curve[0].week, 1);
  assert.equal(curve[1].week, 2);
});

test('generateClimbCurve: monotonic-ish climb (last >= first by majority)', () => {
  // Cumulative trend should be upward despite variance; final > first
  const curve = generateClimbCurve(3.6, 4.8, 12);
  assert.ok(curve[curve.length - 1].value > curve[0].value);
});

// ─────────────────────────────────────────────────────────────
// Scene timing constants
// ─────────────────────────────────────────────────────────────

test('CINEMATIC_DURATION: 9 saniye loop', () => {
  assert.equal(CINEMATIC_DURATION, 9);
});

test('STAR_CLIMB_DURATION: 8 saniye loop', () => {
  assert.equal(STAR_CLIMB_DURATION, 8);
});

test('CINEMATIC_SCENES: 5 sahne, kronolojik sıra, 0.2s overlap', () => {
  const scenes = [
    CINEMATIC_SCENES.qrPulse,
    CINEMATIC_SCENES.scan,
    CINEMATIC_SCENES.form,
    CINEMATIC_SCENES.aiReply,
    CINEMATIC_SCENES.starPop,
  ];

  // Each scene should start before previous ends (overlap pattern)
  for (let i = 1; i < scenes.length; i++) {
    assert.ok(
      scenes[i].start < scenes[i - 1].end,
      `Scene ${i} should overlap with previous`,
    );
    // But start should still advance forward
    assert.ok(
      scenes[i].start > scenes[i - 1].start,
      `Scene ${i} start should advance`,
    );
  }

  // Last scene should end at duration
  assert.equal(scenes[scenes.length - 1].end, CINEMATIC_DURATION);
});

test('CINEMATIC_SCENES: scenes 1-4 have 2s window (1.8s visible + 0.2s overlap), last scene (starPop) has 1.8s window (loop boundary)', () => {
  // Scenes 1-4 overlap into next; last scene runs to loop end (no next overlap).
  const overlapping = [
    CINEMATIC_SCENES.qrPulse,
    CINEMATIC_SCENES.scan,
    CINEMATIC_SCENES.form,
    CINEMATIC_SCENES.aiReply,
  ];
  for (const scene of overlapping) {
    // Float-safe equality (3.8 - 1.8 = 1.9999999999999998 on IEEE 754).
    assert.ok(Math.abs(scene.end - scene.start - 2) < 1e-9);
  }
  // starPop runs 7.2 → 9 (final scene, 1.8s — fits cleanly in 9s loop).
  assert.ok(Math.abs(CINEMATIC_SCENES.starPop.end - CINEMATIC_SCENES.starPop.start - 1.8) < 1e-9);
});
