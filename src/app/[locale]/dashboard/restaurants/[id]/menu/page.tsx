'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, ArrowLeft, BarChart3, CheckCircle2, Eye, Palette, QrCode, RefreshCw, Smartphone, X,
} from 'lucide-react';
import PublicMenuView, { type MenuItemView } from '@/components/menu/PublicMenuView';
import { AlertBanner, Modal, PageHeader, useConfirmDialog } from '@/components/ui';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { getMenuReadiness } from '@/lib/menu-readiness';
import { detectSector } from '@/lib/sector-platforms';
import type { Locale } from '@/lib/translations';
import MenuBuilderSkeleton from './loading';
import { BulkAddModal } from './_components/BulkAddModal';
import { CategoryModal } from './_components/CategoryModal';
import { CategoryChips, CategoryColumn } from './_components/CategoryNav';
import { ItemEditorModal } from './_components/ItemEditorModal';
import { ItemList } from './_components/ItemList';
import { MenuDesignModal } from './_components/MenuDesignModal';
import { MenuLivePreview } from './_components/MenuLivePreview';
import { MenuShareModal } from './_components/MenuShareModal';
import { MenuStarter } from './_components/MenuStarter';
import { MenuStatusBar, type MenuLockReason, type MenuStepId } from './_components/MenuStatusBar';
import type { ItemPatch } from './_components/menu-item-form';
import type { CategoryShape } from './_components/menu-types';
import { useIsDesktop } from './_components/menu-ui';
import { useMenuBuilder } from './_components/useMenuBuilder';

type ItemDraft = Partial<MenuItemView> & { categoryId?: string };

export default function RestaurantMenuBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const locale = (params?.locale as Locale) ?? 'tr';
  const isTr = locale === 'tr';
  const previewMode = searchParams?.get('preview') === '1';

  // State + data layer (restaurant, categories, every mutation). Modal and
  // confirm state stay here.
  const {
    restaurant, categories, activeCategory, activeCategoryId, setActiveCategoryId,
    loading, error, setError, notice, setNotice, busy, publishBusy, presetBusy,
    themeStatus, themeError, setThemeError,
    fetchAll, previewTheme, saveTheme, uploadLogo, uploadPhoto,
    toggleCategoryVisibility, toggleItemAvailability, toggleItemOutOfStock,
    applyStarterPreset,
    saveCategory: persistCategory, deleteCategory: removeCategoryById, reorderCategories, moveCategory,
    saveItem: persistItem, bulkAddItems, deleteItem: removeItemById, reorderItems, moveItem,
    togglePublish, copy, fmt,
  } = useMenuBuilder({ id, isTr });

  const { isViewer, loading: roleLoading } = useCurrentRole();
  const isDesktop = useIsDesktop();

  const [categoryModal, setCategoryModal] = useState<null | { mode: 'create' | 'edit'; data: Partial<CategoryShape> }>(null);
  const [itemModal, setItemModal] = useState<null | { mode: 'create' | 'edit'; data: ItemDraft }>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [confirmDialog, askConfirm] = useConfirmDialog();

  const readiness = useMemo(() => getMenuReadiness(categories), [categories]);

  // Admin switch off → the whole editing surface is locked. A viewer role is
  // read-only too, and so is everything until the role has loaded (a viewer
  // must never see editable controls that would answer 403).
  const menuEnabled = restaurant?.menuEnabled ?? true;
  const readOnly = !menuEnabled || isViewer || roleLoading;
  const lockReason: MenuLockReason = !menuEnabled ? 'locked' : isViewer ? 'viewer' : null;

  // `?edit=<itemId>` (from analytics) opens that item once; `?share=1` opens the
  // QR dialog once. Both are removed from the URL afterwards. An unknown item
  // (deleted since, other business) is ignored without a word.
  const paramsHandled = useRef(false);
  useEffect(() => {
    if (paramsHandled.current || loading || !restaurant || roleLoading || previewMode) return;
    paramsHandled.current = true;
    const editId = searchParams?.get('edit') ?? null;
    const wantsShare = searchParams?.get('share') === '1';
    if (!editId && !wantsShare) return;

    if (editId && !readOnly) {
      const owner = categories.find((c) => c.items.some((i) => i.id === editId));
      const item = owner?.items.find((i) => i.id === editId);
      if (owner && item) {
        setActiveCategoryId(owner.id);
        setItemModal({ mode: 'edit', data: { ...item, categoryId: owner.id } });
      }
    }
    if (wantsShare && restaurant.menuEnabled) setShareOpen(true);

    const rest = new URLSearchParams(searchParams?.toString() ?? '');
    rest.delete('edit');
    rest.delete('share');
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [loading, restaurant, roleLoading, previewMode, readOnly, categories, searchParams, pathname, router, setActiveCategoryId]);

  // ── Open dialogs ──
  const openCategoryCreate = () => setCategoryModal({ mode: 'create', data: { isVisible: true } });
  const openItemCreate = () => {
    if (!activeCategory) return openCategoryCreate();
    setItemModal({
      mode: 'create',
      data: { categoryId: activeCategory.id, isAvailable: true, isOutOfStock: false, badges: [] },
    });
  };
  const openBulk = () => {
    if (!activeCategory) return openCategoryCreate();
    setBulkOpen(true);
  };
  const openItemEdit = (item: MenuItemView) =>
    setItemModal({ mode: 'edit', data: { ...item, categoryId: activeCategory?.id } });

  // ── Category ops ──
  const saveCategory = async (payload: Partial<CategoryShape>): Promise<string | null> => {
    if (!categoryModal) return null;
    const err = await persistCategory(categoryModal.mode, categoryModal.data.id, payload);
    if (!err) setCategoryModal(null);
    return err;
  };

  const askDeleteCategory = (c: CategoryShape) => {
    const n = c.items.length;
    askConfirm({
      title: n > 0 ? fmt.deleteCategoryWithItemsTitle(c.name, n) : fmt.deleteCategoryTitle(c.name),
      body: n > 0 ? fmt.deleteCategoryWithItemsBody() : fmt.deleteCategoryBody(),
      confirmLabel: n > 0 ? copy.deleteCategoryAndItems : copy.delete,
      cancelLabel: copy.cancel,
      variant: 'danger',
      onConfirm: async () => {
        await removeCategoryById(c.id, { deleteItems: n > 0 });
      },
    });
  };

  // ── Item ops ──
  // The editor closes itself (it also stays open for "save & add another").
  const saveItem = async (patch: ItemPatch): Promise<string | null> => {
    if (!itemModal) return null;
    return persistItem(itemModal.mode, itemModal.data.id, patch);
  };

  const submitBulk = async (categoryId: string, items: { name: string; priceCents: number }[]) => {
    const result = await bulkAddItems(categoryId, items);
    if (result.ok) setBulkOpen(false);
    return result;
  };

  const askDeleteItem = (item: MenuItemView) => {
    askConfirm({
      title: fmt.deleteItemTitle(item.name),
      body: fmt.deleteItemBody(),
      confirmLabel: copy.delete,
      cancelLabel: copy.cancel,
      variant: 'danger',
      onConfirm: () => removeItemById(item.id),
    });
  };

  // ── Publish ──
  const publish = async () => {
    const result = await togglePublish();
    if (result === 'published') setJustPublished(true);
  };
  const askUnpublish = () => {
    askConfirm({
      title: copy.unpublishTitle,
      body: copy.unpublishBody,
      confirmLabel: copy.unpublish,
      cancelLabel: copy.keepIt,
      variant: 'danger',
      onConfirm: async () => {
        setJustPublished(false);
        await togglePublish();
      },
    });
  };

  const onStep = (step: MenuStepId) => {
    if (step === 'category') openCategoryCreate();
    else if (step === 'items') openItemCreate();
    else void publish();
  };

  const onApplyPreset = async (preset: Parameters<typeof applyStarterPreset>[0]) => {
    const result = await applyStarterPreset(preset);
    if (result.created > 0 && typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() =>
        document.getElementById('menu-items-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
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

  const menuHref = `/${locale}/dashboard/restaurants/${id}/menu`;
  const activeIndex = activeCategory ? categories.findIndex((c) => c.id === activeCategory.id) : -1;
  const canDesign = restaurant.menuEnabled && !isViewer;

  const previewButton = (
    <button
      type="button"
      onClick={() => setPreviewOpen(true)}
      className="bz-btn-ghost hidden lg:max-[1399px]:inline-flex"
    >
      <Smartphone size={14} strokeWidth={2} />
      {copy.previewRail}
    </button>
  );

  return (
    // Mobil bottom-nav boşluğu zaten shell <main>'de; burada tekrarlamak ~190px
    // boşluk bırakıyordu.
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <div className="space-y-3">
        {/* Back goes to the business page (not the menu hub: with one business
            the hub redirects straight back here). */}
        <Link
          href={`/${locale}/dashboard/restaurants/${id}`}
          className="pulse-eyebrow inline-flex min-h-[32px] items-center gap-1.5 text-[#737373] transition-colors hover:text-[#0A0A0A]"
        >
          <ArrowLeft size={12} strokeWidth={2.25} />
          {copy.backToMenus}
        </Link>
        <PageHeader
          className="!mb-0"
          eyebrow={copy.eyebrow}
          title={restaurant.name}
          titleScale="compact"
          description={<span className="hidden sm:inline">{copy.pageDescription}</span>}
          actions={
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Link href={`${menuHref}?preview=1`} className="bz-btn">
                <Eye size={14} strokeWidth={2} />
                {copy.preview}
              </Link>
              {canDesign && (
                <button type="button" onClick={() => setDesignOpen(true)} disabled={roleLoading} className="bz-btn">
                  <Palette size={14} strokeWidth={2} />
                  {copy.design}
                </button>
              )}
              {restaurant.menuEnabled && (
                <button type="button" onClick={() => setShareOpen(true)} className="bz-btn">
                  <QrCode size={14} strokeWidth={2} />
                  <span className="sm:hidden">{copy.shareShort}</span>
                  <span className="hidden sm:inline">{copy.shareAndQr}</span>
                </button>
              )}
              <Link href={`${menuHref}/analytics`} className="bz-btn">
                <BarChart3 size={14} strokeWidth={2} />
                {copy.analytics}
              </Link>
            </div>
          }
        />
      </div>

      <MenuStatusBar
        isTr={isTr}
        copy={copy}
        fmt={fmt}
        restaurant={restaurant}
        readiness={readiness}
        lockReason={lockReason}
        readOnly={readOnly}
        publishBusy={publishBusy}
        justPublished={justPublished}
        analyticsHref={`${menuHref}/analytics`}
        onDismissPublished={() => setJustPublished(false)}
        onPublish={publish}
        onUnpublish={askUnpublish}
        onOpenShare={() => setShareOpen(true)}
        onStep={onStep}
      />

      {(error || notice) && (
        <div className="space-y-3">
          {error && (
            <AlertBanner
              kind="danger"
              icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}
              onDismiss={() => setError(null)}
            >
              {error}
            </AlertBanner>
          )}
          {notice && (
            <AlertBanner
              kind="success"
              icon={<CheckCircle2 size={14} strokeWidth={2} className="mt-0.5" />}
              onDismiss={() => setNotice(null)}
            >
              <span aria-live="polite">{notice}</span>
            </AlertBanner>
          )}
        </div>
      )}

      {categories.length === 0 ? (
        <MenuStarter
          isTr={isTr}
          copy={copy}
          sector={restaurant.category ? detectSector(restaurant.category) : null}
          presetBusy={presetBusy}
          readOnly={readOnly}
          onApplyPreset={onApplyPreset}
          onStartEmpty={openCategoryCreate}
        />
      ) : (
        <>
          <CategoryChips
            categories={categories}
            activeId={activeCategoryId}
            readOnly={readOnly}
            isTr={isTr}
            copy={copy}
            fmt={fmt}
            onSelect={setActiveCategoryId}
            onAdd={openCategoryCreate}
          />
          {/* Two columns from 1024px, three from 1400px. The two ranges are written
              as exclusive media queries: Tailwind emits arbitrary `min-[1400px]`
              rules BEFORE the named `lg:` ones, so a plain `lg:` + `min-[1400px]:`
              pair would let `lg:` win at 1440. */}
          <div className="grid items-start gap-5 lg:max-[1399px]:grid-cols-[240px_minmax(0,1fr)] min-[1400px]:grid-cols-[240px_minmax(0,1fr)_320px]">
            <CategoryColumn
              categories={categories}
              activeId={activeCategoryId}
              readOnly={readOnly}
              isTr={isTr}
              copy={copy}
              fmt={fmt}
              onSelect={setActiveCategoryId}
              onAdd={openCategoryCreate}
              onRename={(c) => setCategoryModal({ mode: 'edit', data: c })}
              onToggleVisible={toggleCategoryVisibility}
              onMove={moveCategory}
              onDelete={askDeleteCategory}
              onReorder={reorderCategories}
            />

            {activeCategory ? (
              <ItemList
                category={activeCategory}
                categoryIndex={activeIndex}
                categoryTotal={categories.length}
                isTr={isTr}
                locale={locale}
                readOnly={readOnly}
                isDesktop={isDesktop}
                copy={copy}
                fmt={fmt}
                headerExtra={previewButton}
                onAddItem={openItemCreate}
                onBulkAdd={openBulk}
                onEditItem={openItemEdit}
                onToggleSoldOut={toggleItemOutOfStock}
                onToggleHidden={toggleItemAvailability}
                onMoveItem={moveItem}
                onDeleteItem={askDeleteItem}
                onReorderItems={reorderItems}
                onRenameCategory={() => setCategoryModal({ mode: 'edit', data: activeCategory })}
                onToggleCategoryVisible={() => toggleCategoryVisibility(activeCategory)}
                onMoveCategory={(dir) => moveCategory(activeIndex, dir)}
                onDeleteCategory={() => askDeleteCategory(activeCategory)}
              />
            ) : (
              <p className="rounded-3xl border border-[#EDEDED] bg-white px-6 py-16 text-center text-[13px] text-[#525252] shadow-sm">
                {copy.noCategorySelected}
              </p>
            )}

            <MenuLivePreview
              restaurant={restaurant}
              categories={categories}
              locale={locale}
              published={restaurant.menuEnabled && restaurant.menuPublished}
            />
          </div>
        </>
      )}

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

      {itemModal && (
        <ItemEditorModal
          mode={itemModal.mode}
          data={itemModal.data}
          categories={categories}
          isTr={isTr}
          copy={copy}
          fmt={fmt}
          onClose={() => setItemModal(null)}
          onSave={saveItem}
          onUploadPhoto={(file) => uploadPhoto(file, 'item')}
        />
      )}

      {bulkOpen && activeCategory && (
        <BulkAddModal
          categories={categories}
          defaultCategoryId={activeCategory.id}
          isTr={isTr}
          copy={copy}
          fmt={fmt}
          onClose={() => setBulkOpen(false)}
          onSubmit={submitBulk}
        />
      )}

      {designOpen && canDesign && (
        <MenuDesignModal
          restaurant={restaurant}
          categories={categories}
          isTr={isTr}
          locale={locale}
          copy={copy}
          fmt={fmt}
          status={themeStatus}
          error={themeError}
          onDismissError={() => setThemeError(null)}
          onPreview={previewTheme}
          onSave={saveTheme}
          onUploadLogo={uploadLogo}
          onClose={() => setDesignOpen(false)}
        />
      )}

      {shareOpen && restaurant.menuEnabled && (
        <MenuShareModal
          restaurantId={id}
          restaurant={restaurant}
          isTr={isTr}
          copy={copy}
          canPublish={!readOnly}
          hasPublishableItems={readiness.publishableItems > 0}
          publishBusy={publishBusy}
          analyticsHref={`${menuHref}/analytics`}
          onPublish={publish}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* 1024–1399px: no side column, so the live preview opens in a dialog. */}
      {previewOpen && (
        <Modal size={420} title={copy.previewRail} onClose={() => setPreviewOpen(false)}>
          <MenuLivePreview
            variant="inline"
            restaurant={restaurant}
            categories={categories}
            locale={locale}
            published={restaurant.menuEnabled && restaurant.menuPublished}
          />
        </Modal>
      )}

      {/* Imperative confirm dialog (delete category / item, take offline) */}
      {confirmDialog}
    </div>
  );
}
