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
  /** `window.WebGL2RenderingContext` exists (three r163+ is WebGL2-only). */
  webgl2: boolean;
  /** `prefers-reduced-motion: reduce`. */
  reducedMotion: boolean;
  /** `navigator.connection.saveData`. */
  saveData: boolean;
  /** `navigator.connection.effectiveType` (Chromium only). */
  effectiveType?: string | null;
  /** `navigator.deviceMemory` in GB (Chromium only). */
  deviceMemory?: number | null;
  /** `navigator.hardwareConcurrency`. */
  hardwareConcurrency?: number | null;
  /** The host's `media` query (e.g. desktop only). Absent = no restriction. */
  mediaMatches?: boolean;
}

export function decideThreeMode(env: ThreeEnvironment): ThreeMode {
  if (!env.webgl2) return 'off';
  if (env.mediaMatches === false) return 'off';
  // Data saver / very slow links: the three chunk is ~110 KB brotli — never
  // spend it on decoration.
  if (env.saveData) return 'off';
  if (env.effectiveType === '2g' || env.effectiveType === 'slow-2g') return 'off';
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

/**
 * Software rasterisers (no GPU): SwiftShader, llvmpipe/softpipe, the Windows
 * basic render driver. Headless browsers, crawlers' renderers and
 * GPU-blocklisted machines report these. Drawing a full-screen scene on the
 * CPU every frame costs far more than the decoration is worth, so these get
 * the static fallback. Capability-based, not user-agent based: every visitor
 * receives the same HTML.
 */
export function isSoftwareRenderer(renderer: string | null | undefined): boolean {
  if (!renderer) return false;
  return /swiftshader|llvmpipe|softpipe|software|basic render driver|mesa offscreen/i.test(renderer);
}

/** Device pixel ratio cap: sharp enough, but never 3× fill-rate on phones. */
export function capPixelRatio(devicePixelRatio: number, viewportWidth: number): number {
  const dpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const cap = viewportWidth < 768 ? 1.5 : 2;
  return Math.min(dpr, cap);
}

/**
 * Frame pacing: draw only when at least one frame interval has passed since
 * the last drawn frame (a 2 ms slack absorbs rAF jitter, so a 60 Hz display
 * capped at 30 fps draws every second callback, not every third).
 */
export function shouldDrawFrame(nowMs: number, lastDrawMs: number, maxFps: number): boolean {
  if (!(maxFps > 0) || !Number.isFinite(maxFps)) return true;
  if (!lastDrawMs) return true;
  return nowMs - lastDrawMs >= 1000 / maxFps - 2;
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
 * Phases sampled within one beat: dense around the P–QRS–T waves, nothing on
 * the flat baseline (a straight segment draws it). Keeps the fallback path a
 * few hundred bytes instead of several KB.
 */
const BEAT_KEYFRAMES = [
  0, 0.05, 0.075, 0.1, 0.125, 0.15, 0.185, 0.2, 0.207, 0.213, 0.218, 0.222, 0.226, 0.232, 0.24,
  0.245, 0.25, 0.258, 0.28, 0.33, 0.37, 0.4, 0.43, 0.47, 0.53,
];

/**
 * SVG path (`d`) of a repeating ECG line across `width` × `height`, used as
 * the server-rendered fallback of the pulse scenes (same shape as the 3D
 * wave, so the swap is not jarring).
 */
export function ecgPath(
  width: number,
  height: number,
  { beats = 3, amplitude = 0.38 }: { beats?: number; amplitude?: number } = {},
): string {
  const mid = height * 0.62;
  const amp = height * amplitude;
  const parts: string[] = [];
  const point = (t: number) => {
    const x = (t / beats) * width;
    const y = mid - ecgPulse(t) * amp;
    parts.push(`${parts.length === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  };
  for (let beat = 0; beat < beats; beat++) {
    for (const k of BEAT_KEYFRAMES) point(beat + k);
  }
  point(beats);
  return parts.join(' ');
}
