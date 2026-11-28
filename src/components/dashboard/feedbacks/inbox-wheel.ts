'use client';

import { useCallback, type RefObject, type WheelEvent } from 'react';

/**
 * Reviews inbox (owner + admin), desktop: the page is locked to the viewport
 * and only the list card and the detail card scroll. A wheel turned over the
 * page header, the toolbar or the gaps between the cards hit nothing that can
 * scroll, so "scrolling down" did nothing there. This hook scrolls the list
 * card instead.
 *
 * Skipped when: the event comes from a portal (filters dialog, menus: React
 * bubbles portal events through the tree, the DOM check stops them), it
 * starts inside one of the two cards (they scroll themselves), it is a pinch
 * zoom or a sideways swipe, the viewport is below lg, or an ancestor can
 * really scroll (short screens), so the browser already handles it.
 */
export function useInboxWheelForward(
  listRef: RefObject<HTMLElement | null>,
  detailRef: RefObject<HTMLElement | null>,
) {
  return useCallback(
    (e: WheelEvent<HTMLElement>) => {
      const list = listRef.current;
      if (!list || e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const root = e.currentTarget;
      const target = e.target as Node | null;
      if (!target || !root.contains(target)) return;
      if (list.contains(target) || detailRef.current?.contains(target)) return;
      if (typeof window === 'undefined' || !window.matchMedia('(min-width: 1024px)').matches) return;
      if (ancestorCanScroll(root, e.deltaY)) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? list.clientHeight : 1;
      list.scrollBy({ top: e.deltaY * unit });
    },
    [listRef, detailRef],
  );
}

function ancestorCanScroll(from: HTMLElement, deltaY: number): boolean {
  let el: HTMLElement | null = from.parentElement;
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((deltaY > 0 && !atBottom) || (deltaY < 0 && !atTop)) return true;
    }
    el = el.parentElement;
  }
  return false;
}
