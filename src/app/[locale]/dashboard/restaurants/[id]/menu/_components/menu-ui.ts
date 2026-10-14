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

/** Re-renders when a CSS media query starts / stops matching (false on the server). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** Tailwind `lg` — where the category list becomes a column instead of a chip strip. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

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
export function useDndAccessibility(isTr: boolean, nameOf: (id: string) => string, instructions: string) {
  const name = useCallback((id: string | number) => nameOf(String(id)), [nameOf]);
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
