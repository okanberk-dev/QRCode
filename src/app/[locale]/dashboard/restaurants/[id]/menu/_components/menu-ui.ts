'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
  type Announcements, type ScreenReaderInstructions,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * True when the primary pointer is a mouse / trackpad (not a finger). Used to
 * auto-focus the first field of a modal only where that will not pop the
 * on-screen keyboard over the form.
 */
export function isFinePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: fine)').matches;
}

/**
 * Re-renders when a CSS media query starts / stops matching (false on the
 * server). Pass `readNow` for components that only ever mount in the browser
 * (dialogs): they get the real answer on the first render instead of one frame
 * of the wrong layout.
 */
export function useMediaQuery(query: string, readNow = false): boolean {
  const [matches, setMatches] = useState(() =>
    readNow && typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/**
 * Tailwind `lg` — where the category list becomes a column instead of a chip strip.
 * `readNow` as in `useMediaQuery` (the Menu Studio mounts only in the browser).
 */
export function useIsDesktop(readNow = false): boolean {
  return useMediaQuery('(min-width: 1024px)', readNow);
}

// ── Menu Studio hooks (spec §7.10). The studio renders only after a browser
// fetch, never on the server, so these read the real answer on the first render.

/** Mouse / trackpad as the primary pointer (rows get the dense tiers, inline rename). */
export function useFinePointer(): boolean {
  return useMediaQuery('(pointer: fine)', true);
}

/** ≥1400px. */
export function useIsWide(): boolean {
  return useMediaQuery('(min-width: 1400px)', true);
}

/** ≥640px (Tailwind `sm`): sheets open from the right instead of the bottom. */
export function useIsSmUp(): boolean {
  return useMediaQuery('(min-width: 640px)', true);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', true);
}

/** `scrollIntoView` / `scrollTo` behaviour that respects reduced motion (read at call time). */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Height of the on-screen keyboard over the layout viewport (iOS Safari keeps
 * `position: fixed` elements under it). 0 when there is none or the browser has
 * no `visualViewport`. rAF-throttled.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
      });
    };
    measure();
    vv.addEventListener('resize', measure);
    vv.addEventListener('scroll', measure);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', measure);
      vv.removeEventListener('scroll', measure);
    };
  }, []);
  return inset;
}

/** `navigator.onLine`, kept current by the `online` / `offline` events. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export { MENU_TOUCH } from '@/app/[locale]/dashboard/surveys/_components/menu-touch';

/** Drag sensors shared by the category list and the item list: mouse, touch (long press) and keyboard. */
export function useMenuDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/**
 * Screen-reader text for drag and drop in the owner's language (dnd-kit ships
 * English only). `nameOf` turns a draggable id into the name a person knows.
 */
export function useDndAccessibility(
  isTr: boolean,
  nameOf: (id: string) => string,
  instructions: string,
  /** Menu Studio: drop targets `container:<categoryId>` read as "{name} kategorisi". */
  containerName?: (categoryId: string) => string,
) {
  const name = useCallback(
    (id: string | number) => {
      const key = String(id);
      if (containerName && key.startsWith('container:')) return containerName(key.slice('container:'.length));
      return nameOf(key);
    },
    [nameOf, containerName],
  );
  const announcements: Announcements = {
    onDragStart: ({ active }) => (isTr ? `${name(active.id)} tutuldu.` : `Picked up ${name(active.id)}.`),
    onDragOver: ({ active, over }) =>
      over
        ? isTr
          ? `${name(active.id)}, ${name(over.id)} üzerinde.`
          : `${name(active.id)} is over ${name(over.id)}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? isTr
          ? `${name(active.id)}, ${name(over.id)} konumuna bırakıldı.`
          : `${name(active.id)} was dropped at ${name(over.id)}.`
        : isTr
          ? `${name(active.id)} bırakıldı.`
          : `${name(active.id)} was dropped.`,
    onDragCancel: ({ active }) => (isTr ? `${name(active.id)} için sıralama iptal edildi.` : `Reordering ${name(active.id)} was cancelled.`),
  };
  const screenReaderInstructions: ScreenReaderInstructions = { draggable: instructions };
  return { announcements, screenReaderInstructions };
}

/** Copy text to the clipboard; falls back to a hidden textarea where the Clipboard API is blocked. Resolves to success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Run `fn` once a Radix menu has finished closing. Radix hands focus back to
 * the menu's trigger a tick AFTER the item was selected; a dialog opened in the
 * same tick would have its focus (autofocused field, or the first control)
 * taken straight back, leaving keyboard and screen-reader users outside the
 * dialog. Use for menu items that open a dialog; plain actions run directly.
 */
export function afterMenuCloses(fn: () => void): void {
  window.setTimeout(fn, 120);
}

/** Text input / textarea look shared by the builder's dialogs (16px on phones so iOS does not zoom). */
export const MENU_INPUT_CLASS =
  'w-full bz-card px-4 py-3 text-[16px] sm:text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40';

/** Small label above a field (same look as the shared `Field`, for the few fields that cannot use it). */
export const MENU_LABEL_CLASS = 'mb-1.5 block text-[12px] font-semibold text-[#0A0A0A]';
