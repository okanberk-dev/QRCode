/**
 * Edge fades for the horizontal chip strips (filters, categories). A strip
 * that scrolls fades out at the edge that has more chips behind it, so a chip
 * cut by the next control reads as "more this way" instead of a broken border.
 * Pure (no React): the hook in menu-ui.ts measures, this decides.
 */
export type ScrollFadeEdges = { start: boolean; end: boolean };

/** 1 px slack: fractional widths at browser zoom never fade a strip that fits. */
export function scrollFadeEdges(scrollLeft: number, clientWidth: number, scrollWidth: number): ScrollFadeEdges {
  if (!(scrollWidth > clientWidth + 1)) return { start: false, end: false };
  return { start: scrollLeft > 1, end: scrollLeft + clientWidth < scrollWidth - 1 };
}

/** Mask classes (24 px fade). Literal strings so Tailwind sees them. */
export function scrollFadeClass({ start, end }: ScrollFadeEdges): string {
  if (start && end) return '[mask-image:linear-gradient(to_right,transparent,#000_24px,#000_calc(100%-24px),transparent)]';
  if (end) return '[mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)]';
  if (start) return '[mask-image:linear-gradient(to_right,transparent,#000_24px)]';
  return '';
}
