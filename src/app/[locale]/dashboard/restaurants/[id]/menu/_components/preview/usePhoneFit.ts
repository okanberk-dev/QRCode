'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Native width of the customer view (iPhone-ish). */
export const PHONE_WIDTH = 375;

export interface PhoneFit {
  /** CSS zoom of the 375 px viewport. */
  zoom: number;
  /** Native height of the viewport (before zoom). */
  height: number;
  /** Framed only: not enough room for a useful phone — show "Önizlemeyi aç" instead. */
  tooShort: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Size of the preview phone (spec §7.9).
 * - framed (right column): fits the stage width and the window height under
 *   the sticky toolbar (`topOffset`); below 368 px of room → `tooShort`.
 * - bare (phone "Önizle" view, sheets): full width, zoom ≤ 1, tall enough to scroll.
 */
export function usePhoneFit(
  stageRef: RefObject<HTMLElement | null>,
  variant: 'framed' | 'bare',
  opts: { topOffset?: number; height?: number } = {},
): PhoneFit {
  const { topOffset = 214, height } = opts;
  const [fit, setFit] = useState<PhoneFit>({ zoom: variant === 'framed' ? 0.78 : 1, height: 660, tooShort: false });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = stage.clientWidth;
        const vh = window.innerHeight;
        if (variant === 'framed') {
          const zW = (width - 16) / PHONE_WIDTH;
          const room = vh - topOffset - 112;
          if (room < 368) {
            setFit({ zoom: 0.78, height: 600, tooShort: true });
            return;
          }
          const zoom = clamp(Math.min(zW, (room - 38) / 600), 0.55, 0.9);
          setFit({ zoom, height: Math.round(clamp((room - 38) / zoom, 600, 812)), tooShort: false });
        } else {
          const zoom = Math.min(1, width / PHONE_WIDTH);
          const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-bottom-nav-h')) || 0;
          const budget = height ?? vh - 72 - nav - 52 - 48 - 24;
          setFit({ zoom, height: Math.round(Math.max(480, budget / zoom)), tooShort: false });
        }
      });
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(stage);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [stageRef, variant, topOffset, height]);

  return fit;
}
