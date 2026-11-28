// Small colour helpers for the customer loyalty pages (CLAUDE.md §60, §61):
// the card face, the business's customer panel and the arrival screen.
// Pure and client-safe. The business's colour is data; these only derive
// readable companions from it (text, gradients, soft tints).

export const INK = '#111110';
export const WHITE = '#FFFFFF';
/** Buaze accent, used only when the business picked no colour (§64). */
export const BUAZE_LIME = '#C6F24E';

export function hexToRgb(hex: string | null | undefined): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isHexColor(value: string | null | undefined): value is string {
  return hexToRgb(value) !== null;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance; 0 for an unreadable value. */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** WCAG contrast ratio of two hex colours (1 … 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever reads better on `hex`. */
export function inkOn(hex: string): typeof INK | typeof WHITE {
  return contrast(INK, hex) >= contrast(WHITE, hex) ? INK : WHITE;
}

/** `amount` of `withHex` mixed into `hex` (0 = hex, 1 = withHex). */
export function mix(hex: string, withHex: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(withHex);
  if (!a || !b) return hex;
  const out = a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** `rgba()` of a hex colour. */
export function alpha(hex: string, a: number): string {
  const rgb = hexToRgb(hex) ?? [17, 17, 16];
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

/**
 * Fine grain for brand surfaces (card face, header band, arrival screen):
 * an inline SVG, no request, no third party.
 */
export const GRAIN_IMAGE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
