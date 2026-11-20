// Public menu design — accent contrast resolver (menu-design-final.md §7.3).
//
// Owners pick any accent colour (12 swatches, a custom hex, or "Varsayılan" →
// primaryColor). The public menu paints it on one of 8 curated surfaces
// (white … forest). The raw accent is NEVER used as text or as a fill: every
// place the accent appears reads one of the roles below, each of which is
// guaranteed to meet WCAG AA against the surface it sits on:
//
//   accentText  ≥ 4.5 vs bg + surface                (prices "Renkli", numbers, links)
//   accentUi    ≥ 3   vs bg + surface + navWorst      (rules, active underline, focus)
//   onAccent    ≥ 4.5 vs accentFill                   (active pill, chef's pick, chips)
//   accentEdge  ≥ 3   vs bg                           (inset edge of the fill)
//   onBanner    ≥ 4.5 vs banner and bannerEnd         (banner masthead / splash)
//   accentMark  ≥ 3   vs accentSoft                   (monogram letters, ≥ 24 px)
//
// Pure and dependency-light (reuses the WCAG maths in qr-colors.ts, which is
// not edited), deterministic (no Date, randomness or locale calls), so it runs
// identically on the server and in the client bundle. Same style as
// survey-accent.ts.

import { contrastRatio, normaliseHex } from '@/lib/qr-colors';

export const ON_DARK = '#141210';
export const WHITE = '#FFFFFF';
export const BLACK = '#000000';

/** WCAG AA, normal text. */
export const TEXT_MIN = 4.5;
/** WCAG AA, non-text UI (and large text). */
export const UI_MIN = 3;
/** On a light surface a fill stays the accent while it is at least this visible. */
export const FILL_VISIBLE_LIGHT = 1.15;
/** On a dark surface a fill must clear the non-text floor. */
export const FILL_VISIBLE_DARK = 3;
/** Content scrolling under the translucent sticky nav: bg mixed 8 % towards the extreme. */
export const NAV_WORST_MIX = 0.08;

/** Steps used by `ensureAll` and the mid-band search (i / STEPS). */
const STEPS = 50;

export type MenuScheme = 'light' | 'dark';

/** A curated surface (menu-design.ts `SURFACES`). All colours are `#RRGGBB`. */
export interface SurfaceDef {
  scheme: MenuScheme;
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  muted: string;
  rule: string;
  ruleStrong: string;
}

export interface AccentRoles {
  accentText: string;
  accentUi: string;
  accentFill: string;
  onAccent: string;
  accentEdge: string;
  accentSoft: string;
  onAccentSoft: string;
  accentMark: string;
  banner: string;
  bannerEnd: string;
  onBanner: string;
  glow: string;
  focus: string;
  /** True when the owner's colour was changed for that role (drives the Studio note). */
  adjusted: { text: boolean; ui: boolean; fill: boolean; banner: boolean };
}

function rgb(hex: string): [number, number, number] {
  const n = normaliseHex(hex) ?? BLACK;
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

function hex2(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
}

/** Per-channel sRGB lerp a → b (t = 0 → a, t = 1 → b), rounded, uppercase `#RRGGBB`. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const k = Math.max(0, Math.min(1, t));
  return `#${hex2(ar + (br - ar) * k)}${hex2(ag + (bg - ag) * k)}${hex2(ab + (bb - ab) * k)}`;
}

/** WCAG relative luminance (same formula as qr-colors.ts). */
export function luminance(hex: string): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function minContrast(fg: string, refs: readonly string[]): number {
  let min = Infinity;
  for (const ref of refs) min = Math.min(min, contrastRatio(fg, ref));
  return min;
}

/**
 * The first blend of `fg` towards `toward` (in 1/50 steps) that reaches `min`
 * against EVERY reference colour. Step 50 is `toward` itself (black on light
 * surfaces, white on dark ones), so the function is total.
 */
export function ensureAll(
  fg: string,
  refs: readonly string[],
  min: number,
  toward: string,
): { color: string; adjusted: boolean } {
  const start = normaliseHex(fg) ?? BLACK;
  for (let i = 0; i <= STEPS; i += 1) {
    const color = mixHex(start, toward, i / STEPS);
    if (minContrast(color, refs) >= min) return { color, adjusted: i > 0 };
  }
  return { color: mixHex(start, toward, 1), adjusted: true };
}

/** Ink or white, whichever contrasts more with `fill` (ties → ink). */
export function readableOn(fill: string): string {
  return contrastRatio(ON_DARK, fill) >= contrastRatio(WHITE, fill) ? ON_DARK : WHITE;
}

/** First step i (0…50) where `text` on `mix(fill, toward, i/50)` reaches TEXT_MIN. */
function firstReadableStep(fill: string, toward: string, text: string): number {
  for (let i = 0; i <= STEPS; i += 1) {
    if (contrastRatio(text, mixHex(fill, toward, i / STEPS)) >= TEXT_MIN) return i;
  }
  return STEPS;
}

/**
 * Resolve every accent role for one surface. `accent` must already be a
 * normalised `#RRGGBB` (resolveMenuDesign does that); anything else is treated
 * as black.
 */
export function resolveAccentRoles(accent: string, s: SurfaceDef, bannerTone: 'accent' | 'ink'): AccentRoles {
  const a = normaliseHex(accent) ?? BLACK;
  const light = s.scheme === 'light';
  const toward = light ? BLACK : WHITE;
  const navWorst = mixHex(s.bg, toward, NAV_WORST_MIX);

  const accentText = ensureAll(a, [s.bg, s.surface], TEXT_MIN, toward);
  const accentUi = ensureAll(a, [s.bg, s.surface, navWorst], UI_MIN, toward);

  // Fill + the text on it.
  let fill = a;
  let inkPill = false;
  if (light) {
    if (contrastRatio(fill, s.bg) < FILL_VISIBLE_LIGHT) {
      fill = s.ink;
      inkPill = true;
    }
  } else if (contrastRatio(fill, s.bg) < FILL_VISIBLE_DARK) {
    fill = ensureAll(fill, [s.bg], FILL_VISIBLE_DARK, WHITE).color;
  }
  let on = inkPill ? (contrastRatio(a, s.ink) >= TEXT_MIN ? a : WHITE) : readableOn(fill);
  if (contrastRatio(on, fill) < TEXT_MIN) {
    // Mid-luminance band (e.g. #A26F33): neither ink nor white reaches 4.5 —
    // nudge the fill the shorter way.
    const dk = firstReadableStep(fill, BLACK, WHITE);
    const lt = firstReadableStep(fill, WHITE, ON_DARK);
    if (dk <= lt) {
      fill = mixHex(fill, BLACK, dk / STEPS);
      on = WHITE;
    } else {
      fill = mixHex(fill, WHITE, lt / STEPS);
      on = ON_DARK;
    }
  }
  const accentEdge = contrastRatio(fill, s.bg) >= UI_MIN ? fill : accentUi.color;

  const accentSoft = mixHex(a, s.bg, light ? 0.88 : 0.82);
  const onAccentSoft = s.ink;
  const accentMark = ensureAll(a, [accentSoft], UI_MIN, toward).color;

  let banner: string;
  let onBanner: string;
  if (bannerTone === 'ink') {
    banner = light ? ON_DARK : s.surface2;
    onBanner = readableOn(banner);
  } else {
    banner = fill;
    onBanner = on;
  }
  // The sheen moves AWAY from the text colour, so contrast only grows.
  const bannerEnd = mixHex(banner, luminance(onBanner) > luminance(banner) ? BLACK : WHITE, 0.12);
  const glow = light ? s.bg : mixHex(accentUi.color, s.bg, 0.8);

  return {
    accentText: accentText.color,
    accentUi: accentUi.color,
    accentFill: fill,
    onAccent: on,
    accentEdge,
    accentSoft,
    onAccentSoft,
    accentMark,
    banner,
    bannerEnd,
    onBanner,
    glow,
    focus: accentUi.color,
    adjusted: {
      text: accentText.color !== a,
      ui: accentUi.color !== a,
      fill: fill !== a,
      banner: bannerTone === 'accent' && banner !== a,
    },
  };
}
