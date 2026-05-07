/**
 * Stage 35 §38.115 — HANDOFF §8 step 2 (Lib) animation engine.
 *
 * Easing fonksiyonları (saf, deterministik). HANDOFF animations.jsx'ten
 * birebir çevrildi; eklenen değer: TS tip imzaları + JSDoc.
 *
 * Tüm fonksiyonlar `t ∈ [0, 1]` alır ve eased `t` döner. Back/Elastic
 * variant'lar overshoot edebilir (yanı sıra `<0` veya `>1` aralık dışına
 * geçebilir — Pulse design intent gereği; clamp gerekirse caller yapar).
 *
 * Pulse §11 tasarım disipline: lime CTA'lar genelde `easeOutBack`,
 * fade-in'ler `easeOutCubic`, slide-up'lar `cubic-bezier(0.4, 0, 0.2, 1)`
 * (cubic-bezier mevcut CSS'te kullanılıyor; bu modülün TS karşılığı
 * yaklaşık `easeInOutCubic`).
 */

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: ((t) => t) satisfies EasingFn,

  // Quad
  easeInQuad: ((t) => t * t) satisfies EasingFn,
  easeOutQuad: ((t) => t * (2 - t)) satisfies EasingFn,
  easeInOutQuad: ((t) =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t) satisfies EasingFn,

  // Cubic
  easeInCubic: ((t) => t * t * t) satisfies EasingFn,
  easeOutCubic: ((t) => {
    const t1 = t - 1;
    return t1 * t1 * t1 + 1;
  }) satisfies EasingFn,
  easeInOutCubic: ((t) =>
    t < 0.5
      ? 4 * t * t * t
      : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1) satisfies EasingFn,

  // Quart
  easeInQuart: ((t) => t * t * t * t) satisfies EasingFn,
  easeOutQuart: ((t) => {
    const t1 = t - 1;
    return 1 - t1 * t1 * t1 * t1;
  }) satisfies EasingFn,
  easeInOutQuart: ((t) => {
    if (t < 0.5) return 8 * t * t * t * t;
    const t1 = t - 1;
    return 1 - 8 * t1 * t1 * t1 * t1;
  }) satisfies EasingFn,

  // Expo
  easeInExpo: ((t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)))) satisfies EasingFn,
  easeOutExpo: ((t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))) satisfies EasingFn,
  easeInOutExpo: ((t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  }) satisfies EasingFn,

  // Sine
  easeInSine: ((t) => 1 - Math.cos((t * Math.PI) / 2)) satisfies EasingFn,
  easeOutSine: ((t) => Math.sin((t * Math.PI) / 2)) satisfies EasingFn,
  easeInOutSine: ((t) => -(Math.cos(Math.PI * t) - 1) / 2) satisfies EasingFn,

  // Back (overshoot — output may briefly exceed [0, 1])
  easeOutBack: ((t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }) satisfies EasingFn,
  easeInBack: ((t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }) satisfies EasingFn,
  easeInOutBack: ((t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  }) satisfies EasingFn,

  // Elastic
  easeOutElastic: ((t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }) satisfies EasingFn,
} as const;

export type EasingName = keyof typeof Easing;
