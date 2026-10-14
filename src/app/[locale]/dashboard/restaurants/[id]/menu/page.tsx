'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, ArrowLeft, BarChart3, ChevronRight, Eye, EyeOff, Image as ImageIcon, Loader2,
  Plus, QrCode, RefreshCw, UtensilsCrossed, X,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import PublicMenuView, { type MenuItemView } from '@/components/menu/PublicMenuView';
import { AlertBanner, useConfirmDialog } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';
import MenuBuilderSkeleton from './loading';
import { CategoryModal } from './_components/CategoryModal';
import { ItemModal } from './_components/ItemModal';
import { MenuLivePreview } from './_components/MenuLivePreview';
import { MenuQrModal } from './_components/MenuQrModal';
import { MenuStarter } from './_components/MenuStarter';
import { SortableCategoryRow } from './_components/SortableCategoryRow';
import { SortableItemRow } from './_components/SortableItemRow';
import { ThemePanel } from './_components/ThemePanel';
import { buildMenuCopy } from './_components/menu-copy';
import type { CategoryShape } from './_components/menu-types';
import { useMenuBuilder } from './_components/useMenuBuilder';

export default function RestaurantMenuBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const locale = (params?.locale as Locale) ?? 'tr';
  const isTr = locale === 'tr';
  const previewMode = searchParams?.get('preview') === '1';

  // State + data layer (restaurant, categories, every mutation). Modal, confirm
  // and drag-and-drop state stay here.
  const {
    restaurant, categories, activeCategory, activeCategoryId, setActiveCategoryId,
    loading, error, busy, publishBusy, themeSaving, presetBusy,
    fetchAll, saveTheme, uploadLogo,
    toggleCategoryVisibility, toggleItemAvailability, toggleItemOutOfStock,
    applyStarterPreset,
    saveCategory: persistCategory, deleteCategory: removeCategoryById, reorderCategories, moveCategory,
    saveItem: persistItem, deleteItem: removeItemById, reorderItems, moveItem,
    togglePublish,
  } = useMenuBuilder({ id, isTr });

  const [categoryModal, setCategoryModal] = useState<null | { mode: 'create' | 'edit'; data: Partial<CategoryShape> }>(null);
  const [itemModal, setItemModal] = useState<null | { mode: 'create' | 'edit'; data: Partial<MenuItemView> & { categoryId?: string } }>(null);
  const [qrModal, setQrModal] = useState(false);
  const [confirmDialog, askConfirm] = useConfirmDialog();

  const copy = useMemo(() => buildMenuCopy(isTr), [isTr]);

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  // ── Category ops ──
  const saveCategory = async (payload: Partial<CategoryShape>): Promise<string | null> => {
    if (!categoryModal) return null;
    const err = await persistCategory(categoryModal.mode, categoryModal.data.id, payload);
    if (!err) setCategoryModal(null);
    return err;
  };

  const deleteCategory = (categoryId: string) => {
    askConfirm({
      title: isTr ? 'Kategori silinsin mi?' : 'Delete category?',
      body: copy.deleteCategoryConfirm,
      confirmLabel: isTr ? 'Sil' : 'Delete',
      cancelLabel: isTr ? 'İptal' : 'Cancel',
      variant: 'danger',
      onConfirm: () => removeCategoryById(categoryId),
    });
  };

  const onCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    await reorderCategories(arrayMove(categories, oldIndex, newIndex));
  };

  // ── Item ops ──
  const saveItem = async (
    payload: Partial<MenuItemView> & { categoryId?: string },
  ): Promise<string | null> => {
    if (!itemModal) return null;
    const err = await persistItem(itemModal.mode, itemModal.data.id, payload);
    if (!err) setItemModal(null);
    return err;
  };

  const deleteItem = (itemId: string) => {
    askConfirm({
      title: isTr ? 'Ürün silinsin mi?' : 'Delete item?',
      body: copy.deleteItemConfirm,
      confirmLabel: isTr ? 'Sil' : 'Delete',
      cancelLabel: isTr ? 'İptal' : 'Cancel',
      variant: 'danger',
      onConfirm: () => removeItemById(itemId),
    });
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

  if (loading) {
    // Same skeleton as the segment loading.tsx — no second loading layer.
    return <MenuBuilderSkeleton />;
  }
  if (!restaurant) {
    return (
      <div className="mx-auto max-w-[640px] px-4 sm:px-7 py-12 lg:py-16">
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="shrink-0 rounded-full bg-[#DC2626]/10 p-2">
              <AlertTriangle size={20} strokeWidth={2} className="text-[#DC2626]" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="bz-h-tight text-[20px] text-[#0A0A0A] sm:text-[22px]">
                {isTr ? 'Menü yüklenemedi' : 'Menu could not be loaded'}
              </h1>
              <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">
                {error ??
                  (isTr
                    ? 'Menü verileri alınırken bir sorun oluştu.'
                    : 'Something went wrong while loading the menu.')}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => fetchAll({ initial: true })} className="bz-btn-primary">
              <RefreshCw size={14} strokeWidth={2} />
              {isTr ? 'Tekrar dene' : 'Try again'}
            </button>
            <Link href={`/${locale}/dashboard/restaurants/${id}`} className="bz-btn-ghost">
              <ArrowLeft size={14} strokeWidth={2} />
              {copy.backToMenus}
            </Link>
          </div>
        </div>
      </div>
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
        {/* Shell topbar'ları da sticky top-0 (mobil ~61px z-40, masaüstü ~71px
            z-30); bar onların altına yerleşmeli, üstüne/altına kaymamalı. */}
        <div className="sticky top-[61px] z-20 flex items-center justify-between gap-3 border-b border-[#1A1A1A] bg-[#0A0A0A] px-5 py-3.5 text-white lg:top-[71px]">
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
            className="bz-btn-on-dark bz-btn-sm text-[11px]"
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
    // Mobil bottom-nav boşluğu zaten shell <main>'de; burada tekrarlamak ~190px
    // boşluk bırakıyordu.
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
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
              {/* §38.72 — Back link target değişti: hub yerine restoran detail.
                  1-restoran owner'da hub redirect'i (line 132) infinite loop
                  riski yaratıyordu (`/menu` → `/restaurants/[id]/menu`).
                  Detail page evrensel doğru parent — hub picker sidebar'dan
                  erişilebilir kalır. Copy backToMenus → "İşletmeye Dön". */}
              <Link
                href={`/${locale}/dashboard/restaurants/${id}`}
                className="pulse-eyebrow inline-flex items-center gap-1.5 text-[#737373] transition-colors hover:text-[#0A0A0A]"
              >
                <ArrowLeft size={12} strokeWidth={2.25} />
                {copy.backToMenus}
              </Link>
              {/* §38.73 — Pulse pattern eyebrow (Stage 1 §38.71 13 sayfada
                  uygulanan disipline). Custom hero korunur (kullanıcı kararı),
                  sadece eyebrow + description copy hint inline. */}
              <div className="pulse-eyebrow text-[#525252]">{copy.eyebrow}</div>
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
              <p className="text-[13px] leading-relaxed text-[#525252] max-w-[640px]">
                {copy.pageDescription}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[#737373]">
                <span className={`inline-flex items-center gap-1.5 ${status.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
                  <span className="font-medium">{status.label}</span>
                </span>
                {restaurant.menuUpdatedAt && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-[#EDEDED]" aria-hidden />
                    <span>{copy.lastUpdated}: {formatFullDateTimeInTimeZone(restaurant.menuUpdatedAt, locale === 'en' ? 'en' : 'tr')}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${locale}/dashboard/restaurants/${id}/menu?preview=1`}
                className="bz-btn"
              >
                <Eye size={14} strokeWidth={2} />
                {copy.preview}
              </Link>
              <button
                onClick={() => setQrModal(true)}
                className="bz-btn"
              >
                <QrCode size={14} strokeWidth={2} />
                {copy.menuQr}
              </button>
              <Link
                href={`/${locale}/dashboard/restaurants/${id}/menu/analytics`}
                className="bz-btn"
              >
                <BarChart3 size={14} strokeWidth={2} />
                {copy.analytics}
              </Link>
              {restaurant.menuPublished && (
                <Link
                  href={`/menu/${restaurant.slug}`}
                  target="_blank"
                  className="bz-btn"
                >
                  <ChevronRight size={14} strokeWidth={2} />
                  {copy.viewPublic}
                </Link>
              )}
              <button
                onClick={togglePublish}
                disabled={publishBusy || !restaurant.menuEnabled}
                className={`${restaurant.menuPublished ? 'bz-btn-warn' : 'bz-btn-lime'} disabled:opacity-50`}
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

      {/* Menu Design (theme + accent color + logo) — yan panelde canlı
          önizleme: tema/accent/logo değiştirildiğinde anlık müşteri
          görünümü, save-and-see loop'u kaldırır. Mobile'da preview
          panel gizli (340px phone mockup mobile'da kafa karıştırır).
          Column 340px: 308 bezel + 16 stage padding + ~16 breathing. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <ThemePanel
          restaurant={restaurant}
          copy={copy}
          locale={locale}
          saving={themeSaving}
          onChange={saveTheme}
          onUploadLogo={uploadLogo}
        />
        <MenuLivePreview
          restaurant={restaurant}
          categories={categories}
          locale={locale}
          published={restaurant.menuEnabled && restaurant.menuPublished}
        />
      </div>

      {/* §38.73 — Mobile preview hint. MenuLivePreview lg:block; mobile owner
          "preview nereye gitti?" diye düşünmesin diye küçük inline info card. */}
      <div className="lg:hidden flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-3.5 py-2.5 text-[12px] text-[#525252]">
        <Eye size={13} strokeWidth={2} className="shrink-0 text-[#737373]" />
        <span>
          {isTr
            ? 'Canlı menü önizlemesi masaüstünde sağ tarafta görünür.'
            : 'Live menu preview is shown on the right side on desktop.'}
        </span>
      </div>

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
              disabled={!restaurant.menuEnabled}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] shadow-sm transition-all hover:bg-[#A8D62E] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
              {/* §38.73 — Boş state CTA Lime PRIMARY (header ile birebir).
                  Eski graphite stil "neden farklı?" mental drift yaratıyordu;
                  aynı semantik aksiyon = aynı görsel hiyerarşi (Pulse §11). */}
              <button
                onClick={() => setCategoryModal({ mode: 'create', data: { isVisible: true } })}
                disabled={!restaurant.menuEnabled}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-4 py-2 text-[12px] font-medium text-[#0A0A0A] shadow-sm transition-all hover:bg-[#A8D62E] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
                      onSelect={() => {
                        setActiveCategoryId(c.id);
                        // Mobile UX: kategori değiştirince items pane'ne
                        // smooth scroll yap (lg+'da two-pane zaten yan yana,
                        // scroll gereksiz). Eskiden mobilde kategori
                        // tıklayınca items pane görünmüyordu, kullanıcı
                        // sayfayı manuel scroll etmek zorundaydı.
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          requestAnimationFrame(() => {
                            document
                              .getElementById('menu-items-pane')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          });
                        }
                      }}
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
        <section
          id="menu-items-pane"
          className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm scroll-mt-20"
        >
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
                disabled={!restaurant.menuEnabled}
                className="bz-btn-primary bz-btn-sm shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={14} strokeWidth={2.25} />
                {copy.addItem}
              </button>
            )}
          </div>
          {!activeCategory ? (
            categories.length === 0 ? (
              <MenuStarter
                isTr={isTr}
                presetBusy={presetBusy}
                menuEnabled={restaurant.menuEnabled}
                onApplyPreset={applyStarterPreset}
                onStartEmpty={() => setCategoryModal({ mode: 'create', data: { isVisible: true } })}
              />
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
                disabled={!restaurant.menuEnabled}
                className="bz-btn-primary bz-btn-sm mt-1 disabled:cursor-not-allowed disabled:opacity-50"
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
