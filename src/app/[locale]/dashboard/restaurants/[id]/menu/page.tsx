'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, ArrowLeft, ArrowDown, ArrowUp, BarChart3, BedDouble, Check, ChevronRight, Coffee,
  Croissant, Download, Edit2, Eye, EyeOff, GripVertical, Image as ImageIcon, Info, Loader2,
  PartyPopper, Pizza, Plus, QrCode, Save, ShieldAlert, Sparkles, Trash2, Truck, UtensilsCrossed,
  Wine, X,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PublicMenuView, { type MenuCategoryView, type MenuItemView, type RestaurantView } from '@/components/menu/PublicMenuView';
import { Modal, useConfirmDialog } from '@/components/ui';
import { MENU_THEMES, type MenuAllergen, type MenuBadge, type MenuTheme } from '@/lib/validations';
import { formatPrice, parsePriceInput } from '@/lib/format';
import { compressImage } from '@/lib/client-image';
import type { Locale } from '@/lib/translations';
import { AlertBanner } from '@/components/ui';

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
  kahvalti: { tr: 'Kahvaltı', en: 'Breakfast' },
  organik: { tr: 'Organik', en: 'Organic' },
  taze: { tr: 'Taze', en: 'Fresh' },
  sezonluk: { tr: 'Sezonluk', en: 'Seasonal' },
  ev_yapimi: { tr: 'Ev Yapımı', en: 'Homemade' },
};

// Inline color hint per badge — consistent with PublicMenuView's BADGE_META so
// the builder previews how a chip will look on the live menu without importing
// the public render module.
const BADGE_TINTS: Record<MenuBadge, { bg: string; fg: string; border?: string }> = {
  populer:     { bg: '#FFFBEB', fg: '#92400E', border: '#FDE68A' },
  yeni:        { bg: '#EFF6FF', fg: '#1E40AF', border: '#BFDBFE' },
  vegan:       { bg: '#F0FDF4', fg: '#166534', border: '#BBF7D0' },
  vegetaryen:  { bg: '#EAF9B8', fg: '#4D5C00', border: '#D9EE7A' },
  aci:         { bg: '#FEF2F2', fg: '#991B1B', border: '#FECACA' },
  sef_onerisi: { bg: '#0A0A0A', fg: '#C6F24E' },
  glutensiz:   { bg: '#EAF9B8', fg: '#0A0A0A' },
  kahvalti:    { bg: '#FFEDD5', fg: '#9A3412', border: '#FED7AA' },
  organik:     { bg: '#ECFDF5', fg: '#14532D', border: '#A7F3D0' },
  taze:        { bg: '#ECFEFF', fg: '#155E75', border: '#A5F3FC' },
  sezonluk:    { bg: '#F5F3FF', fg: '#5B21B6', border: '#DDD6FE' },
  ev_yapimi:   { bg: '#FEF3C7', fg: '#854D0E', border: '#FDE68A' },
};

// Group badges by intent so the form picker reads as semantic rows instead of
// one wall of pills. Order is meaningful — most-used first.
const BADGE_GROUPS: { tr: string; en: string; items: MenuBadge[] }[] = [
  { tr: 'Vurgu', en: 'Highlights', items: ['populer', 'yeni', 'sef_onerisi'] },
  { tr: 'Diyet', en: 'Diet', items: ['vegan', 'vegetaryen', 'glutensiz'] },
  { tr: 'Karakter', en: 'Character', items: ['aci', 'kahvalti', 'sezonluk'] },
  { tr: 'Kalite', en: 'Quality', items: ['organik', 'taze', 'ev_yapimi'] },
];

// Allergen labels used in the picker — full TR/EN copy. The public chip uses a
// short 2-letter code (PublicMenuView.ALLERGEN_META.short). Order is the EU
// 1169/2011 disclosure order plus most-frequent-first within groups.
const ALLERGEN_LABELS: Record<MenuAllergen, { tr: string; en: string }> = {
  gluten:    { tr: 'Gluten',                en: 'Gluten' },
  sut:       { tr: 'Süt / laktoz',          en: 'Milk / lactose' },
  yumurta:   { tr: 'Yumurta',               en: 'Egg' },
  findik:    { tr: 'Sert kabuklu yemiş',    en: 'Tree nut' },
  fistik:    { tr: 'Yer fıstığı',           en: 'Peanut' },
  soya:      { tr: 'Soya',                  en: 'Soy' },
  balik:     { tr: 'Balık',                 en: 'Fish' },
  kabuklu:   { tr: 'Kabuklu deniz ürünü',   en: 'Crustacean' },
  yumusakca: { tr: 'Yumuşakça',             en: 'Mollusc' },
  susam:     { tr: 'Susam',                 en: 'Sesame' },
  hardal:    { tr: 'Hardal',                en: 'Mustard' },
  kereviz:   { tr: 'Kereviz',               en: 'Celery' },
};

const ALLERGEN_GROUPS: { tr: string; en: string; items: MenuAllergen[] }[] = [
  { tr: 'Tahıl & süt', en: 'Grain & dairy', items: ['gluten', 'sut', 'yumurta'] },
  { tr: 'Yemiş',       en: 'Nuts',          items: ['findik', 'fistik', 'susam'] },
  { tr: 'Deniz',       en: 'Seafood',       items: ['balik', 'kabuklu', 'yumusakca'] },
  { tr: 'Diğer',       en: 'Other',         items: ['soya', 'hardal', 'kereviz'] },
];

// Quick-start category presets so a new owner doesn't stare at an empty list.
// Picking one POSTs ~6 categories with sensible Turkish names; the user can
// rename / delete after. English mirror is included for the EN locale.
type StarterPreset = {
  id: 'restaurant' | 'cafe' | 'fastfood' | 'bakery' | 'bar' | 'hotel' | 'winebar' | 'foodtruck' | 'catering';
  tr: { label: string; hint: string; categories: string[] };
  en: { label: string; hint: string; categories: string[] };
};
const STARTER_PRESETS: StarterPreset[] = [
  {
    id: 'restaurant',
    tr: {
      label: 'Restoran',
      hint: 'Klasik yemek menüsü',
      categories: ['Başlangıçlar', 'Çorbalar', 'Salatalar', 'Ana Yemekler', 'Tatlılar', 'İçecekler'],
    },
    en: {
      label: 'Restaurant',
      hint: 'Classic dining menu',
      categories: ['Starters', 'Soups', 'Salads', 'Mains', 'Desserts', 'Beverages'],
    },
  },
  {
    id: 'cafe',
    tr: {
      label: 'Cafe',
      hint: 'Kahve, çay, tatlı',
      categories: ['Kahveler', 'Sıcak İçecekler', 'Soğuk İçecekler', 'Atıştırmalıklar', 'Tatlılar', 'Kahvaltı'],
    },
    en: {
      label: 'Cafe',
      hint: 'Coffee, tea, treats',
      categories: ['Coffee', 'Hot Drinks', 'Cold Drinks', 'Snacks', 'Desserts', 'Breakfast'],
    },
  },
  {
    id: 'fastfood',
    tr: {
      label: 'Fast Food',
      hint: 'Burger, pizza, döner',
      categories: ['Burgerler', 'Pizzalar', 'Tavuk', 'Wraplar', 'Yan Ürünler', 'İçecekler'],
    },
    en: {
      label: 'Fast Food',
      hint: 'Burger, pizza, wraps',
      categories: ['Burgers', 'Pizzas', 'Chicken', 'Wraps', 'Sides', 'Beverages'],
    },
  },
  {
    id: 'bakery',
    tr: {
      label: 'Pastane',
      hint: 'Hamur işi & tatlı',
      categories: ['Pastalar', 'Kurabiyeler', 'Tuzlular', 'Ekmek', 'Sıcak İçecekler', 'Soğuk İçecekler'],
    },
    en: {
      label: 'Bakery',
      hint: 'Pastry & dessert',
      categories: ['Cakes', 'Cookies', 'Savory', 'Bread', 'Hot Drinks', 'Cold Drinks'],
    },
  },
  {
    id: 'bar',
    tr: {
      label: 'Bar',
      hint: 'Kokteyl & meze',
      categories: ['Kokteyller', 'Şaraplar', 'Biralar', 'Mezeler', 'Atıştırmalıklar', 'Alkolsüzler'],
    },
    en: {
      label: 'Bar',
      hint: 'Cocktails & snacks',
      categories: ['Cocktails', 'Wines', 'Beers', 'Mezze', 'Snacks', 'Soft Drinks'],
    },
  },
  {
    id: 'hotel',
    tr: {
      label: 'Otel · Oda Servisi',
      hint: '24 saat oda menüsü',
      categories: ['Kahvaltı', 'Sandviçler', 'Ana Yemekler', 'Tatlılar', 'İçecekler', 'Gece Menüsü'],
    },
    en: {
      label: 'Hotel · Room Service',
      hint: '24-hour in-room menu',
      categories: ['Breakfast', 'Sandwiches', 'Mains', 'Desserts', 'Beverages', 'Late Night'],
    },
  },
  {
    id: 'winebar',
    tr: {
      label: 'Şarap Bar',
      hint: 'Şarap, peynir, kuru meze',
      categories: ['Beyaz Şaraplar', 'Kırmızı Şaraplar', 'Köpüklü', 'Peynir Tabağı', 'Şarküteri', 'Bar Atıştırmalıkları'],
    },
    en: {
      label: 'Wine Bar',
      hint: 'Wine, cheese, charcuterie',
      categories: ['White Wines', 'Red Wines', 'Sparkling', 'Cheese Board', 'Charcuterie', 'Bar Bites'],
    },
  },
  {
    id: 'foodtruck',
    tr: {
      label: 'Food Truck',
      hint: 'Mobil servis, kısa menü',
      categories: ['İmza Tabaklar', 'Tacolar / Wraplar', 'Patates Çeşitleri', 'Soslar', 'İçecekler'],
    },
    en: {
      label: 'Food Truck',
      hint: 'Street menu, short list',
      categories: ['Signatures', 'Tacos / Wraps', 'Fries & Sides', 'Sauces', 'Drinks'],
    },
  },
  {
    id: 'catering',
    tr: {
      label: 'Catering',
      hint: 'Etkinlik & toplu sipariş',
      categories: ['Açık Büfe', 'Soğuk Tabaklar', 'Sıcak Tabaklar', 'Kanepeler', 'Tatlı Standı', 'Servis İçecekleri'],
    },
    en: {
      label: 'Catering',
      hint: 'Events & bulk orders',
      categories: ['Buffet', 'Cold Plates', 'Hot Plates', 'Canapés', 'Dessert Station', 'Drink Service'],
    },
  },
];

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
  const [confirmDialog, askConfirm] = useConfirmDialog();

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
      themePulse: isTr ? 'Pulse' : 'Pulse',
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
      saving: isTr ? 'Kaydediliyor' : 'Saving',
      resetAccent: isTr ? 'Sıfırla' : 'Reset',
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

  // ── Quick-start preset (only meaningful when categories list is empty) ──
  const [presetBusy, setPresetBusy] = useState<StarterPreset['id'] | null>(null);
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

  const deleteCategory = (categoryId: string) => {
    askConfirm({
      title: isTr ? 'Kategori silinsin mi?' : 'Delete category?',
      body: copy.deleteCategoryConfirm,
      confirmLabel: isTr ? 'Sil' : 'Delete',
      cancelLabel: isTr ? 'İptal' : 'Cancel',
      variant: 'danger',
      onConfirm: () => doDeleteCategory(categoryId),
    });
  };

  const doDeleteCategory = async (categoryId: string) => {
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
          allergens: payload.allergens ?? [],
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

  const deleteItem = (itemId: string) => {
    askConfirm({
      title: isTr ? 'Ürün silinsin mi?' : 'Delete item?',
      body: copy.deleteItemConfirm,
      confirmLabel: isTr ? 'Sil' : 'Delete',
      cancelLabel: isTr ? 'İptal' : 'Cancel',
      variant: 'danger',
      onConfirm: () => doDeleteItem(itemId),
    });
  };

  const doDeleteItem = async (itemId: string) => {
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
      <div className="p-10 text-center text-sm font-bold text-[#DC2626]">{error ?? 'Yüklenemedi'}</div>
    );
  }

  const status = !restaurant.menuEnabled
    ? { label: copy.disabled, dot: 'bg-[#737373]', text: 'text-[#737373]' }
    : restaurant.menuPublished
    ? { label: copy.published, dot: 'bg-[#16A34A]', text: 'text-[#166534]' }
    : { label: copy.draft, dot: 'bg-[#D97706]', text: 'text-[#92400E]' };

  if (previewMode) {
    return (
      <div className="min-h-full">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#1A1A1A] bg-[#0A0A0A] px-5 py-3.5 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#C6F24E]">
              <Eye size={14} strokeWidth={2.25} className="text-[#0A0A0A]" />
            </span>
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#C6F24E]">{copy.preview}</p>
              <p className="truncate text-sm font-medium">{restaurant.name}</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/${locale}/dashboard/restaurants/${id}/menu`)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/20 active:scale-95"
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
      <div className="relative overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        {restaurant.menuPublished && (
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#C6F24E]" aria-hidden />
        )}
        {/* Soft accent halo + dotted texture so the header doesn't read as a flat
            white card. Pure decoration — pointer-events-none + aria-hidden. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-[0.18] blur-3xl"
          style={{ backgroundColor: restaurant.menuAccentColor ?? restaurant.primaryColor ?? '#C6F24E' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #0A0A0A 1px, transparent 0)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="relative flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <Link
                href={`/${locale}/dashboard/menu`}
                className="pulse-eyebrow inline-flex items-center gap-1.5 text-[#737373] transition-colors hover:text-[#0A0A0A]"
              >
                <ArrowLeft size={12} strokeWidth={2.25} />
                {copy.backToMenus}
              </Link>
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E] shadow-sm">
                  <UtensilsCrossed size={20} strokeWidth={2} />
                  {restaurant.menuPublished && (
                    <span
                      aria-hidden
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#16A34A] ring-2 ring-white"
                    />
                  )}
                </span>
                <h1 className="truncate text-[26px] font-medium tracking-[-0.02em] text-[#0A0A0A] sm:text-[32px]">
                  {restaurant.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[#737373]">
                <span className={`inline-flex items-center gap-1.5 ${status.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
                  <span className="font-medium">{status.label}</span>
                </span>
                {restaurant.menuUpdatedAt && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-[#EDEDED]" aria-hidden />
                    <span>{copy.lastUpdated}: {new Date(restaurant.menuUpdatedAt).toLocaleString(isTr ? 'tr-TR' : 'en-US')}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${locale}/dashboard/restaurants/${id}/menu?preview=1`}
                className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <Eye size={14} strokeWidth={2} />
                {copy.preview}
              </Link>
              <button
                onClick={() => setQrModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <QrCode size={14} strokeWidth={2} />
                {copy.menuQr}
              </button>
              <Link
                href={`/${locale}/dashboard/restaurants/${id}/menu/analytics`}
                className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <BarChart3 size={14} strokeWidth={2} />
                {copy.analytics}
              </Link>
              {restaurant.menuPublished && (
                <Link
                  href={`/menu/${restaurant.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
                >
                  <ChevronRight size={14} strokeWidth={2} />
                  {copy.viewPublic}
                </Link>
              )}
              <button
                onClick={togglePublish}
                disabled={publishBusy || !restaurant.menuEnabled}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                  restaurant.menuPublished
                    ? 'bg-[#FFFBEB] text-[#92400E] ring-1 ring-[#FDE68A] hover:bg-[#FEF3C7]'
                    : 'bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
                }`}
              >
                {publishBusy ? <Loader2 size={14} className="animate-spin" /> : restaurant.menuPublished ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
                {restaurant.menuPublished ? copy.unpublish : copy.publish}
              </button>
            </div>
          </div>
          {!restaurant.menuEnabled && (
            <AlertBanner kind="warn" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
              {copy.disabledByAdmin}
            </AlertBanner>
          )}
        </div>
      </div>

      {error && (
        <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
          {error}
        </AlertBanner>
      )}

      {/* Menu Design (theme + accent color + logo) */}
      <ThemePanel
        restaurant={restaurant}
        copy={copy}
        locale={locale}
        saving={themeSaving}
        onChange={saveTheme}
        onUploadLogo={uploadLogo}
      />

      {/* Two-pane builder */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Categories */}
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#EDEDED] px-5 py-4">
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#737373]">{copy.categories}</p>
              <p className="mt-0.5 text-[11px] text-[#737373]">{categories.length} {isTr ? 'toplam' : 'total'}</p>
            </div>
            <button
              onClick={() => setCategoryModal({ mode: 'create', data: { isVisible: true } })}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] shadow-sm transition-all hover:bg-[#A8D62E] active:scale-95"
            >
              <Plus size={14} strokeWidth={2.25} />
              {copy.addCategory}
            </button>
          </div>
          {categories.length === 0 ? (
            <div className="px-4 py-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
                  <UtensilsCrossed size={18} strokeWidth={2} />
                </span>
                <p className="max-w-[260px] text-[12px] leading-relaxed text-[#525252]">{copy.noCategories}</p>
              </div>
              <button
                onClick={() => setCategoryModal({ mode: 'create', data: { isVisible: true } })}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-[#1A1A1A] active:scale-95"
              >
                <Plus size={12} strokeWidth={2.25} />
                {copy.addCategory}
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
              <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-[#F5F5F5]">
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
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[#EDEDED] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#737373]">{activeCategory ? copy.items : copy.categories}</p>
              <h2 className="mt-1 truncate text-[18px] font-medium tracking-[-0.015em] text-[#0A0A0A] sm:text-[20px]">
                {activeCategory ? activeCategory.name : copy.items}
              </h2>
              {activeCategory?.description && (
                <p className="mt-1 line-clamp-1 text-[12px] text-[#737373]">{activeCategory.description}</p>
              )}
              {activeCategory && (
                <p className="mt-1 text-[11px] text-[#737373]">
                  {activeCategory.items.length} {isTr ? 'ürün' : 'items'}
                </p>
              )}
            </div>
            {activeCategory && (
              <button
                onClick={() => setItemModal({ mode: 'create', data: { categoryId: activeCategory.id, isAvailable: true, isOutOfStock: false, badges: [], priceCents: 0 } })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95"
              >
                <Plus size={14} strokeWidth={2.25} />
                {copy.addItem}
              </button>
            )}
          </div>
          {!activeCategory ? (
            categories.length === 0 ? (
              <div className="px-5 py-8 sm:px-8 sm:py-10">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF9B8] to-[#C6F24E] text-[#0A0A0A] shadow-sm">
                    <UtensilsCrossed size={24} strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="bz-h-tight text-[18px] text-[#0A0A0A]">
                      {isTr ? 'Hızlı başla' : 'Quick start'}
                    </h3>
                    <p className="mt-1 max-w-[420px] text-[13px] leading-relaxed text-[#525252]">
                      {isTr
                        ? 'İşletmene en yakın şablonu seç — kategorileri biz oluşturalım, sen ürünlerini ekle. Sonradan istediğini yeniden adlandırabilir veya silebilirsin.'
                        : 'Pick the template that fits your venue — we create the categories, you add the items. Rename or delete anything you want later.'}
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {STARTER_PRESETS.map((p) => {
                    const localized = p[isTr ? 'tr' : 'en'];
                    const busy = presetBusy === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => applyStarterPreset(p)}
                        disabled={presetBusy !== null}
                        className="group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border border-[#EDEDED] bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#0A0A0A] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="inline-flex items-center gap-1.5">
                            <PresetGlyph id={p.id} />
                            <span className="text-[14px] font-medium text-[#0A0A0A]">{localized.label}</span>
                          </span>
                          {busy ? (
                            <Loader2 size={14} className="animate-spin text-[#0A0A0A]" />
                          ) : (
                            <ChevronRight size={14} strokeWidth={2} className="text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#737373]">{localized.hint}</p>
                        <div className="flex flex-wrap gap-1">
                          {localized.categories.slice(0, 4).map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-medium text-[#525252]"
                            >
                              {c}
                            </span>
                          ))}
                          <span className="inline-flex items-center rounded-full border border-dashed border-[#EDEDED] px-2 py-0.5 text-[10px] font-medium text-[#A3A3A3]">
                            +{localized.categories.length - 4}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex items-center gap-3 border-t border-dashed border-[#EDEDED] pt-4">
                  <span className="h-px flex-1 bg-[#EDEDED]" aria-hidden />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#A3A3A3]">
                    {isTr ? 'veya' : 'or'}
                  </span>
                  <span className="h-px flex-1 bg-[#EDEDED]" aria-hidden />
                </div>
                <button
                  onClick={() => setCategoryModal({ mode: 'create', data: { isVisible: true } })}
                  disabled={presetBusy !== null}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2.5 text-[12px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={13} strokeWidth={2.25} />
                  {isTr ? 'Boş kategoriyle başla' : 'Start with an empty category'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F5F5] text-[#737373]">
                  <ChevronRight size={24} strokeWidth={2} />
                </span>
                <p className="max-w-[260px] text-[13px] leading-relaxed text-[#525252]">{copy.noCategorySelected}</p>
              </div>
            )
          ) : activeCategory.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
                <ImageIcon size={24} strokeWidth={2} />
              </span>
              <p className="max-w-[280px] text-[13px] leading-relaxed text-[#525252]">{copy.noItems}</p>
              <button
                onClick={() => setItemModal({ mode: 'create', data: { categoryId: activeCategory.id, isAvailable: true, isOutOfStock: false, badges: [], priceCents: 0 } })}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-1.5 text-[12px] font-medium text-white transition-all hover:bg-[#1A1A1A] active:scale-95"
              >
                <Plus size={12} strokeWidth={2.25} />
                {copy.addItem}
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemDragEnd}>
              <SortableContext items={activeCategory.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-[#F5F5F5]">
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

      {/* Imperative confirm dialog (deleteCategory + deleteItem) */}
      {confirmDialog}
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
    <Modal size={620} title={mode === 'create' ? copy.addCategory : copy.editCategory} onClose={onClose}>
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
            className="w-full bz-card px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none bz-card px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 bz-card px-4 py-3 transition-colors hover:bg-[#FAFAFA]">
          <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} className="h-4 w-4 accent-[#C6F24E]" />
          <span className="text-[14px] font-medium text-[#0A0A0A]">{copy.visible}</span>
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
  const [allergens, setAllergens] = useState<string[]>(data.allergens ?? []);
  const [isAvailable, setIsAvailable] = useState(data.isAvailable ?? true);
  const [isOutOfStock, setIsOutOfStock] = useState(data.isOutOfStock ?? false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleBadge = (b: string) => {
    setBadges((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const toggleAllergen = (a: string) => {
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
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
    <Modal size={680} title={mode === 'create' ? copy.addItem : copy.editItem} onClose={onClose}>
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
            allergens,
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
            className="w-full bz-card px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
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
            className="w-full bz-card px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
          />
        </Field>
        <Field label={copy.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none bz-card px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
          />
        </Field>
        <Field label={copy.price}>
          <div className="relative">
            <input
              required
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0,00"
              className="w-full bz-card px-4 py-3 pr-12 text-[15px] tabular-nums text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[13px] font-medium text-[#A3A3A3]">₺</span>
          </div>
        </Field>
        <Field label={copy.imageUrl}>
          <div className="flex gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F5] ring-1 ring-[#EDEDED]">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#A3A3A3]">
                  <ImageIcon size={24} strokeWidth={1.75} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-4 py-2 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} strokeWidth={2} />}
                  {uploading ? copy.uploading : copy.uploadImage}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[12px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:text-[#0A0A0A] active:scale-95"
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
                className="w-full rounded-full border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              />
            </div>
          </div>
        </Field>
        <Field label={copy.badges}>
          <div className="space-y-3">
            {BADGE_GROUPS.map((group) => (
              <div key={group.tr} className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#A3A3A3]">
                  {locale === 'tr' ? group.tr : group.en}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((b) => {
                    const active = badges.includes(b);
                    const tint = BADGE_TINTS[b];
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBadge(b)}
                        style={
                          active
                            ? {
                                backgroundColor: tint.bg,
                                color: tint.fg,
                                borderColor: tint.border ?? tint.bg,
                              }
                            : undefined
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
                          active
                            ? 'shadow-sm'
                            : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]'
                        }`}
                      >
                        {active && <Check size={11} strokeWidth={2.5} />}
                        {BADGE_LABELS[b][locale]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Field>

        {/* Allergens — regulatory disclosure, intentionally distinct visual
            treatment from marketing badges (amber warning palette). */}
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert size={11} strokeWidth={2.25} className="text-[#92400E]" />
              {locale === 'tr' ? 'Alerjenler (opsiyonel)' : 'Allergens (optional)'}
            </span>
          }
        >
          <div className="space-y-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB]/60 p-3">
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[#92400E]">
              <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0" />
              {locale === 'tr'
                ? 'Üründe doğal olarak bulunan veya çapraz bulaşma riski taşıyan içerikleri seç. Müşteriler menüde uyarı olarak görür.'
                : 'Mark allergens that are present or risk cross-contamination. Customers see this as a warning in the public menu.'}
            </p>
            {ALLERGEN_GROUPS.map((group) => (
              <div key={group.tr} className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#92400E]/80">
                  {locale === 'tr' ? group.tr : group.en}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((a) => {
                    const active = allergens.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAllergen(a)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
                          active
                            ? 'border-[#92400E] bg-[#FEF3C7] text-[#92400E] shadow-sm'
                            : 'border-[#FDE68A]/60 bg-white text-[#92400E]/80 hover:border-[#92400E] hover:text-[#92400E]'
                        }`}
                      >
                        {active && <Check size={11} strokeWidth={2.5} />}
                        {ALLERGEN_LABELS[a][locale]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {allergens.length > 0 && (
              <button
                type="button"
                onClick={() => setAllergens([])}
                className="text-[11px] font-medium text-[#92400E] underline-offset-2 hover:underline"
              >
                {locale === 'tr' ? 'Tümünü temizle' : 'Clear all'}
              </button>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center gap-3 bz-card px-4 py-3 transition-colors hover:bg-[#FAFAFA]">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="h-4 w-4 accent-[#C6F24E]" />
            <span className="text-[14px] font-medium text-[#0A0A0A]">{copy.available}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 bz-card px-4 py-3 transition-colors hover:bg-[#FAFAFA]">
            <input type="checkbox" checked={isOutOfStock} onChange={(e) => setIsOutOfStock(e.target.checked)} className="h-4 w-4 accent-red-500" />
            <span className="text-[14px] font-medium text-[#0A0A0A]">{copy.outOfStock}</span>
          </label>
        </div>
        {formError && (
          <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
            {formError}
          </AlertBanner>
        )}
        <ModalActions busy={busy} copy={copy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="pulse-eyebrow text-[#737373]">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ busy, copy, onClose }: { busy: boolean; copy: Record<string, string>; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-[#EDEDED] pt-5">
      <button
        type="button"
        onClick={onClose}
        className="rounded-full px-5 py-2.5 text-[13px] font-medium text-[#525252] transition-colors hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"
      >
        {copy.cancel}
      </button>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-2.5 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
        {copy.save}
      </button>
    </div>
  );
}

// Tiny themed icon for the starter-preset cards. Each glyph picks a recognizable
// venue silhouette (bistro plate, espresso cup, slice, croissant, wine glass).
function PresetGlyph({ id }: { id: StarterPreset['id'] }) {
  const Icon =
    id === 'restaurant' ? UtensilsCrossed
    : id === 'cafe' ? Coffee
    : id === 'fastfood' ? Pizza
    : id === 'bakery' ? Croissant
    : id === 'hotel' ? BedDouble
    : id === 'foodtruck' ? Truck
    : id === 'catering' ? PartyPopper
    : Wine;
  const palette: Record<StarterPreset['id'], { bg: string; fg: string }> = {
    restaurant: { bg: '#FEF3C7', fg: '#854D0E' },
    cafe:       { bg: '#F5F3FF', fg: '#5B21B6' },
    fastfood:   { bg: '#FEF2F2', fg: '#991B1B' },
    bakery:     { bg: '#FFEDD5', fg: '#9A3412' },
    bar:        { bg: '#ECFEFF', fg: '#155E75' },
    hotel:      { bg: '#EFF6FF', fg: '#1E40AF' },
    winebar:    { bg: '#FAE8FF', fg: '#86198F' },
    foodtruck:  { bg: '#FEF3C7', fg: '#A16207' },
    catering:   { bg: '#ECFDF5', fg: '#14532D' },
  };
  const { bg, fg } = palette[id];
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-xl"
      style={{ backgroundColor: bg, color: fg }}
    >
      <Icon size={14} strokeWidth={2} />
    </span>
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
      className={`group relative flex items-center gap-1 px-3 py-2.5 text-sm transition-colors ${
        isActive ? 'bg-[#EAF9B8]/40' : 'hover:bg-[#FAFAFA]'
      } ${isDragging ? 'z-10 rounded-xl bg-white shadow-lg ring-1 ring-[#EDEDED]' : ''}`}
    >
      {isActive && (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[#C6F24E]" aria-hidden />
      )}
      <button
        {...attributes}
        {...listeners}
        aria-label={copy.dragToReorder}
        className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[#A3A3A3] opacity-0 transition-all hover:bg-[#EDEDED] hover:text-[#525252] group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical size={14} strokeWidth={2} />
      </button>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[14px] ${isActive ? 'font-medium text-[#0A0A0A]' : 'text-[#0A0A0A]'}`}>
            {category.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#737373]">
            <span>{category.items.length} {isTr ? 'ürün' : 'items'}</span>
            {!category.isVisible && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-[#EDEDED]" aria-hidden />
                <span className="inline-flex items-center gap-1 text-[#92400E]">
                  <EyeOff size={10} strokeWidth={2.25} />
                  {copy.hidden}
                </span>
              </>
            )}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <button onClick={onMoveUp} disabled={isFirst} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#EDEDED] hover:text-[#0A0A0A] disabled:opacity-30 disabled:hover:bg-transparent" title="Up">
          <ArrowUp size={14} strokeWidth={2} />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#EDEDED] hover:text-[#0A0A0A] disabled:opacity-30 disabled:hover:bg-transparent" title="Down">
          <ArrowDown size={14} strokeWidth={2} />
        </button>
        <button
          onClick={onToggleVisible}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EDEDED] ${category.isVisible ? 'text-[#525252] hover:text-[#0A0A0A]' : 'text-[#D97706]'}`}
          title={copy.toggleVisible}
          aria-label={copy.toggleVisible}
        >
          {category.isVisible ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
        </button>
        <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#EDEDED] hover:text-[#0A0A0A]" title={copy.editCategory} aria-label={copy.editCategory}>
          <Edit2 size={14} strokeWidth={2} />
        </button>
        <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#DC2626] transition-colors hover:bg-[#FEF2F2]" title={copy.delete} aria-label={copy.delete}>
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
  const dimmed = !item.isAvailable || item.isOutOfStock;
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-[#FAFAFA] sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4 ${
        isDragging ? 'z-10 rounded-xl bg-white shadow-lg ring-1 ring-[#EDEDED]' : ''
      }`}
    >
      <div className="flex items-center gap-3 sm:contents">
        <button
          {...attributes}
          {...listeners}
          aria-label={copy.dragToReorder}
          className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[#A3A3A3] transition-all hover:bg-[#EDEDED] hover:text-[#525252] sm:opacity-0 sm:group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={16} strokeWidth={2} />
        </button>
        <div className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F5] ring-1 ring-[#EDEDED] transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#A3A3A3]">
              <ImageIcon size={20} strokeWidth={1.75} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={`truncate text-[14px] font-medium ${dimmed ? 'text-[#737373]' : 'text-[#0A0A0A]'}`}>
              {item.name}
            </p>
            {!item.isAvailable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EDEDED] px-2 py-0.5 text-[10px] font-medium text-[#525252]">
                <EyeOff size={10} strokeWidth={2.25} />
                {copy.hidden}
              </span>
            )}
            {item.isOutOfStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-medium text-[#991B1B] ring-1 ring-[#FECACA]">
                <AlertTriangle size={10} strokeWidth={2.25} />
                {copy.outOfStock}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={`text-[15px] font-medium tabular-nums tracking-tight ${dimmed ? 'text-[#737373]' : 'text-[#0A0A0A]'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatPrice(item.priceCents, item.currency, isTr ? 'tr-TR' : 'en-US')}
            </span>
            {item.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.badges.slice(0, 3).map((b) => {
                  const tint = BADGE_TINTS[b as MenuBadge];
                  return (
                    <span
                      key={b}
                      style={
                        tint
                          ? {
                              backgroundColor: tint.bg,
                              color: tint.fg,
                              boxShadow: tint.border ? `inset 0 0 0 1px ${tint.border}` : undefined,
                            }
                          : undefined
                      }
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                    >
                      {BADGE_LABELS[b as MenuBadge]?.[locale] || b}
                    </span>
                  );
                })}
                {item.badges.length > 3 && (
                  <span className="inline-flex items-center rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-[#525252]">
                    +{item.badges.length - 3}
                  </span>
                )}
              </div>
            )}
            {item.allergens && item.allergens.length > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-medium text-[#92400E]"
                title={isTr ? `${item.allergens.length} alerjen işaretli` : `${item.allergens.length} allergens flagged`}
              >
                <ShieldAlert size={9} strokeWidth={2.25} />
                {item.allergens.length}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5 border-t border-[#F5F5F5] pt-2 transition-opacity sm:border-t-0 sm:pt-0 md:opacity-0 md:group-hover:opacity-100">
        <button onClick={onMoveUp} disabled={isFirst} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#EDEDED] hover:text-[#0A0A0A] disabled:opacity-30 disabled:hover:bg-transparent">
          <ArrowUp size={16} strokeWidth={2} />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#EDEDED] hover:text-[#0A0A0A] disabled:opacity-30 disabled:hover:bg-transparent">
          <ArrowDown size={16} strokeWidth={2} />
        </button>
        <button
          onClick={onToggleAvailable}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[#EDEDED] ${item.isAvailable ? 'text-[#525252] hover:text-[#0A0A0A]' : 'text-[#D97706]'}`}
          title={copy.toggleVisible}
          aria-label={copy.toggleVisible}
        >
          {item.isAvailable ? <Eye size={16} strokeWidth={2} /> : <EyeOff size={16} strokeWidth={2} />}
        </button>
        <button
          onClick={onToggleOutOfStock}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[#EDEDED] ${item.isOutOfStock ? 'text-[#DC2626]' : 'text-[#525252] hover:text-[#0A0A0A]'}`}
          title={copy.toggleOutOfStock}
          aria-label={copy.toggleOutOfStock}
        >
          <AlertTriangle size={16} strokeWidth={2} />
        </button>
        <button onClick={onEdit} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#EDEDED] hover:text-[#0A0A0A]" aria-label={copy.editItem || 'Edit'}>
          <Edit2 size={16} strokeWidth={2} />
        </button>
        <button onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#DC2626] transition-colors hover:bg-[#FEF2F2]" aria-label={copy.delete}>
          <Trash2 size={16} strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Theme panel

// Curated palette covering common venue moods. Grouped visually in the picker
// (lime/warm/dark/herb/floral) so a cafe owner and a fine-dining owner can
// each find a fitting accent without opening the color wheel.
const THEME_SWATCH_GROUPS: { tr: string; en: string; colors: string[] }[] = [
  { tr: 'Marka', en: 'Brand', colors: ['#C6F24E', '#A8D62E', '#8CB81E'] },
  { tr: 'Sıcak', en: 'Warm', colors: ['#E85A4F', '#D97706', '#F59E0B', '#9A3412'] },
  { tr: 'Koyu', en: 'Dark', colors: ['#0A0A0A', '#1F2937', '#3F3F46'] },
  { tr: 'Bitki', en: 'Herb', colors: ['#0E7C66', '#15803D', '#65A30D'] },
  { tr: 'Soğuk', en: 'Cool', colors: ['#0EA5E9', '#1D4ED8', '#0F766E'] },
  { tr: 'Zarif', en: 'Soft', colors: ['#8B5CF6', '#EC4899', '#BE185D', '#A16207'] },
];

// Hint per theme — small TR/EN copy chip on the card so a brand-new owner can
// pick the layout that fits their venue without opening the public preview.
const THEME_VIBES: Record<MenuTheme, { tr: string; en: string }> = {
  classic:    { tr: 'Restoran · Aile',         en: 'Restaurant · Family' },
  modern:     { tr: 'Fast food · Burger',      en: 'Fast food · Burger' },
  elegant:    { tr: 'Fine dining',             en: 'Fine dining' },
  gastronomy: { tr: 'Şef · Bar · Gece',        en: 'Chef · Bar · Night' },
  minimal:    { tr: 'Cafe · Pastane',          en: 'Cafe · Bakery' },
  bistro:     { tr: 'Bistro · Kahvaltı',       en: 'Bistro · Brunch' },
  pulse:      { tr: 'Pulse · Marka uyumlu',    en: 'Pulse · Brand-aligned' },
};

function ThemePanel({
  restaurant, copy, locale, saving, onChange, onUploadLogo,
}: {
  restaurant: RestaurantShape;
  copy: Record<string, string>;
  locale: Locale;
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
    { id: 'pulse', label: copy.themePulse },
  ];
  const currentAccent = restaurant.menuAccentColor ?? restaurant.primaryColor ?? '#C6F24E';
  const logoFileRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#EDEDED] px-6 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]">
            <Sparkles size={14} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="pulse-eyebrow text-[#737373]">{copy.menuDesign}</p>
            <p className="mt-0.5 text-[12px] text-[#737373]">
              {copy.themeLabel} · {copy.accentColor} · {copy.logo}
            </p>
          </div>
        </div>
        {saving && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#737373]">
            <Loader2 size={12} className="animate-spin" />
            {copy.saving}
          </span>
        )}
      </div>

      <div className="space-y-7 p-6">
        {/* Themes */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="pulse-eyebrow text-[#737373]">{copy.themeLabel}</p>
            <p className="text-[11px] text-[#A3A3A3]">
              {themes.find((t) => t.id === restaurant.menuTheme)?.label ?? ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {themes.map((t) => {
              const active = restaurant.menuTheme === t.id;
              const vibe = THEME_VIBES[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => onChange({ menuTheme: t.id })}
                  className={`group relative flex flex-col items-stretch gap-2.5 rounded-2xl border p-2.5 text-left transition-all ${
                    active
                      ? 'border-[#0A0A0A] bg-white shadow-md ring-2 ring-[#C6F24E]/50'
                      : 'border-[#EDEDED] bg-white hover:-translate-y-0.5 hover:border-[#A3A3A3] hover:shadow-sm'
                  }`}
                >
                  <ThemeThumb theme={t.id} accent={currentAccent} />
                  <div className="flex items-start justify-between gap-2 px-0.5">
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] leading-tight ${active ? 'font-medium text-[#0A0A0A]' : 'text-[#525252]'}`}>
                        {t.label}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.1em] text-[#A3A3A3]">
                        {locale === 'tr' ? vibe.tr : vibe.en}
                      </p>
                    </div>
                    {active && (
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C6F24E]">
                        <Check size={11} strokeWidth={3} className="text-[#0A0A0A]" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="pulse-eyebrow text-[#737373]">{copy.accentColor}</p>
            <span className="font-mono text-[11px] text-[#A3A3A3]" style={{ fontFamily: 'var(--font-mono)' }}>
              {currentAccent.toUpperCase()}
            </span>
          </div>
          <div className="space-y-3">
            {THEME_SWATCH_GROUPS.map((group) => (
              <div key={group.tr} className="flex items-center gap-3">
                <p className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[#A3A3A3]">
                  {locale === 'tr' ? group.tr : group.en}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {group.colors.map((c) => {
                    const active = currentAccent.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        onClick={() => onChange({ menuAccentColor: c })}
                        style={{ backgroundColor: c }}
                        className={`relative h-9 w-9 rounded-full transition-all active:scale-90 ${
                          active
                            ? 'ring-2 ring-[#0A0A0A] ring-offset-2'
                            : 'shadow-sm ring-1 ring-black/5 hover:scale-110'
                        }`}
                        title={c}
                        aria-label={c}
                      >
                        {active && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check size={13} strokeWidth={3} className="text-white drop-shadow" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#F5F5F5] pt-3">
              <label className="relative inline-flex h-9 cursor-pointer items-center gap-2 overflow-hidden rounded-full border-2 border-dashed border-[#A3A3A3] px-3 text-[11px] font-medium text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]">
                <input
                  type="color"
                  value={currentAccent}
                  onChange={(e) => onChange({ menuAccentColor: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <Plus size={12} strokeWidth={2.25} />
                {locale === 'tr' ? 'Özel renk' : 'Custom'}
              </label>
              {restaurant.menuAccentColor && (
                <button
                  onClick={() => onChange({ menuAccentColor: null })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3 py-1.5 text-[11px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
                >
                  <X size={11} strokeWidth={2} />
                  {copy.resetAccent}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <p className="pulse-eyebrow mb-3 text-[#737373]">{copy.logo}</p>
          <div className="flex items-start gap-4 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-[#EDEDED]">
              {restaurant.menuLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.menuLogoUrl} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ color: currentAccent }}>
                  <UtensilsCrossed size={26} strokeWidth={1.75} />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-4 py-2 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
                >
                  <ImageIcon size={13} strokeWidth={2} />
                  {copy.uploadImage}
                </button>
                {restaurant.menuLogoUrl && (
                  <button
                    type="button"
                    onClick={() => onChange({ menuLogoUrl: null })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[12px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:text-[#0A0A0A] active:scale-95"
                  >
                    <X size={12} strokeWidth={2} />
                    {copy.removeImage}
                  </button>
                )}
              </div>
              <p className="text-[12px] leading-relaxed text-[#737373]">{copy.logoHint}</p>
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
      <div className="relative h-28 overflow-hidden rounded-xl bg-white ring-1 ring-[#EDEDED]">
        <div className="relative h-9 w-full" style={{ backgroundColor: accent }}>
          <div className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-white/40" />
          <div className="absolute right-5 top-1.5 h-2.5 w-2.5 rounded-full bg-white/25" />
        </div>
        <div className="space-y-1.5 p-2.5">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[#0A0A0A]/70" />
            <div className="h-1.5 flex-1 rounded bg-[#0A0A0A]/85" />
            <div className="h-1.5 w-5 rounded bg-[#0A0A0A]/85" />
          </div>
          <div className="h-1 w-full rounded bg-[#A3A3A3]/40" />
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[#0A0A0A]/40" />
            <div className="h-1.5 flex-1 rounded bg-[#0A0A0A]/60" />
            <div className="h-1.5 w-5 rounded bg-[#0A0A0A]/60" />
          </div>
          <div className="h-1 w-4/5 rounded bg-[#A3A3A3]/40" />
        </div>
      </div>
    );
  }
  if (theme === 'modern') {
    return (
      <div className="relative grid h-28 grid-cols-2 gap-1.5 overflow-hidden rounded-xl bg-[#FAFAFA] p-2 ring-1 ring-[#EDEDED]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="relative overflow-hidden rounded-md bg-white shadow-sm">
            <div className="h-5 w-full" style={{ backgroundColor: accent, opacity: 0.85 - i * 0.12 }} />
            <div className="space-y-0.5 p-1">
              <div className="h-1 w-3/4 rounded bg-[#0A0A0A]/85" />
              <div className="h-0.5 w-full rounded bg-[#A3A3A3]/40" />
              <div className="h-1 w-1/3 rounded" style={{ backgroundColor: accent }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (theme === 'elegant') {
    return (
      <div className="relative flex h-28 flex-col items-center gap-1.5 overflow-hidden rounded-xl bg-white p-3 ring-1 ring-[#EDEDED]">
        <div className="h-[3px] w-8 rounded" style={{ backgroundColor: accent }} />
        <div className="h-2 w-3/5 rounded bg-[#0A0A0A]" />
        <div className="h-px w-2/3 bg-[#EDEDED]" />
        <div className="mt-0.5 w-full space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <div className="h-1.5 flex-1 rounded bg-[#0A0A0A]/85" />
            <div className="h-1 w-px bg-[#A3A3A3]" />
            <div className="h-1.5 w-5 rounded bg-[#0A0A0A]/60" />
          </div>
          <div className="h-0.5 w-4/5 rounded bg-[#A3A3A3]/40" />
          <div className="flex items-baseline gap-1.5">
            <div className="h-1.5 flex-1 rounded bg-[#0A0A0A]/85" />
            <div className="h-1 w-px bg-[#A3A3A3]" />
            <div className="h-1.5 w-5 rounded bg-[#0A0A0A]/60" />
          </div>
        </div>
      </div>
    );
  }
  if (theme === 'minimal') {
    return (
      <div className="relative h-28 overflow-hidden rounded-xl bg-white p-3 ring-1 ring-[#EDEDED]">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 flex-1 rounded bg-[#0A0A0A]" />
          <div className="h-1.5 w-6 rounded" style={{ backgroundColor: accent }} />
        </div>
        <div className="mt-2 h-px w-full bg-[#EDEDED]" />
        <div className="mt-2 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="h-0.5 flex-1 rounded bg-[#A3A3A3]/45" />
              <div
                className="h-0.5 rounded"
                style={{ backgroundColor: accent, opacity: 0.85 - i * 0.15, width: 18 + i * 2 }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (theme === 'bistro') {
    return (
      <div className="relative grid h-28 grid-cols-2 gap-1.5 overflow-hidden rounded-xl p-2 ring-1 ring-[#E8E0D2]" style={{ backgroundColor: '#FAF7F0' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-lg bg-white shadow-sm"
          >
            <div
              className="absolute inset-x-0 top-0 h-3"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
            />
            <div className="space-y-0.5 p-1 pt-3.5">
              <div className="h-1 w-2/3 rounded bg-[#3F3F46]" />
              <div className="h-0.5 w-full rounded bg-[#A3A3A3]/40" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (theme === 'pulse') {
    // Buaze design system layout: pure white + ECG line + 2-col card grid +
    // mono price + lime accent dot. Mirrors the live PulseLayout.
    return (
      <div className="relative h-28 overflow-hidden rounded-xl bg-white p-2.5 ring-1 ring-[#EDEDED]">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
          <div className="h-1 flex-1 rounded bg-[#0A0A0A]" />
          <div className="h-1 w-4 rounded bg-[#0A0A0A]/60" style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
        <svg viewBox="0 0 100 8" className="mt-1.5 h-2 w-full" preserveAspectRatio="none" aria-hidden>
          <path d="M0 4 L24 4 L28 1 L34 7 L40 4 L46 2 L52 6 L58 4 L100 4" stroke={accent} strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg ring-1 ring-[#EDEDED]">
              <div className="h-3.5 bg-[#FAFAFA]" />
              <div className="space-y-0.5 p-1">
                <div className="flex items-center gap-1">
                  <div className="h-1 flex-1 rounded bg-[#0A0A0A]/85" />
                  <div className="h-1 w-3 rounded bg-[#0A0A0A]/85" />
                </div>
                <div className="h-0.5 w-full rounded bg-[#A3A3A3]/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // gastronomy
  return (
    <div className="relative h-28 overflow-hidden rounded-xl bg-[#0A0A0A] p-2.5 ring-1 ring-black">
      <div className="absolute -right-3 -top-3 h-12 w-12 rounded-full opacity-30 blur-xl" style={{ backgroundColor: accent }} />
      <div className="relative">
        <div className="h-2 w-1/3 rounded" style={{ backgroundColor: accent }} />
        <div className="mt-2 h-2 w-3/4 rounded bg-white/85" />
        <div className="mt-2 h-px w-full bg-white/15" />
        <div className="mt-2 space-y-1">
          <div className="flex items-baseline gap-1.5">
            <div className="h-1 flex-1 rounded bg-white/45" />
            <div className="h-1 w-5 rounded" style={{ backgroundColor: accent, opacity: 0.85 }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="h-1 flex-1 rounded bg-white/35" />
            <div className="h-1 w-4 rounded" style={{ backgroundColor: accent, opacity: 0.7 }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="h-1 w-3/4 rounded bg-white/30" />
            <div className="h-1 w-3 rounded" style={{ backgroundColor: accent, opacity: 0.55 }} />
          </div>
        </div>
      </div>
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
    <Modal size={520} title={copy.menuQr} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] p-6 ring-1 ring-[#EDEDED] sm:p-8">
          {previewSvg ? (
            <div
              className="aspect-square w-full max-w-[240px] [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          ) : err ? (
            <div className="flex aspect-square w-full max-w-[240px] flex-col items-center justify-center gap-2 text-center">
              <AlertTriangle size={24} strokeWidth={2} className="text-[#DC2626]" />
              <p className="text-[13px] text-[#991B1B]">{err}</p>
            </div>
          ) : (
            <div className="flex aspect-square w-full max-w-[240px] items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#737373]" />
            </div>
          )}
        </div>

        <div>
          <p className="pulse-eyebrow mb-2 text-[#737373]">{copy.qrFormat}</p>
          <div className="flex gap-2">
            {(['png', 'svg'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-full border px-4 py-2.5 text-[13px] font-medium transition-all ${
                  format === f
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white shadow-sm'
                    : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#EDEDED] pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-[13px] font-medium text-[#525252] transition-colors hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"
          >
            {copy.cancel}
          </button>
          <button
            onClick={download}
            disabled={downloading || !previewSvg}
            className="inline-flex items-center gap-2 rounded-full bg-[#C6F24E] px-6 py-2.5 text-[13px] font-medium text-[#0A0A0A] shadow-sm transition-all hover:bg-[#A8D62E] active:scale-95 disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
            {copy.downloadQr}
          </button>
        </div>
      </div>
    </Modal>
  );
}
