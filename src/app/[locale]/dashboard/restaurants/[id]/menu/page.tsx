'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowDown, ArrowUp, Check, ChevronRight, Edit2, Eye, EyeOff, Image as ImageIcon,
  Loader2, Plus, Save, Trash2, UtensilsCrossed, X,
} from 'lucide-react';
import PublicMenuView, { type MenuCategoryView, type MenuItemView, type RestaurantView } from '@/components/menu/PublicMenuView';
import { MENU_BADGES, type MenuBadge } from '@/lib/validations';
import { formatPrice, parsePriceInput } from '@/lib/format';
import type { Locale } from '@/lib/translations';

interface RestaurantShape extends RestaurantView {
  menuEnabled: boolean;
  menuPublished: boolean;
  menuUpdatedAt: string | null;
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
        primaryColor: r.primaryColor ?? '#F4B400',
        menuEnabled: r.menuEnabled ?? true,
        menuPublished: r.menuPublished ?? false,
        menuUpdatedAt: r.menuUpdatedAt ?? null,
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

  const moveCategory = async (index: number, dir: -1 | 1) => {
    const target = categories[index + dir];
    const current = categories[index];
    if (!target || !current) return;
    const payload = {
      categories: [
        { id: current.id, sortOrder: target.sortOrder },
        { id: target.id, sortOrder: current.sortOrder },
      ],
    };
    const next = [...categories];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    setCategories(next);
    await fetch(`/api/restaurants/${id}/menu/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await fetchAll();
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

  const moveItem = async (index: number, dir: -1 | 1) => {
    if (!activeCategory) return;
    const items = activeCategory.items;
    const target = items[index + dir];
    const current = items[index];
    if (!target || !current) return;
    const payload = {
      items: [
        { id: current.id, sortOrder: target.sortOrder },
        { id: target.id, sortOrder: current.sortOrder },
      ],
    };
    const nextCats = categories.map((c) => {
      if (c.id !== activeCategory.id) return c;
      const list = [...c.items];
      [list[index], list[index + dir]] = [list[index + dir], list[index]];
      return { ...c, items: list };
    });
    setCategories(nextCats);
    await fetch(`/api/restaurants/${id}/menu/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await fetchAll();
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
        <Loader2 className="h-8 w-8 animate-spin text-[#1A2332]" />
      </div>
    );
  }
  if (!restaurant) {
    return (
      <div className="p-10 text-center text-sm font-bold text-red-600">{error ?? 'Yüklenemedi'}</div>
    );
  }

  const status = !restaurant.menuEnabled
    ? { label: copy.disabled, cls: 'bg-gray-100 text-gray-500 border-[#E8ECF2]' }
    : restaurant.menuPublished
    ? { label: copy.published, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : { label: copy.draft, cls: 'bg-amber-50 text-amber-700 border-amber-200' };

  if (previewMode) {
    return (
      <div className="min-h-full">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#E8ECF2] bg-[#1A2332] px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#F4B400]">{copy.preview}</p>
            <p className="truncate text-sm font-black">{restaurant.name}</p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/dashboard/restaurants/${id}/menu`)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/20 active:scale-95"
          >
            <X size={14} strokeWidth={2} />
            {copy.exitPreview}
          </button>
        </div>
        <PublicMenuView restaurant={restaurant} categories={categories} locale={locale} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-[24px] border border-[#E8ECF2] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <Link
              href={`/${locale}/dashboard/menu`}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#2A3444] hover:text-[#1A2332]"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              {copy.backToMenus}
            </Link>
            <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-[#1A2332] sm:text-3xl">
              <UtensilsCrossed size={22} strokeWidth={2} />
              {restaurant.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#2A3444]">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 ${status.cls}`}>{status.label}</span>
              {restaurant.menuUpdatedAt && (
                <span className="text-[#6B7280]">· {copy.lastUpdated}: {new Date(restaurant.menuUpdatedAt).toLocaleString(isTr ? 'tr-TR' : 'en-US')}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/dashboard/restaurants/${id}/menu?preview=1`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E8ECF2] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#1A2332] shadow-sm hover:bg-gray-50 active:scale-95"
            >
              <Eye size={14} strokeWidth={2} />
              {copy.preview}
            </Link>
            {restaurant.menuPublished && (
              <Link
                href={`/menu/${restaurant.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E8ECF2] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#1A2332] shadow-sm hover:bg-gray-50 active:scale-95"
              >
                <ChevronRight size={14} strokeWidth={2} />
                {copy.viewPublic}
              </Link>
            )}
            <button
              onClick={togglePublish}
              disabled={publishBusy || !restaurant.menuEnabled}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
                restaurant.menuPublished
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-[#1A2332] text-white hover:bg-gray-800'
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

      {/* Two-pane builder */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Categories */}
        <section className="rounded-[24px] border border-[#E8ECF2] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E8ECF2] p-4">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-[#1A2332]">{copy.categories}</h2>
            <button
              onClick={() => setCategoryModal({ mode: 'create', data: { isVisible: true } })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4B400] px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#1A2332] shadow-sm hover:bg-[#F4B400] active:scale-95"
            >
              <Plus size={12} strokeWidth={2} />
              {copy.addCategory}
            </button>
          </div>
          {categories.length === 0 ? (
            <div className="p-5 text-center text-xs font-bold text-[#2A3444]">{copy.noCategories}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {categories.map((c, idx) => {
                const isActive = c.id === activeCategoryId;
                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-2 p-3 text-sm transition-all ${isActive ? 'bg-[#F4B400]/15' : 'hover:bg-gray-50'}`}
                  >
                    <button
                      onClick={() => setActiveCategoryId(c.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-[#1A2332]">{c.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">
                          {c.items.length} {isTr ? 'ürün' : 'items'}
                          {!c.isVisible && <span className="ml-1 text-amber-600">· {copy.hidden}</span>}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center">
                      <button
                        onClick={() => moveCategory(idx, -1)}
                        disabled={idx === 0}
                        className="rounded-lg p-1 text-[#2A3444] hover:bg-gray-100 disabled:opacity-30"
                        title="Up"
                      >
                        <ArrowUp size={14} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => moveCategory(idx, 1)}
                        disabled={idx === categories.length - 1}
                        className="rounded-lg p-1 text-[#2A3444] hover:bg-gray-100 disabled:opacity-30"
                        title="Down"
                      >
                        <ArrowDown size={14} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => setCategoryModal({ mode: 'edit', data: c })}
                        className="rounded-lg p-1 text-[#2A3444] hover:bg-gray-100"
                        title={copy.editCategory}
                      >
                        <Edit2 size={14} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => deleteCategory(c.id)}
                        className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                        title={copy.delete}
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Items */}
        <section className="rounded-[24px] border border-[#E8ECF2] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-[#E8ECF2] p-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-extrabold uppercase tracking-widest text-[#1A2332]">
                {activeCategory ? activeCategory.name : copy.items}
              </h2>
              {activeCategory?.description && (
                <p className="mt-1 truncate text-[11px] font-bold text-[#2A3444]">{activeCategory.description}</p>
              )}
            </div>
            {activeCategory && (
              <button
                onClick={() => setItemModal({ mode: 'create', data: { categoryId: activeCategory.id, isAvailable: true, isOutOfStock: false, badges: [], priceCents: 0 } })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A2332] px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-gray-800 active:scale-95"
              >
                <Plus size={12} strokeWidth={2} />
                {copy.addItem}
              </button>
            )}
          </div>
          {!activeCategory ? (
            <div className="p-10 text-center text-xs font-bold text-[#2A3444]">{copy.noCategorySelected}</div>
          ) : activeCategory.items.length === 0 ? (
            <div className="p-10 text-center text-xs font-bold text-[#2A3444]">{copy.noItems}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activeCategory.items.map((item, idx) => (
                <li key={item.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <ImageIcon size={18} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-[#1A2332]">{item.name}</p>
                      {!item.isAvailable && (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-gray-500">{copy.hidden}</span>
                      )}
                      {item.isOutOfStock && (
                        <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-600">{copy.outOfStock}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] font-bold text-[#2A3444]">
                      {formatPrice(item.priceCents, item.currency, isTr ? 'tr-TR' : 'en-US')}
                      {item.badges.length > 0 && (
                        <span className="ml-2 text-[#6B7280]">· {item.badges.map((b) => BADGE_LABELS[b as MenuBadge]?.[locale] || b).join(', ')}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="rounded-lg p-1.5 text-[#2A3444] hover:bg-gray-100 disabled:opacity-30">
                      <ArrowUp size={14} strokeWidth={2} />
                    </button>
                    <button onClick={() => moveItem(idx, 1)} disabled={idx === activeCategory.items.length - 1} className="rounded-lg p-1.5 text-[#2A3444] hover:bg-gray-100 disabled:opacity-30">
                      <ArrowDown size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => setItemModal({ mode: 'edit', data: { ...item, categoryId: activeCategory.id } })}
                      className="rounded-lg p-1.5 text-[#2A3444] hover:bg-gray-100"
                    >
                      <Edit2 size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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
          onClose={() => setItemModal(null)}
          onSave={saveItem}
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
            className="w-full rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#F4B400]"
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#F4B400]"
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3">
          <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} className="h-4 w-4 accent-[#F4B400]" />
          <span className="text-sm font-bold text-[#1A2332]">{copy.visible}</span>
        </label>
        <ModalActions busy={busy} copy={copy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function ItemModal({
  mode, data, categories, copy, busy, locale, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  data: Partial<MenuItemView> & { categoryId?: string };
  categories: CategoryShape[];
  copy: Record<string, string>;
  busy: boolean;
  locale: Locale;
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

  const toggleBadge = (b: string) => {
    setBadges((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
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
            className="w-full rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#F4B400]"
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
            className="w-full rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#F4B400]"
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#F4B400]"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={copy.price}>
            <input
              required
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#F4B400]"
            />
          </Field>
          <Field label={copy.imageUrl}>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#F4B400]"
            />
          </Field>
        </div>
        <Field label={copy.badges}>
          <div className="flex flex-wrap gap-2">
            {MENU_BADGES.map((b) => {
              const active = badges.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBadge(b)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest transition-all ${
                    active ? 'border-[#F4B400] bg-[#F4B400] text-[#1A2332]' : 'border-[#E8ECF2] bg-white text-[#2A3444] hover:bg-gray-50'
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
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="h-4 w-4 accent-[#F4B400]" />
            <span className="text-sm font-bold text-[#1A2332]">{copy.available}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] px-4 py-3">
            <input type="checkbox" checked={isOutOfStock} onChange={(e) => setIsOutOfStock(e.target.checked)} className="h-4 w-4 accent-red-500" />
            <span className="text-sm font-bold text-[#1A2332]">{copy.outOfStock}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-md sm:p-6">
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-[#E8ECF2] bg-white shadow-2xl">
        <div className="relative border-b border-[#E8ECF2] bg-[#F8F6F1] p-5 sm:p-7">
          <h2 className="pr-10 text-xl font-extrabold uppercase tracking-tight text-[#1A2332] sm:text-2xl">{title}</h2>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-[#1A2332]"
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
      <label className="text-[11px] font-black uppercase tracking-widest text-[#6B7280]">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ busy, copy, onClose }: { busy: boolean; copy: Record<string, string>; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-3 border-t-2 border-[#F8F6F1] pt-5">
      <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#2A3444] hover:text-[#1A2332]">
        {copy.cancel}
      </button>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1A2332] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-gray-800 active:scale-95 disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
        {copy.save}
      </button>
    </div>
  );
}
