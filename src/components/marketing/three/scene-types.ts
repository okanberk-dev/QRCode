/**
 * Contract between <ThreeStage> and a scene module (CLAUDE.md §50).
 *
 * A scene module lives in ./scenes/, imports what it needs from `three` with
 * static named imports (so webpack tree-shakes three) and exports
 * `createScene`. <ThreeStage> loads the module with a dynamic import, so
 * neither the scene nor three is part of any page's initial JavaScript.
 *
 * This file must not import values from `three` (type-only imports at most):
 * ThreeStage imports it eagerly.
 */

export type SceneName = 'pulse-field' | 'platform-orbit';

/**
 * WebGL2 context attributes per scene. ThreeStage creates the context with
 * these BEFORE downloading three, reads the renderer name (software
 * rasterisers are skipped) and hands the same context to the scene.
 */
export const SCENE_CONTEXT_ATTRIBUTES: Record<SceneName, WebGLContextAttributes> = {
  // Points only, additive, no depth sorting needed.
  'pulse-field': {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  },
  // Meshes + lines: depth and antialiasing matter.
  'platform-orbit': {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  },
};

export interface SceneContext {
  canvas: HTMLCanvasElement;
  /** The WebGL2 context ThreeStage already created on `canvas`. */
  gl: WebGL2RenderingContext;
  /** CSS pixels. */
  width: number;
  height: number;
  pixelRatio: number;
  /** `static` renders a single frame; the loop never starts. */
  mode: 'animate' | 'static';
  /** Background the scene sits on (colors are tuned per side). */
  theme: 'dark' | 'light';
}

export interface SceneHandle {
  /** Compile shaders off the main thread where supported (before frame 1). */
  prepare?(): Promise<void>;
  /** Draw one frame at `timeSeconds` (scene time, paused while hidden). */
  render(timeSeconds: number): void;
  resize(width: number, height: number, pixelRatio: number): void;
  /** Pointer in [-1, 1] on both axes (window-relative). Optional parallax. */
  setPointer?(x: number, y: number): void;
  /** Free GPU memory: geometries, materials, renderer, context. */
  dispose(): void;
}

export type SceneFactory = (context: SceneContext) => SceneHandle;

export interface SceneModule {
  createScene: SceneFactory;
}

/** Window event the motion toggle sends; detail `{ paused: boolean }`. */
export const AMBIENT_MOTION_EVENT = 'buaze:ambient-motion';
/** Window event ThreeStage sends when a scene starts animating. */
export const AMBIENT_ACTIVE_EVENT = 'buaze:ambient-active';
/** sessionStorage key remembering a pause for the rest of the visit. */
export const AMBIENT_MOTION_STORAGE_KEY = 'buaze.ambientMotion';
