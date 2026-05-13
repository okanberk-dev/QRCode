'use client';

/**
 * <BuazeQR> — custom client-side QR renderer used by print/PDF templates.
 *
 * Wraps the `qrcode-generator` npm package and paints the modules as SVG
 * with configurable module shape, finder-pattern shape, palette, and
 * optional centre logo. Output is a real, scannable QR.
 *
 * Why a separate renderer (parallel to `qrcode` + `qr-aesthetic.ts`):
 *   • Templates need a React component that composes inside print frames;
 *     server-side `renderAestheticQrSvg` returns a raw SVG string, no React
 *     scope for inline logos / palette swaps.
 *   • Both can coexist — the wizard's live colour preview still uses the
 *     server-aesthetic renderer (Stage 96 colour fidelity), templates use
 *     this for module/finder shape variety per design.
 *
 * Ported from `qaxx/qr-engine.jsx` (Claude Design handoff). Browser-only —
 * inside server components, wrap in dynamic import with `ssr: false`.
 */

import { useMemo, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';

export type ModuleShape = 'dot' | 'square' | 'rounded';
export type FinderShape = 'rounded' | 'square' | 'leaf' | 'circle';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface BuazeQRGradient {
  from: string;
  to: string;
  angle?: number;
}

export interface BuazeQRProps {
  /** Payload (URL etc.) encoded into the QR. */
  value: string;
  /** Pixel size of the rendered <svg>. */
  size?: number;
  moduleShape?: ModuleShape;
  finderShape?: FinderShape;
  /** Module colour. */
  fg?: string;
  /** Background colour. `"transparent"` skips the backdrop rect. */
  bg?: string;
  /** Quiet zone in modules (default 2). */
  margin?: number;
  /** Optional centre logo node (sized ~22% of QR). */
  logo?: ReactNode;
  /** Colour of the rounded-square plate behind the centre logo. */
  logoBg?: string;
  /** Error correction level. Default `H` allows ~30% obscured (logo OK). */
  ecLevel?: ErrorCorrectionLevel;
  /** Optional linear gradient painted across the modules. */
  gradient?: BuazeQRGradient | null;
  /** Override the finder pattern colour (defaults to module fg). */
  finderColor?: string | null;
}

/** Build a 2D boolean matrix for the QR modules. */
function buildMatrix(text: string, ecLevel: ErrorCorrectionLevel = 'H'): boolean[][] {
  const qr = qrcode(0, ecLevel);
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let r = 0; r < count; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < count; c++) row.push(qr.isDark(r, c));
    matrix.push(row);
  }
  return matrix;
}

/** Is (r,c) inside one of the three finder-pattern 7×7 squares? */
function isFinder(r: number, c: number, count: number): boolean {
  const inTL = r < 7 && c < 7;
  const inTR = r < 7 && c >= count - 7;
  const inBL = r >= count - 7 && c < 7;
  return inTL || inTR || inBL;
}

/** Is (r,c) inside the central "clear zone" we'll punch out for a logo? */
function isInClearZone(r: number, c: number, count: number, clearRadius: number): boolean {
  if (!clearRadius) return false;
  const cx = (count - 1) / 2;
  const cy = (count - 1) / 2;
  return Math.abs(r - cy) <= clearRadius && Math.abs(c - cx) <= clearRadius;
}

export function BuazeQR({
  value = 'https://buaze.com',
  size = 240,
  moduleShape = 'dot',
  finderShape = 'rounded',
  fg = '#0A0A0A',
  bg = '#FFFFFF',
  margin = 2,
  logo = null,
  logoBg = '#FFFFFF',
  ecLevel = 'H',
  gradient = null,
  finderColor = null,
}: BuazeQRProps) {
  const matrix = useMemo(() => buildMatrix(value, ecLevel), [value, ecLevel]);
  const count = matrix.length;
  const totalCells = count + margin * 2;
  const cell = size / totalCells;
  const offset = margin * cell;

  // Punch out ~22% of the centre if a logo is present; ECC-H tolerates ~30%.
  const clearRadius = logo ? Math.floor(count * 0.11) : 0;
  const gradientId = useMemo(() => `bzqrg-${Math.random().toString(36).slice(2, 9)}`, []);

  const fill = gradient ? `url(#${gradientId})` : fg;
  const finderFill = finderColor || fill;

  // ─── Module rendering ────────────────────────────────────────────────
  const dataPaths: ReactNode[] = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!matrix[r][c]) continue;
      if (isFinder(r, c, count)) continue;
      if (isInClearZone(r, c, count, clearRadius)) continue;
      const x = offset + c * cell;
      const y = offset + r * cell;
      if (moduleShape === 'dot') {
        dataPaths.push(
          <circle
            key={`${r}-${c}`}
            cx={x + cell / 2}
            cy={y + cell / 2}
            r={cell * 0.42}
            fill={fill}
          />,
        );
      } else if (moduleShape === 'rounded') {
        dataPaths.push(
          <rect
            key={`${r}-${c}`}
            x={x + cell * 0.06}
            y={y + cell * 0.06}
            width={cell * 0.88}
            height={cell * 0.88}
            rx={cell * 0.28}
            fill={fill}
          />,
        );
      } else {
        dataPaths.push(
          <rect key={`${r}-${c}`} x={x} y={y} width={cell} height={cell} fill={fill} />,
        );
      }
    }
  }

  // ─── Finder patterns ──────────────────────────────────────────────────
  const finderOrigins = [
    { r: 0, c: 0 },
    { r: 0, c: count - 7 },
    { r: count - 7, c: 0 },
  ];
  const bgFallback = bg === 'transparent' ? '#fff' : bg;
  const finders = finderOrigins.map(({ r, c }, i) => {
    const x = offset + c * cell;
    const y = offset + r * cell;
    const s = cell * 7;
    if (finderShape === 'circle') {
      return (
        <g key={`f${i}`}>
          <circle cx={x + s / 2} cy={y + s / 2} r={s / 2} fill={finderFill} />
          <circle cx={x + s / 2} cy={y + s / 2} r={s / 2 - cell} fill={bgFallback} />
          <circle cx={x + s / 2} cy={y + s / 2} r={cell * 1.5} fill={finderFill} />
        </g>
      );
    }
    if (finderShape === 'leaf') {
      const rxOuter = cell * 2.5;
      const rxInner = cell * 1.2;
      return (
        <g key={`f${i}`}>
          <rect x={x} y={y} width={s} height={s} rx={rxOuter} fill={finderFill} />
          <rect
            x={x + cell}
            y={y + cell}
            width={s - cell * 2}
            height={s - cell * 2}
            rx={rxOuter - cell}
            fill={bgFallback}
          />
          <rect
            x={x + cell * 2}
            y={y + cell * 2}
            width={s - cell * 4}
            height={s - cell * 4}
            rx={rxInner}
            fill={finderFill}
          />
        </g>
      );
    }
    if (finderShape === 'rounded') {
      const rxOuter = cell * 1.5;
      return (
        <g key={`f${i}`}>
          <rect x={x} y={y} width={s} height={s} rx={rxOuter} fill={finderFill} />
          <rect
            x={x + cell}
            y={y + cell}
            width={s - cell * 2}
            height={s - cell * 2}
            rx={rxOuter - cell}
            fill={bgFallback}
          />
          <rect
            x={x + cell * 2}
            y={y + cell * 2}
            width={s - cell * 4}
            height={s - cell * 4}
            rx={cell * 0.8}
            fill={finderFill}
          />
        </g>
      );
    }
    return (
      <g key={`f${i}`}>
        <rect x={x} y={y} width={s} height={s} fill={finderFill} />
        <rect
          x={x + cell}
          y={y + cell}
          width={s - cell * 2}
          height={s - cell * 2}
          fill={bgFallback}
        />
        <rect
          x={x + cell * 2}
          y={y + cell * 2}
          width={s - cell * 4}
          height={s - cell * 4}
          fill={finderFill}
        />
      </g>
    );
  });

  // ─── Centre logo plate ────────────────────────────────────────────────
  let logoNode: ReactNode = null;
  if (logo) {
    const plateSize = clearRadius * 2 * cell + cell * 1.6;
    const plateX = size / 2 - plateSize / 2;
    const plateY = size / 2 - plateSize / 2;
    logoNode = (
      <g>
        <rect
          x={plateX}
          y={plateY}
          width={plateSize}
          height={plateSize}
          rx={plateSize * 0.22}
          fill={logoBg}
        />
        <foreignObject x={plateX} y={plateY} width={plateSize} height={plateSize}>
          {/* xmlns kaldırıldı — TS HTMLDivElement type'ında declared değil;
              modern tarayıcılar foreignObject içinde XHTML'i otomatik infer
              eder, dolayısıyla SVG export uyumu bozulmaz. */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {logo}
          </div>
        </foreignObject>
      </g>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {gradient && (
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientTransform={`rotate(${gradient.angle ?? 45} 0.5 0.5)`}
          >
            <stop offset="0%" stopColor={gradient.from} />
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>
        </defs>
      )}
      {bg !== 'transparent' && <rect width={size} height={size} fill={bg} />}
      {dataPaths}
      {finders}
      {logoNode}
    </svg>
  );
}

export default BuazeQR;
