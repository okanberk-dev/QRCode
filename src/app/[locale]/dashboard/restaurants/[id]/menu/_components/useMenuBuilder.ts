'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { MENU_THEMES, type MenuTheme } from '@/lib/validations';
import { compressImage } from '@/lib/client-image';
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
import type { StarterPreset } from './menu-starter-data';
import type { CategoryShape, RestaurantShape } from './menu-types';

type ThemePatch = { menuTheme?: MenuTheme; menuAccentColor?: string | null; menuLogoUrl?: string | null };

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
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [presetBusy, setPresetBusy] = useState<StarterPreset['id'] | null>(null);

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
      setRestaurant({
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
  const saveTheme = async (patch: ThemePatch) => {
    if (!restaurant) return;
    setThemeSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${id}/theme`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tema kaydedilemedi');
      setRestaurant((prev) => prev ? { ...prev, ...data } : prev);
    } catch (e) {
      setError((e as Error).message);
    }
    setThemeSaving(false);
  };

  const uploadLogo = async (file: File) => {
    setThemeSaving(true);
    setError(null);
    try {
      // Pre-compress in the browser so the request payload is small (~200 KB
      // instead of several MB) before sharp does the final resize server-side.
      const compressed = await compressImage(file, { maxDim: 1024, quality: 0.85 });
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('kind', 'logo');
      const res = await fetch(`/api/restaurants/${id}/menu/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Logo yüklenemedi');
      await saveTheme({ menuLogoUrl: data.url });
    } catch (e) {
      setError((e as Error).message);
      setThemeSaving(false);
    }
  };

  // ── Quick toggles (optimistic, revert on failure) ──
  const toggleCategoryVisibility = async (category: CategoryShape) => {
    const next = !category.isVisible;
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isVisible: next } : c)));
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: next }),
      });
      if (!res.ok) throw new Error('Değişiklik kaydedilemedi');
      touchLocal();
    } catch (e) {
      // Revert on failure
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isVisible: !next } : c)));
      setError((e as Error).message);
    }
  };

  const toggleItemAvailability = async (item: MenuItemView) => {
    const next = !item.isAvailable;
    setCategories((prev) => patchItem(prev, item.id, { isAvailable: next }));
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: next }),
      });
      if (!res.ok) throw new Error('Değişiklik kaydedilemedi');
      touchLocal();
    } catch (e) {
      setCategories((prev) => patchItem(prev, item.id, { isAvailable: !next }));
      setError((e as Error).message);
    }
  };

  const toggleItemOutOfStock = async (item: MenuItemView) => {
    const next = !item.isOutOfStock;
    setCategories((prev) => patchItem(prev, item.id, { isOutOfStock: next }));
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOutOfStock: next }),
      });
      if (!res.ok) throw new Error('Değişiklik kaydedilemedi');
      touchLocal();
    } catch (e) {
      setCategories((prev) => patchItem(prev, item.id, { isOutOfStock: !next }));
      setError((e as Error).message);
    }
  };

  // ── Quick-start preset (only meaningful when categories list is empty) ──
  const applyStarterPreset = async (preset: StarterPreset) => {
    setPresetBusy(preset.id);
    setError(null);
    const names = preset[isTr ? 'tr' : 'en'].categories;
    try {
      // Sequential to keep deterministic sortOrder; ~6 calls so latency is fine.
      for (const name of names) {
        const res = await fetch(`/api/restaurants/${id}/menu/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, isVisible: true }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Kategori oluşturulamadı');
        }
      }
      await fetchAll();
    } catch (e) {
      setError((e as Error).message);
    }
    setPresetBusy(null);
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
    try {
      const url =
        mode === 'create'
          ? `/api/restaurants/${id}/menu/categories`
          : `/api/restaurants/${id}/menu/categories/${categoryId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          description: payload.description ?? null,
          isVisible: payload.isVisible ?? true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      const saved = data.category as SavedCategory | undefined;
      if (saved) {
        setCategories((prev) => applySavedCategory(prev, mode, saved));
        // First category of an empty menu becomes the active one (what the old
        // full refetch did); otherwise the current selection stays.
        if (mode === 'create') setActiveCategoryId((prev) => prev ?? saved.id);
        touchLocal();
      } else {
        await fetchAll();
      }
      setBusy(false);
      return null;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      return (e as Error).message;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/categories/${categoryId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Silinemedi');
      const successor = neighbourCategoryId(categories, categoryId);
      setCategories((prev) => removeCategory(prev, categoryId));
      setActiveCategoryId((prev) => (prev === categoryId ? successor : prev));
      touchLocal();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reorderCategories = async (newOrder: CategoryShape[]) => {
    // Optimistic state update; server returns 200 without a body so no refetch
    // needed on success. Only refetch on failure to revert to canonical order.
    setCategories(withIndexSortOrder(newOrder));
    const payload = {
      categories: newOrder.map((c, i) => ({ id: c.id, sortOrder: i })),
    };
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Sıralama kaydedilemedi');
      touchLocal();
    } catch (e) {
      setError((e as Error).message);
      await fetchAll();
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
  /** Resolves to an error message when the save failed, or null on success. */
  const saveItem = async (
    mode: 'create' | 'edit',
    itemId: string | undefined,
    payload: Partial<MenuItemView> & { categoryId?: string },
  ): Promise<string | null> => {
    setBusy(true);
    setError(null);
    try {
      const url =
        mode === 'create'
          ? `/api/restaurants/${id}/menu/items`
          : `/api/restaurants/${id}/menu/items/${itemId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: payload.categoryId,
          name: payload.name,
          description: payload.description ?? null,
          priceCents: payload.priceCents ?? 0,
          imageUrl: payload.imageUrl ?? null,
          badges: payload.badges ?? [],
          allergens: payload.allergens ?? [],
          isAvailable: payload.isAvailable ?? true,
          isOutOfStock: payload.isOutOfStock ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      const saved = data.item as SavedItem | undefined;
      const merged = saved ? applySavedItem(categories, mode, saved, payload.categoryId) : null;
      if (merged) {
        setCategories((prev) => applySavedItem(prev, mode, saved as SavedItem, payload.categoryId) ?? prev);
        touchLocal();
      } else {
        await fetchAll();
      }
      setBusy(false);
      return null;
    } catch (e) {
      // Also set the page-level banner for the (rare) case where the modal is
      // already gone — but the modal itself renders the message now. It used to
      // ONLY set this state while staying open, so the banner painted behind
      // the overlay and the owner saw the Save button go idle with no feedback.
      setError((e as Error).message);
      setBusy(false);
      return (e as Error).message;
    }
  };

  const deleteItem = async (itemId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Silinemedi');
      }
      setCategories((prev) => removeItem(prev, itemId));
      touchLocal();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reorderItems = async (categoryId: string, newOrder: MenuItemView[]) => {
    const nextCats = categories.map((c) => (c.id === categoryId ? { ...c, items: withIndexSortOrder(newOrder) } : c));
    setCategories(nextCats);
    const payload = {
      items: newOrder.map((item, i) => ({ id: item.id, sortOrder: i })),
    };
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Sıralama kaydedilemedi');
      touchLocal();
    } catch (e) {
      setError((e as Error).message);
      await fetchAll();
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

  const togglePublish = async () => {
    if (!restaurant) return;
    setPublishBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuPublished: !restaurant.menuPublished }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      setRestaurant({
        ...restaurant,
        menuPublished: data.restaurant.menuPublished,
        menuUpdatedAt: data.restaurant.menuUpdatedAt,
      });
    } catch (e) {
      setError((e as Error).message);
    }
    setPublishBusy(false);
  };

  return {
    // data
    restaurant, categories, activeCategory, activeCategoryId, setActiveCategoryId,
    // status
    loading, error, setError, busy, publishBusy, themeSaving, presetBusy,
    // loading
    fetchAll,
    // theme
    saveTheme, uploadLogo,
    // toggles
    toggleCategoryVisibility, toggleItemAvailability, toggleItemOutOfStock,
    // preset
    applyStarterPreset,
    // categories
    saveCategory, deleteCategory, reorderCategories, moveCategory,
    // items
    saveItem, deleteItem, reorderItems, moveItem,
    // publish
    togglePublish,
  };
}
