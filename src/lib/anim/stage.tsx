'use client';

/**
 * Stage 35 §38.115 — HANDOFF §8 step 2 (Lib) animation engine.
 *
 * `<Stage>` core: TimelineContext sağlar, RAF loop ile time advance,
 * loop support. HANDOFF showcase paterninden production-relevant
 * subset alındı:
 *
 * Korunan:
 *  - RAF-driven `time` advance (delta-time based, not fixed-step)
 *  - `loop` prop — duration sonunda restart
 *  - TimelineContext + `useTime`/`useTimeline` hooks
 *  - HANDOFF §5.1 CRITICAL: tab pause (`document.visibilityState === 'hidden'` → RAF durdur)
 *  - HANDOFF §5.2: reduced-motion bypass (`prefers-reduced-motion: reduce` → time = duration, sprite'lar static görünür)
 *
 * Atılan (showcase-only, production'da gereksiz):
 *  - PlaybackBar, keyboard control (Space/←/→), persist localStorage
 *  - Auto-scale to viewport, hover seek
 *  - `fps` prop (RAF native rate)
 *
 * Pulse §11 + §38.61 disipline:
 *  - Reduced-motion blanket'a Stage component eklenmesi gerekmez —
 *    reduced-motion check internal; child sprite'lar `progress = 1`
 *    ile final state'te render olur.
 */

import * as React from 'react';
import { clamp } from './interpolate';

interface TimelineContextValue {
  time: number;
  duration: number;
  playing: boolean;
  reduced: boolean;
}

const TimelineContext = React.createContext<TimelineContextValue>({
  time: 0,
  duration: 10,
  playing: false,
  reduced: false,
});

export const useTime = (): number => React.useContext(TimelineContext).time;
export const useTimeline = (): TimelineContextValue =>
  React.useContext(TimelineContext);

export interface StageProps {
  /** Toplam süre (saniye). Loop true ise modulo, aksi halde duration'da pause. */
  duration?: number;
  /** Bitince başa sar (default true). */
  loop?: boolean;
  /** Auto-start (default true). */
  autoplay?: boolean;
  /** Custom className for the host element. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Animation timeline host. RAF ile `time` 0..duration aralığında advance
 * eder. Child `<Sprite>`'lar `useTimeline()` ile time'i okur.
 *
 * Tab pause + reduced-motion HANDOFF §5 disipline'i intact:
 *  - `document.visibilityState === 'hidden'` → RAF teardown (battery save)
 *  - `prefers-reduced-motion: reduce` → time = duration, autoplay off
 *    (child sprite'lar final state'te static render)
 */
export function Stage({
  duration = 10,
  loop = true,
  autoplay = true,
  className,
  children,
}: StageProps): React.ReactElement {
  const [reduced, setReduced] = React.useState(false);

  // Reduced-motion preference detection (HANDOFF §5.2 + CLAUDE.md §38.61)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Legacy Safari fallback (mql.addListener)
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  const initialTime = reduced ? duration : 0;
  const [time, setTime] = React.useState(initialTime);
  const [playing, setPlaying] = React.useState(autoplay && !reduced);
  const lastTsRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);

  // Sync state when reduced-motion flips at runtime
  React.useEffect(() => {
    if (reduced) {
      setTime(duration);
      setPlaying(false);
    } else if (autoplay) {
      setPlaying(true);
    }
  }, [reduced, duration, autoplay]);

  // Tab pause (HANDOFF §5.1 CRITICAL)
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.hidden) {
        setPlaying(false);
        lastTsRef.current = null;
      } else if (autoplay && !reduced) {
        setPlaying(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [autoplay, reduced]);

  // RAF animation loop (delta-time based; correct under tab throttle)
  React.useEffect(() => {
    if (!playing || reduced) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts: number): void => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((prev) => {
        let next = prev + dt;
        if (next >= duration) {
          if (loop) {
            next = duration > 0 ? next % duration : 0;
          } else {
            next = duration;
            setPlaying(false);
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop, reduced]);

  const value = React.useMemo<TimelineContextValue>(
    () => ({
      time: clamp(time, 0, duration),
      duration,
      playing,
      reduced,
    }),
    [time, duration, playing, reduced],
  );

  return (
    <TimelineContext.Provider value={value}>
      <div className={className}>{children}</div>
    </TimelineContext.Provider>
  );
}
