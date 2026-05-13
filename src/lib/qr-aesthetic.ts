// CLAUDE.md §11 (Pulse design system) — Buaze QR'lar için custom matrix
// renderer. `qrcode` paketinin lower-level `create()` API'si üzerinden
// bit matrix'i alıp her modülü rounded `<rect>` olarak çıkarır. Finder
// patterns (3 köşedeki büyük göz) daha kalın yumuşak köşeli kareler;
// data modülleri ufak rounded kareler. No dep — `qrcode` zaten kurulu.
//
// CLAUDE.md §7 disipline: yeni paket eklenmedi (`qr-code-styling` ~50KB
// gzip + Node SSR uyumsuzluğu vardı). Matrix → SVG dönüşümü ~120 satır,
// kendi kontrolümüzde + Buaze brand stiline birebir uyumlu.

import QRCode from "qrcode";

export interface AestheticQrOptions {
  /** Encoded URL / payload. */
  data: string;
  /** Output SVG side (px). Default 800 (PNG download), 220 (wizard preview). */
  size?: number;
  /** Foreground hex (modules). Default `#0A0A0A`. */
  dark?: string;
  /** Background hex (canvas). Default `#FFFFFF`. */
  light?: string;
  /** Padding modules around symbol (qrcode `margin` equiv). Default 2. */
  margin?: number;
  /**
   * Error correction level — `H` (30% recovery) is the safest default for
   * a stylised QR. Lower levels (L/M) tolerate less artistic distortion
   * but produce a denser grid; we always recommend H for branded QRs.
   */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

interface RenderedQrSvg {
  /** Inline `<svg>...</svg>` markup. */
  svg: string;
  /** Symbol grid size (modules per side, e.g. 33 for v3). */
  gridSize: number;
  /** Pixel size of each module on the rendered canvas. */
  modulePx: number;
}

/**
 * True when the (row, col) cell sits inside one of the three finder
 * patterns (top-left, top-right, bottom-left 7×7 blocks). We render
 * these as a single rounded square + concentric inner square so the
 * symbol keeps its scan landmarks visually intact even when surrounding
 * data modules are rounded.
 */
function isFinderCell(row: number, col: number, size: number): boolean {
  // Top-left
  if (row < 7 && col < 7) return true;
  // Top-right
  if (row < 7 && col >= size - 7) return true;
  // Bottom-left
  if (row >= size - 7 && col < 7) return true;
  return false;
}

/**
 * Render the three finder patterns as graphical units (outer rounded
 * square + inner dot). This replaces the default 49 individual modules
 * per finder, giving a softer, brand-aligned silhouette without ever
 * breaking the alignment landmarks scanners look for.
 */
function renderFinder(
  startRow: number,
  startCol: number,
  modulePx: number,
  marginPx: number,
  dark: string,
  light: string,
): string {
  const x = marginPx + startCol * modulePx;
  const y = marginPx + startRow * modulePx;
  const outerSize = 7 * modulePx;
  const midInset = modulePx;
  const innerInset = 2 * modulePx;
  // Outer ring: rounded square, outer corner radius ~ 30% of finder size
  const outerR = outerSize * 0.28;
  // Inner background (light) — punches the hole between outer ring and centre dot
  const midSize = outerSize - midInset * 2;
  const midR = midSize * 0.26;
  // Centre dot (dark) — 3×3 module block, rounded
  const innerSize = outerSize - innerInset * 2;
  const innerR = innerSize * 0.32;
  return [
    `<rect x="${x}" y="${y}" width="${outerSize}" height="${outerSize}" rx="${outerR}" ry="${outerR}" fill="${dark}"/>`,
    `<rect x="${x + midInset}" y="${y + midInset}" width="${midSize}" height="${midSize}" rx="${midR}" ry="${midR}" fill="${light}"/>`,
    `<rect x="${x + innerInset}" y="${y + innerInset}" width="${innerSize}" height="${innerSize}" rx="${innerR}" ry="${innerR}" fill="${dark}"/>`,
  ].join("");
}

/**
 * Render a single data module as a rounded square. Slight inset (4% of
 * module size) creates a faint visual gap that reads as softer modules
 * without hurting scan reliability at standard print sizes.
 */
function renderDataModule(
  row: number,
  col: number,
  modulePx: number,
  marginPx: number,
  dark: string,
): string {
  const inset = modulePx * 0.04;
  const px = marginPx + col * modulePx + inset;
  const py = marginPx + row * modulePx + inset;
  const w = modulePx - inset * 2;
  const r = w * 0.32;
  return `<rect x="${px.toFixed(2)}" y="${py.toFixed(2)}" width="${w.toFixed(2)}" height="${w.toFixed(2)}" rx="${r.toFixed(2)}" ry="${r.toFixed(2)}" fill="${dark}"/>`;
}

/**
 * Renders a stylised Buaze QR as an inline SVG string. Use the matrix
 * from `qrcode.create()` directly so we control every glyph — finder
 * eyes get unified rounded landmarks, data modules become soft squares.
 *
 * Returns the SVG markup, plus geometry helpers (`gridSize`, `modulePx`)
 * for downstream composers (e.g. premium PNG frame placement).
 */
export function renderAestheticQrSvg(opts: AestheticQrOptions): RenderedQrSvg {
  const size = opts.size ?? 800;
  const dark = opts.dark ?? "#0A0A0A";
  const light = opts.light ?? "#FFFFFF";
  const margin = Math.max(0, opts.margin ?? 2);
  const errorCorrectionLevel = opts.errorCorrectionLevel ?? "H";

  const qr = QRCode.create(opts.data, { errorCorrectionLevel });
  const gridSize = qr.modules.size;

  // Total tiles across = gridSize + (margin × 2). Each tile gets the
  // same pixel allocation so the rendered SVG aligns to a clean grid.
  const totalTiles = gridSize + margin * 2;
  const modulePx = size / totalTiles;
  const marginPx = modulePx * margin;

  const cells: string[] = [];

  // 1) Finder patterns — render as 3 unified glyphs (outer + mid + dot).
  cells.push(renderFinder(0, 0, modulePx, marginPx, dark, light));
  cells.push(renderFinder(0, gridSize - 7, modulePx, marginPx, dark, light));
  cells.push(renderFinder(gridSize - 7, 0, modulePx, marginPx, dark, light));

  // 2) Data modules — skip finder regions (already drawn above).
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (isFinderCell(row, col, gridSize)) continue;
      if (qr.modules.get(row, col) !== 1) continue;
      cells.push(renderDataModule(row, col, modulePx, marginPx, dark));
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="geometricPrecision">`,
    `<rect width="${size}" height="${size}" fill="${light}"/>`,
    ...cells,
    `</svg>`,
  ].join("");

  return { svg, gridSize, modulePx };
}
