'use client';

import { useEffect, useRef } from 'react';
import { isModalOpen } from '../kit/Toaster';
import { isTypingTarget, matchShortcut, type ShortcutId } from '../menu-keys';

export interface ShortcutHit {
  /** The row (`[data-item-id]` inside `#menu-items-pane`) that has focus, if any. */
  rowId: string | null;
  /** Focus is in a text field (only Esc reaches the handler then). */
  typing: boolean;
  /** The focused element. */
  target: Element | null;
}

/** ⌘ on Mac, Ctrl elsewhere (read once in the browser). */
export function detectMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** A keyboard drag (dnd-kit) is running: arrows, Space and Esc belong to it. */
function keyboardDragActive(): boolean {
  return document.querySelector('[aria-roledescription][aria-pressed="true"]') !== null;
}

/**
 * The page's keyboard shortcuts (spec §9): one `keydown` listener on `window`
 * that turns a key into a `ShortcutId` through the shared `SHORTCUTS` table
 * (`matchShortcut`, `e.key` based, Turkish-keyboard safe) and hands it to
 * `onShortcut`. Returning `true` marks the key as used (`preventDefault`).
 *
 * The listener runs after React's own handlers (it sits on `window`), so a
 * field, the docked item panel or a menu that already handled a key
 * (`preventDefault` / `stopPropagation`) wins. Shortcuts wait while a modal or
 * a menu is open, while typing (Esc excepted) and during a keyboard drag; row
 * shortcuts need focus on a row of the outline.
 */
export function useStudioShortcuts(
  singleKeys: boolean,
  onShortcut: (id: ShortcutId, hit: ShortcutHit, event: KeyboardEvent) => boolean | void,
): void {
  const handler = useRef(onShortcut);
  const single = useRef(singleKeys);
  useEffect(() => {
    handler.current = onShortcut;
    single.current = singleKeys;
  });

  useEffect(() => {
    const isMac = detectMac();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (keyboardDragActive()) return;
      const active = document.activeElement;
      const target = event.target instanceof Element ? event.target : active;
      const typing = isTypingTarget(target);
      const rowEl = active?.closest<HTMLElement>('[data-item-id]') ?? null;
      const inRow = Boolean(rowEl && rowEl.closest('#menu-items-pane'));
      const modalOpen = isModalOpen() || document.querySelector('[role="alertdialog"]') !== null;
      const menuOpen = document.querySelector('[role="menu"]') !== null;
      const id = matchShortcut(event, { isMac, singleKeysEnabled: single.current, typing, modalOpen, menuOpen, inRow });
      if (!id) return;
      // Esc is always reported by `matchShortcut`; a dialog or menu closes itself.
      if (id === 'escape' && (modalOpen || menuOpen)) return;
      const used = handler.current(id, { rowId: inRow ? (rowEl?.dataset.itemId ?? null) : null, typing, target }, event);
      if (used) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
