'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SceneHandle, SceneModule, SceneName } from './scene-types';
import { capPixelRatio, decideThreeMode } from './three-support';

/**
 * Decorative three.js layer for marketing pages (CLAUDE.md §50).
 *
 * - The server renders only `fallback` (an SVG/CSS picture of the scene), so
 *   crawlers, no-JS visitors and devices that skip 3D all see a finished
 *   layout. Nothing here carries text or links: the host is aria-hidden.
 * - three.js and the scene module load with a dynamic import only after the
 *   host comes near the viewport and the browser is idle — never part of the
 *   page's initial JavaScript, never on the LCP path.
 * - Reduced motion / weak CPU → one static frame. Data saver, very low
 *   memory, no WebGL, or a renderer error → three never loads, the fallback
 *   stays.
 * - The loop pauses when the host leaves the viewport or the tab is hidden,
 *   and everything is disposed on unmount.
 */

const SCENE_LOADERS: Record<SceneName, () => Promise<SceneModule>> = {
  'pulse-field': () => import('./scenes/pulse-field'),
  'platform-orbit': () => import('./scenes/platform-orbit'),
};

/** Scene time used for the single frame of `static` mode. */
const STATIC_FRAME_TIME = 1.35;

type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

export interface ThreeStageProps {
  scene: SceneName;
  /** Server-rendered stand-in; fades out once the first 3D frame is drawn. */
  fallback?: ReactNode;
  /** Positions/sizes the host (e.g. `absolute inset-0`). It must have a size. */
  className?: string;
  /** How early to start loading before the host scrolls into view. */
  rootMargin?: string;
  /** Window pointer parallax on fine pointers. */
  interactive?: boolean;
  /** Background the scene sits on. */
  theme?: 'dark' | 'light';
}

export default function ThreeStage({
  scene,
  fallback,
  className = '',
  rootMargin = '320px 0px',
  interactive = true,
  theme = 'dark',
}: ThreeStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return;

    const nav = navigator as NavigatorWithHints;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mode = decideThreeMode({
      webgl: typeof window.WebGLRenderingContext !== 'undefined',
      reducedMotion: reducedQuery.matches,
      saveData: Boolean(nav.connection?.saveData),
      deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
      hardwareConcurrency:
        typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    });
    if (mode === 'off') return;

    let disposed = false;
    let handle: SceneHandle | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let started = false;
    let inView = false;
    let animating = mode === 'animate';
    let raf = 0;
    let sceneTime = 0;
    let lastFrame = 0;
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

    const frame = (now: number) => {
      raf = 0;
      if (!handle || disposed) return;
      const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
      lastFrame = now;
      sceneTime += delta;
      handle.render(sceneTime);
      if (shouldRun()) raf = window.requestAnimationFrame(frame);
    };

    const shouldRun = () => animating && inView && !document.hidden && !!handle && !disposed;

    const startLoop = () => {
      if (raf || !shouldRun()) return;
      lastFrame = 0;
      raf = window.requestAnimationFrame(frame);
    };

    const stopLoop = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const renderStatic = () => {
      if (!handle) return;
      handle.render(animating ? sceneTime : STATIC_FRAME_TIME);
    };

    const load = async () => {
      let mod: SceneModule;
      try {
        mod = await SCENE_LOADERS[scene]();
      } catch {
        return; // chunk failed to load — the fallback stays
      }
      if (disposed) return;
      canvas = document.createElement('canvas');
      canvas.className = 'absolute inset-0 h-full w-full';
      canvas.setAttribute('aria-hidden', 'true');
      // Cross-fade with the fallback instead of popping in.
      canvas.style.opacity = '0';
      canvas.style.transition = 'opacity 700ms ease';
      canvas.addEventListener('webglcontextlost', onContextLost);
      host.appendChild(canvas);
      const { width, height, pixelRatio } = size();
      try {
        handle = mod.createScene({
          canvas,
          width,
          height,
          pixelRatio,
          mode: animating ? 'animate' : 'static',
          theme,
        });
      } catch {
        // WebGL unavailable or blocked: keep the fallback.
        canvas.remove();
        canvas = null;
        handle = null;
        return;
      }
      if (animating) {
        sceneTime = STATIC_FRAME_TIME; // start mid-beat, not on a flat line
        handle.render(sceneTime);
        startLoop();
      } else {
        handle.render(STATIC_FRAME_TIME);
      }
      canvas.style.opacity = '1';
      setReady(true);
    };

    const scheduleLoad = () => {
      if (started) return;
      started = true;
      const run = () => {
        idleId = null;
        timeoutId = null;
        void load();
      };
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      };
      if (typeof w.requestIdleCallback === 'function') {
        idleId = w.requestIdleCallback(run, { timeout: 1500 });
      } else {
        timeoutId = window.setTimeout(run, 200);
      }
    };

    function onContextLost(event: Event) {
      event.preventDefault();
      stopLoop();
      if (canvas) canvas.style.opacity = '0';
      setReady(false);
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        inView = Boolean(entry?.isIntersecting);
        if (inView) {
          scheduleLoad();
          startLoop();
        } else {
          stopLoop();
        }
      },
      { rootMargin },
    );
    io.observe(host);

    const ro = new ResizeObserver(() => {
      if (!handle) return;
      const { width, height, pixelRatio } = size();
      handle.resize(width, height, pixelRatio);
      if (!raf) renderStatic();
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
        renderStatic();
      }
    };
    reducedQuery.addEventListener?.('change', onReducedChange);

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const onPointer = (event: PointerEvent) => {
      if (!handle?.setPointer) return;
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      handle.setPointer(x, y);
    };
    if (interactive && finePointer && mode === 'animate') {
      window.addEventListener('pointermove', onPointer, { passive: true });
    }

    return () => {
      disposed = true;
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedQuery.removeEventListener?.('change', onReducedChange);
      window.removeEventListener('pointermove', onPointer);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idleId !== null && typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (handle) {
        try {
          handle.dispose();
        } catch {
          /* already gone */
        }
      }
      handle = null;
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.remove();
      }
      canvas = null;
    };
  }, [scene, rootMargin, interactive, theme]);

  return (
    <div ref={hostRef} className={`pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
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
