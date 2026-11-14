'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AMBIENT_ACTIVE_EVENT,
  AMBIENT_MOTION_EVENT,
  AMBIENT_MOTION_STORAGE_KEY,
  SCENE_CONTEXT_ATTRIBUTES,
  type SceneHandle,
  type SceneModule,
  type SceneName,
} from './scene-types';
import {
  capPixelRatio,
  decideThreeMode,
  isSoftwareRenderer,
  shouldDrawFrame,
} from './three-support';

/**
 * Decorative three.js layer for marketing pages (CLAUDE.md §50).
 *
 * - The server renders only `fallback` (an SVG picture of the scene), so
 *   crawlers, no-JS visitors and devices that skip 3D all see a finished
 *   layout. Nothing here carries text or links: the host is aria-hidden.
 * - three.js and the scene module load with a dynamic import only after the
 *   host comes near the viewport and the browser is idle — never part of the
 *   page's initial JavaScript, never on the LCP path.
 * - Before downloading anything, a WebGL2 context is created and its
 *   renderer name checked: software rasterisers (headless browsers,
 *   GPU-blocklisted machines) keep the fallback.
 * - Reduced motion / weak CPU → one static frame. Data saver, slow 2G, very
 *   low memory, no WebGL2, or any error → three never loads (or is dropped)
 *   and the fallback stays.
 * - Initialisation is split into yielded steps (import → create → compile →
 *   first frame) so no single task blocks input for long.
 * - The loop runs only while the host is on screen and the tab is visible,
 *   is capped at `maxFps`, pauses with the shared motion toggle, and
 *   everything is disposed on unmount.
 */

const SCENE_LOADERS: Record<SceneName, () => Promise<SceneModule>> = {
  'pulse-field': () => import('./scenes/pulse-field'),
  'platform-orbit': () => import('./scenes/platform-orbit'),
};

/** Scene time used for the single frame of `static` mode. */
const STATIC_FRAME_TIME = 1.35;

type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

type WindowWithExtras = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
  scheduler?: { yield?: () => Promise<void> };
  /** Test-only: let headless runs exercise the 3D path on SwiftShader. */
  __BZ_THREE_ALLOW_SOFTWARE__?: boolean;
};

function yieldToMain(): Promise<void> {
  const w = window as WindowWithExtras;
  if (typeof w.scheduler?.yield === 'function') return w.scheduler.yield();
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function readRendererName(gl: WebGL2RenderingContext): string {
  const masked = String(gl.getParameter(gl.RENDERER) ?? '');
  // Firefox and Safari already report a sanitised GPU name here; Chromium
  // reports "WebKit WebGL" and needs the debug extension.
  if (masked && !/^webkit webgl$/i.test(masked)) return masked;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return masked;
  return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? masked);
}

function readPausedPreference(): boolean {
  try {
    return window.sessionStorage.getItem(AMBIENT_MOTION_STORAGE_KEY) === 'paused';
  } catch {
    return false;
  }
}

export interface ThreeStageProps {
  scene: SceneName;
  /** Server-rendered stand-in; fades out once the first 3D frame is drawn. */
  fallback?: ReactNode;
  /** Positions/sizes the host (e.g. `absolute inset-0`). It must have a size. */
  className?: string;
  /** How early to start loading before the host scrolls into view. */
  loadMargin?: string;
  /** Window pointer parallax on fine pointers. */
  interactive?: boolean;
  /** Background the scene sits on. */
  theme?: 'dark' | 'light';
  /** Frame-rate cap for the animation loop. */
  maxFps?: number;
  /** Only load when this media query matches (e.g. desktop-only placements). */
  media?: string;
  /** Wait for the window `load` event first (hosts near the top of a page). */
  afterLoad?: boolean;
}

export default function ThreeStage({
  scene,
  fallback,
  className = '',
  loadMargin = '100% 0px',
  interactive = true,
  theme = 'dark',
  maxFps = 30,
  media,
  afterLoad = false,
}: ThreeStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return;

    const w = window as WindowWithExtras;
    const nav = navigator as NavigatorWithHints;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mode = decideThreeMode({
      webgl2: typeof window.WebGL2RenderingContext !== 'undefined',
      reducedMotion: reducedQuery.matches,
      saveData: Boolean(nav.connection?.saveData),
      effectiveType: nav.connection?.effectiveType ?? null,
      deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
      hardwareConcurrency:
        typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
      mediaMatches: media ? window.matchMedia(media).matches : undefined,
    });
    if (mode === 'off') return;

    let disposed = false;
    let handle: SceneHandle | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let started = false;
    let nearView = false;
    let inView = false;
    let animating = mode === 'animate';
    let paused = readPausedPreference();
    let raf = 0;
    let sceneTime = STATIC_FRAME_TIME;
    let lastDraw = 0;
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const size = () => {
      const rect = host.getBoundingClientRect();
      return {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        pixelRatio: capPixelRatio(window.devicePixelRatio || 1, window.innerWidth),
      };
    };

    const shouldRun = () =>
      animating && !paused && inView && !document.hidden && !!handle && !disposed;

    const frame = (now: number) => {
      raf = 0;
      if (!handle || disposed) return;
      if (!shouldDrawFrame(now, lastDraw, maxFps)) {
        if (shouldRun()) raf = window.requestAnimationFrame(frame);
        return;
      }
      const delta = lastDraw ? Math.min((now - lastDraw) / 1000, 0.1) : 0;
      lastDraw = now;
      sceneTime += delta;
      handle.render(sceneTime);
      if (shouldRun()) raf = window.requestAnimationFrame(frame);
    };

    const startLoop = () => {
      if (raf || !shouldRun()) return;
      lastDraw = 0;
      raf = window.requestAnimationFrame(frame);
    };

    const stopLoop = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const renderCurrent = () => {
      if (!handle || disposed) return;
      handle.render(animating ? sceneTime : STATIC_FRAME_TIME);
    };

    function onContextLost() {
      // No restore: the fallback simply comes back.
      stopLoop();
      if (canvas) canvas.style.opacity = '0';
      if (!disposed) setReady(false);
    }

    const releaseCanvas = () => {
      if (!canvas) return;
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.remove();
      canvas = null;
    };

    const load = async () => {
      // 1) Probe a WebGL2 context before downloading three.
      const probe = document.createElement('canvas');
      probe.className = 'absolute inset-0 h-full w-full';
      probe.setAttribute('aria-hidden', 'true');
      probe.style.opacity = '0';
      probe.style.transition = 'opacity 700ms ease';
      let gl: WebGL2RenderingContext | null = null;
      try {
        gl = probe.getContext('webgl2', SCENE_CONTEXT_ATTRIBUTES[scene]);
      } catch {
        gl = null;
      }
      if (!gl) return;
      if (isSoftwareRenderer(readRendererName(gl)) && !w.__BZ_THREE_ALLOW_SOFTWARE__) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return;
      }

      // 2) Download three + the scene.
      let mod: SceneModule;
      try {
        mod = await SCENE_LOADERS[scene]();
      } catch {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return; // chunk failed to load — the fallback stays
      }
      if (disposed) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return;
      }
      await yieldToMain();
      if (disposed) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return;
      }

      // 3) Build the scene.
      canvas = probe;
      canvas.addEventListener('webglcontextlost', onContextLost);
      host.appendChild(canvas);
      const { width, height, pixelRatio } = size();
      try {
        handle = mod.createScene({
          canvas,
          gl,
          width,
          height,
          pixelRatio,
          mode: animating ? 'animate' : 'static',
          theme,
        });
      } catch {
        // WebGL blocked or the scene threw: keep the fallback.
        handle = null;
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        releaseCanvas();
        return;
      }

      // 4) Compile shaders (parallel compile where the driver supports it).
      try {
        await yieldToMain();
        if (handle.prepare) await handle.prepare();
      } catch {
        /* compile errors surface on the first render below */
      }
      if (disposed || !handle) return;

      // 5) First frame inside rAF, then cross-fade with the fallback.
      window.requestAnimationFrame(() => {
        if (disposed || !handle || !canvas) return;
        try {
          handle.render(animating ? sceneTime : STATIC_FRAME_TIME);
        } catch {
          try {
            handle.dispose();
          } catch {
            /* already gone */
          }
          handle = null;
          releaseCanvas();
          return;
        }
        canvas.style.opacity = '1';
        setReady(true);
        if (animating) {
          window.dispatchEvent(new CustomEvent(AMBIENT_ACTIVE_EVENT));
          startLoop();
        }
      });
    };

    const scheduleLoad = () => {
      if (started) return;
      started = true;
      const run = () => {
        idleId = null;
        timeoutId = null;
        if (!disposed) void load();
      };
      const whenIdle = () => {
        if (disposed) return;
        if (typeof w.requestIdleCallback === 'function') {
          idleId = w.requestIdleCallback(run, { timeout: 2000 });
        } else {
          timeoutId = window.setTimeout(run, 200);
        }
      };
      if (afterLoad && document.readyState !== 'complete') {
        window.addEventListener('load', whenIdle, { once: true });
      } else {
        whenIdle();
      }
    };

    // Load early (one viewport ahead), run only while actually visible.
    const loadObserver = new IntersectionObserver(
      (entries) => {
        nearView = Boolean(entries[entries.length - 1]?.isIntersecting);
        if (nearView) scheduleLoad();
      },
      { rootMargin: loadMargin },
    );
    loadObserver.observe(host);

    const runObserver = new IntersectionObserver((entries) => {
      inView = Boolean(entries[entries.length - 1]?.isIntersecting);
      if (inView) startLoop();
      else stopLoop();
    });
    runObserver.observe(host);

    const ro = new ResizeObserver(() => {
      if (!handle || disposed) return;
      const { width, height, pixelRatio } = size();
      handle.resize(width, height, pixelRatio);
      if (!raf) renderCurrent();
    });
    ro.observe(host);

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onReducedChange = () => {
      if (reducedQuery.matches && animating) {
        animating = false;
        stopLoop();
        renderCurrent();
      }
    };
    reducedQuery.addEventListener?.('change', onReducedChange);

    const onAmbientMotion = (event: Event) => {
      const detail = (event as CustomEvent<{ paused?: boolean }>).detail;
      paused = Boolean(detail?.paused);
      if (paused) {
        stopLoop();
        renderCurrent();
      } else {
        startLoop();
      }
    };
    window.addEventListener(AMBIENT_MOTION_EVENT, onAmbientMotion);

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const onPointer = (event: PointerEvent) => {
      if (!handle?.setPointer) return;
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      handle.setPointer(x, y);
    };
    const pointerParallax = interactive && finePointer && mode === 'animate';
    if (pointerParallax) {
      window.addEventListener('pointermove', onPointer, { passive: true });
    }

    return () => {
      disposed = true;
      stopLoop();
      loadObserver.disconnect();
      runObserver.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedQuery.removeEventListener?.('change', onReducedChange);
      window.removeEventListener(AMBIENT_MOTION_EVENT, onAmbientMotion);
      if (pointerParallax) window.removeEventListener('pointermove', onPointer);
      if (idleId !== null && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      // Detach the context-lost listener BEFORE dispose: forceContextLoss()
      // fires that event and nothing may react to it after unmount.
      if (canvas) canvas.removeEventListener('webglcontextlost', onContextLost);
      if (handle) {
        try {
          handle.dispose();
        } catch {
          /* already gone */
        }
      }
      handle = null;
      if (canvas) canvas.remove();
      canvas = null;
    };
  }, [scene, loadMargin, interactive, theme, maxFps, media, afterLoad]);

  return (
    <div
      ref={hostRef}
      className={`pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {fallback ? (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}
        >
          {fallback}
        </div>
      ) : null}
    </div>
  );
}
