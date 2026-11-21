// How long the QR splash still has to run when its effect starts (pure, so it
// is unit-tested). The SSR splash's CSS fade began at first paint, not at
// hydration, so the time already played is subtracted.

export interface SplashTimingInput {
  /** Delay + fade-out duration of the splash's CSS animation. */
  totalMs: number;
  /** `playState` of that CSS animation, or null when it cannot be read. */
  playState: string | null;
  /** Its `currentTime` (ms since it started, delay included), or null. */
  currentTime: unknown;
  /** The element is already hidden (the fade ran out before hydration). */
  hidden: boolean;
}

/** Milliseconds until the splash is gone: 0 = already gone, `totalMs` when unknown. */
export function splashRemainingMs({ totalMs, playState, currentTime, hidden }: SplashTimingInput): number {
  if (hidden || playState === 'finished') return 0;
  if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
    return Math.max(0, Math.min(totalMs, Math.ceil(totalMs - currentTime)));
  }
  return totalMs;
}
