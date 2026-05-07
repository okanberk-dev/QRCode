/**
 * Stage 35 §38.115 — animation engine easing fonksiyonları unit test.
 *
 * Pulse §32 paterni: Node `--test` runner, saf fonksiyon coverage.
 * Tüm easing'ler `t ∈ [0, 1]` boundary + monotonic + identity test.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Easing } from '../src/lib/anim/easing';

const EPSILON = 1e-9;

describe('Easing identity (linear)', () => {
  it('linear(0) = 0, linear(1) = 1', () => {
    assert.equal(Easing.linear(0), 0);
    assert.equal(Easing.linear(1), 1);
  });
  it('linear(0.5) = 0.5', () => {
    assert.equal(Easing.linear(0.5), 0.5);
  });
});

describe('Easing boundary (all functions)', () => {
  // 0 ve 1'de easing'lerin (back/elastic hariç tam) sınır değerleri.
  const standardFns = [
    'easeInQuad',
    'easeOutQuad',
    'easeInOutQuad',
    'easeInCubic',
    'easeOutCubic',
    'easeInOutCubic',
    'easeInQuart',
    'easeOutQuart',
    'easeInOutQuart',
    'easeInExpo',
    'easeOutExpo',
    'easeInOutExpo',
    'easeInSine',
    'easeOutSine',
    'easeInOutSine',
  ] as const;

  for (const name of standardFns) {
    it(`${name}(0) ≈ 0`, () => {
      const v = Easing[name](0);
      assert.ok(Math.abs(v) < EPSILON, `expected ~0, got ${v}`);
    });
    it(`${name}(1) ≈ 1`, () => {
      const v = Easing[name](1);
      assert.ok(Math.abs(v - 1) < EPSILON, `expected ~1, got ${v}`);
    });
  }
});

describe('Easing back (overshoot)', () => {
  it('easeOutBack(1) ≈ 1', () => {
    assert.ok(Math.abs(Easing.easeOutBack(1) - 1) < EPSILON);
  });
  it('easeOutBack(0) ≈ 0', () => {
    // Floating-point noise: implementation may return 2.22e-16
    assert.ok(Math.abs(Easing.easeOutBack(0)) < EPSILON);
  });
  it('easeInBack(0) ≈ 0', () => {
    assert.ok(Math.abs(Easing.easeInBack(0)) < EPSILON);
  });
  it('easeInBack(1) ≈ 1', () => {
    assert.ok(Math.abs(Easing.easeInBack(1) - 1) < EPSILON);
  });
  it('easeOutBack overshoots between 0.6-0.9', () => {
    // Back easing 0.5 sonrası 1'i geçer, sonra 1'e iner.
    const v = Easing.easeOutBack(0.7);
    assert.ok(v > 1, `expected overshoot >1, got ${v}`);
  });
});

describe('Easing elastic', () => {
  it('easeOutElastic(0) = 0', () => {
    assert.equal(Easing.easeOutElastic(0), 0);
  });
  it('easeOutElastic(1) = 1', () => {
    assert.equal(Easing.easeOutElastic(1), 1);
  });
});

describe('Easing monotonicity (in/out — no overshoot variants)', () => {
  // Standard non-overshoot easing'ler monotonik artmalı.
  const monotonicFns = [
    'linear',
    'easeInQuad',
    'easeOutQuad',
    'easeInCubic',
    'easeOutCubic',
    'easeInQuart',
    'easeOutQuart',
    'easeInExpo',
    'easeOutExpo',
    'easeInSine',
    'easeOutSine',
  ] as const;

  for (const name of monotonicFns) {
    it(`${name} is monotonic increasing`, () => {
      const fn = Easing[name];
      let prev = fn(0);
      for (let i = 1; i <= 20; i++) {
        const t = i / 20;
        const v = fn(t);
        assert.ok(v >= prev - EPSILON, `${name} non-monotonic at t=${t}: ${prev} → ${v}`);
        prev = v;
      }
    });
  }
});
