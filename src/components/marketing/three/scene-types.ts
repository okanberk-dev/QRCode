/**
 * Contract between <ThreeStage> and a scene module (CLAUDE.md §50).
 *
 * A scene module lives in ./scenes/, imports what it needs from `three` with
 * static named imports (so webpack tree-shakes three) and exports
 * `createScene`. <ThreeStage> loads the module with a dynamic import, so
 * neither the scene nor three is part of any page's initial JavaScript.
 */

export type SceneName = 'pulse-field' | 'platform-orbit';

export interface SceneContext {
  canvas: HTMLCanvasElement;
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
