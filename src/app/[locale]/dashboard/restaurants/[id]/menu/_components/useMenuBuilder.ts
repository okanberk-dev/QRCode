'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { MENU_THEMES, type MenuTheme } from '@/lib/validations';
import { compressImage } from '@/lib/client-image';
import { mapMenuApiError } from '@/lib/menu-api-error';
import {
  applySavedCategory,
  applySavedItem,
  neighbourCategoryId,
  patchItem,
  removeCategory,
  removeItem,
  withIndexSortOrder,
  type SavedCategory,
  type SavedItem,
} from './menu-merge';
import type { ItemPatch } from './menu-item-form';
import { buildMenuCopy, menuFmt } from './menu-copy';
import type { StarterPreset } from './menu-starter-data';
import { beginThemeSave, createThemeSync, settleThemeSave, type ThemeSyncState, type ThemeValues } from './menu-theme';
import type { CategoryShape, RestaurantShape } from './menu-types';

type ThemePatch = { menuTheme?: MenuTheme; menuAccentColor?: string | null; menuLogoUrl?: string | null };

/** Result of a photo upload: the stored data URL, or a sentence the owner can read. */
export type PhotoUploadResult = { ok: true; url: string } | { ok: false; message: string };

/** Result of "Paste a list". */
export type BulkAddResult = { ok: true; count: number } | { ok: false; message: string };

/** The parts of a menu API answer the builder reads. */
type ApiBody = {
  category?: SavedCategory;
  item?: SavedItem;
  items?: SavedItem[];
  url?: string;
  restaurant?: { menuPublished: boolean; menuUpdatedAt: string | null };
};

type ApiCall =
  | { ok: true; status: number; data: ApiBody | null }
  | { ok: false; status: number; code: string | null; itemCount: number | null; message: string };

/**
 * One request → either the parsed answer or an owner-facing message. Raw
 * server text and machine codes never leave this function: they are mapped
 * (or replaced by a generic hint) by `mapMenuApiError`.
 */
async function apiCall(url: string, init: RequestInit | undefined, isTr: boolean): Promise<ApiCall> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return { ok: false, status: 0, code: null, itemCount: null, message: mapMenuApiError(e as Error, isTr) };
  }
  const data = (await res.json().catch(() => null)) as (ApiBody & { code?: unknown; itemCount?: unknown; error?: unknown }) | null;
  if (res.ok) return { ok: true, status: res.status, data };
  return {
    ok: false,
    status: res.status,
    code: typeof data?.code === 'string' ? data.code : null,
    itemCount: typeof data?.itemCount === 'number' ? data.itemCount : null,
    message: mapMenuApiError(
      {
        status: res.status,
        code: typeof data?.code === 'string' ? data.code : null,
        error: typeof data?.error === 'string' ? data.error : null,
      },
      isTr,
    ),
  };
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** How long a passing note ("6 categories added") stays on screen. */
const NOTICE_MS = 3500;

/**
 * State + data layer of the owner menu builder: the restaurant, its categories
 * and items, and every mutation on them. Modal / confirm / drag-and-drop state
 * stays in page.tsx.
 *
 * Local merge (spec 7.2): a successful create / update / delete applies the
 * server response to the in-memory menu instead of re-downloading everything
 * (with photos stored as data URLs that was hundreds of KB per save), and every
 * successful mutation advances `restaurant.menuUpdatedAt` locally — the server
 * bumps it too, but the builder would otherwise show the old "last updated"
 * until the next full load. `fetchAll` runs only on the first load, after a
 * starter preset, after a failed reorder, on retry (and as a safety net when a
 * response cannot be merged).
 */
export function useMenuBuilder({ id, isTr }: { id: string; isTr: boolean }) {
  const [restaurant, setRestaurant] = useState<RestaurantShape | null>(null);
  const [categories, setCategories] = useState<CategoryShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNoticeState] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  // The design dialog shows its own status: saves overlap while a colour is
  // dragged, and an error on the page behind the dialog would be invisible.
  const [themeStatus, setThemeStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [themeError, setThemeError] = useState<string | null>(null);
  const themeSync = useRef<ThemeSyncState | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [presetBusy, setPresetBusy] = useState<StarterPreset['id'] | null>(null);

  const copy = useMemo(() => buildMenuCopy(isTr), [isTr]);
  const fmt = useMemo(() => menuFmt(isTr), [isTr]);

  // A passing note that clears itself; a newer note replaces an older one.
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setNotice = useCallback((message: string | null) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNoticeState(message);
    if (message) noticeTimer.current = setTimeout(() => setNoticeState(null), NOTICE_MS);
  }, []);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  // `initial` (first load / retry) shows the page skeleton. Every other call
  // — after a preset, a failed reorder, an unmergeable response — refreshes
  // silently so the builder stays mounted and keeps its scroll position.
  const fetchAll = useCallback(async (opts: { initial?: boolean } = {}) => {
    if (opts.initial) setLoading(true);
    setError(null);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch(`/api/restaurants/${id}`),
        fetch(`/api/restaurants/${id}/menu/categories`),
      ]);
      // §38.73 — Locale-aware error messages (EN owner için drift fix).
      if (!rRes.ok) throw new Error(isTr ? 'Restoran yüklenemedi' : 'Restaurant failed to load');
      if (!cRes.ok) throw new Error(isTr ? 'Menü yüklenemedi' : 'Menu failed to load');
      const r = await rRes.json();
      const c = await cRes.json();
      const loaded: RestaurantShape = {
        id: r.id,
        slug: r.slug,
        name: r.name,
        category: r.category,
        address: r.address ?? null,
        phone: r.phone ?? null,
        workingHours: r.workingHours ?? null,
        primaryColor: r.primaryColor ?? '#C6F24E',
        menuEnabled: r.menuEnabled ?? true,
        menuPublished: r.menuPublished ?? false,
        menuUpdatedAt: r.menuUpdatedAt ?? null,
        menuTheme: (MENU_THEMES as readonly string[]).includes(r.menuTheme) ? r.menuTheme : 'classic',
        menuAccentColor: r.menuAccentColor ?? null,
        menuLogoUrl: r.menuLogoUrl ?? null,
      };
      setRestaurant(loaded);
      themeSync.current = createThemeSync({
        menuTheme: loaded.menuTheme,
        menuAccentColor: loaded.menuAccentColor,
        menuLogoUrl: loaded.menuLogoUrl,
      });
      const cats: CategoryShape[] = (c.categories ?? []).map((cat: CategoryShape) => ({
        ...cat,
        items: (cat.items ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      setCategories(cats);
      setActiveCategoryId((prev) => prev && cats.some((x) => x.id === prev) ? prev : cats[0]?.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [id, isTr]);

  useEffect(() => {
    if (id) fetchAll({ initial: true });
  }, [id, fetchAll]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || null;

  /** The server stamped `menu_updated_at`; mirror it so "last updated" is current. */
  const touchLocal = () => {
    setRestaurant((prev) => (prev ? { ...prev, menuUpdatedAt: new Date().toISOString() } : prev));
  };

  // ── Theme ops ──
  /** Show a theme change in the live preview right away, without saving it. */
  const previewTheme = (patch: ThemePatch) => {
    setRestaurant((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  /**
   * Save a theme change. The screen changes first; the server's answers may
   * arrive in any order, so `menu-theme.ts` decides what is really saved and
   * the screen is re-synced once nothing is in flight (a failed change is
   * taken back, with the reason in `themeError`).
   */
  const saveTheme = async (patch: ThemePatch): Promise<void> => {
    if (!restaurant) return;
    if (!themeSync.current) {
      themeSync.current = createThemeSync({
        menuTheme: restaurant.menuTheme,
        menuAccentColor: restaurant.menuAccentColor,
        menuLogoUrl: restaurant.menuLogoUrl,
      });
    }
    const begun = beginThemeSave(themeSync.current);
    themeSync.current = begun.state;
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setThemeError(null);
    setThemeStatus('saving');
    previewTheme(patch);

    const r = await apiCall(`/api/restaurants/${id}/theme`, jsonInit('PATCH', patch), isTr);
    const settled = settleThemeSave(themeSync.current ?? begun.state, begun.seq, patch as Partial<ThemeValues>, r.ok);
    themeSync.current = settled.state;
    if (!r.ok) setThemeError(r.message);
    if (r.ok) {
      // The theme route stamps `menu_updated_at` but does not return it.
      setRestaurant((prev) => (prev ? { ...prev, menuUpdatedAt: new Date().toISOString() } : prev));
    }
    if (settled.ui) {
      const confirmed = settled.ui;
      setRestaurant((prev) => (prev ? { ...prev, ...confirmed } : prev));
      setThemeStatus(r.ok ? 'saved' : 'idle');
      if (r.ok) {
        savedTimer.current = setTimeout(() => setThemeStatus('idle'), 2000);
      }
    }
  };

  /**
   * Compress in the browser (a phone photo is several MB; the server resizes
   * to its final size anyway), upload, and answer with the stored image or a
   * sentence in the owner's language. Item photos are shown at phone width on
   * the public menu, so 960 px is plenty.
   */
  const uploadPhoto = async (file: File, kind: 'item' | 'logo'): Promise<PhotoUploadResult> => {
    const generic = mapMenuApiError(null, isTr);
    // Raw server text and codes never reach the owner; an unknown failure
    // gets the photo-specific sentence instead of the generic one.
    const sentence = (message: string) => (message === generic ? copy.photoFailed : message);
    try {
      const compressed = await compressImage(
        file,
        kind === 'item' ? { maxDim: 960, quality: 0.8 } : { maxDim: 1024, quality: 0.85 },
      );
      if (compressed.size > 5 * 1024 * 1024) {
        return { ok: false, message: mapMenuApiError({ status: 413, code: 'IMAGE_TOO_LARGE' }, isTr) };
      }
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('kind', kind);
      const r = await apiCall(`/api/restaurants/${id}/menu/upload`, { method: 'POST', body: fd }, isTr);
      if (!r.ok) return { ok: false, message: sentence(r.message) };
      const url = r.data?.url;
      if (!url) return { ok: false, message: copy.photoFailed };
      return { ok: true, url };
    } catch (e) {
      return { ok: false, message: sentence(mapMenuApiError(e as Error, isTr)) };
    }
  };

  const uploadLogo = async (file: File): Promise<void> => {
    setThemeError(null);
    setThemeStatus('saving');
    const uploaded = await uploadPhoto(file, 'logo');
    if (!uploaded.ok) {
      setThemeStatus('idle');
      setThemeError(uploaded.message);
      return;
    }
    await saveTheme({ menuLogoUrl: uploaded.url });
  };

  // ── Quick toggles (optimistic, revert on failure) ──
  const toggleCategoryVisibility = async (category: CategoryShape) => {
    const next = !category.isVisible;
    setError(null);
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isVisible: next } : c)));
    const r = await apiCall(
      `/api/restaurants/${id}/menu/categories/${category.id}`,
      jsonInit('PATCH', { isVisible: next }),
      isTr,
    );
    if (r.ok) {
      touchLocal();
    } else {
      // Revert on failure
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isVisible: !next } : c)));
      setError(r.message);
    }
  };

  const toggleItemFlag = async (item: MenuItemView, flag: 'isAvailable' | 'isOutOfStock') => {
    const next = !item[flag];
    setError(null);
    setCategories((prev) => patchItem(prev, item.id, { [flag]: next }));
    const r = await apiCall(
      `/api/restaurants/${id}/menu/items/${item.id}`,
      jsonInit('PATCH', { [flag]: next }),
      isTr,
    );
    if (r.ok) {
      touchLocal();
    } else {
      setCategories((prev) => patchItem(prev, item.id, { [flag]: !next }));
      setError(r.message);
    }
  };
  const toggleItemAvailability = (item: MenuItemView) => toggleItemFlag(item, 'isAvailable');
  const toggleItemOutOfStock = (item: MenuItemView) => toggleItemFlag(item, 'isOutOfStock');

  // ── Quick-start preset (only meaningful when categories list is empty) ──
  /**
   * Adds the preset's categories one by one (sequential keeps sortOrder
   * deterministic; ~6 calls). Whatever was created is shown even when one call
   * fails half way, so the owner never sees an empty menu next to categories
   * that really exist.
   */
  const applyStarterPreset = async (preset: StarterPreset): Promise<{ created: number; failed: boolean }> => {
    setPresetBusy(preset.id);
    setError(null);
    const names = preset[isTr ? 'tr' : 'en'].categories;
    let created = 0;
    let failure: string | null = null;
    try {
      for (const name of names) {
        const r = await apiCall(
          `/api/restaurants/${id}/menu/categories`,
          jsonInit('POST', { name, isVisible: true }),
          isTr,
        );
        if (!r.ok) {
          failure = r.message;
          break;
        }
        created += 1;
      }
    } finally {
      await fetchAll();
      setPresetBusy(null);
    }
    // fetchAll clears the error banner, so the message is set after it.
    if (failure) setError(created > 0 ? fmt.presetPartial() : failure);
    else setNotice(fmt.presetAdded(created));
    return { created, failed: failure !== null };
  };

  // ── Category ops ──
  /** Resolves to an error message when the save failed, or null on success. */
  const saveCategory = async (
    mode: 'create' | 'edit',
    categoryId: string | undefined,
    payload: Partial<CategoryShape>,
  ): Promise<string | null> => {
    setBusy(true);
    setError(null);
    const url =
      mode === 'create'
        ? `/api/restaurants/${id}/menu/categories`
        : `/api/restaurants/${id}/menu/categories/${categoryId}`;
    const r = await apiCall(
      url,
      jsonInit(mode === 'create' ? 'POST' : 'PATCH', {
        name: payload.name,
        description: payload.description ?? null,
        isVisible: payload.isVisible ?? true,
      }),
      isTr,
    );
    setBusy(false);
    if (!r.ok) return r.message;
    const saved = r.data?.category;
    if (saved) {
      setCategories((prev) => applySavedCategory(prev, mode, saved));
      // A category you just created is where you will add items next.
      if (mode === 'create') setActiveCategoryId(saved.id);
      touchLocal();
    } else {
      await fetchAll();
    }
    return null;
  };

  /**
   * Delete a category. With `deleteItems` its items go with it (one request,
   * soft delete like everywhere else in the menu). Resolves to true on success.
   */
  const deleteCategory = async (categoryId: string, opts: { deleteItems?: boolean } = {}): Promise<boolean> => {
    setError(null);
    const r = await apiCall(
      `/api/restaurants/${id}/menu/categories/${categoryId}${opts.deleteItems ? '?deleteItems=true' : ''}`,
      { method: 'DELETE' },
      isTr,
    );
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    const successor = neighbourCategoryId(categories, categoryId);
    setCategories((prev) => removeCategory(prev, categoryId));
    setActiveCategoryId((prev) => (prev === categoryId ? successor : prev));
    touchLocal();
    return true;
  };

  const reorderCategories = async (newOrder: CategoryShape[]) => {
    // Optimistic state update; server returns 200 without a body so no refetch
    // needed on success. Only refetch on failure to revert to canonical order.
    setCategories(withIndexSortOrder(newOrder));
    const r = await apiCall(
      `/api/restaurants/${id}/menu/reorder`,
      jsonInit('PATCH', { categories: newOrder.map((c, i) => ({ id: c.id, sortOrder: i })) }),
      isTr,
    );
    if (r.ok) {
      touchLocal();
    } else {
      await fetchAll();
      setError(r.message);
    }
  };

  const moveCategory = async (index: number, dir: -1 | 1) => {
    const next = [...categories];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    await reorderCategories(next);
  };

  // ── Item ops ──
  /**
   * Resolves to an error message when the save failed, or null on success.
   * `payload` carries only what the editor decided to send (every field for a
   * new item, just the changed ones for an edit).
   */
  const saveItem = async (
    mode: 'create' | 'edit',
    itemId: string | undefined,
    payload: ItemPatch,
  ): Promise<string | null> => {
    setBusy(true);
    setError(null);
    const url =
      mode === 'create'
        ? `/api/restaurants/${id}/menu/items`
        : `/api/restaurants/${id}/menu/items/${itemId}`;
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) body[key] = value;
    }
    const r = await apiCall(url, jsonInit(mode === 'create' ? 'POST' : 'PATCH', body), isTr);
    setBusy(false);
    if (!r.ok) {
      // The modal renders the message itself; the page banner is only the
      // fallback for the (rare) case where the modal is already gone.
      setError(r.message);
      return r.message;
    }
    const saved = r.data?.item;
    const merged = saved ? applySavedItem(categories, mode, saved, payload.categoryId) : null;
    if (merged) {
      setCategories((prev) => applySavedItem(prev, mode, saved as SavedItem, payload.categoryId) ?? prev);
      // An item put into (or moved to) another category: show where it went.
      const landedIn = (saved as SavedItem).categoryId ?? payload.categoryId;
      if (landedIn && landedIn !== activeCategoryId) setActiveCategoryId(landedIn);
      touchLocal();
    } else {
      await fetchAll();
    }
    return null;
  };

  /**
   * "Paste a list": every row in one request (all or nothing, ordered on the
   * server). Merges the created items locally and leaves a passing note.
   */
  const bulkAddItems = async (
    categoryId: string,
    items: { name: string; priceCents: number }[],
  ): Promise<BulkAddResult> => {
    setBusy(true);
    setError(null);
    const r = await apiCall(`/api/restaurants/${id}/menu/items/bulk`, jsonInit('POST', { categoryId, items }), isTr);
    setBusy(false);
    if (!r.ok) return { ok: false, message: r.message };
    const created = r.data?.items ?? [];
    if (created.length > 0 && categories.some((c) => c.id === categoryId)) {
      setCategories((prev) =>
        created.reduce<CategoryShape[]>((acc, item) => applySavedItem(acc, 'create', item, categoryId) ?? acc, prev),
      );
      touchLocal();
    } else {
      await fetchAll();
    }
    setActiveCategoryId(categoryId);
    setNotice(fmt.bulkAdded(created.length || items.length));
    return { ok: true, count: created.length || items.length };
  };

  const deleteItem = async (itemId: string) => {
    setError(null);
    const r = await apiCall(`/api/restaurants/${id}/menu/items/${itemId}`, { method: 'DELETE' }, isTr);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setCategories((prev) => removeItem(prev, itemId));
    touchLocal();
  };

  const reorderItems = async (categoryId: string, newOrder: MenuItemView[]) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, items: withIndexSortOrder(newOrder) } : c)),
    );
    const r = await apiCall(
      `/api/restaurants/${id}/menu/reorder`,
      jsonInit('PATCH', { items: newOrder.map((item, i) => ({ id: item.id, sortOrder: i })) }),
      isTr,
    );
    if (r.ok) {
      touchLocal();
    } else {
      await fetchAll();
      setError(r.message);
    }
  };

  const moveItem = async (index: number, dir: -1 | 1) => {
    if (!activeCategory) return;
    const items = [...activeCategory.items];
    const swap = index + dir;
    if (swap < 0 || swap >= items.length) return;
    [items[index], items[swap]] = [items[swap], items[index]];
    await reorderItems(activeCategory.id, items);
  };

  /** Resolves to the new state on success, null when nothing changed. */
  const togglePublish = async (): Promise<'published' | 'unpublished' | null> => {
    if (!restaurant) return null;
    setPublishBusy(true);
    setError(null);
    const r = await apiCall(
      `/api/restaurants/${id}/menu/publish`,
      jsonInit('PATCH', { menuPublished: !restaurant.menuPublished }),
      isTr,
    );
    setPublishBusy(false);
    if (!r.ok) {
      setError(r.message);
      return null;
    }
    const updated = r.data?.restaurant;
    if (!updated) {
      await fetchAll();
      return null;
    }
    setRestaurant((prev) =>
      prev ? { ...prev, menuPublished: updated.menuPublished, menuUpdatedAt: updated.menuUpdatedAt } : prev,
    );
    return updated.menuPublished ? 'published' : 'unpublished';
  };

  return {
    // data
    restaurant, categories, activeCategory, activeCategoryId, setActiveCategoryId,
    // status
    loading, error, setError, notice, setNotice, busy, publishBusy, presetBusy,
    themeStatus, themeError, setThemeError,
    // loading
    fetchAll,
    // theme
    previewTheme, saveTheme, uploadLogo, uploadPhoto,
    // toggles
    toggleCategoryVisibility, toggleItemAvailability, toggleItemOutOfStock,
    // preset
    applyStarterPreset,
    // categories
    saveCategory, deleteCategory, reorderCategories, moveCategory,
    // items
    saveItem, bulkAddItems, deleteItem, reorderItems, moveItem,
    // publish
    togglePublish,
    // copy (so the page and the hook never disagree on wording)
    copy, fmt,
  };
}
