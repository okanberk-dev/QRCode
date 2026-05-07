'use client';

/**
 * Stage 35 §38.115 — HANDOFF §8 step 2 (Lib) util hook.
 *
 * IntersectionObserver-based "in viewport" trigger. HANDOFF shared.jsx
 * `useInView` birebir çevrildi; eklenen değer:
 *  - TS tip imzası
 *  - SSR-safe (window check)
 *  - One-shot semantik intact (seen kalır, ikinci tetiklenme YOK)
 *
 * Pulse §11 + §38.61 disipline: scroll-triggered fade-in animasyonları,
 * lazy-load sentinels için. Marketing surface'lerinde feature card
 * grid'leri (Stage 39 site-fx) kullanır.
 */

import { useEffect, useState, type RefObject } from 'react';

export interface UseInViewOptions extends IntersectionObserverInit {
  /** Default 0.3 — element'in %30'u görünür olunca trigger. */
  threshold?: number | number[];
}

/**
 * Element viewport'a girince `true` döner; bir kez tetiklendikten sonra
 * `true` kalır (one-shot). Aynı element'in tekrar tekrar in/out olmasını
 * track etmek için ayrı API gerekir (yet another scope).
 *
 * @param ref Hedef element ref'i.
 * @param options IntersectionObserver options. Default `{ threshold: 0.3 }`.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  options: UseInViewOptions = { threshold: 0.3 },
): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof IntersectionObserver === 'undefined') {
      // SSR / test env fallback — assume in view (kullanıcıya değer
      // göstermek için better than blank state).
      setSeen(true);
      return;
    }
    const node = ref.current;
    if (!node || seen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true);
            observer.disconnect();
            return;
          }
        }
      },
      options,
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, seen, options]);

  return seen;
}
