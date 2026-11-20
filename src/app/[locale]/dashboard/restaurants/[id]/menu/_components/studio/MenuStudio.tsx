'use client';

import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState, useConfirmDialog } from '@/components/ui';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { getMenuReadiness } from '@/lib/menu-readiness';
import { useUnsavedGuard } from '@/app/[locale]/dashboard/surveys/_components/useUnsavedGuard';
import MenuBuilderSkeleton from '../../loading';
import { useMenuActions } from '../data/useMenuActions';
import { useMenuData, type MenuDataHandle } from '../data/useMenuData';
import { usePhotoUpload } from '../data/usePhotoUpload';
import { ItemPanel, useItemPanelKey, type ItemPanelSaved } from '../item/ItemPanel';
import { SaveIndicator } from '../kit/SaveIndicator';
import { STORAGE_KEYS, safeLocalGet, safeLocalSet } from '../kit/storage';
import { ToasterProvider, useToaster, useToasterState } from '../kit/Toaster';
import { useFileDropGuard } from '../kit/useFileDropGuard';
import { filterCounts, filterMenu, visibleItemIds, type MenuFilter } from '../menu-filter';
import { getMenuCopy } from '../menu-i18n';
import { DRAFT_ITEM_ID, isTempId, overlayItemDraft, withoutTemps, type ItemDraftOverlay } from '../menu-merge';
import { customerVisibility, menuNudges } from '../menu-status';
import type { ItemTarget, MenuData } from '../menu-types';
import { scrollBehavior, useFinePointer, useIsDesktop, useOnline } from '../menu-ui';
import { CategoryChips } from '../outline/CategoryChips';
import { MenuOutline } from '../outline/MenuOutline';
import { PhonePreview } from '../preview/PhonePreview';
import { PreviewPanel } from '../preview/PreviewPanel';
import { RightPanel } from '../preview/RightPanel';
import { ShareDialog } from '../share/ShareDialog';
import { ContextBar } from './ContextBar';
import { LoadErrorView } from './LoadErrorView';
import { MenuStatusCard, type MenuStepId } from './MenuStatusCard';
import { StudioContext, type StudioContextValue } from './studio-context';
import { StudioHeader } from './StudioHeader';
import { StudioToolbar } from './StudioToolbar';
import { useScrollSpy } from './useScrollSpy';
import { useUrlIntents } from './useUrlIntents';
import type { StudioView } from './ViewSwitch';

const EMPTY_SET: Set<string> = new Set();
const LINGER_MS = 1200;

function readCollapsed(restaurantId: string): Set<string> {
  try {
    const raw = safeLocalGet(STORAGE_KEYS.collapsed(restaurantId));
    const list = raw ? (JSON.parse(raw) as unknown) : null;
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * Owner Menu Studio (spec §7.2): loads the menu and the role, shows the
 * skeleton until both are known (no disabled-controls flash), then the studio.
 */
export function MenuStudio({ restaurantId, locale }: { restaurantId: string; locale: 'tr' | 'en' }) {
  const isTr = locale === 'tr';
  const copy = getMenuCopy(locale);
  const menu = useMenuData(restaurantId, isTr);
  const { isViewer, loading: roleLoading } = useCurrentRole();

  if (!menu.data) {
    if (menu.loadError && !menu.isLoadingFresh) {
      return (
        <LoadErrorView
          copy={copy}
          message={menu.loadError}
          onRetry={() => void menu.fetchAll()}
          backHref={`/${locale}/dashboard/restaurants/${restaurantId}`}
        />
      );
    }
    return <MenuBuilderSkeleton />;
  }
  if (roleLoading) return <MenuBuilderSkeleton />;

  const { restaurant } = menu.data;
  return (
    <ToasterProvider copy={copy} published={restaurant.menuPublished && restaurant.menuEnabled}>
      <StudioLoaded restaurantId={restaurantId} locale={locale} data={menu.data} menu={menu} isViewer={isViewer} />
    </ToasterProvider>
  );
}

function StudioLoaded({
  restaurantId, locale, data, menu, isViewer,
}: {
  restaurantId: string;
  locale: 'tr' | 'en';
  data: MenuData;
  menu: MenuDataHandle;
  isViewer: boolean;
}) {
  const isTr = locale === 'tr';
  const copy = useMemo(() => getMenuCopy(locale), [locale]);
  const toaster = useToaster();
  const toasterState = useToasterState();
  const queryClient = useQueryClient();
  const { restaurant, categories } = data;

  const menuEnabled = restaurant.menuEnabled;
  const readOnly = !menuEnabled || isViewer;
  const lockReason = !menuEnabled ? 'locked' : isViewer ? 'viewer' : null;
  const canEdit = !readOnly;
  const canDesign = menuEnabled && !isViewer;
  const canShare = menuEnabled;
  const isPublished = restaurant.menuPublished && menuEnabled;

  const isDesktop = useIsDesktop(true);
  const finePointer = useFinePointer();
  const online = useOnline();
  const upload = usePhotoUpload(restaurantId, isTr);
  useFileDropGuard();

  // ── state ──
  const [mode, setModeState] = useState<'edit' | 'service'>(() => (safeLocalGet(STORAGE_KEYS.mode) === 'service' ? 'service' : 'edit'));
  const [phonePreview, setPhonePreview] = useState(false);
  const [itemTarget, setItemTarget] = useState<ItemTarget | null>(null);
  const [itemFocus, setItemFocus] = useState<'photo' | 'description' | undefined>(undefined);
  const [itemNonce, setItemNonce] = useState(0);
  const [rightTab, setRightTab] = useState<'preview' | 'item'>('preview');
  const [itemSheetTab, setItemSheetTab] = useState<'edit' | 'preview'>('edit');
  const [previewCollapsed, setPreviewCollapsed] = useState(() => safeLocalGet(STORAGE_KEYS.previewCollapsed) === '1');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MenuFilter>('all');
  const [lingerIds, setLingerIds] = useState<Set<string>>(EMPTY_SET);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsed(restaurantId));
  const [shareOpen, setShareOpen] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [itemDraft, setItemDraft] = useState<ItemDraftOverlay | null>(null);
  const [itemDirty, setItemDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [serviceHintSeen, setServiceHintSeen] = useState(() => safeLocalGet(STORAGE_KEYS.serviceHint) === '1');
  const [confirmDialog, askConfirm] = useConfirmDialog();
  const itemDirtyRef = useRef(false);

  // ── row flash (Web Animations: survives React re-renders of the row) ──
  const flashItem = useCallback((itemId: string) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById(`menu-row-li-${itemId}`);
        if (!el) return;
        el.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.animate(
          reduced
            ? [{ backgroundColor: '#EAF9B8' }, { backgroundColor: '#EAF9B8' }]
            : [{ backgroundColor: '#EAF9B8' }, { backgroundColor: 'rgba(234,249,184,0)' }],
          { duration: 900, easing: reduced ? 'steps(1, end)' : 'ease-out' },
        );
      }),
    );
  }, []);

  const { fetchAll } = menu;
  const onAccessLost = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['current-user-role'] });
    void fetchAll();
  }, [queryClient, fetchAll]);

  const { actions, rows, pendingCreates, pending, savedAt, saveError, publishBusy } = useMenuActions({
    restaurantId,
    isTr,
    copy,
    menu: { setMenu: menu.setMenu, getMenu: menu.getMenu, touchLocal: menu.touchLocal, fetchAll: menu.fetchAll },
    toaster,
    upload,
    onAccessLost,
    onFlash: flashItem,
  });

  // ── derived ──
  const stable = useMemo(() => withoutTemps(categories), [categories]);
  const readiness = useMemo(() => getMenuReadiness(stable), [stable]);
  const nudges = useMemo(() => menuNudges(stable), [stable]);
  const counts = useMemo(() => filterCounts(categories), [categories]);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterMenu(categories, deferredQuery, filter, { keepIds: lingerIds }),
    [categories, deferredQuery, filter, lingerIds],
  );
  const effectiveCollapsed = filtered.active ? EMPTY_SET : collapsed;
  const visibleIds = useMemo(() => visibleItemIds(filtered.sections, effectiveCollapsed), [filtered.sections, effectiveCollapsed]);
  const completion = filter === 'noPhoto' || filter === 'noDescription' ? filter : null;
  const sectionIds = useMemo(() => filtered.sections.map((s) => s.category.id), [filtered.sections]);
  const activeCategoryId = useScrollSpy(sectionIds, isDesktop ? 180 : 124);
  const soldOutIds = useMemo(
    () => (filter === 'soldOut' ? filtered.sections.flatMap((s) => s.items.filter((i) => i.isOutOfStock).map((i) => i.id)) : []),
    [filter, filtered.sections],
  );

  // Latest values for the stable callbacks below.
  const latest = useRef({ categories, visibleIds, activeCategoryId, collapsed, filterActive: filtered.active, mode });
  latest.current = { categories, visibleIds, activeCategoryId, collapsed, filterActive: filtered.active, mode };

  // ── registries (quick-add, new category, inline cells) ──
  const quickAdds = useRef(new Map<string, () => void>());
  const priceCells = useRef(new Map<string, () => void>());
  const nameCells = useRef(new Map<string, () => void>());
  const newCategoryOpen = useRef<(() => void) | null>(null);
  const register = (map: Map<string, () => void>) => (key: string, open: () => void) => {
    map.set(key, open);
    return () => {
      if (map.get(key) === open) map.delete(key);
    };
  };
  const registerQuickAdd = useMemo(() => register(quickAdds.current), []);
  const registerPriceCell = useMemo(() => register(priceCells.current), []);
  const registerNameCell = useMemo(() => register(nameCells.current), []);
  const registerNewCategory = useCallback((open: () => void) => {
    newCategoryOpen.current = open;
    return () => {
      if (newCategoryOpen.current === open) newCategoryOpen.current = null;
    };
  }, []);

  // ── modes ──
  const setMode = useCallback((m: 'edit' | 'service') => {
    setModeState(m);
    safeLocalSet(STORAGE_KEYS.mode, m);
    setPhonePreview(false);
  }, []);

  /** Leave search / filter / Servis / phone preview so a section's editing rows are on screen. */
  const showEditing = useCallback(() => {
    setQuery('');
    setFilter('all');
    setPhonePreview(false);
    if (latest.current.mode !== 'edit') setMode('edit');
  }, [setMode]);

  const expand = useCallback((categoryId: string) => {
    setCollapsed((prev) => {
      if (!prev.has(categoryId)) return prev;
      const next = new Set(prev);
      next.delete(categoryId);
      safeLocalSet(STORAGE_KEYS.collapsed(restaurantId), JSON.stringify([...next]));
      return next;
    });
  }, [restaurantId]);

  const onToggleCollapse = useCallback((categoryId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      safeLocalSet(STORAGE_KEYS.collapsed(restaurantId), JSON.stringify([...next]));
      return next;
    });
  }, [restaurantId]);

  const setAllCollapsed = (all: boolean) => {
    const next = all ? new Set(categories.map((c) => c.id)) : new Set<string>();
    safeLocalSet(STORAGE_KEYS.collapsed(restaurantId), JSON.stringify([...next]));
    setCollapsed(next);
  };

  // ── item panel (every open / close path goes through the dirty guard) ──
  const guardItem = useCallback((proceed: () => void) => {
    if (itemDirtyRef.current) setPendingLeave(() => proceed);
    else proceed();
  }, []);
  const onDirtyChange = useCallback((dirty: boolean) => {
    itemDirtyRef.current = dirty;
    setItemDirty(dirty);
  }, []);
  const showTarget = useCallback((target: ItemTarget, focus?: 'photo' | 'description') => {
    itemDirtyRef.current = false;
    setItemDirty(false);
    setPendingLeave(null);
    setItemTarget(target);
    setItemFocus(focus);
    setItemNonce((n) => n + 1);
    setRightTab('item');
    setItemSheetTab('edit');
  }, []);

  const openItem = useCallback(
    (itemId: string, focus?: 'photo' | 'description') => {
      if (isTempId(itemId)) return;
      guardItem(() => showTarget({ mode: 'edit', itemId }, focus));
    },
    [guardItem, showTarget],
  );
  const createItemIn = useCallback(
    (categoryId: string) => guardItem(() => showTarget({ mode: 'create', categoryId })),
    [guardItem, showTarget],
  );

  const closeItemNow = useCallback((restoreFocus = true) => {
    setItemTarget((current) => {
      if (restoreFocus && current?.mode === 'edit') {
        const id = current.itemId;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const row = document.getElementById(`menu-row-${id}`);
            row?.focus({ preventScroll: true });
            row?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
          }),
        );
      }
      return null;
    });
    setItemDraft(null);
    itemDirtyRef.current = false;
    setItemDirty(false);
    setPendingLeave(null);
    setRightTab('preview');
  }, []);
  const requestCloseItem = useCallback(() => guardItem(() => closeItemNow()), [guardItem, closeItemNow]);

  const linger = useCallback((itemId: string) => {
    setLingerIds((prev) => new Set(prev).add(itemId));
    window.setTimeout(() => {
      setLingerIds((prev) => {
        if (!prev.has(itemId)) return prev;
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, LINGER_MS);
  }, []);

  const onSaved = useCallback(
    (saved: ItemPanelSaved | null) => {
      closeItemNow(!saved?.itemId);
      if (!saved) return;
      toaster.notify({ message: copy.fmt.toast.saved(saved.name), undo: saved.undo });
      if (saved.itemId) {
        const id = saved.itemId;
        if (completion) linger(id);
        flashItem(id);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => document.getElementById(`menu-row-${id}`)?.focus({ preventScroll: true })),
        );
      }
    },
    [closeItemNow, toaster, copy, completion, linger, flashItem],
  );
  const onGone = useCallback(() => {
    closeItemNow(false);
    toaster.notify({ message: copy.item.goneToast, tone: 'info' });
  }, [closeItemNow, toaster, copy]);
  const onNavigate = useCallback((itemId: string) => openItem(itemId), [openItem]);

  // ── outline navigation ──
  const jumpToCategory = useCallback(
    (categoryId: string) => {
      expand(categoryId);
      if (latest.current.filterActive) {
        setQuery('');
        setFilter('all');
      }
      setPhonePreview(false);
      requestAnimationFrame(() =>
        document.getElementById(`menu-section-${categoryId}`)?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }),
      );
    },
    [expand],
  );
  const focusQuickAdd = useCallback(
    (categoryId: string) => {
      showEditing();
      expand(categoryId);
      requestAnimationFrame(() => requestAnimationFrame(() => quickAdds.current.get(categoryId)?.()));
    },
    [showEditing, expand],
  );
  const focusNewCategory = useCallback(() => {
    showEditing();
    requestAnimationFrame(() => requestAnimationFrame(() => newCategoryOpen.current?.()));
  }, [showEditing]);

  const openPriceCell = useCallback((fromItemId: string, dir: 1 | -1) => {
    const ids = latest.current.visibleIds;
    const index = ids.indexOf(fromItemId);
    const target = index === -1 ? undefined : ids[index + dir];
    if (target) priceCells.current.get(target)?.();
  }, []);
  const openNameCell = useCallback((itemId: string) => nameCells.current.get(itemId)?.(), []);

  const focusAfterRemoval = useCallback((itemId: string) => {
    const { visibleIds: ids, categories: cats } = latest.current;
    const index = ids.indexOf(itemId);
    const next = index === -1 ? undefined : (ids[index + 1] ?? ids[index - 1]);
    const owner = cats.find((c) => c.items.some((i) => i.id === itemId));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el =
          (next && document.getElementById(`menu-row-${next}`)) ||
          (owner && document.getElementById(`menu-section-toggle-${owner.id}`));
        el?.focus();
      }),
    );
  }, []);

  const getCategories = useCallback(() => latest.current.categories, []);

  const studio = useMemo<StudioContextValue>(
    () => ({
      restaurantId, locale, isTr, copy, readOnly, canEdit, isPublished, finePointer, mode, actions, toaster,
      getCategories, openItem, createItemIn, focusQuickAdd, focusNewCategory, jumpToCategory, registerQuickAdd,
      registerNewCategory, registerPriceCell, openPriceCell, registerNameCell, openNameCell, flashItem, linger,
      focusAfterRemoval, askConfirm,
    }),
    [
      restaurantId, locale, isTr, copy, readOnly, canEdit, isPublished, finePointer, mode, actions, toaster,
      getCategories, openItem, createItemIn, focusQuickAdd, focusNewCategory, jumpToCategory, registerQuickAdd,
      registerNewCategory, registerPriceCell, openPriceCell, registerNameCell, openNameCell, flashItem, linger,
      focusAfterRemoval, askConfirm,
    ],
  );

  // ── guards & URL intents ──
  const guard = useUnsavedGuard(itemDirty || pending > 0, locale);
  const onEditIntent = useCallback(
    (itemId: string, categoryId: string) => {
      expand(categoryId);
      showTarget({ mode: 'edit', itemId });
      flashItem(itemId);
    },
    [expand, showTarget, flashItem],
  );
  const onShareIntent = useCallback(() => setShareOpen(true), []);
  useUrlIntents({ ready: true, readOnly, menuEnabled, categories, onEdit: onEditIntent, onShare: onShareIntent });

  // ── publish ──
  const publish = useCallback(async () => {
    const r = await actions.publish();
    if (r.ok) setJustPublished(true);
  }, [actions]);
  const unpublish = () =>
    askConfirm({
      title: copy.status.unpublishTitle,
      body: copy.status.unpublishBody,
      confirmLabel: copy.status.unpublish,
      cancelLabel: copy.status.keepIt,
      variant: 'danger',
      onConfirm: async () => {
        setJustPublished(false);
        await actions.unpublish();
      },
    });

  const onStep = (step: MenuStepId) => {
    if (step === 'category') focusNewCategory();
    else if (step === 'items') {
      const first = categories[0];
      if (first) focusQuickAdd(first.id);
      else focusNewCategory();
    } else void publish();
  };

  const scrollToOutline = () =>
    requestAnimationFrame(() =>
      document.getElementById('menu-items-pane')?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }),
    );
  const onNudge = (f: Exclude<MenuFilter, 'all'>) => {
    setQuery('');
    setFilter(f);
    setPhonePreview(false);
    scrollToOutline();
  };

  // ── view switching ──
  const view: StudioView = phonePreview ? 'preview' : mode;
  const onView = (v: StudioView) => {
    if (v === 'preview') {
      setPhonePreview(true);
      requestAnimationFrame(() => {
        const el = document.getElementById('menu-view-anchor');
        if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 69, behavior: scrollBehavior() });
      });
    } else setMode(v);
  };

  // ── preview ──
  const onFocusCapture = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-item-id]');
    const id = row?.dataset.itemId;
    if (id && !isTempId(id)) setFocusedRowId(id);
  }, []);
  const deferredFocusedRow = useDeferredValue(focusedRowId);

  const itemOpen = itemTarget !== null;
  const previewCategories = useMemo(
    () => (itemTarget && itemDraft ? overlayItemDraft(stable, itemDraft) : stable),
    [itemTarget, itemDraft, stable],
  );
  const focusItemId = itemTarget ? (itemTarget.mode === 'edit' ? itemTarget.itemId : DRAFT_ITEM_ID) : deferredFocusedRow;
  const hiddenNote = useMemo(() => {
    if (!focusItemId) return null;
    for (const c of previewCategories) {
      const item = c.items.find((i) => i.id === focusItemId);
      if (!item) continue;
      const v = customerVisibility(item, c);
      return v === 'hiddenItem' ? copy.preview.hiddenNote : v === 'hiddenCategory' ? copy.preview.categoryHiddenNote : null;
    }
    return null;
  }, [focusItemId, previewCategories, copy]);

  const rightVisible = isDesktop && (!previewCollapsed || itemOpen);
  const sheetPreviewActive = !isDesktop && itemOpen && itemSheetTab === 'preview';
  const pagePreview = !isDesktop && phonePreview && !sheetPreviewActive;
  const menuHref = `/${locale}/dashboard/restaurants/${restaurantId}/menu`;
  const openLink = isPublished
    ? { href: `/menu/${restaurant.slug}`, external: true }
    : { href: `${menuHref}?preview=1`, external: false };

  const phoneProps = {
    restaurant,
    categories: previewCategories,
    locale,
    focusItemId,
    followCategoryId: activeCategoryId,
    onPickItem: openItem,
    hiddenNote,
  };

  const collapsePreview = (value: boolean) => {
    setPreviewCollapsed(value);
    safeLocalSet(STORAGE_KEYS.previewCollapsed, value ? '1' : null);
  };

  const saveIndicator = (variant: 'desktop' | 'compact') => (
    <SaveIndicator
      variant={variant}
      published={isPublished}
      pending={pending}
      savedAt={savedAt}
      error={saveError}
      online={online}
      lastSilentUndo={toasterState.lastSilentUndo}
      onUndo={(id) => void toaster.undoById(id)}
      onJumpToError={() => {
        const id = saveError?.itemId;
        if (!id) return;
        flashItem(id);
        document.getElementById(`menu-row-${id}`)?.focus({ preventScroll: true });
      }}
    />
  );

  const empty = categories.length === 0;
  const panelKey = useItemPanelKey(itemTarget, itemNonce);
  const editedItemName =
    itemTarget?.mode === 'edit'
      ? (categories.flatMap((c) => c.items).find((i) => i.id === itemTarget.itemId)?.name ?? null)
      : itemTarget
        ? copy.item.newItem
        : null;

  const leaveConfirm = pendingLeave
    ? {
        onConfirm: () => {
          const proceed = pendingLeave;
          itemDirtyRef.current = false;
          setItemDirty(false);
          setPendingLeave(null);
          proceed();
        },
        onCancel: () => setPendingLeave(null),
      }
    : null;

  const itemPanel = (presentation: 'docked' | 'sheet') =>
    itemTarget && panelKey ? (
      <ItemPanel
        key={panelKey}
        target={itemTarget}
        presentation={presentation}
        categories={categories}
        visibleIds={visibleIds}
        readOnly={readOnly}
        focusField={itemFocus}
        onRequestClose={requestCloseItem}
        onSaved={onSaved}
        onGone={onGone}
        onNavigate={onNavigate}
        onDraftChange={setItemDraft}
        onDirtyChange={onDirtyChange}
        leaveConfirm={leaveConfirm}
        sheetTab={itemSheetTab}
        onSheetTab={setItemSheetTab}
        preview={sheetPreviewActive ? <PhonePreview {...phoneProps} variant="bare" height={Math.round(window.innerHeight * 0.6)} /> : null}
      />
    ) : null;

  return (
    <StudioContext.Provider value={studio}>
      <div className="relative mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 sm:px-7 lg:py-8">
        <StudioHeader
          restaurantName={restaurant.name}
          canDesign={canDesign}
          designReady={false}
          canShare={canShare}
          designActive={false}
          onOpenDesign={() => undefined}
          onOpenShare={() => setShareOpen(true)}
          analyticsHref={`${menuHref}/analytics`}
          fullPreview={openLink}
          onCollapseAll={empty ? undefined : () => setAllCollapsed(true)}
          onExpandAll={empty ? undefined : () => setAllCollapsed(false)}
          designDisabledReason={!menuEnabled ? copy.header.designLockedReason : isViewer ? copy.header.designViewerReason : null}
        />

        {(!empty || readOnly) && (
          <MenuStatusCard
            isTr={isTr}
            restaurant={restaurant}
            readiness={readiness}
            nudges={nudges}
            lockReason={lockReason}
            canEdit={canEdit}
            publishBusy={publishBusy}
            justPublished={justPublished}
            onPublish={() => void publish()}
            onUnpublish={unpublish}
            onDismissJustPublished={() => setJustPublished(false)}
            onStep={onStep}
            onNudge={onNudge}
            onReopenAllSoldOut={() => void actions.bulkSetFlags(stable.flatMap((c) => c.items.map((i) => i.id)), 'markAvailable')}
            onOpenShare={() => setShareOpen(true)}
          />
        )}

        {empty && readOnly ? (
          <EmptyState title={copy.outline.emptyMenuReadOnly} />
        ) : (
          <>
            {!empty && (
              <>
                <StudioToolbar
                  query={query}
                  onQuery={setQuery}
                  filter={filter}
                  onFilter={setFilter}
                  counts={counts}
                  saveIndicator={saveIndicator('desktop')}
                  canUndo={toasterState.canUndo}
                  onUndo={() => void toaster.undoLatest()}
                  mode={mode}
                  onMode={setMode}
                  view={view}
                  onView={onView}
                  previewCollapsed={previewCollapsed && !itemOpen}
                  onShowPreview={() => collapsePreview(false)}
                  categoryChips={
                    <CategoryChips
                      variant="toolbar"
                      categories={filtered.sections.map((s) => s.category)}
                      activeId={activeCategoryId}
                      onJump={jumpToCategory}
                      onAddCategory={canEdit && mode === 'edit' ? focusNewCategory : undefined}
                    />
                  }
                  onAdd={{
                    item: () => {
                      const target = activeCategoryId ?? categories[0]?.id;
                      if (target) createItemIn(target);
                    },
                    category: focusNewCategory,
                  }}
                  readOnly={readOnly}
                  showSearch={!phonePreview}
                />
                {!pagePreview && (
                  <CategoryChips
                    variant="sticky-mobile"
                    categories={filtered.sections.map((s) => s.category)}
                    activeId={activeCategoryId}
                    onJump={jumpToCategory}
                    onAddCategory={canEdit && mode === 'edit' ? focusNewCategory : undefined}
                    leading={saveIndicator('compact')}
                    onPreview={() => onView('preview')}
                  />
                )}
                {mode === 'service' && !serviceHintSeen && !pagePreview && (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5 text-[13px] text-[#525252]">
                    <p>{isPublished ? copy.service.hintLive : copy.service.hintDraft}</p>
                    <button
                      type="button"
                      onClick={() => {
                        safeLocalSet(STORAGE_KEYS.serviceHint, '1');
                        setServiceHintSeen(true);
                      }}
                      className="min-h-11 shrink-0 font-semibold text-[#0A0A0A] pointer-fine:min-h-8"
                    >
                      {copy.service.hintDismiss}
                    </button>
                  </div>
                )}
              </>
            )}

            <div
              className={`lg:grid lg:items-start lg:gap-5 ${
                rightVisible
                  ? 'lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] min-[100rem]:grid-cols-[minmax(0,1fr)_380px]'
                  : 'lg:grid-cols-[minmax(0,1fr)]'
              }`}
            >
              <div
                id="menu-items-pane"
                hidden={pagePreview}
                onFocusCapture={onFocusCapture}
                className="@container/outline min-w-0 scroll-mt-[124px] space-y-3 lg:scroll-mt-[180px]"
              >
                <ContextBar
                  query={deferredQuery}
                  filter={filter}
                  total={filtered.total}
                  onClear={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                  onRestockAll={(ids) => void actions.bulkSetFlags(ids, 'markAvailable')}
                  canEdit={canEdit}
                  soldOutIds={soldOutIds}
                />
                <MenuOutline
                  sections={filtered.sections}
                  filterActive={filtered.active}
                  query={deferredQuery}
                  onClearSearch={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                  collapsed={effectiveCollapsed}
                  onToggleCollapse={onToggleCollapse}
                  completion={completion}
                  rows={rows}
                  pendingCreates={pendingCreates}
                />
              </div>

              {pagePreview && (
                <div className="lg:hidden">
                  <PhonePreview {...phoneProps} variant="bare" />
                </div>
              )}

              {rightVisible && (
                <RightPanel
                  itemOpen={itemOpen}
                  itemTitle={editedItemName}
                  tab={itemOpen ? rightTab : 'preview'}
                  onTab={setRightTab}
                  onCloseItem={requestCloseItem}
                  onCollapse={() => collapsePreview(true)}
                  published={isPublished}
                  openLink={openLink}
                  preview={
                    <PreviewPanel {...phoneProps} badge={itemOpen && itemDirty ? copy.preview.unsavedBadge : null} />
                  }
                  item={itemPanel('docked')}
                />
              )}
            </div>
          </>
        )}

        {!isDesktop && itemPanel('sheet')}

        {shareOpen && canShare && (
          <ShareDialog
            restaurantId={restaurantId}
            restaurant={restaurant}
            isTr={isTr}
            copy={copy}
            canPublish={canEdit}
            hasPublishableItems={readiness.publishableItems > 0}
            publishBusy={publishBusy}
            analyticsHref={`${menuHref}/analytics`}
            onPublish={() => void publish()}
            onClose={() => setShareOpen(false)}
          />
        )}
        {confirmDialog}
        {guard.dialog}
      </div>
    </StudioContext.Provider>
  );
}
