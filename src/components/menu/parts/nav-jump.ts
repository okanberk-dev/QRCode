// Category-nav jumps (review F4). A native `#cat-<id>` fragment jump scrolls
// EVERY scrolling ancestor of the section — inside the Studio that moved the
// owner's outline / panel too, and it wrote a hash and a history entry into
// the Studio URL. The nav keeps its href (no-JS still works) but, once
// JavaScript runs, scrolls only the section's nearest scroll container.

const SCROLLABLE = new Set(['auto', 'scroll', 'overlay']);

/** True for an overflow-y value that makes an element a scroll container. */
export function isScrollableOverflow(overflowY: string): boolean {
  return SCROLLABLE.has(overflowY);
}

/**
 * Scroll position that puts the section's top just under the sticky nav.
 * Rect values are in client px; `scale` converts them into the scroller's own
 * CSS px (the Studio preview frame is zoomed). Never negative.
 */
export function jumpTarget({
  scrollTop, sectionTop, scrollerTop, scale, margin,
}: {
  scrollTop: number;
  sectionTop: number;
  scrollerTop: number;
  scale: number;
  margin: number;
}): number {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return Math.max(0, Math.round(scrollTop + (sectionTop - scrollerTop) / s - margin));
}

/** The nearest scrolling ancestor of `el`, or null when the page itself scrolls. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  const root = document.scrollingElement ?? document.documentElement;
  for (let node = el.parentElement; node && node !== root && node !== document.body; node = node.parentElement) {
    if (node.scrollHeight > node.clientHeight && isScrollableOverflow(window.getComputedStyle(node).overflowY)) {
      return node;
    }
  }
  return null;
}

/**
 * Scroll the section's own scroll container (never its ancestors) so the
 * section sits under the sticky nav. Instant under reduced motion; otherwise
 * the container's CSS `scroll-behavior` decides (smooth on the public page,
 * instant in the Studio preview).
 */
export function scrollSectionIntoView(section: HTMLElement): void {
  const reduced =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = reduced ? 'instant' : 'auto';
  const margin = parseFloat(window.getComputedStyle(section).scrollMarginTop) || 0;
  const sectionTop = section.getBoundingClientRect().top;
  const scroller = scrollParent(section);
  if (!scroller) {
    window.scrollTo({ top: jumpTarget({ scrollTop: window.scrollY, sectionTop, scrollerTop: 0, scale: 1, margin }), behavior });
    return;
  }
  const rect = scroller.getBoundingClientRect();
  const scale = scroller.offsetHeight > 0 ? rect.height / scroller.offsetHeight : 1;
  scroller.scrollTo({
    top: jumpTarget({ scrollTop: scroller.scrollTop, sectionTop, scrollerTop: rect.top + scroller.clientTop * scale, scale, margin }),
    behavior,
  });
}
