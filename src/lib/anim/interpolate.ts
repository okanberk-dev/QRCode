/**
 * Stage 35 §38.115 — HANDOFF §8 step 2 (Lib) animation engine.
 *
 * Saf interpolasyon helper'ları. HANDOFF animations.jsx'ten birebir
 * çevrildi; eklenen değer: TS tip imzaları + immutable signature.
 */

import { Easing, type EasingFn } from './easing';

/** Clamp a value to [min, max]. */
export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export interface InterpolateOptions {
  /** Per-segment easing veya tek easing. Array length must be `input.length - 1`. */
  ease?: EasingFn | EasingFn[];
}

/**
 * Popmotion-style keyframe interpolasyon.
 *
 * `interpolate([0, 0.5, 1], [0, 100, 50], easeOutCubic)` → fn(t):
 *   - `t <= 0` → 0
 *   - `t = 0.5` → 100
 *   - `t = 1` → 50
 *
 * Saf fonksiyon, RAF dışı kullanım için unit-test edilebilir.
 */
export function interpolate(
  input: readonly number[],
  output: readonly number[],
  ease: EasingFn | EasingFn[] = Easing.linear,
): (t: number) => number {
  if (input.length !== output.length) {
    throw new Error('interpolate: input and output arrays must have equal length');
  }
  if (input.length < 2) {
    throw new Error('interpolate: at least 2 keyframes required');
  }
  return (t: number): number => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? ease[i] || Easing.linear : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

export interface AnimateOptions {
  from?: number;
  to?: number;
  start?: number;
  end?: number;
  ease?: EasingFn;
}

/**
 * Single-segment tween. `animate({from, to, start, end, ease})` → fn(t).
 *
 * - `t <= start` → `from`
 * - `t >= end` → `to`
 * - aksi → easing'e göre interpolasyon
 *
 * `start === end` durumunda fn(t) `from` döner (division-by-zero guard).
 */
export function animate({
  from = 0,
  to = 1,
  start = 0,
  end = 1,
  ease = Easing.easeInOutCubic,
}: AnimateOptions = {}): (t: number) => number {
  return (t: number): number => {
    if (t <= start) return from;
    if (t >= end) return to;
    const span = end - start;
    if (span === 0) return from;
    const local = (t - start) / span;
    return from + (to - from) * ease(local);
  };
}
