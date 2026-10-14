// Stage 96 — QR colour palette + WCAG contrast helpers.
//
// The owner panel CreateQRWizard lets owners customise the QR scan colours
// (dark = foreground modules, light = background). QR scanners need a
// **contrast ratio of ≥ 3:1** to read reliably across lighting conditions
// — below that, scan rate drops sharply, especially on phone cameras with
// auto white-balance. WCAG AA for non-text content uses the same 3:1 floor
// (we mirror it so the UI guidance matches accessibility intuition).
//
// This file is **runtime-agnostic** — pure functions usable from both the
// client preview component and the server-side validator helpers. Keep it
// dep-free.

export type QrPreset = {
  id: string;
  /** TR label (UI surface is owner panel — TR primary). */
  labelTr: string;
  /** EN fallback. */
  labelEn: string;
  /** Foreground (modules) hex — `#RRGGBB`. */
  dark: string;
  /** Background hex — `#RRGGBB`. */
  light: string;
  /** Optional design intent hint shown under the preset swatch. */
  hintTr?: string;
  hintEn?: string;
};

/**
 * Curated palette — Pulse brand + a handful of scan-safe alternatives.
 *
 * **Disipline**: every preset is pre-validated ≥ 4.5:1 contrast so any
 * pick from this list is safe without manual review. Custom HEX entries
 * go through `scoreContrast` for live UI feedback.
 */
export const QR_PRESETS: QrPreset[] = [
  {
    id: 'classic',
    labelTr: 'Klasik',
    labelEn: 'Classic',
    dark: '#000000',
    light: '#FFFFFF',
    hintTr: 'En yüksek okunabilirlik',
    hintEn: 'Highest scan reliability',
  },
  {
    id: 'pulse',
    labelTr: 'Pulse',
    labelEn: 'Pulse',
    dark: '#0A0A0A',
    light: '#FFFFFF',
    hintTr: 'Buaze marka',
    hintEn: 'Buaze brand',
  },
  {
    id: 'cream',
    labelTr: 'Krem',
    labelEn: 'Cream',
    dark: '#0A0A0A',
    light: '#FAF7F0',
    hintTr: 'Sıcak menü estetiği',
    hintEn: 'Warm menu aesthetic',
  },
  {
    id: 'navy',
    labelTr: 'Lacivert',
    labelEn: 'Navy',
    dark: '#0B2545',
    light: '#FFFFFF',
    hintTr: 'Kurumsal',
    hintEn: 'Corporate',
  },
  {
    id: 'maroon',
    labelTr: 'Bordo',
    labelEn: 'Maroon',
    dark: '#5C1A1B',
    light: '#FAF3E0',
    hintTr: 'Şarap & gastronomi',
    hintEn: 'Wine & fine dining',
  },
  {
    id: 'forest',
    labelTr: 'Orman',
    labelEn: 'Forest',
    dark: '#0F3B2E',
    light: '#FFFFFF',
    hintTr: 'Organik / doğal',
    hintEn: 'Organic / nature',
  },
];

export const DEFAULT_QR_PRESET_ID = 'classic';

/**
 * Strict `#RRGGBB` (or `#RGB` shorthand) hex validator. Lowercase + uppercase
 * accepted; alpha + named colours rejected (QR libraries expect 6-char hex).
 *
 * @returns the normalised `#RRGGBB` uppercase form when valid, otherwise null.
 */
export function normaliseHex(value: string): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Allow `#RGB` shorthand by expanding to 6 chars before testing.
  const shortMatch = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  const expanded = shortMatch
    ? `#${shortMatch[1]
        .split('')
        .map((ch) => ch + ch)
        .join('')}`
    : trimmed;
  if (!/^#[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return expanded.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = normaliseHex(hex);
  if (!norm) return null;
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

/** WCAG relative luminance (sRGB → linear → weighted sum). */
function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * WCAG contrast ratio (1.0–21.0). Higher = more readable.
 *  - 21.0 = pure black on pure white
 *  - 4.5  = WCAG AA for normal text
 *  - 3.0  = WCAG AA for non-text content (QR safe-zone floor)
 *  - 1.0  = identical colours
 *
 * Returns 0 if either input is an invalid hex (caller can treat as worst-case).
 */
export function contrastRatio(dark: string, light: string): number {
  const lDark = relativeLuminance(dark);
  const lLight = relativeLuminance(light);
  if (lDark === null || lLight === null) return 0;
  const a = Math.max(lDark, lLight);
  const b = Math.min(lDark, lLight);
  return (a + 0.05) / (b + 0.05);
}

export type ContrastVerdict = {
  ratio: number;
  /**
   *  - `excellent` ≥ 7.0 (WCAG AAA) — print + low-light camera safe
   *  - `good`      ≥ 4.5 (WCAG AA text) — recommended floor
   *  - `passable`  ≥ 3.0 (WCAG AA non-text) — works but scanners may struggle
   *  - `risky`     < 3.0 — likely to fail scans, block save
   */
  level: 'excellent' | 'good' | 'passable' | 'risky';
  /** Owner-facing TR message for the picker UI. */
  messageTr: string;
  messageEn: string;
};

export function scoreContrast(dark: string, light: string): ContrastVerdict {
  const ratio = contrastRatio(dark, light);
  if (ratio >= 7) {
    return {
      ratio,
      level: 'excellent',
      messageTr: 'Mükemmel — her kamerada güvenli',
      messageEn: 'Excellent — safe on every camera',
    };
  }
  if (ratio >= 4.5) {
    return {
      ratio,
      level: 'good',
      messageTr: 'İyi kontrast — tarama güvenli',
      messageEn: 'Good contrast — safe to scan',
    };
  }
  if (ratio >= 3) {
    return {
      ratio,
      level: 'passable',
      messageTr: 'Sınırda — düşük ışıkta riskli olabilir',
      messageEn: 'Borderline — may struggle in low light',
    };
  }
  return {
    ratio,
    level: 'risky',
    messageTr: 'Kontrast yetersiz — taranmayabilir',
    messageEn: 'Insufficient contrast — may fail to scan',
  };
}

/**
 * True when the pair would block save in the picker (< 3:1). UI surfaces
 * this as a hard-block disabled state; lower levels render warnings but
 * still allow save.
 */
export function isContrastRisky(dark: string, light: string): boolean {
  return contrastRatio(dark, light) < 3;
}

/** Contrast floor used when a QR colour is picked automatically (see below). */
export const SCANNABLE_MIN_CONTRAST = 3;

/** Fallback used when the supplied foreground is not a usable hex colour. */
const SCANNABLE_FALLBACK_DARK = '#0A0A0A';

function toHex2(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

/** Mix `hex` towards pure black (target 0) or pure white (target 255). */
function blendTowards(hex: string, target: 0 | 255, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (channel: number) => channel + (target - channel) * amount;
  return `#${toHex2(mix(rgb.r))}${toHex2(mix(rgb.g))}${toHex2(mix(rgb.b))}`;
}

/**
 * Guarantee a scannable QR foreground without throwing the owner's brand
 * colour away.
 *
 * The menu QR is drawn in the menu accent colour, which an owner can set to
 * anything — a pale lime (#C6F24E) is only 1.3:1 against white and simply
 * does not scan. When `dark` already clears `min` against `light` it is
 * returned untouched (normalised to `#RRGGBB`); otherwise it is blended
 * towards the extreme that contrasts most with `light`, in 8 % steps, until
 * the floor is met. The direction follows `light`, so a dark background pulls
 * the foreground towards white instead of making things worse.
 *
 * The floor is 3:1 (not 4.5:1) on purpose: it matches `isContrastRisky`, which
 * already blocks the QR wizard below 3:1, and the QR is rendered with the
 * highest error-correction level. Only the lightest brand colours change.
 *
 * - Invalid `dark` falls back to `#0A0A0A`; invalid `light` is treated as white.
 * - 3-digit hex is expanded; the result is always upper-case `#RRGGBB`.
 * - At most 13 steps: the last one lands exactly on black/white.
 */
export function ensureScannableDark(
  dark: string,
  light: string,
  min: number = SCANNABLE_MIN_CONTRAST,
): { color: string; adjusted: boolean } {
  const normalDark = normaliseHex(dark);
  if (!normalDark) return { color: SCANNABLE_FALLBACK_DARK, adjusted: false };
  const normalLight = normaliseHex(light) ?? '#FFFFFF';

  if (contrastRatio(normalDark, normalLight) >= min) {
    return { color: normalDark, adjusted: false };
  }

  const target: 0 | 255 =
    contrastRatio('#000000', normalLight) >= contrastRatio('#FFFFFF', normalLight) ? 0 : 255;

  for (let step = 1; step <= 13; step += 1) {
    const candidate = blendTowards(normalDark, target, Math.min(1, step * 0.08));
    if (contrastRatio(candidate, normalLight) >= min) {
      return { color: candidate, adjusted: true };
    }
  }
  // Unreachable for any real background (pure black or white always clears
  // the floor), but keep the function total: land on the extreme.
  return { color: target === 0 ? '#000000' : '#FFFFFF', adjusted: true };
}
