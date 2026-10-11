'use client';

import { useEffect } from 'react';

function scrollParentOf(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null; // the document scrolls
}

/**
 * WCAG 2.4.11 (focus not obscured) for the platform-links pages.
 *
 * The page wrapper (`data-focus-clearance`) gives its controls a
 * scroll-margin that clears the sticky topbar and the fixed mobile bottom
 * nav. Browsers only apply it when they decide to scroll — a control that is
 * technically inside the viewport but sitting under the bottom nav is left
 * there (and `scrollIntoView({ block: 'nearest' })` does not move it either).
 * So on keyboard focus we compare the control's margin box with its scroll
 * container and nudge the container by the difference. Pointer focus (taps)
 * is ignored so the page never jumps under a finger.
 */
export function useFocusClearance() {
  useEffect(() => {
    let frame = 0;
    const onFocusIn = (event: FocusEvent) => {
      const el = event.target;
      if (!(el instanceof HTMLElement)) return;
      if (!el.closest('[data-focus-clearance]')) return;
      let keyboard = false;
      try {
        keyboard = el.matches(':focus-visible');
      } catch {
        keyboard = false;
      }
      if (!keyboard) return;
      window.cancelAnimationFrame(frame);
      // After the browser's own focus scroll has settled.
      frame = window.requestAnimationFrame(() => {
        if (document.activeElement !== el) return;
        const style = window.getComputedStyle(el);
        const marginTop = Number.parseFloat(style.scrollMarginTop) || 0;
        const marginBottom = Number.parseFloat(style.scrollMarginBottom) || 0;
        const rect = el.getBoundingClientRect();
        const parent = scrollParentOf(el);
        const view = parent ? parent.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
        let delta = 0;
        if (rect.bottom + marginBottom > view.bottom) delta = rect.bottom + marginBottom - view.bottom;
        else if (rect.top - marginTop < view.top) delta = rect.top - marginTop - view.top;
        if (Math.abs(delta) < 1) return;
        if (parent) parent.scrollBy({ top: delta });
        else window.scrollBy({ top: delta });
      });
    };
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);
}

export default useFocusClearance;
