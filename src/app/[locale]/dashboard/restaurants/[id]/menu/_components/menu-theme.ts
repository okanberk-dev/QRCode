/**
 * Pure logic of the "Görünüm" dialog (no React): the named accent colours, and
 * the bookkeeping that keeps overlapping theme saves honest.
 */
import { normaliseHex } from '@/lib/qr-colors';
import type { MenuTheme } from '@/lib/validations';

// ── Accent colours ────────────────────────────────────────────────────────

/** Twelve named accent colours — the name is what screen readers announce (not the hex). */
export const ACCENT_SWATCHES: { hex: string; tr: string; en: string }[] = [
  { hex: '#C6F24E', tr: 'Limon', en: 'Lime' },
  { hex: '#E85A4F', tr: 'Mercan', en: 'Coral' },
  { hex: '#D97706', tr: 'Amber', en: 'Amber' },
  { hex: '#9A3412', tr: 'Kiremit', en: 'Brick' },
  { hex: '#0A0A0A', tr: 'Siyah', en: 'Black' },
  { hex: '#1F2937', tr: 'Kömür', en: 'Charcoal' },
  { hex: '#0E7C66', tr: 'Zümrüt', en: 'Emerald' },
  { hex: '#15803D', tr: 'Yeşil', en: 'Green' },
  { hex: '#0EA5E9', tr: 'Gökyüzü', en: 'Sky' },
  { hex: '#1D4ED8', tr: 'Mavi', en: 'Blue' },
  { hex: '#8B5CF6', tr: 'Mor', en: 'Violet' },
  { hex: '#BE185D', tr: 'Pembe', en: 'Pink' },
];

/** The swatch a colour is, or null when it is a custom colour. */
export function findSwatch(value: string | null | undefined): (typeof ACCENT_SWATCHES)[number] | null {
  const hex = typeof value === 'string' ? normaliseHex(value) : null;
  if (!hex) return null;
  return ACCENT_SWATCHES.find((s) => s.hex === hex) ?? null;
}

// ── Overlapping saves ─────────────────────────────────────────────────────

export interface ThemeValues {
  menuTheme: MenuTheme;
  menuAccentColor: string | null;
  menuLogoUrl: string | null;
}

type ThemeKey = keyof ThemeValues;

/**
 * Bookkeeping for theme saves that overlap (a colour dragged across the
 * picker fires many). The screen is updated optimistically; the server answers
 * in any order. What counts as "saved" is tracked per field:
 *  - a field is confirmed only by a request newer than the last one that
 *    confirmed it, so a slow old answer can never write an old colour back;
 *  - the screen is re-synced to the confirmed values only once nothing is in
 *    flight, which also takes back a change whose save failed.
 */
export interface ThemeSyncState {
  latestSeq: number;
  inFlight: number;
  confirmed: ThemeValues;
  confirmedSeq: Record<ThemeKey, number>;
}

export function createThemeSync(values: ThemeValues): ThemeSyncState {
  return {
    latestSeq: 0,
    inFlight: 0,
    confirmed: { ...values },
    confirmedSeq: { menuTheme: 0, menuAccentColor: 0, menuLogoUrl: 0 },
  };
}

export function beginThemeSave(state: ThemeSyncState): { state: ThemeSyncState; seq: number } {
  const seq = state.latestSeq + 1;
  return { state: { ...state, latestSeq: seq, inFlight: state.inFlight + 1 }, seq };
}

export function settleThemeSave(
  state: ThemeSyncState,
  seq: number,
  patch: Partial<ThemeValues>,
  ok: boolean,
): { state: ThemeSyncState; /** Values the screen must show now, or null while other saves are still running. */ ui: ThemeValues | null } {
  const confirmed = { ...state.confirmed };
  const confirmedSeq = { ...state.confirmedSeq };
  if (ok) {
    for (const key of Object.keys(patch) as ThemeKey[]) {
      if (seq > confirmedSeq[key]) {
        (confirmed as Record<ThemeKey, unknown>)[key] = patch[key];
        confirmedSeq[key] = seq;
      }
    }
  }
  const inFlight = Math.max(0, state.inFlight - 1);
  const next: ThemeSyncState = { ...state, inFlight, confirmed, confirmedSeq };
  return { state: next, ui: inFlight === 0 ? confirmed : null };
}

// ── Local design draft (Menu Studio, spec §5.7 / §7.11) ──────────────────
// Theme, accent and logo change only the preview until "Uygula". Apply sends
// exactly the fields that differ from what is saved.

function accentKey(value: string | null): string | null {
  if (value === null || value === undefined || value === '') return null;
  return normaliseHex(value) ?? value;
}

/**
 * The PATCH that turns `applied` into `draft` — only changed keys, `{}` when
 * nothing changed. Accent colours are compared after `normaliseHex`
 * (`#c6f24e` equals `#C6F24E`) and sent normalised; the logo is compared as a
 * string, and removing it sends `null`.
 */
export function themeDiff(applied: ThemeValues, draft: ThemeValues): Partial<ThemeValues> {
  const diff: Partial<ThemeValues> = {};
  if (draft.menuTheme !== applied.menuTheme) diff.menuTheme = draft.menuTheme;
  const accent = accentKey(draft.menuAccentColor);
  if (accent !== accentKey(applied.menuAccentColor)) diff.menuAccentColor = accent;
  const logo = draft.menuLogoUrl || null;
  if (logo !== (applied.menuLogoUrl || null)) diff.menuLogoUrl = logo;
  return diff;
}

/** True when the draft has something "Uygula" would send. */
export function isThemeDirty(applied: ThemeValues, draft: ThemeValues): boolean {
  return Object.keys(themeDiff(applied, draft)).length > 0;
}
