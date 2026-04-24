'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, ArrowLeft, ArrowDown, ArrowUp, BarChart3, Check, ChevronRight, Download, Edit2,
  Eye, EyeOff, GripVertical, Image as ImageIcon, Loader2, Plus, QrCode, Save, Trash2, UtensilsCrossed, X,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PublicMenuView, { type MenuCategoryView, type MenuItemView, type RestaurantView } from '@/components/menu/PublicMenuView';
import { MENU_BADGES, MENU_THEMES, type MenuBadge, type MenuTheme } from '@/lib/validations';
import { formatPrice, parsePriceInput } from '@/lib/format';
import { compressImage } from '@/lib/client-image';
import type { Locale } from '@/lib/translations';

interface RestaurantShape extends RestaurantView {
  menuEnabled: boolean;
  menuPublished: boolean;
  menuUpdatedAt: string | null;
  menuTheme: MenuTheme;
  menuAccentColor: string | null;
  menuLogoUrl: string | null;
}

interface CategoryShape extends MenuCategoryView {}

const BADGE_LABELS: Record<MenuBadge, { tr: string; en: string }> = {
  populer: { tr: 'Popüler', en: 'Popular' },
  yeni: { tr: 'Yeni', en: 'New' },
  vegan: { tr: 'Vegan', en: 'Vegan' },
  vegetaryen: { tr: 'Vejetaryen', en: 'Vegetarian' },
  aci: { tr: 'Acı', en: 'Spicy' },
  sef_onerisi: { tr: 'Şef Önerisi', en: "Chef's Pick" },
  glutensiz: { tr: 'Glutensiz', en: 'Gluten-Free' },
};

export default function RestaurantMenuBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const locale = (params?.locale as Locale) ?? 'tr';
  const isTr = locale === 'tr';
  const previewMode = searchParams?.get('preview') === '1';

  const [restaurant, setRestaurant] = useState<RestaurantShape | null>(null);
  const [categories, setCategories] = useState<CategoryShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const [categoryModal, setCategoryModal] = useState<null | { mode: 'create' | 'edit'; data: Partial<CategoryShape> }>(null);
  const [itemModal, setItemModal] = useState<null | { mode: 'create' | 'edit'; data: Partial<MenuItemView> & { categoryId?: string } }>(null);
  const [busy, setBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [qrModal, setQrModal] = useState(false);

  const copy = useMemo(
    () => ({
      title: isTr ? 'Menü' : 'Menu',
      backToMenus: isTr ? 'Menülere Dön' : 'Back to Menus',
      categories: isTr ? 'Kategoriler' : 'Categories',
      items: isTr ? 'Ürünler' : 'Items',
      addCategory: isTr ? 'Kategori Ekle' : 'Add Category',
      addItem: isTr ? 'Ürün Ekle' : 'Add Item',
      editCategory: isTr ? 'Kategori Düzenle' : 'Edit Category',
      editItem: isTr ? 'Ürün Düzenle' : 'Edit Item',
      noCategories: isTr ? 'Henüz kategori yok. Başlamak için ekleyin.' : 'No categories yet. Add one to begin.',
      noItems: isTr ? 'Bu kategoride henüz ürün yok.' : 'No items in this category yet.',
      noCategorySelected: isTr ? 'Soldan bir kategori seçin.' : 'Select a category from the left.',
      categoryName: isTr ? 'Kategori Adı' : 'Category Name',
      description: isTr ? 'Açıklama' : 'Description',
      visible: isTr ? 'Görünür' : 'Visible',
      hidden: isTr ? 'Gizli' : 'Hidden',
      itemName: isTr ? 'Ürün Adı' : 'Item Name',
      price: isTr ? 'Fiyat (₺)' : 'Price (₺)',
      imageUrl: isTr ? 'Görsel URL (opsiyonel)' : 'Image URL (optional)',
      badges: isTr ? 'Etiketler' : 'Badges',
      available: isTr ? 'Satışta' : 'Available',
      outOfStock: isTr ? 'Tükendi' : 'Out of stock',
      cancel: isTr ? 'İptal' : 'Cancel',
      save: isTr ? 'Kaydet' : 'Save',
      delete: isTr ? 'Sil' : 'Delete',
      deleteCategoryConfirm: isTr
        ? 'Bu kategori silinecek. Emin misiniz? (Aktif ürünler varsa silinemez.)'
        : 'Delete this category? (Cannot delete if it has active items.)',
      deleteItemConfirm: isTr ? 'Bu ürün silinsin mi?' : 'Delete this item?',
      publish: isTr ? 'Yayına Al' : 'Publish',
      unpublish: isTr ? 'Yayından Kaldır' : 'Unpublish',
      preview: isTr ? 'Önizle' : 'Preview',
      exitPreview: isTr ? 'Önizlemeden Çık' : 'Exit Preview',
      viewPublic: isTr ? 'Genel Sayfa' : 'Public Page',
      disabledByAdmin: isTr
        ? 'Menü özelliği yönetici tarafından kapatıldı. Yayınlayamazsınız.'
        : 'Menu feature disabled by admin. Publishing is blocked.',
      published: isTr ? 'Yayında' : 'Published',
      draft: isTr ? 'Taslak' : 'Draft',
      disabled: isTr ? 'Kapalı' : 'Disabled',
      lastUpdated: isTr ? 'Son güncelleme' : 'Last updated',
      menuDesign: isTr ? 'Menü Tasarımı' : 'Menu Design',
      themeLabel: isTr ? 'Tema' : 'Theme',
      themeClassic: isTr ? 'Klasik' : 'Classic',
      themeModern: isTr ? 'Modern' : 'Modern',
      themeElegant: isTr ? 'Şık' : 'Elegant',
      themeGastronomy: isTr ? 'Gastronomi' : 'Gastronomy',
      themeMinimal: isTr ? 'Minimal' : 'Minimal',
      themeBistro: isTr ? 'Bistro' : 'Bistro',
      accentColor: isTr ? 'Renk' : 'Accent Color',
      menuQr: isTr ? 'Menü QR' : 'Menu QR',
      downloadQr: isTr ? 'İndir' : 'Download',
      qrFormat: isTr ? 'Format' : 'Format',
      dragToReorder: isTr ? 'Sırala' : 'Reorder',
      analytics: isTr ? 'Analitik' : 'Analytics',
      logo: isTr ? 'Menü Logosu' : 'Menu Logo',
      logoHint: isTr ? 'Kare görsel önerilir. PNG veya WebP, 5 MB altı.' : 'Square image recommended. PNG or WebP, under 5 MB.',
      uploadImage: isTr ? 'Görsel Yükle' : 'Upload Image',
      uploading: isTr ? 'Yükleniyor…' : 'Uploading…',
      removeImage: isTr ? 'Kaldır' : 'Remove',
      orUrl: isTr ? 'veya URL' : 'or URL',
      toggleVisible: isTr ? 'Görünürlüğü değiştir' : 'Toggle visibility',
      toggleOutOfStock: isTr ? 'Stok durumunu değiştir' : 'Toggle out of stock',
    }),
    [isTr],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch(`/api/restaurants/${id}`),
        fetch(`/api/restaurants/${id}/menu/categories`),
      ]);
      if (!rRes.ok) throw new Error('Restoran yüklenemedi');
      if (!cRes.ok) throw new Error('Menü yüklenemedi');
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
  }, [id]);

  useEffect(() => {
    if (id) fetchAll();
  }, [id, fetchAll]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || null;

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  // ── Theme ops ──
  const saveTheme = async (patch: { menuTheme?: MenuTheme; menuAccentColor?: string | null; menuLogoUrl?: string | null }) => {
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

  // ── Quick toggles ──
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
    } catch (e) {
      // Revert on failure
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isVisible: !next } : c)));
      setError((e as Error).message);
    }
  };

  const toggleItemAvailability = async (item: MenuItemView) => {
    const next = !item.isAvailable;
    setCategories((prev) => prev.map((c) => ({
      ...c,
      items: c.items.map((i) => (i.id === item.id ? { ...i, isAvailable: next } : i)),
    })));
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: next }),
      });
      if (!res.ok) throw new Error('Değişiklik kaydedilemedi');
    } catch (e) {
      setCategories((prev) => prev.map((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === item.id ? { ...i, isAvailable: !next } : i)),
      })));
      setError((e as Error).message);
    }
  };

  const toggleItemOutOfStock = async (item: MenuItemView) => {
    const next = !item.isOutOfStock;
    setCategories((prev) => prev.map((c) => ({
      ...c,
      items: c.items.map((i) => (i.id === item.id ? { ...i, isOutOfStock: next } : i)),
    })));
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOutOfStock: next }),
      });
      if (!res.ok) throw new Error('Değişiklik kaydedilemedi');
    } catch (e) {
      setCategories((prev) => prev.map((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === item.id ? { ...i, isOutOfStock: !next } : i)),
      })));
      setError((e as Error).message);
    }
  };

  // ── Category ops ──
  const saveCategory = async (payload: Partial<CategoryShape>) => {
    if (!categoryModal) return;
    setBusy(true);
    setError(null);
    try {
      const url =
        categoryModal.mode === 'create'
          ? `/api/restaurants/${id}/menu/categories`
          : `/api/restaurants/${id}/menu/categories/${categoryModal.data.id}`;
      const method = categoryModal.mode === 'create' ? 'POST' : 'PATCH';
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
      setCategoryModal(null);
      await fetchAll();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm(copy.deleteCategoryConfirm)) return;
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/categories/${categoryId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Silinemedi');
      await fetchAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reorderCategories = async (newOrder: CategoryShape[]) => {
    // Optimistic state update; server returns 200 without a body so no refetch
    // needed on success. Only refetch on failure to revert to canonical order.
    setCategories(newOrder);
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

  const onCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(categories, oldIndex, newIndex);
    await reorderCategories(next);
  };

  // ── Item ops ──
  const saveItem = async (payload: Partial<MenuItemView> & { categoryId?: string }) => {
    if (!itemModal) return;
    setBusy(true);
    setError(null);
    try {
      const url =
        itemModal.mode === 'create'
          ? `/api/restaurants/${id}/menu/items`
          : `/api/restaurants/${id}/menu/items/${itemModal.data.id}`;
      const method = itemModal.mode === 'create' ? 'POST' : 'PATCH';
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
          isAvailable: payload.isAvailable ?? true,
          isOutOfStock: payload.isOutOfStock ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      setItemModal(null);
      await fetchAll();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm(copy.deleteItemConfirm)) return;
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${id}/menu/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Silinemedi');
      }
      await fetchAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reorderItems = async (categoryId: string, newOrder: MenuItemView[]) => {
    const nextCats = categories.map((c) => (c.id === categoryId ? { ...c, items: newOrder } : c));
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

  const onItemDragEnd = async (event: DragEndEvent) => {
    if (!activeCategory) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = activeCategory.items;
    const oldIndex = items.findIndex((it) => it.id === active.id);
    const newIndex = items.findIndex((it) => it.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    await reorderItems(activeCategory.id, arrayMove(items, oldIndex, newIndex));
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }
  if (!restaurant) {
    return (
      <div className="p-10 text-center text-sm font-bold text-red-600">{error ?? 'Yüklenemedi'}</div>
    );
  }

  const status = !restaurant.menuEnabled
    ? { label: copy.disabled, cls: 'bg-[#EDEDED] text-[#6B7280] border-[#EDEDED]' }
    : restaurant.menuPublished
    ? { label: copy.published, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : { label: copy.draft, cls: 'bg-amber-50 text-amber-700 border-amber-200' };

  if (previewMode) {
    return (
      <div className="min-h-full">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#EDEDED] bg-[#0A0A0A] px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C6F24E]">{copy.preview}</p>
            <p className="truncate text-sm font-semibold">{restaurant.name}</p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/dashboard/restaurants/${id}/menu`)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-white/20 active:scale-95"
          >
            <X size={14} strokeWidth={2} />
            {copy.exitPreview}
          </button>
        </div>
        <PublicMenuView restaurant={restaurant} categories={categories} locale={locale} disableAnalytics />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <Link
              href={`/${locale}/dashboard/menu`}
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#1A1A1A] hover:text-[#0A0A0A]"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              {copy.backToMenus}
            </Link>
            <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-[#0A0A0A] sm:text-3xl">
              <UtensilsCrossed size={22} strokeWidth={2} />
              {restaurant.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 ${status.cls}`}>{status.label}</span>
              {restaurant.menuUpdatedAt && (
                <span className="text-[#6B7280]">· {copy.lastUpdated}: {new Date(restaurant.menuUpdatedAt).toLocaleString(isTr ? 'tr-TR' : 'en-US')}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/dashboard/restaurants/${id}/menu?preview=1`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#FFFFFF] active:scale-95"
            >
              <Eye size={14} strokeWidth={2} />
              {copy.preview}
            </Link>
            <button
              onClick={() => setQrModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#FFFFFF] active:scale-95"
            >
              <QrCode size={14} strokeWidth={2} />
              {copy.menuQr}
            </button>
            <Link
              href={`/${locale}/dashboard/restaurants/${id}/menu/analytics`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#FFFFFF] active:scale-95"
            >
              <BarChart3 size={14} strokeWidth={2} />
              {copy.analytics}
            </Link>
            {restaurant.menuPublished && (
              <Link
                href={`/menu/${restaurant.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#FFFFFF] active:scale-95"
              >
                <ChevronRight size={14} strokeWidth={2} />
                {copy.viewPublic}
              </Link>
            )}
            <button
              onClick={togglePublish}
              disabled={publishBusy || !restaurant.menuEnabled}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
                restaurant.menuPublished
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]'
              }`}
            >
              {publishBusy ? <Loader2 size={14} className="animate-spin" /> : restaurant.menuPublished ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
              {restaurant.menuPublished ? copy.unpublish : copy.publish}
            </button>
          </div>
        </div>
        {!restaurant.menuEnabled && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            {copy.disabledByAdmin}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          {error}
        </div>
      )}

      {/* Menu Design (theme + accent color + logo) */}
      <ThemePanel
        restaurant={restaurant}
        copy={copy}
        saving={themeSaving}
        onChange={saveTheme}
        onUploadLogo={uploadLogo}
      />

      {/* Two-pane builder */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Categories */}
        <section className="rounded-2xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EDEDED] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">{copy.categories}</h2>
            <button
              onClick={() => setCategoryModal({ mode: 'create', data: { isVisible: true } })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C6F24E] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#C6F24E] active:scale-95"
            >
              <Plus size={12} strokeWidth={2} />
              {copy.addCategory}
            </button>
          </div>
          {categories.length === 0 ? (
            <div className="p-5 text-center text-xs font-bold text-[#1A1A1A]">{copy.noCategories}</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
              <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-[#EDEDED]">
                  {categories.map((c, idx) => (
                    <SortableCategoryRow
                      key={c.id}
                      category={c}
                      isActive={c.id === activeCategoryId}
                      isFirst={idx === 0}
                      isLast={idx === categories.length - 1}
                      isTr={isTr}
                      copy={copy}
                      onSelect={() => setActiveCategoryId(c.id)}
                      onMoveUp={() => moveCategory(idx, -1)}
                      onMoveDown={() => moveCategory(idx, 1)}
                      onToggleVisible={() => toggleCategoryVisibility(c)}
                      onEdit={() => setCategoryModal({ mode: 'edit', data: c })}
                      onDelete={() => deleteCategory(c.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {/* Items */}
        <section className="rounded-2xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-[#EDEDED] p-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">
                {activeCategory ? activeCategory.name : copy.items}
              </h2>
              {activeCategory?.description && (
                <p className="mt-1 truncate text-[11px] font-bold text-[#1A1A1A]">{activeCategory.description}</p>
              )}
            </div>
            {activeCategory && (
              <button
                onClick={() => setItemModal({ mode: 'create', data: { categoryId: activeCategory.id, isAvailable: true, isOutOfStock: false, badges: [], priceCents: 0 } })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A0A0A] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white shadow-sm hover:bg-[#1A1A1A] active:scale-95"
              >
                <Plus size={12} strokeWidth={2} />
                {copy.addItem}
              </button>
            )}
          </div>
          {!activeCategory ? (
            <div className="p-10 text-center text-xs font-bold text-[#1A1A1A]">{copy.noCategorySelected}</div>
          ) : activeCategory.items.length === 0 ? (
            <div className="p-10 text-center text-xs font-bold text-[#1A1A1A]">{copy.noItems}</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemDragEnd}>
              <SortableContext items={activeCategory.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-[#EDEDED]">
                  {activeCategory.items.map((item, idx) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      idx={idx}
                      isFirst={idx === 0}
                      isLast={idx === activeCategory.items.length - 1}
                      isTr={isTr}
                      locale={locale}
                      copy={copy}
                      onMoveUp={() => moveItem(idx, -1)}
                      onMoveDown={() => moveItem(idx, 1)}
                      onToggleAvailable={() => toggleItemAvailability(item)}
                      onToggleOutOfStock={() => toggleItemOutOfStock(item)}
                      onEdit={() => setItemModal({ mode: 'edit', data: { ...item, categoryId: activeCategory.id } })}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>

      {/* Category Modal */}
      {categoryModal && (
        <CategoryModal
          mode={categoryModal.mode}
          data={categoryModal.data}
          copy={copy}
          busy={busy}
          onClose={() => setCategoryModal(null)}
          onSave={saveCategory}
        />
      )}

      {/* Item Modal */}
      {itemModal && (
        <ItemModal
          mode={itemModal.mode}
          data={itemModal.data}
          categories={categories}
          copy={copy}
          busy={busy}
          locale={locale}
          restaurantId={id}
          onClose={() => setItemModal(null)}
          onSave={saveItem}
        />
      )}

      {/* Menu QR Modal */}
      {qrModal && (
        <MenuQrModal
          restaurantId={id}
          slug={restaurant.slug}
          copy={copy}
          onClose={() => setQrModal(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Modals

function CategoryModal({
  mode, data, copy, busy, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  data: Partial<CategoryShape>;
  copy: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Partial<CategoryShape>) => void;
}) {
  const [name, setName] = useState(data.name ?? '');
  const [description, setDescription] = useState(data.description ?? '');
  const [isVisible, setIsVisible] = useState(data.isVisible ?? true);

  return (
    <Modal title={mode === 'create' ? copy.addCategory : copy.editCategory} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ id: data.id, name: name.trim(), description: description.trim() || null, isVisible });
        }}
        className="space-y-5"
      >
        <Field label={copy.categoryName}>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C6F24E]"
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C6F24E]"
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3">
          <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} className="h-4 w-4 accent-[#C6F24E]" />
          <span className="text-sm font-bold text-[#0A0A0A]">{copy.visible}</span>
        </label>
        <ModalActions busy={busy} copy={copy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function ItemModal({
  mode, data, categories, copy, busy, locale, restaurantId, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  data: Partial<MenuItemView> & { categoryId?: string };
  categories: CategoryShape[];
  copy: Record<string, string>;
  busy: boolean;
  locale: Locale;
  restaurantId: string;
  onClose: () => void;
  onSave: (payload: Partial<MenuItemView> & { categoryId?: string }) => void;
}) {
  const [categoryId, setCategoryId] = useState(data.categoryId ?? categories[0]?.id ?? '');
  const [name, setName] = useState(data.name ?? '');
  const [description, setDescription] = useState(data.description ?? '');
  const [priceInput, setPriceInput] = useState(data.priceCents ? (data.priceCents / 100).toFixed(2) : '0');
  const [imageUrl, setImageUrl] = useState(data.imageUrl ?? '');
  const [badges, setBadges] = useState<string[]>(data.badges ?? []);
  const [isAvailable, setIsAvailable] = useState(data.isAvailable ?? true);
  const [isOutOfStock, setIsOutOfStock] = useState(data.isOutOfStock ?? false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleBadge = (b: string) => {
    setBadges((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const handleFilePick = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError(locale === 'tr' ? 'Sadece görsel dosyası yükleyebilirsiniz.' : 'Only image files allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError(locale === 'tr' ? 'Görsel 5 MB\'dan büyük olamaz.' : 'Image must be under 5 MB.');
      return;
    }
    setUploading(true);
    setFormError(null);
    try {
      // Client-side compression cuts upload time ~80% for heavy phone photos.
      const compressed = await compressImage(file, { maxDim: 1600, quality: 0.85 });
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('kind', 'item');
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/upload`, { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Görsel yüklenemedi');
      setImageUrl(body.url);
    } catch (e) {
      setFormError((e as Error).message);
    }
    setUploading(false);
  };

  return (
    <Modal title={mode === 'create' ? copy.addItem : copy.editItem} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const cents = parsePriceInput(priceInput);
          if (cents === null) {
            setFormError(locale === 'tr' ? 'Geçersiz fiyat' : 'Invalid price');
            return;
          }
          setFormError(null);
          onSave({
            id: data.id,
            categoryId,
            name: name.trim(),
            description: description.trim() || null,
            priceCents: cents,
            imageUrl: imageUrl.trim() || null,
            badges,
            isAvailable,
            isOutOfStock,
          });
        }}
        className="space-y-5"
      >
        <Field label={locale === 'tr' ? 'Kategori' : 'Category'}>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C6F24E]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label={copy.itemName}>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C6F24E]"
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C6F24E]"
          />
        </Field>
        <Field label={copy.price}>
          <input
            required
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#C6F24E]"
          />
        </Field>
        <Field label={copy.imageUrl}>
          <div className="flex gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#EDEDED] bg-[#FFFFFF]">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#6B7280]">
                  <ImageIcon size={22} strokeWidth={2} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0A0A0A] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white shadow-sm hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} strokeWidth={2} />}
                  {uploading ? copy.uploading : copy.uploadImage}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#1A1A1A] hover:bg-[#FFFFFF] active:scale-95"
                  >
                    <X size={12} strokeWidth={2} />
                    {copy.removeImage}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFilePick(f);
                  e.target.value = '';
                }}
              />
              <input
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={copy.orUrl + ' · https://...'}
                className="w-full rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#C6F24E]"
              />
            </div>
          </div>
        </Field>
        <Field label={copy.badges}>
          <div className="flex flex-wrap gap-2">
            {MENU_BADGES.map((b) => {
              const active = badges.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBadge(b)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest transition-all ${
                    active ? 'border-[#C6F24E] bg-[#C6F24E] text-[#0A0A0A]' : 'border-[#EDEDED] bg-white text-[#1A1A1A] hover:bg-[#FFFFFF]'
                  }`}
                >
                  {active && <Check size={10} strokeWidth={2} />}
                  {BADGE_LABELS[b][locale]}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="h-4 w-4 accent-[#C6F24E]" />
            <span className="text-sm font-bold text-[#0A0A0A]">{copy.available}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] px-4 py-3">
            <input type="checkbox" checked={isOutOfStock} onChange={(e) => setIsOutOfStock(e.target.checked)} className="h-4 w-4 accent-red-500" />
            <span className="text-sm font-bold text-[#0A0A0A]">{copy.outOfStock}</span>
          </label>
        </div>
        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{formError}</div>
        )}
        <ModalActions busy={busy} copy={copy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-6">
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[#EDEDED] bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-2xl sm:pb-0">
        <div className="relative border-b border-[#EDEDED] bg-[#FFFFFF] p-5 sm:p-7">
          <h2 className="pr-10 text-xl font-semibold uppercase tracking-tight text-[#0A0A0A] sm:text-2xl">{title}</h2>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-[#6B7280] transition-all hover:bg-[#EDEDED] hover:text-[#0A0A0A]"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ busy, copy, onClose }: { busy: boolean; copy: Record<string, string>; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-3 border-t-2 border-[#FFFFFF] pt-5">
      <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] hover:text-[#0A0A0A]">
        {copy.cancel}
      </button>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-[#0A0A0A] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
        {copy.save}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sortable rows

function SortableCategoryRow({
  category, isActive, isFirst, isLast, isTr, copy,
  onSelect, onMoveUp, onMoveDown, onToggleVisible, onEdit, onDelete,
}: {
  category: CategoryShape;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  isTr: boolean;
  copy: Record<string, string>;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 p-3 text-sm transition-all ${isActive ? 'bg-[#C6F24E]/15' : 'hover:bg-[#FFFFFF]'} ${isDragging ? 'z-10 shadow-lg' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={copy.dragToReorder}
        className="cursor-grab touch-none rounded-lg p-1 text-[#6B7280] hover:bg-[#EDEDED] active:cursor-grabbing"
      >
        <GripVertical size={14} strokeWidth={2} />
      </button>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#0A0A0A]">{category.name}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">
            {category.items.length} {isTr ? 'ürün' : 'items'}
            {!category.isVisible && <span className="ml-1 text-amber-600">· {copy.hidden}</span>}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 items-center">
        <button onClick={onMoveUp} disabled={isFirst} className="rounded-lg p-1 text-[#1A1A1A] hover:bg-[#EDEDED] disabled:opacity-30" title="Up">
          <ArrowUp size={14} strokeWidth={2} />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="rounded-lg p-1 text-[#1A1A1A] hover:bg-[#EDEDED] disabled:opacity-30" title="Down">
          <ArrowDown size={14} strokeWidth={2} />
        </button>
        <button
          onClick={onToggleVisible}
          className={`rounded-lg p-1 hover:bg-[#EDEDED] ${category.isVisible ? 'text-[#1A1A1A]' : 'text-amber-600'}`}
          title={copy.toggleVisible}
        >
          {category.isVisible ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
        </button>
        <button onClick={onEdit} className="rounded-lg p-1 text-[#1A1A1A] hover:bg-[#EDEDED]" title={copy.editCategory}>
          <Edit2 size={14} strokeWidth={2} />
        </button>
        <button onClick={onDelete} className="rounded-lg p-1 text-red-500 hover:bg-red-50" title={copy.delete}>
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}

function SortableItemRow({
  item, isFirst, isLast, isTr, locale, copy,
  onMoveUp, onMoveDown, onToggleAvailable, onToggleOutOfStock, onEdit, onDelete,
}: {
  item: MenuItemView;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  isTr: boolean;
  locale: Locale;
  copy: Record<string, string>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleAvailable: () => void;
  onToggleOutOfStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 sm:gap-3 sm:p-4 ${isDragging ? 'z-10 bg-white shadow-lg' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={copy.dragToReorder}
        className="cursor-grab touch-none rounded-lg p-1 text-[#6B7280] hover:bg-[#EDEDED] active:cursor-grabbing"
      >
        <GripVertical size={14} strokeWidth={2} />
      </button>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#EDEDED]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#6B7280]">
            <ImageIcon size={18} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[#0A0A0A]">{item.name}</p>
          {!item.isAvailable && (
            <span className="rounded-full bg-[#EDEDED] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#6B7280]">{copy.hidden}</span>
          )}
          {item.isOutOfStock && (
            <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-600">{copy.outOfStock}</span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] font-bold text-[#1A1A1A]">
          {formatPrice(item.priceCents, item.currency, isTr ? 'tr-TR' : 'en-US')}
          {item.badges.length > 0 && (
            <span className="ml-2 text-[#6B7280]">· {item.badges.map((b) => BADGE_LABELS[b as MenuBadge]?.[locale] || b).join(', ')}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        <button onClick={onMoveUp} disabled={isFirst} className="rounded-lg p-1.5 text-[#1A1A1A] hover:bg-[#EDEDED] disabled:opacity-30">
          <ArrowUp size={14} strokeWidth={2} />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="rounded-lg p-1.5 text-[#1A1A1A] hover:bg-[#EDEDED] disabled:opacity-30">
          <ArrowDown size={14} strokeWidth={2} />
        </button>
        <button
          onClick={onToggleAvailable}
          className={`rounded-lg p-1.5 hover:bg-[#EDEDED] ${item.isAvailable ? 'text-[#1A1A1A]' : 'text-amber-600'}`}
          title={copy.toggleVisible}
        >
          {item.isAvailable ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
        </button>
        <button
          onClick={onToggleOutOfStock}
          className={`rounded-lg p-1.5 hover:bg-[#EDEDED] ${item.isOutOfStock ? 'text-red-500' : 'text-[#1A1A1A]'}`}
          title={copy.toggleOutOfStock}
        >
          <AlertTriangle size={14} strokeWidth={2} />
        </button>
        <button onClick={onEdit} className="rounded-lg p-1.5 text-[#1A1A1A] hover:bg-[#EDEDED]">
          <Edit2 size={14} strokeWidth={2} />
        </button>
        <button onClick={onDelete} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Theme panel

const THEME_SWATCHES = ['#C6F24E', '#E85A4F', '#0A0A0A', '#0E7C66', '#8B5CF6', '#EC4899', '#0EA5E9', '#8CB81E'];

function ThemePanel({
  restaurant, copy, saving, onChange, onUploadLogo,
}: {
  restaurant: RestaurantShape;
  copy: Record<string, string>;
  saving: boolean;
  onChange: (patch: { menuTheme?: MenuTheme; menuAccentColor?: string | null; menuLogoUrl?: string | null }) => void;
  onUploadLogo: (file: File) => void;
}) {
  const themes: { id: MenuTheme; label: string }[] = [
    { id: 'classic', label: copy.themeClassic },
    { id: 'modern', label: copy.themeModern },
    { id: 'elegant', label: copy.themeElegant },
    { id: 'gastronomy', label: copy.themeGastronomy },
    { id: 'minimal', label: copy.themeMinimal },
    { id: 'bistro', label: copy.themeBistro },
  ];
  const currentAccent = restaurant.menuAccentColor ?? restaurant.primaryColor ?? '#C6F24E';
  const logoFileRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">{copy.menuDesign}</h2>
        {saving && <Loader2 size={14} className="animate-spin text-[#6B7280]" />}
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">{copy.themeLabel}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {themes.map((t) => {
              const active = restaurant.menuTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onChange({ menuTheme: t.id })}
                  className={`group flex flex-col items-stretch gap-2 rounded-2xl border-2 p-2 text-left transition-all ${
                    active ? 'border-[#C6F24E] bg-[#C6F24E]/5 shadow-sm' : 'border-[#EDEDED] hover:border-[#1A1A1A]'
                  }`}
                >
                  <ThemeThumb theme={t.id} accent={currentAccent} />
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0A0A0A]">{t.label}</span>
                    {active && <Check size={12} strokeWidth={3} className="text-[#C6F24E]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">{copy.accentColor}</p>
          <div className="flex flex-wrap items-center gap-2">
            {THEME_SWATCHES.map((c) => {
              const active = currentAccent.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => onChange({ menuAccentColor: c })}
                  style={{ backgroundColor: c }}
                  className={`h-9 w-9 rounded-full border-2 transition-all active:scale-90 ${active ? 'border-[#0A0A0A] ring-2 ring-[#C6F24E] ring-offset-2' : 'border-white shadow-sm hover:scale-110'}`}
                  title={c}
                />
              );
            })}
            <label className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#1A1A1A] hover:bg-[#FFFFFF]">
              <input
                type="color"
                value={currentAccent}
                onChange={(e) => onChange({ menuAccentColor: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span className="text-[9px] font-semibold uppercase text-[#1A1A1A]">+</span>
            </label>
            {restaurant.menuAccentColor && (
              <button
                onClick={() => onChange({ menuAccentColor: null })}
                className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#6B7280] hover:bg-[#FFFFFF]"
              >
                <X size={10} strokeWidth={2} />
                reset
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">{copy.logo}</p>
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#EDEDED] bg-[#FFFFFF]">
              {restaurant.menuLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.menuLogoUrl} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#6B7280]" style={{ color: currentAccent }}>
                  <UtensilsCrossed size={22} strokeWidth={2} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0A0A0A] px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-white shadow-sm hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
                >
                  <ImageIcon size={12} strokeWidth={2} />
                  {copy.uploadImage}
                </button>
                {restaurant.menuLogoUrl && (
                  <button
                    type="button"
                    onClick={() => onChange({ menuLogoUrl: null })}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#1A1A1A] hover:bg-[#FFFFFF] active:scale-95"
                  >
                    <X size={12} strokeWidth={2} />
                    {copy.removeImage}
                  </button>
                )}
              </div>
              <p className="text-[10px] font-medium text-[#6B7280]">{copy.logoHint}</p>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadLogo(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ThemeThumb({ theme, accent }: { theme: MenuTheme; accent: string }) {
  if (theme === 'classic') {
    return (
      <div className="relative h-20 overflow-hidden rounded-xl border border-[#EDEDED] bg-[#FFFFFF]">
        <div className="h-6 w-full" style={{ backgroundColor: accent }} />
        <div className="space-y-1.5 p-2">
          <div className="h-1.5 w-2/3 rounded bg-[#0A0A0A]/80" />
          <div className="h-1 w-full rounded bg-[#6B7280]/30" />
          <div className="h-1 w-4/5 rounded bg-[#6B7280]/30" />
        </div>
      </div>
    );
  }
  if (theme === 'modern') {
    return (
      <div className="relative grid h-20 grid-cols-3 gap-1 overflow-hidden rounded-xl border border-[#EDEDED] bg-[#FFFFFF] p-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded bg-white shadow-sm" style={{ borderBottom: `2px solid ${accent}` }} />
        ))}
      </div>
    );
  }
  if (theme === 'elegant') {
    return (
      <div className="relative flex h-20 flex-col gap-1.5 overflow-hidden rounded-xl border border-[#EDEDED] bg-white p-2">
        <div className="mx-auto h-0.5 w-8 rounded" style={{ backgroundColor: accent }} />
        <div className="mx-auto h-1.5 w-1/2 rounded bg-[#0A0A0A]" />
        <div className="mt-1 h-px w-full bg-[#EDEDED]" />
        <div className="mt-1 space-y-1">
          <div className="h-1 w-full rounded bg-[#6B7280]/30" />
          <div className="h-1 w-4/5 rounded bg-[#6B7280]/30" />
        </div>
      </div>
    );
  }
  if (theme === 'minimal') {
    return (
      <div className="relative h-20 overflow-hidden rounded-xl border border-[#EDEDED] bg-white p-2">
        <div className="flex items-center gap-1">
          <div className="h-1 flex-1 rounded bg-[#0A0A0A]" />
          <div className="h-1 w-6 rounded" style={{ backgroundColor: accent }} />
        </div>
        <div className="mt-2 space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-0.5 flex-1 rounded bg-[#6B7280]/30" />
              <div className="h-0.5 w-6 rounded" style={{ backgroundColor: accent, opacity: 0.7 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (theme === 'bistro') {
    return (
      <div className="relative grid h-20 grid-cols-2 gap-1 overflow-hidden rounded-xl border border-[#E8E0D2] p-1.5" style={{ backgroundColor: '#FAF7F0' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-white shadow-sm"
            style={{ borderBottom: `2px solid ${accent}` }}
          />
        ))}
      </div>
    );
  }
  // gastronomy
  return (
    <div className="relative h-20 overflow-hidden rounded-xl border border-[#000000] bg-[#000000] p-2">
      <div className="h-1.5 w-1/3 rounded" style={{ backgroundColor: accent }} />
      <div className="mt-2 h-1 w-2/3 rounded bg-white/80" />
      <div className="mt-1 h-1 w-full rounded bg-white/30" />
      <div className="mt-1 h-1 w-4/5 rounded bg-white/30" />
      <div className="mt-2 h-1 w-1/4 rounded" style={{ backgroundColor: accent }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Menu QR modal

function MenuQrModal({
  restaurantId, slug, copy, onClose,
}: {
  restaurantId: string;
  slug: string;
  copy: Record<string, string>;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const previewAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    previewAbort.current?.abort();
    const ctrl = new AbortController();
    previewAbort.current = ctrl;
    setErr(null);
    setPreviewSvg(null);
    fetch(`/api/restaurants/${restaurantId}/menu/qr?format=svg&width=400`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? 'QR oluşturulamadı');
        }
        return res.text();
      })
      .then((svg) => setPreviewSvg(svg))
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setErr((e as Error).message);
      });
    return () => ctrl.abort();
  }, [restaurantId]);

  const download = async () => {
    setDownloading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/qr?format=${format}`);
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error ?? 'QR indirilemedi');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menu-qr-${slug}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr((e as Error).message);
    }
    setDownloading(false);
  };

  return (
    <Modal title={copy.menuQr} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] p-4 sm:p-6">
          {previewSvg ? (
            <div
              className="aspect-square w-full max-w-[240px] [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          ) : err ? (
            <p className="py-20 text-xs font-bold text-red-600">{err}</p>
          ) : (
            <div className="flex aspect-square w-full max-w-[240px] items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#6B7280]" />
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">{copy.qrFormat}</p>
          <div className="flex gap-2">
            {(['png', 'svg'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all ${
                  format === f ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-[#EDEDED] bg-white text-[#0A0A0A] hover:bg-[#FFFFFF]'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t-2 border-[#FFFFFF] pt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] hover:text-[#0A0A0A]"
          >
            {copy.cancel}
          </button>
          <button
            onClick={download}
            disabled={downloading || !previewSvg}
            className="inline-flex items-center gap-2 rounded-xl bg-[#C6F24E] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#D7F98E] active:scale-95 disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
            {copy.downloadQr}
          </button>
        </div>
      </div>
    </Modal>
  );
}
