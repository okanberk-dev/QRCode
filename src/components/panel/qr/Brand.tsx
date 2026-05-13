/**
 * Buaze QR template brand assets.
 *
 * Three glyphs that print/PDF templates compose:
 *   • <BuazeIcon>   — speech-bubble + ECG + lime accent (no font dependency,
 *                     survives PDF export at any size).
 *   • <PoweredBy>   — single-line attribution sat at the bottom of every
 *                     template (CLAUDE.md §22.4 disclosure parity — the
 *                     member business takes the spotlight, Buaze is footer).
 *   • <BizMark>     — placeholder for the member business's own brand,
 *                     auto-derived from `name` + `initials`.
 *
 * Ported from `qaxx/brand.jsx` (Claude Design handoff). Inline styles kept
 * deliberately so templates render identically inside print/PDF pipelines
 * where Tailwind classes don't reach (CLAUDE.md §11 Pulse design is panel
 * chrome; templates are print artefacts → inline style is faithful).
 *
 * Note: The marketing `BuazeLogo` (`src/components/marketing/BuazeLogo.tsx`)
 * is the canonical wordmark; this file only provides the QR-template-scoped
 * glyph + attribution mark. Don't merge — different surfaces, different
 * pixel budgets.
 */

import type { CSSProperties } from 'react';

export interface BuazeIconProps {
  size?: number;
  color?: string;
  accent?: string;
}

/**
 * <BuazeIcon /> — speech-bubble + ECG heartbeat + lime accent dot.
 * Drawn on a 64×64 canvas. Bubble fills ~52×46, accent dot sits at (55,9).
 */
export function BuazeIcon({
  size = 28,
  color = '#0A0A0A',
  accent = '#C6F24E',
}: BuazeIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Speech bubble outline + tail */}
      <path
        d="M14 8 H50 A6 6 0 0 1 56 14 V40 A6 6 0 0 1 50 46 H26 L18 56 V46 H14 A6 6 0 0 1 8 40 V14 A6 6 0 0 1 14 8 Z"
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* ECG / heartbeat line inside bubble */}
      <path
        d="M16 28 L24 28 L28 22 L32 34 L36 22 L40 28 L48 28"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lime accent dot (top-right, outside bubble) */}
      <circle cx={55} cy={9} r={5} fill={accent} />
    </svg>
  );
}

export interface PoweredByProps {
  color?: string;
  accent?: string;
  size?: number;
}

/**
 * <PoweredBy /> — discreet bottom-of-template attribution.
 * Templates feature the MEMBER business above the fold; Buaze itself appears
 * only here, tiny, on a single line.
 */
export function PoweredBy({
  color = '#737373',
  accent = '#C6F24E',
  size = 9,
}: PoweredByProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: "'Inter', sans-serif",
        fontSize: size,
        letterSpacing: size * 0.18,
        fontWeight: 600,
        color,
        textTransform: 'uppercase',
      }}
    >
      <span>powered by</span>
      <BuazeIcon size={size * 1.4} color={color} accent={accent} />
      <span
        style={{
          color,
          fontWeight: 800,
          letterSpacing: -size * 0.04,
          textTransform: 'lowercase',
          fontSize: size * 1.05,
        }}
      >
        buaze<span style={{ color: accent }}>.</span>
      </span>
    </div>
  );
}

export type BizMarkStyle = 'circle' | 'plate' | 'wordmark';

export interface BizMarkProps {
  name?: string;
  initials?: string;
  style?: BizMarkStyle;
  bg?: string;
  fg?: string;
  size?: number;
  hint?: boolean;
}

/**
 * <BizMark> — placeholder for the member business's own brand.
 *
 * `style`:
 *   • `circle` (default) — initials inside a coloured disc.
 *   • `plate`            — small wordmark rectangle (name lockup).
 *   • `wordmark`         — bare wordmark for editorial templates.
 *
 * `hint` shows a dashed outline that signals "swap this for your logo"
 * inside the template picker preview. In production prints we set
 * `hint={false}` so the dash isn't part of the printed artwork.
 */
export function BizMark({
  name = 'Şefin Lokantası',
  initials = 'ŞL',
  style = 'circle',
  bg = '#0A0A0A',
  fg = '#FAFAFA',
  size = 36,
  hint = false,
}: BizMarkProps) {
  const hintOutline: CSSProperties = hint
    ? { outline: '1.5px dashed rgba(115,115,115,0.4)', outlineOffset: 3 }
    : {};

  if (style === 'circle') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: bg,
          color: fg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: size * 0.4,
          letterSpacing: -size * 0.01,
          ...hintOutline,
        }}
      >
        {initials}
      </div>
    );
  }

  if (style === 'plate') {
    return (
      <div
        style={{
          padding: `${size * 0.18}px ${size * 0.36}px`,
          background: bg,
          color: fg,
          borderRadius: size * 0.16,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: size * 0.34,
          letterSpacing: -size * 0.01,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          ...hintOutline,
        }}
      >
        {name}
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 800,
        fontSize: size * 0.5,
        letterSpacing: -size * 0.02,
        color: bg,
        lineHeight: 1,
        padding: '2px 4px',
        ...(hint
          ? { outline: '1.5px dashed rgba(115,115,115,0.4)', outlineOffset: 4 }
          : {}),
      }}
    >
      {name}
    </div>
  );
}

/** Derive 2-character initials from a restaurant name (TR-aware). */
export function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'BZ';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (parts[0][0] + parts[1][0]).toLocaleUpperCase('tr-TR');
}
