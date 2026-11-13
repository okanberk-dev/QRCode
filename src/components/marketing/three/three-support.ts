/**
 * Pure helpers for the decorative three.js scenes on the marketing site
 * (CLAUDE.md §50). No DOM access and no `three` import here, so the logic is
 * unit-tested in Node (tests/three-support.test.ts) and stays out of the
 * three chunk.
 */

/**
 * How a decorative scene runs on this device:
 * - `animate`: full animation loop (paused off-screen / in hidden tabs)
 * - `static`: one rendered frame, no loop (reduced motion, weak CPUs)
 * - `off`: never load three; the server-rendered fallback stays
 */
export type ThreeMode = 'animate' | 'static' | 'off';

export interface ThreeEnvironment {
  /** `window.WebGLRenderingContext` exists. The renderer still verifies. */
  webgl: boolean;
  /** `prefers-reduced-motion: reduce`. */
  reducedMotion: boolean;
  /** `navigator.connection.saveData`. */
  saveData: boolean;
  /** `navigator.deviceMemory` in GB (Chromium only). */
  deviceMemory?: number | null;
  /** `navigator.hardwareConcurrency`. */
  hardwareConcurrency?: number | null;
}

export function decideThreeMode(env: ThreeEnvironment): ThreeMode {
  if (!env.webgl) return 'off';
  // Data saver: the three chunk is ~150 KB gzip — never spend it on decoration.
  if (env.saveData) return 'off';
  if (typeof env.deviceMemory === 'number' && env.deviceMemory > 0 && env.deviceMemory < 2) {
    return 'off';
  }
  if (env.reducedMotion) return 'static';
  if (
    typeof env.hardwareConcurrency === 'number' &&
    env.hardwareConcurrency > 0 &&
    env.hardwareConcurrency < 4
  ) {
    return 'static';
  }
  return 'animate';
}

/** Device pixel ratio cap: sharp enough, but never 3× fill-rate on phones. */
export function capPixelRatio(devicePixelRatio: number, viewportWidth: number): number {
  const dpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const cap = viewportWidth < 768 ? 1.5 : 2;
  return Math.min(dpr, cap);
}

function gauss(p: number, center: number, width: number): number {
  const d = p - center;
  return Math.exp(-(d * d) / (2 * width * width));
}

/**
 * One heartbeat (ECG) cycle, phase in [0, 1). Peak ≈ 1 at the R wave, small
 * P and T waves, Q and S dips. The GLSL `ecg()` in the pulse-field shader is
 * the same formula; the SVG fallbacks sample this function.
 */
export function ecgPulse(phase: number): number {
  const p = phase - Math.floor(phase);
  return (
    0.12 * gauss(p, 0.1, 0.025) -
    0.15 * gauss(p, 0.2, 0.008) +
    1 * gauss(p, 0.22, 0.012) -
    0.3 * gauss(p, 0.245, 0.01) +
    0.25 * gauss(p, 0.4, 0.04)
  );
}

/**
 * SVG path (`d`) of a repeating ECG line across `width` × `height`, used as
 * the server-rendered fallback of the pulse scenes (same shape as the 3D
 * wave, so the swap is not jarring).
 */
export function ecgPath(
  width: number,
  height: number,
  { beats = 3, samples = 240, amplitude = 0.38 }: { beats?: number; samples?: number; amplitude?: number } = {},
): string {
  const mid = height * 0.62;
  const amp = height * amplitude;
  const parts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * width;
    const y = mid - ecgPulse(t * beats) * amp;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(' ');
}
