'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MENU_THEMES, type MenuTheme } from '@/lib/validations';
import { readMenuDesign, type MenuKnobKey, type MenuKnobs, type MenuPresetId } from '@/lib/menu-design';
import {
  beginThemeSave, createThemeSync, isThemeDirty, rebaseThemeDraft, settleThemeSave, themeDiff,
  withKnob, withoutKnobs, withPreset, withPresetRestored, withTagline,
  type ThemeSyncState, type ThemeValues,
} from '../menu-theme';
import type { MenuData, RestaurantShape } from '../menu-types';
import { menuApi } from './menu-api';
import type { UndoRun } from './useMenuActions';
import type { PhotoUploadResult } from './usePhotoUpload';
import { useSerialQueue } from './useSerialQueue';

const ACCESS_CODES = new Set(['forbidden_role', 'MENU_MODULE_DISABLED']);

export type ApplyResult = { ok: true; undo?: UndoRun } | { ok: false; message: string };

export interface ThemeDraft {
  /** What customers see now (the restaurant row). */
  applied: ThemeValues;
  /** What the preview shows: `applied` plus the owner's unapplied choices. */
  draft: ThemeValues;
  /** `Uygula` would send something. */
  dirty: boolean;
  setTheme: (theme: MenuTheme) => void;
  /** Pick a preset (family + design); clears style knobs, keeps the tagline. Returns whether knobs were dropped. */
  setPreset: (id: MenuPresetId) => boolean;
  /** Bring back the theme + design from before the last knob-dropping `setPreset` (local only). */
  restorePreset: () => void;
  setKnob: <K extends MenuKnobKey>(key: K, value: MenuKnobs[K]) => void;
  /** Every style knob back to the preset default; the tagline stays. */
  resetKnobs: () => void;
  /** Raw tagline as typed (sanitised here; empty removes it). */
  setTagline: (text: string) => void;
  /** Swatch, custom colour (rAF-throttled: the native picker fires on every pixel) or `null` = default. */
  setAccent: (hex: string | null) => void;
  /** Upload → the draft holds the stored image; nothing is saved to the menu yet. */
  setLogoFile: (file: File) => Promise<void>;
  removeLogo: () => void;
  logoUploading: boolean;
  /** Upload → the draft holds the stored cover; nothing is saved to the menu yet. */
  setCoverFile: (file: File) => Promise<void>;
  removeCover: () => void;
  coverUploading: boolean;
  /** A logo or cover upload is running (Apply waits for it). */
  uploading: boolean;
  error: string | null;
  clearError: () => void;
  /** One PATCH with only the changed keys. The caller toasts `themeApplied` with the returned undo. */
  apply: () => Promise<ApplyResult>;
  /** Back to the applied values. */
  discard: () => void;
  applying: boolean;
  /** Theme requests queued or in flight (leave guard). */
  pending: number;
}

const appliedOf = (r: RestaurantShape): ThemeValues => ({
  menuTheme: r.menuTheme,
  menuAccentColor: r.menuAccentColor,
  menuLogoUrl: r.menuLogoUrl,
  menuDesign: readMenuDesign(r.menuDesign),
  menuCoverUrl: r.menuCoverUrl ?? null,
});

/**
 * What the server answered for a successful PATCH, as the values ThemeSync
 * confirms: the sent patch, with `menuTheme`, `menuAccentColor` and
 * `menuDesign` replaced by the response's canonical values (normalised hex,
 * normalised design). Only keys that were sent are confirmed.
 */
function canonicalPatch(patch: Partial<ThemeValues>, data: Record<string, unknown> | null): Partial<ThemeValues> {
  const out: Partial<ThemeValues> = { ...patch };
  if (!data) return out;
  if ('menuTheme' in patch && typeof data.menuTheme === 'string' && (MENU_THEMES as readonly string[]).includes(data.menuTheme)) {
    out.menuTheme = data.menuTheme as MenuTheme;
  }
  if ('menuAccentColor' in patch && 'menuAccentColor' in data) {
    out.menuAccentColor = typeof data.menuAccentColor === 'string' ? data.menuAccentColor : null;
  }
  if ('menuDesign' in patch && 'menuDesign' in data) out.menuDesign = readMenuDesign(data.menuDesign);
  return out;
}

/**
 * Local design draft (spec §7.11, fixed decision 3; menu-design-final §11):
 * preset, knobs, tagline, accent colour, logo and cover change only the
 * preview until "Uygula". Browsing sends no PATCH; Apply
 * sends one PATCH with exactly the changed fields; its undo PATCHes the
 * previous applied values back. Both go through the `theme` queue key and the
 * `ThemeSync` bookkeeping (`menu-theme.ts`), so an old answer can never write
 * an old value over a newer one. The draft follows the applied values while it
 * is clean (an undo, a refetch); a dirty draft is never overwritten.
 */
export function useThemeDraft({
  restaurantId, isTr, restaurant, menu, upload, onAccessLost,
}: {
  restaurantId: string;
  isTr: boolean;
  restaurant: RestaurantShape;
  menu: { setMenu: (fn: (m: MenuData) => MenuData) => void; touchLocal: () => void };
  upload: (file: File, kind: 'item' | 'logo' | 'cover') => Promise<PhotoUploadResult>;
  onAccessLost: () => void;
}): ThemeDraft {
  const { menuTheme, menuAccentColor, menuLogoUrl, menuDesign, menuCoverUrl } = restaurant;
  const applied = useMemo<ThemeValues>(
    () => ({
      menuTheme,
      menuAccentColor,
      menuLogoUrl,
      menuDesign: readMenuDesign(menuDesign),
      menuCoverUrl: menuCoverUrl ?? null,
    }),
    [menuTheme, menuAccentColor, menuLogoUrl, menuDesign, menuCoverUrl],
  );
  const [draft, setDraft] = useState<ThemeValues>(() => appliedOf(restaurant));
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const { enqueue, pending } = useSerialQueue();

  const latest = useRef({ applied, draft });
  latest.current = { applied, draft };
  const env = useRef({ restaurantId, isTr, menu, upload, onAccessLost });
  env.current = { restaurantId, isTr, menu, upload, onAccessLost };

  // The draft follows the applied values (undo of Apply, refetch) key by key:
  // what the owner did not touch follows, what they edited stays.
  const prevApplied = useRef(applied);
  useEffect(() => {
    const before = prevApplied.current;
    prevApplied.current = applied;
    if (before === applied) return;
    setDraft((d) => rebaseThemeDraft(before, applied, d));
  }, [applied]);

  // ── accent: one state update per frame while the native picker is dragged ──
  const accentFrame = useRef(0);
  const accentNext = useRef<string | null>(null);
  useEffect(() => () => cancelAnimationFrame(accentFrame.current), []);
  const setAccent = useCallback((hex: string | null) => {
    accentNext.current = hex;
    if (accentFrame.current) return;
    accentFrame.current = requestAnimationFrame(() => {
      accentFrame.current = 0;
      const value = accentNext.current;
      setDraft((d) => (d.menuAccentColor === value ? d : { ...d, menuAccentColor: value }));
    });
  }, []);

  const setTheme = useCallback((theme: MenuTheme) => {
    setDraft((d) => (d.menuTheme === theme ? d : { ...d, menuTheme: theme }));
  }, []);

  // ── preset + knobs + tagline (menu-design-final §5.4) ──
  const beforePreset = useRef<Pick<ThemeValues, 'menuTheme' | 'menuDesign'> | null>(null);
  const setPreset = useCallback((id: MenuPresetId) => {
    const current = latest.current.draft;
    const r = withPreset(current, id);
    if (r.values === current) return false;
    beforePreset.current = r.dropped ? { menuTheme: current.menuTheme, menuDesign: current.menuDesign } : null;
    setDraft((d) => ({ ...d, menuTheme: r.values.menuTheme, menuDesign: r.values.menuDesign }));
    return r.dropped;
  }, []);
  const restorePreset = useCallback(() => {
    const before = beforePreset.current;
    beforePreset.current = null;
    if (before) setDraft((d) => withPresetRestored(d, before));
  }, []);
  const setKnob = useCallback(<K extends MenuKnobKey>(key: K, value: MenuKnobs[K]) => {
    beforePreset.current = null;
    setDraft((d) => withKnob(d, key, value));
  }, []);
  const resetKnobs = useCallback(() => {
    beforePreset.current = null;
    setDraft((d) => withoutKnobs(d));
  }, []);
  const setTagline = useCallback((text: string) => {
    setDraft((d) => withTagline(d, text));
  }, []);

  // ── logo: upload only; the latest pick wins ──
  const logoSeq = useRef(0);
  const setLogoFile = useCallback(async (file: File) => {
    const seq = ++logoSeq.current;
    setLogoUploading(true);
    setError(null);
    const r = await env.current.upload(file, 'logo');
    if (seq !== logoSeq.current) return;
    setLogoUploading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setDraft((d) => ({ ...d, menuLogoUrl: r.url }));
  }, []);
  const removeLogo = useCallback(() => {
    logoSeq.current += 1;
    setLogoUploading(false);
    setDraft((d) => (d.menuLogoUrl === null ? d : { ...d, menuLogoUrl: null }));
  }, []);

  // ── cover: its own sequence guard; remove cancels an in-flight upload ──
  const coverSeq = useRef(0);
  const setCoverFile = useCallback(async (file: File) => {
    const seq = ++coverSeq.current;
    setCoverUploading(true);
    setError(null);
    const r = await env.current.upload(file, 'cover');
    if (seq !== coverSeq.current) return;
    setCoverUploading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setDraft((d) => ({ ...d, menuCoverUrl: r.url }));
  }, []);
  const removeCover = useCallback(() => {
    coverSeq.current += 1;
    setCoverUploading(false);
    setDraft((d) => (d.menuCoverUrl === null ? d : { ...d, menuCoverUrl: null }));
  }, []);

  // ── Apply / undo of Apply ──
  const sync = useRef<ThemeSyncState | null>(null);
  const runPatch = useCallback(
    async (patch: Partial<ThemeValues>): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!sync.current || sync.current.inFlight === 0) sync.current = createThemeSync(latest.current.applied);
      const begun = beginThemeSave(sync.current);
      sync.current = begun.state;
      const { restaurantId: id, isTr: tr } = env.current;
      const r = await enqueue('theme', () => menuApi(id, tr).patchTheme(patch));
      const confirmedPatch = r.ok ? canonicalPatch(patch, r.data as Record<string, unknown> | null) : patch;
      const settled = settleThemeSave(sync.current ?? begun.state, begun.seq, confirmedPatch, r.ok);
      sync.current = settled.state;
      const confirmed = settled.ui;
      if (confirmed) {
        env.current.menu.setMenu((m) => ({ ...m, restaurant: { ...m.restaurant, ...confirmed } }));
      }
      if (r.ok) {
        // The theme route stamps `menu_updated_at` but does not return it.
        env.current.menu.touchLocal();
        return { ok: true };
      }
      if (r.code && ACCESS_CODES.has(r.code)) env.current.onAccessLost();
      return { ok: false, message: r.message };
    },
    [enqueue],
  );

  const apply = useCallback(async (): Promise<ApplyResult> => {
    const before = latest.current.applied;
    const diff = themeDiff(before, latest.current.draft);
    const keys = Object.keys(diff) as (keyof ThemeValues)[];
    if (keys.length === 0) return { ok: true };
    setApplying(true);
    setError(null);
    const r = await runPatch(diff);
    setApplying(false);
    if (!r.ok) {
      setError(r.message);
      return r;
    }
    const previous: Partial<ThemeValues> = {};
    for (const key of keys) (previous as Record<string, unknown>)[key] = before[key];
    const undo: UndoRun = async () => {
      const u = await runPatch(previous);
      return u.ok ? { ok: true } : { ok: false, message: u.message };
    };
    return { ok: true, undo };
  }, [runPatch]);

  const discard = useCallback(() => {
    logoSeq.current += 1;
    coverSeq.current += 1;
    beforePreset.current = null;
    setLogoUploading(false);
    setCoverUploading(false);
    setError(null);
    setDraft(latest.current.applied);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    applied,
    draft,
    dirty: isThemeDirty(applied, draft),
    setTheme,
    setPreset,
    restorePreset,
    setKnob,
    resetKnobs,
    setTagline,
    setAccent,
    setLogoFile,
    removeLogo,
    logoUploading,
    setCoverFile,
    removeCover,
    coverUploading,
    uploading: logoUploading || coverUploading,
    error,
    clearError,
    apply,
    discard,
    applying,
    pending,
  };
}
