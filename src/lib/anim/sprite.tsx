'use client';

/**
 * Stage 35 §38.115 — HANDOFF §8 step 2 (Lib) animation engine.
 *
 * `<Sprite>` core: timeline-window'da render + child'a `localTime`/
 * `progress` provide. HANDOFF animations.jsx'ten birebir; sample
 * sprite'lar (TextSprite/ImageSprite/RectSprite) Stage 39 (Site FX)
 * scope'unda. Bu modül **engine primitive** only.
 *
 * Reduced-motion (Stage'den `reduced: true` gelirse): child sprite
 * visible window'unda her zaman final state'te (`progress: 1`,
 * `localTime: duration`) render olur. Entry/exit animation atlanır.
 */

import * as React from 'react';
import { clamp } from './interpolate';
import { useTimeline } from './stage';

export interface SpriteRenderProps {
  /** Sprite başladığından beri geçen süre (saniye). */
  localTime: number;
  /** [0, 1] aralığında progress. duration = 0 ise 0. */
  progress: number;
  /** end - start (saniye). Infinity olabilir. */
  duration: number;
  /** Şu an visible window içinde mi. */
  visible: boolean;
}

export interface SpriteProps {
  /** Visibility window start (saniye). Default 0. */
  start?: number;
  /** Visibility window end (saniye). Default Infinity (Stage duration sonuna kadar). */
  end?: number;
  /** Visible olmasa bile DOM'da kalsın (CSS animasyonları için faydalı). */
  keepMounted?: boolean;
  /** Render prop veya plain children. */
  children:
    | React.ReactNode
    | ((props: SpriteRenderProps) => React.ReactNode);
}

/**
 * Renders children only when timeline `time` is in `[start, end]`.
 * Provides `localTime`/`progress`/`duration`/`visible` via render prop or
 * `useSprite()` hook.
 *
 * Reduced-motion: `time` zaten `duration`'a sabitlenmiş (Stage
 * tarafından), `progress` 1 olarak hesaplanır → child final state'te
 * static render olur.
 */
const SpriteContext = React.createContext<SpriteRenderProps>({
  localTime: 0,
  progress: 0,
  duration: 0,
  visible: false,
});

export const useSprite = (): SpriteRenderProps => React.useContext(SpriteContext);

export function Sprite({
  start = 0,
  end = Infinity,
  keepMounted = false,
  children,
}: SpriteProps): React.ReactElement | null {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress =
    duration > 0 && Number.isFinite(duration) ? clamp(localTime / duration, 0, 1) : 0;

  const value: SpriteRenderProps = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}
