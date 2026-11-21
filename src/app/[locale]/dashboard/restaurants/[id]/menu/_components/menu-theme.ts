/**
 * Pure logic of the "Görünüm" dialog (no React): the named accent colours, the
 * bookkeeping that keeps overlapping theme saves honest, and the local design
 * draft edits (preset, knobs, tagline — menu-design-final §5.4).
 */
import { normaliseHex } from '@/lib/qr-colors';
import type { MenuTheme } from '@/lib/validations';
import {
  PRESETS, countOverrides, designKey, effectivePresetId, normalizeMenuDesign, sanitizeTagline,
  type MenuDesign, type MenuKnobKey, type MenuKnobs, type MenuPresetId,
} from '@/lib/menu-design';

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

/** Every field the "Görünüm" draft owns. ThemeSync confirms per key, so all of them must be listed here. */
export const THEME_KEYS = ['menuTheme', 'menuAccentColor', 'menuLogoUrl', 'menuDesign', 'menuCoverUrl'] as const;

export interface ThemeValues {
  menuTheme: MenuTheme;
  menuAccentColor: string | null;
  menuLogoUrl: string | null;
  /** Stored design (preset + knob overrides + tagline); `null` = the family's own preset. */
  menuDesign: MenuDesign | null;
  /** Cover photo (data URL in the Studio), `null` = none. */
  menuCoverUrl: string | null;
}

type ThemeKey = (typeof THEME_KEYS)[number];

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
    // Built from THEME_KEYS: a key missing here would never confirm (`seq > undefined`
    // is false) and Apply would visually revert.
    confirmedSeq: Object.fromEntries(THEME_KEYS.map((key) => [key, 0])) as Record<ThemeKey, number>,
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
// Theme, accent, logo, design and cover change only the preview until
// "Uygula". Apply sends exactly the fields that differ from what is saved.

function accentKey(value: string | null): string | null {
  if (value === null || value === undefined || value === '') return null;
  return normaliseHex(value) ?? value;
}

/** The stored form of a draft's design (what the server would keep). */
function storedDesign(values: Pick<ThemeValues, 'menuTheme' | 'menuDesign'>): MenuDesign | null {
  return normalizeMenuDesign(values.menuTheme, values.menuDesign ?? null);
}

/**
 * The PATCH that turns `applied` into `draft` — only changed keys, `{}` when
 * nothing changed. Accent colours are compared after `normaliseHex`
 * (`#c6f24e` equals `#C6F24E`) and sent normalised; the logo and the cover are
 * compared as strings, and removing one sends `null`. Designs are compared in
 * their normalised, canonical form (key order and preset-default knobs never
 * count as a change) and the normalised draft (or `null`) is sent.
 */
export function themeDiff(applied: ThemeValues, draft: ThemeValues): Partial<ThemeValues> {
  const diff: Partial<ThemeValues> = {};
  if (draft.menuTheme !== applied.menuTheme) diff.menuTheme = draft.menuTheme;
  const accent = accentKey(draft.menuAccentColor);
  if (accent !== accentKey(applied.menuAccentColor)) diff.menuAccentColor = accent;
  const logo = draft.menuLogoUrl || null;
  if (logo !== (applied.menuLogoUrl || null)) diff.menuLogoUrl = logo;
  const design = storedDesign(draft);
  if (designKey(design) !== designKey(storedDesign(applied))) diff.menuDesign = design;
  const cover = draft.menuCoverUrl || null;
  if (cover !== (applied.menuCoverUrl || null)) diff.menuCoverUrl = cover;
  return diff;
}

/** True when the draft has something "Uygula" would send. */
export function isThemeDirty(applied: ThemeValues, draft: ThemeValues): boolean {
  return Object.keys(themeDiff(applied, draft)).length > 0;
}

/**
 * The draft after the applied values changed from `before` to `applied` (an
 * undo of Apply, a refetch). Rebased per key: a key the owner left as it was
 * follows the new applied value, a key the owner edited keeps the edit. Family
 * and design move together (a knob or tagline belongs to the preset it was set
 * on). So an undo is never silently re-applied by the next "Uygula" because the
 * owner had also changed something else meanwhile.
 */
export function rebaseThemeDraft(before: ThemeValues, applied: ThemeValues, draft: ThemeValues): ThemeValues {
  const edited = themeDiff(before, draft);
  if (Object.keys(edited).length === 0) return applied;
  const designEdited = 'menuTheme' in edited || 'menuDesign' in edited;
  const next: ThemeValues = {
    menuTheme: designEdited ? draft.menuTheme : applied.menuTheme,
    menuDesign: designEdited ? draft.menuDesign : applied.menuDesign,
    menuAccentColor: 'menuAccentColor' in edited ? draft.menuAccentColor : applied.menuAccentColor,
    menuLogoUrl: 'menuLogoUrl' in edited ? draft.menuLogoUrl : applied.menuLogoUrl,
    menuCoverUrl: 'menuCoverUrl' in edited ? draft.menuCoverUrl : applied.menuCoverUrl,
  };
  return THEME_KEYS.every((key) => next[key] === draft[key]) ? draft : next;
}

// ── Design edits (menu-design-final §5.4) ─────────────────────────────────

/** The preset the draft renders (the design's preset when it fits the family). */
export function draftPresetId(values: Pick<ThemeValues, 'menuTheme' | 'menuDesign'>): MenuPresetId {
  return effectivePresetId(values.menuTheme, values.menuDesign ?? null);
}

/** The draft's design rebased on the preset it renders (knobs and tagline kept), before a change. */
function baseDesign(values: ThemeValues): MenuDesign {
  const preset = draftPresetId(values);
  return values.menuDesign ? { ...values.menuDesign, preset } : { v: 1, preset };
}

/**
 * Pick a preset: `menuTheme` becomes its family, the style knobs are cleared
 * and the tagline (content) is kept. `dropped` says whether knobs were
 * overridden before (the panel then offers "Geri al").
 */
export function withPreset(values: ThemeValues, id: MenuPresetId): { values: ThemeValues; dropped: boolean } {
  if (draftPresetId(values) === id && values.menuTheme === PRESETS[id].family) return { values, dropped: false };
  const dropped = countOverrides(storedDesign(values)) > 0;
  const family = PRESETS[id].family;
  const tagline = values.menuDesign?.tagline;
  const menuDesign = normalizeMenuDesign(family, { v: 1, preset: id, ...(tagline ? { tagline } : {}) });
  return { values: { ...values, menuTheme: family, menuDesign }, dropped };
}

/** Set one style knob; the preset's own default deletes the override. */
export function withKnob<K extends MenuKnobKey>(values: ThemeValues, key: K, value: MenuKnobs[K]): ThemeValues {
  const menuDesign = normalizeMenuDesign(values.menuTheme, { ...baseDesign(values), [key]: value });
  return { ...values, menuDesign };
}

/** "Bu stilin varsayılanlarına dön": every style knob cleared, the tagline kept. */
export function withoutKnobs(values: ThemeValues): ThemeValues {
  const tagline = values.menuDesign?.tagline;
  const menuDesign = normalizeMenuDesign(values.menuTheme, {
    v: 1, preset: draftPresetId(values), ...(tagline ? { tagline } : {}),
  });
  return { ...values, menuDesign };
}

/**
 * Stil "Geri al": the family and design from before the preset switch, with
 * the tagline as it is NOW. The tagline is content (§5.4), so an edit made
 * after the switch must survive the undo.
 */
export function withPresetRestored(
  values: ThemeValues,
  before: Pick<ThemeValues, 'menuTheme' | 'menuDesign'>,
): ThemeValues {
  const restored: ThemeValues = { ...values, menuTheme: before.menuTheme, menuDesign: before.menuDesign };
  return withTagline(restored, values.menuDesign?.tagline ?? '');
}

/** The tagline as typed: sanitised; empty removes it. */
export function withTagline(values: ThemeValues, raw: string): ThemeValues {
  const tagline = sanitizeTagline(raw);
  const next: MenuDesign = { ...baseDesign(values) };
  if (tagline) next.tagline = tagline;
  else delete next.tagline;
  return { ...values, menuDesign: normalizeMenuDesign(values.menuTheme, next) };
}
