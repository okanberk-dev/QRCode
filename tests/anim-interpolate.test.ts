/**
 * Stage 35 §38.115 — animation engine interpolate/animate/clamp testi.
 *
 * Pulse §32 paterni: Node `--test` runner, saf fonksiyon coverage.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, interpolate, animate } from '../src/lib/anim/interpolate';
import { Easing } from '../src/lib/anim/easing';

const EPSILON = 1e-9;

describe('clamp', () => {
  it('clamps below min', () => {
    assert.equal(clamp(-5, 0, 10), 0);
  });
  it('clamps above max', () => {
    assert.equal(clamp(15, 0, 10), 10);
  });
  it('returns value when in range', () => {
    assert.equal(clamp(5, 0, 10), 5);
  });
  it('respects exclusive bounds 0 and 1', () => {
    assert.equal(clamp(0, 0, 1), 0);
    assert.equal(clamp(1, 0, 1), 1);
  });
});

describe('interpolate — linear segments', () => {
  it('interpolates at keyframe boundaries', () => {
    const fn = interpolate([0, 0.5, 1], [0, 100, 50]);
    assert.equal(fn(0), 0);
    assert.equal(fn(0.5), 100);
    assert.equal(fn(1), 50);
  });
  it('linear interpolation between keyframes', () => {
    const fn = interpolate([0, 1], [0, 100]);
    assert.ok(Math.abs(fn(0.5) - 50) < EPSILON);
  });
  it('returns first output when t below input min', () => {
    const fn = interpolate([0.2, 0.8], [10, 90]);
    assert.equal(fn(0.1), 10);
    assert.equal(fn(-1), 10);
  });
  it('returns last output when t above input max', () => {
    const fn = interpolate([0.2, 0.8], [10, 90]);
    assert.equal(fn(0.9), 90);
    assert.equal(fn(2), 90);
  });
});

describe('interpolate — easing per segment', () => {
  it('applies single easing function across all segments', () => {
    const fn = interpolate([0, 1], [0, 100], Easing.easeInQuad);
    // easeInQuad(0.5) = 0.25 → 0 + 100 * 0.25 = 25
    assert.ok(Math.abs(fn(0.5) - 25) < EPSILON);
  });
  it('applies per-segment easing array', () => {
    const fn = interpolate(
      [0, 0.5, 1],
      [0, 100, 200],
      [Easing.easeInQuad, Easing.easeOutQuad],
    );
    // First segment t=0.25 → local=0.5 → easeInQuad(0.5)=0.25 → 0 + 100*0.25 = 25
    assert.ok(Math.abs(fn(0.25) - 25) < EPSILON);
    // Second segment t=0.75 → local=0.5 → easeOutQuad(0.5)=0.75 → 100 + 100*0.75 = 175
    assert.ok(Math.abs(fn(0.75) - 175) < EPSILON);
  });
});

describe('interpolate — validation', () => {
  it('throws when input/output length mismatch', () => {
    assert.throws(() => interpolate([0, 1], [0]), /equal length/);
  });
  it('throws when fewer than 2 keyframes', () => {
    assert.throws(() => interpolate([0], [0]), /at least 2/);
  });
});

describe('animate — single segment tween', () => {
  it('returns from before start', () => {
    const fn = animate({ from: 0, to: 100, start: 1, end: 2 });
    assert.equal(fn(0.5), 0);
    assert.equal(fn(1), 0);
  });
  it('returns to after end', () => {
    const fn = animate({ from: 0, to: 100, start: 1, end: 2 });
    assert.equal(fn(2.5), 100);
    assert.equal(fn(2), 100);
  });
  it('interpolates with default easing in window', () => {
    const fn = animate({ from: 0, to: 100, start: 0, end: 1 });
    // easeInOutCubic(0.5) = 0.5 → 0 + 100*0.5 = 50
    assert.ok(Math.abs(fn(0.5) - 50) < EPSILON);
  });
  it('handles zero-span (start === end) safely', () => {
    const fn = animate({ from: 10, to: 90, start: 1, end: 1 });
    assert.equal(fn(0.5), 10);
    assert.equal(fn(1.5), 90);
  });
  it('uses custom easing when provided', () => {
    const fn = animate({ from: 0, to: 100, start: 0, end: 1, ease: Easing.linear });
    assert.ok(Math.abs(fn(0.5) - 50) < EPSILON);
  });
  it('respects defaults (from=0, to=1, start=0, end=1)', () => {
    const fn = animate();
    assert.equal(fn(0), 0);
    assert.equal(fn(1), 1);
  });
});
