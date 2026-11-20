'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MenuTheme } from '@/lib/validations';
import {
  beginThemeSave, createThemeSync, isThemeDirty, settleThemeSave, themeDiff,
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
  /** Swatch, custom colour (rAF-throttled: the native picker fires on every pixel) or `null` = default. */
  setAccent: (hex: string | null) => void;
  /** Upload → the draft holds the stored image; nothing is saved to the menu yet. */
  setLogoFile: (file: File) => Promise<void>;
  removeLogo: () => void;
  logoUploading: boolean;
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
});

/**
 * Local design draft (spec §7.11, fixed decision 3): theme, accent colour and
 * logo change only the preview until "Uygula". Browsing sends no PATCH; Apply
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
  upload: (file: File, kind: 'item' | 'logo') => Promise<PhotoUploadResult>;
  onAccessLost: () => void;
}): ThemeDraft {
  const { menuTheme, menuAccentColor, menuLogoUrl } = restaurant;
  const applied = useMemo<ThemeValues>(
    () => ({ menuTheme, menuAccentColor, menuLogoUrl }),
    [menuTheme, menuAccentColor, menuLogoUrl],
  );
  const [draft, setDraft] = useState<ThemeValues>(() => appliedOf(restaurant));
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const { enqueue, pending } = useSerialQueue();

  const latest = useRef({ applied, draft });
  latest.current = { applied, draft };
  const env = useRef({ restaurantId, isTr, menu, upload, onAccessLost });
  env.current = { restaurantId, isTr, menu, upload, onAccessLost };

  // A clean draft follows the applied values (undo of Apply, refetch).
  const prevApplied = useRef(applied);
  useEffect(() => {
    const before = prevApplied.current;
    prevApplied.current = applied;
    if (before === applied) return;
    setDraft((d) => (isThemeDirty(before, d) ? d : applied));
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

  // ── Apply / undo of Apply ──
  const sync = useRef<ThemeSyncState | null>(null);
  const runPatch = useCallback(
    async (patch: Partial<ThemeValues>): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!sync.current || sync.current.inFlight === 0) sync.current = createThemeSync(latest.current.applied);
      const begun = beginThemeSave(sync.current);
      sync.current = begun.state;
      const { restaurantId: id, isTr: tr } = env.current;
      const r = await enqueue('theme', () => menuApi(id, tr).patchTheme(patch));
      const settled = settleThemeSave(sync.current ?? begun.state, begun.seq, patch, r.ok);
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
    setLogoUploading(false);
    setError(null);
    setDraft(latest.current.applied);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    applied,
    draft,
    dirty: isThemeDirty(applied, draft),
    setTheme,
    setAccent,
    setLogoFile,
    removeLogo,
    logoUploading,
    error,
    clearError,
    apply,
    discard,
    applying,
    pending,
  };
}
