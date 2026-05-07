'use client';

/**
 * Stage 35 §38.115 — HANDOFF §8 step 2 (Lib) util hook.
 *
 * RAF-driven count-up animation. HANDOFF shared.jsx `useCountUp`
 * birebir çevrildi; eklenen değer:
 *  - TS tip imzası
 *  - HANDOFF §5.1 + §5.2 disipline: tab hidden iken RAF teardown,
 *    `prefers-reduced-motion: reduce` iken `target` direkt return
 *    (entry animation atlanır)
 *
 * Pulse §11 disipline: KPI sparkline + StatCard delta gibi sayısal
 * count-up animasyonları için kullanılır. Owner panel'de §38.27
 * KPI 4-card grid bu hook ile zenginleştirilebilir (gelecek scope).
 *
 * @param target Hedef değer (animasyonun bitiş değeri).
 * @param durationMs Animasyon süresi (varsayılan 1600ms).
 * @returns Mevcut animasyon değeri (0 → target).
 */

import { useEffect, useState } from 'react';

export function useCountUp(target: number, durationMs = 1600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setValue(target);
      return;
    }

    // HANDOFF §5.2 — reduced-motion: animation atla, direkt target.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }

    const t0 = performance.now();
    let raf = 0;
    let cancelled = false;

    const tick = (now: number): void => {
      if (cancelled) return;
      const p = Math.min(1, (now - t0) / durationMs);
      // easeOutCubic — HANDOFF shared.jsx ile birebir
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // HANDOFF §5.1 — tab pause: hidden iken RAF teardown
    const onVisibility = (): void => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        cancelled = true;
        setValue(target); // tab geri geldiğinde son state görünür
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [target, durationMs]);

  return value;
}
