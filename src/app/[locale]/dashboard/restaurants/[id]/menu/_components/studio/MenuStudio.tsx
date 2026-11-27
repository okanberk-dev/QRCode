'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { EmptyState, useConfirmDialog } from '@/components/ui';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { getMenuReadiness } from '@/lib/menu-readiness';
import { normaliseHex } from '@/lib/qr-colors';
import { detectSector } from '@/lib/sector-platforms';
import { useUnsavedGuard } from '@/app/[locale]/dashboard/surveys/_components/useUnsavedGuard';
import MenuBuilderSkeleton from '../../loading';
import { useMenuActions, type UndoRun } from '../data/useMenuActions';
import { useMenuData, type MenuDataHandle } from '../data/useMenuData';
import { usePhotoUpload } from '../data/usePhotoUpload';
import { useThemeDraft } from '../data/useThemeDraft';
import { DesignPanel } from '../design/DesignPanel';
import { ItemPanel, useItemPanelKey, type ItemPanelDraft, type ItemPanelSaved } from '../item/ItemPanel';
import { PasteSheet } from '../item/PasteSheet';
import { SaveIndicator } from '../kit/SaveIndicator';
import { STORAGE_KEYS, safeLocalGet, safeLocalSet } from '../kit/storage';
import { ToasterProvider, useToaster, useToasterState } from '../kit/Toaster';
import { useFileDropGuard } from '../kit/useFileDropGuard';
import { filterCounts, filterMenu, visibleItemIds, type MenuFilter } from '../menu-filter';
import { getMenuCopy } from '../menu-i18n';
import type { ShortcutId } from '../menu-keys';
import { DRAFT_ITEM_ID, isTempId, overlayItemDraft, withoutTemps, type ItemDraftOverlay } from '../menu-merge';
import type { SetupPlanCategory } from '../menu-setup';
import { planToPreviewCategories } from '../menu-setup-preview';
import { customerVisibility, menuNudges } from '../menu-status';
import type { ItemTarget, MenuData } from '../menu-types';
import { scrollBehavior, useFinePointer, useIsDesktop, useIsWide, useOnline } from '../menu-ui';
import { BulkPriceDialog } from '../outline/BulkPriceDialog';
import { CategoryChips } from '../outline/CategoryChips';
import { CategoryOrderSheet } from '../outline/CategoryOrderSheet';
import { CategoryRail } from '../outline/CategoryRail';
import { MenuOutline } from '../outline/MenuOutline';
import { MoveToCategoryDialog } from '../outline/MoveToCategoryDialog';
import { SelectionBar } from '../outline/SelectionBar';
import { PhonePreview } from '../preview/PhonePreview';
import { PreviewPanel } from '../preview/PreviewPanel';
import { RightPanel } from '../preview/RightPanel';
import { SetupPreviewEmpty } from '../setup/SetupPreviewEmpty';
import { SetupStart, type SetupStartChoice } from '../setup/SetupStart';
import { SetupWizard } from '../setup/SetupWizard';
import { useSetupDraft, type SetupDraftState } from '../setup/useSetupDraft';
import { ShareDialog } from '../share/ShareDialog';
import { ContextBar } from './ContextBar';
import { LoadErrorView } from './LoadErrorView';
import { MenuStatusCard, type MenuStepId } from './MenuStatusCard';
import { ShortcutsDialog } from './ShortcutsDialog';
import { StudioContext, type StudioContextValue } from './studio-context';
import { StudioHeader } from './StudioHeader';
import { StudioToolbar } from './StudioToolbar';
import { useScrollSpy } from './useScrollSpy';
import { detectMac, useStudioShortcuts, type ShortcutHit } from './useStudioShortcuts';
import { useUrlIntents } from './useUrlIntents';
import type { StudioView } from './ViewSwitch';

const EMPTY_SET: Set<string> = new Set();
const LINGER_MS = 1200;
/** Most rows one bulk action takes (spec §8.16; also the restore endpoint's limit). */
const SELECTION_CAP = 100;

/** Add ids to `base` up to the cap (pending rows never); reports whether some did not fit. */
function addCapped(base: Set<string>, ids: string[]): { next: Set<string>; capped: boolean } {
  const next = new Set(base);
  let capped = false;
  for (const id of ids) {
    if (isTempId(id) || next.has(id)) continue;
    if (next.size >= SELECTION_CAP) {
      capped = true;
      break;
    }
    next.add(id);
  }
  return { next, capped };
}

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
  const isWide = useIsWide();
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
  // The open panel's form, so crossing 1024px (docked ⇄ sheet remount) keeps what was typed.
  const itemStashRef = useRef<ItemPanelDraft | null>(null);
  // organise and bulk (chunk 3)
  const [selection, setSelectionState] = useState<Set<string> | null>(null);
  const selectionRef = useRef<Set<string> | null>(null);
  const anchorRef = useRef<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [moveDialog, setMoveDialog] = useState<{ itemIds: string[]; fromSelection: boolean } | null>(null);
  const [bulkPrice, setBulkPrice] = useState<{ itemIds: string[] } | null>(null);
  const [categoryOrderOpen, setCategoryOrderOpen] = useState(false);
  const [pasteSheet, setPasteSheet] = useState<{ categoryId: string | null } | null>(null);
  const [pasteDirtyKeys, setPasteDirtyKeys] = useState<Set<string>>(EMPTY_SET);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [singleKeys, setSingleKeys] = useState(() => safeLocalGet(STORAGE_KEYS.singleKeys) !== '0');
  const [isMac] = useState(detectMac);
  // design ("Görünüm") and empty-menu setup
  const [designOpen, setDesignOpen] = useState(false);
  const [designLeave, setDesignLeave] = useState<(() => void) | null>(null);
  const designOpenRef = useRef(false);
  designOpenRef.current = designOpen;
  const requestCloseDesignRef = useRef<() => void>(() => undefined);
  const setupDraft = useSetupDraft(restaurantId);
  const startsEmpty = categories.length === 0;
  const [setupMode, setSetupMode] = useState<SetupStartChoice | null>(() => (startsEmpty ? setupDraft.restored?.entry ?? null : null));
  const [setupInitial, setSetupInitial] = useState<SetupDraftState | null>(() => (startsEmpty ? setupDraft.restored : null));
  const [setupRestored, setSetupRestored] = useState(() => startsEmpty && setupDraft.restored !== null);
  const [setupPlan, setSetupPlan] = useState<SetupPlanCategory[]>([]);
  const [setupKey, setSetupKey] = useState(0);

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
  const design = useThemeDraft({
    restaurantId,
    isTr,
    restaurant,
    menu: { setMenu: menu.setMenu, touchLocal: menu.touchLocal },
    upload,
    onAccessLost,
  });
  const { discard: discardDesign, dirty: designDirty } = design;
  // Bumped by the design panel: the preview jumps to the top of the menu.
  const [previewTopKey, setPreviewTopKey] = useState(0);
  const bumpPreviewTop = useCallback(() => setPreviewTopKey((k) => k + 1), []);

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
  const activeCategoryId = useScrollSpy(sectionIds, isWide ? 154 : isDesktop ? 210 : 135);
  const soldOutIds = useMemo(
    () => (filter === 'soldOut' ? filtered.sections.flatMap((s) => s.items.filter((i) => i.isOutOfStock).map((i) => i.id)) : []),
    [filter, filtered.sections],
  );
  const hasItems = stable.some((c) => c.items.length > 0);
  // Selected rows that still exist (deleted / moved-away rows drop out on their own).
  const liveSelection = useMemo(() => {
    if (!selection) return null;
    const existing = new Set(stable.flatMap((c) => c.items.map((i) => i.id)));
    const next = new Set([...selection].filter((id) => existing.has(id)));
    return next.size === selection.size ? selection : next;
  }, [selection, stable]);

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

  // ── selection (spec §8.16): React state; rows get a boolean `selected` ──
  const setSelection = useCallback((next: Set<string> | null) => {
    selectionRef.current = next;
    if (next === null) anchorRef.current = null;
    setSelectionState(next);
  }, []);
  const exitSelection = useCallback(() => setSelection(null), [setSelection]);
  const notifyCap = useCallback(() => toaster.notify({ message: copy.selection.cap, tone: 'info' }), [toaster, copy]);

  const toggleSelect = useCallback(
    (id: string, opts?: { range?: boolean }) => {
      if (isTempId(id)) return;
      const base = selectionRef.current ?? new Set<string>();
      const ids = latest.current.visibleIds;
      const anchor = anchorRef.current;
      let result: { next: Set<string>; capped: boolean };
      if (opts?.range && anchor && anchor !== id && ids.includes(anchor) && ids.includes(id)) {
        const a = ids.indexOf(anchor);
        const b = ids.indexOf(id);
        result = addCapped(base, ids.slice(Math.min(a, b), Math.max(a, b) + 1));
      } else if (base.has(id)) {
        const next = new Set(base);
        next.delete(id);
        result = { next, capped: false };
      } else {
        result = addCapped(base, [id]);
      }
      setReorderMode(false);
      setSelection(result.next);
      anchorRef.current = id;
      if (result.capped) notifyCap();
    },
    [setSelection, notifyCap],
  );

  const startSelection = useCallback(
    (ids: string[] = []) => {
      const { next, capped } = addCapped(selectionRef.current ?? new Set<string>(), ids);
      setReorderMode(false);
      setSelection(next);
      anchorRef.current = ids[ids.length - 1] ?? anchorRef.current;
      if (capped) notifyCap();
    },
    [setSelection, notifyCap],
  );

  const selectVisible = () => {
    const { next, capped } = addCapped(selectionRef.current ?? new Set<string>(), visibleIds);
    setSelection(next);
    if (capped) notifyCap();
  };

  // ── modes ──
  const setMode = useCallback(
    (m: 'edit' | 'service') => {
      setModeState(m);
      safeLocalSet(STORAGE_KEYS.mode, m);
      setPhonePreview(false);
      if (m === 'service') {
        setSelection(null);
        setReorderMode(false);
      }
    },
    [setSelection],
  );

  /** Leave search / filter / Servis / selection / phone preview so a section's editing rows are on screen. */
  const showEditing = useCallback(() => {
    if (designOpenRef.current) requestCloseDesignRef.current();
    setQuery('');
    setFilter('all');
    setPhonePreview(false);
    setSelection(null);
    setReorderMode(false);
    if (latest.current.mode !== 'edit') setMode('edit');
  }, [setMode, setSelection]);

  const toggleReorder = () => {
    if (reorderMode) {
      setReorderMode(false);
      return;
    }
    // Arrows and grips work on whole categories: leave search, filter and selection first.
    setSelection(null);
    setQuery('');
    setFilter('all');
    setReorderMode(true);
  };

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
    if (itemDirtyRef.current) {
      // The leave confirm lives in the item panel: bring its tab forward, or it opens hidden (≥1024).
      setRightTab('item');
      setPendingLeave(() => proceed);
    } else proceed();
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
    itemStashRef.current = null;
    setItemDraft(null);
    itemDirtyRef.current = false;
    setItemDirty(false);
    setPendingLeave(null);
    setRightTab('preview');
  }, []);
  const requestCloseItem = useCallback(() => guardItem(() => closeItemNow()), [guardItem, closeItemNow]);

  // ── design ("Görünüm"): docked ≥1024 (replaces the outline), sheet below ──
  const closeDesignNow = useCallback(() => {
    discardDesign();
    setDesignOpen(false);
    setDesignLeave(null);
    requestAnimationFrame(() => document.getElementById('menu-design-toggle')?.focus({ preventScroll: true }));
  }, [discardDesign]);
  /** Every close path of the design panel: asks first while there are unapplied changes. */
  const requestCloseDesign = useCallback(() => {
    if (!designDirty) {
      closeDesignNow();
      return;
    }
    if (isDesktop) {
      askConfirm({
        title: copy.design.closeDirtyTitle,
        body: copy.design.closeDirtyBody,
        confirmLabel: copy.design.closeDirtyConfirm,
        cancelLabel: copy.design.closeDirtyCancel,
        variant: 'danger',
        onConfirm: closeDesignNow,
      });
    } else {
      // Inside the sheet: nothing outside a Radix modal is clickable, so the question renders in place.
      setDesignLeave(() => closeDesignNow);
    }
  }, [designDirty, isDesktop, askConfirm, copy, closeDesignNow]);
  requestCloseDesignRef.current = requestCloseDesign;
  /** Entering design closes the item panel (guarded) and the organise modes; the preview shows the draft. */
  const openDesign = useCallback(() => {
    guardItem(() => {
      closeItemNow(false);
      setSelection(null);
      setReorderMode(false);
      setPhonePreview(false);
      setRightTab('preview');
      setDesignOpen(true);
    });
  }, [guardItem, closeItemNow, setSelection]);
  const onDesignApplied = useCallback(
    (undo: UndoRun | undefined) => {
      const notify = () => toaster.notify({ message: copy.toast.themeApplied, undo });
      if (isDesktop) {
        notify();
        return;
      }
      // The sheet closes first: a toast behind a Radix modal would be inert.
      closeDesignNow();
      requestAnimationFrame(() => requestAnimationFrame(notify));
    },
    [isDesktop, toaster, copy, closeDesignNow],
  );
  // Access lost mid-session (viewer / module off): the panel goes away, nothing was saved.
  useEffect(() => {
    if (designOpen && !canDesign) closeDesignNow();
  }, [designOpen, canDesign, closeDesignNow]);

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
  /** Rail jump (≥1600) is one of the item panel's close paths (spec §7.8): guarded, then closed. */
  const railJump = useCallback(
    (categoryId: string) =>
      guardItem(() => {
        closeItemNow(false);
        jumpToCategory(categoryId);
      }),
    [guardItem, closeItemNow, jumpToCategory],
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

  const priceCellTarget = useCallback((fromItemId: string, dir: 1 | -1 | 0) => {
    const ids = latest.current.visibleIds;
    const index = ids.indexOf(fromItemId);
    const target = index === -1 ? undefined : ids[index + dir];
    return target ? priceCells.current.get(target) : undefined;
  }, []);
  const hasPriceCell = useCallback((fromItemId: string, dir: 1 | -1 | 0) => !!priceCellTarget(fromItemId, dir), [priceCellTarget]);
  const openPriceCell = useCallback((fromItemId: string, dir: 1 | -1 | 0) => {
    const open = priceCellTarget(fromItemId, dir);
    open?.();
    return !!open;
  }, [priceCellTarget]);
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

  // ── organise: one step up / down, dialogs and sheets ──
  const moveItemBy = useCallback(
    (itemId: string, dir: -1 | 1) => {
      if (isTempId(itemId)) return;
      const category = latest.current.categories.find((c) => c.items.some((i) => i.id === itemId));
      if (!category) return;
      const ids = category.items.filter((i) => !isTempId(i.id)).map((i) => i.id);
      const from = ids.indexOf(itemId);
      const to = from + dir;
      if (from === -1 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      void actions.reorderItems(category.id, ids);
    },
    [actions],
  );
  const moveCategoryBy = useCallback(
    (categoryId: string, dir: -1 | 1) => {
      const ids = latest.current.categories.map((c) => c.id);
      const from = ids.indexOf(categoryId);
      const to = from + dir;
      if (from === -1 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      void actions.reorderCategories(ids).then((r) => {
        if (!r.ok) return;
        requestAnimationFrame(() =>
          document.getElementById(`menu-section-${categoryId}`)?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() }),
        );
      });
    },
    [actions],
  );
  const openMoveDialog = useCallback((itemIds: string[]) => {
    const ids = itemIds.filter((id) => !isTempId(id));
    if (ids.length === 0 || latest.current.categories.length < 2) return;
    const current = selectionRef.current;
    const fromSelection = current !== null && current.size === ids.length && ids.every((id) => current.has(id));
    setMoveDialog({ itemIds: ids, fromSelection });
  }, []);
  const openBulkPrice = useCallback((itemIds: string[]) => {
    const ids = itemIds.filter((id) => !isTempId(id));
    if (ids.length) setBulkPrice({ itemIds: ids });
  }, []);
  const openCategoryOrder = useCallback(() => setCategoryOrderOpen(true), []);
  const openPasteSheet = useCallback((categoryId: string | null) => {
    const { activeCategoryId: active, categories: cats } = latest.current;
    setPasteSheet({ categoryId: categoryId ?? active ?? cats[0]?.id ?? null });
  }, []);
  const reportPasteDirty = useCallback((key: string, dirty: boolean) => {
    setPasteDirtyKeys((prev) => {
      if (prev.has(key) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const openItemId = itemTarget?.mode === 'edit' ? itemTarget.itemId : null;
  const studio = useMemo<StudioContextValue>(
    () => ({
      restaurantId, locale, isTr, copy, readOnly, canEdit, isPublished, finePointer, mode, actions, toaster,
      getCategories, openItem, createItemIn, focusQuickAdd, focusNewCategory, jumpToCategory, registerQuickAdd,
      registerNewCategory, registerPriceCell, openPriceCell, hasPriceCell, registerNameCell, openNameCell, flashItem, linger,
      focusAfterRemoval, askConfirm, categoryCount: categories.length, selecting: selection !== null, toggleSelect,
      startSelection, reorderMode, openMoveDialog, openBulkPrice, openCategoryOrder, openPasteSheet, moveItemBy,
      moveCategoryBy, reportPasteDirty, openItemId,
    }),
    [
      restaurantId, locale, isTr, copy, readOnly, canEdit, isPublished, finePointer, mode, actions, toaster,
      getCategories, openItem, createItemIn, focusQuickAdd, focusNewCategory, jumpToCategory, registerQuickAdd,
      registerNewCategory, registerPriceCell, openPriceCell, hasPriceCell, registerNameCell, openNameCell, flashItem, linger,
      focusAfterRemoval, askConfirm, categories.length, selection, toggleSelect, startSelection, reorderMode,
      openMoveDialog, openBulkPrice, openCategoryOrder, openPasteSheet, moveItemBy, moveCategoryBy, reportPasteDirty, openItemId,
    ],
  );

  // ── guards & URL intents ──
  const pasteDirty = pasteDirtyKeys.size > 0;
  const guard = useUnsavedGuard(itemDirty || pasteDirty || designDirty || pending + design.pending > 0, locale);
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

  // ── empty menu: setup (spec §10) ──
  const { save: saveSetupDraft, clear: clearSetupDraft } = setupDraft;
  const empty = categories.length === 0;
  // The menu has categories now (wizard done, first category added, another tab): leave setup.
  useEffect(() => {
    if (empty) return;
    setSetupMode(null);
    setSetupInitial(null);
    setSetupRestored(false);
    setSetupPlan([]);
    clearSetupDraft();
  }, [empty, clearSetupDraft]);
  const onSetupPick = (choice: SetupStartChoice) => {
    setSetupInitial(null);
    setSetupRestored(false);
    setSetupPlan([]);
    setSetupKey((k) => k + 1);
    setSetupMode(choice);
  };
  /** "Geri" on the first wizard step, "Baştan başla", "Şablonlara dön": back to the three ways in. */
  const exitSetup = () => {
    clearSetupDraft();
    setSetupInitial(null);
    setSetupRestored(false);
    setSetupPlan([]);
    setSetupMode(null);
  };
  const onSetupChange = useCallback(
    (state: SetupDraftState, plan: SetupPlanCategory[]) => {
      // Nothing picked or typed yet: nothing worth restoring after a reload.
      if (state.reached === 0 && !state.choice && !state.pasteText.trim()) clearSetupDraft();
      else saveSetupDraft(state);
      setSetupPlan(plan);
    },
    [saveSetupDraft, clearSetupDraft],
  );
  const createFromSetup = useCallback(
    async (plan: SetupPlanCategory[], onProgress: (done: number, total: number) => void) => {
      const r = await actions.createMenuFromSetup(plan, onProgress);
      if (r.categories > 0) {
        clearSetupDraft();
        toaster.notify(
          r.failed
            ? { message: copy.fmt.toast.presetPartial(), tone: 'error' }
            : { message: copy.fmt.toast.setupCreated(r.categories, r.items), tone: 'success' },
        );
        if (!isDesktop) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              document.getElementById('menu-items-pane')?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }),
            ),
          );
        }
      }
      return r;
    },
    [actions, clearSetupDraft, toaster, copy, isDesktop],
  );
  const setupPreview = useMemo(() => planToPreviewCategories(setupPlan), [setupPlan]);

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

  // Preview slot (spec §7.2): exactly one host renders PublicMenuView at a time.
  const designDocked = designOpen && isDesktop;
  const designSheetOpen = designOpen && !isDesktop;
  // No sticky toolbar above the grid: the right column sticks under the topbar.
  const noToolbar = empty || designDocked;
  const rightVisible = isDesktop && (empty || designDocked || !previewCollapsed || itemOpen);
  const sheetPreviewActive = !isDesktop && itemOpen && itemSheetTab === 'preview';
  const pagePreview = !isDesktop && phonePreview && !sheetPreviewActive && !designSheetOpen;
  const menuHref = `/${locale}/dashboard/restaurants/${restaurantId}/menu`;
  const openLink = isPublished
    ? { href: `/menu/${restaurant.slug}`, external: true }
    : { href: `${menuHref}?preview=1`, external: false };

  // Design is previewed locally until "Uygula"; the QR and the live menu keep the applied values.
  const previewRestaurant = useMemo(() => ({ ...restaurant, ...design.draft }), [restaurant, design.draft]);
  const inSetup = empty && !readOnly && setupMode !== 'blank';
  // Empty menu: the setup plan (or nothing yet) instead of the real, empty categories.
  const setupCategories = empty && !readOnly ? (inSetup ? setupPreview : []) : null;
  // Nothing to show yet — except while choosing a design: the empty menu still shows its header in the theme.
  const previewNothing = !designOpen && setupCategories !== null && setupCategories.length === 0;
  const fallbackAccent = normaliseHex(restaurant.primaryColor ?? '') ?? '#C6F24E';

  const phoneProps = {
    restaurant: previewRestaurant,
    categories: setupCategories ?? previewCategories,
    locale,
    focusItemId: designOpen ? null : focusItemId,
    // While choosing a design the preview stays at the top: the header is what styles change most.
    followCategoryId: designOpen ? null : activeCategoryId,
    onPickItem: designOpen || setupCategories !== null ? undefined : openItem,
    hiddenNote: designOpen ? null : hiddenNote,
    topOffset: noToolbar ? 102 : isWide ? 158 : 214,
    scrollTopKey: designOpen ? previewTopKey : undefined,
  };

  const collapsePreview = (value: boolean) => {
    setPreviewCollapsed(value);
    safeLocalSet(STORAGE_KEYS.previewCollapsed, value ? '1' : null);
  };

  // ── keyboard shortcuts (spec §9) ──
  const changeSingleKeys = (on: boolean) => {
    setSingleKeys(on);
    safeLocalSet(STORAGE_KEYS.singleKeys, on ? null : '0');
  };
  const focusSearch = () => {
    if (phonePreview) setPhonePreview(false);
    requestAnimationFrame(() => {
      const field = [...document.querySelectorAll<HTMLInputElement>('[data-menu-search]')].find((el) => el.offsetParent !== null);
      field?.focus();
      field?.select();
    });
  };
  const focusRowBy = (rowId: string | null, dir: -1 | 1) => {
    const index = rowId ? visibleIds.indexOf(rowId) : -1;
    const next = index === -1 ? undefined : visibleIds[index + dir];
    if (!next) return;
    document.querySelector<HTMLElement>(`#menu-items-pane [data-item-id="${CSS.escape(next)}"] [data-row-focus]`)?.focus();
  };
  const refocusRow = (itemId: string) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`#menu-items-pane [data-item-id="${CSS.escape(itemId)}"] [data-row-focus]`)?.focus(),
      ),
    );
  /** Esc, from the innermost thing outwards: panel → selection → reorder mode → search → filter. */
  const escapeCascade = (hit: ShortcutHit): boolean => {
    if (hit.target?.hasAttribute('data-menu-search')) {
      if (filter === 'all') return false;
      setFilter('all');
      return true;
    }
    if (hit.typing) return false;
    if (designDocked) {
      requestCloseDesign();
      return true;
    }
    if (isDesktop && itemTarget) {
      requestCloseItem();
      return true;
    }
    if (selectionRef.current) {
      exitSelection();
      return true;
    }
    if (reorderMode) {
      setReorderMode(false);
      return true;
    }
    if (query) {
      setQuery('');
      return true;
    }
    if (filter !== 'all') {
      setFilter('all');
      return true;
    }
    return false;
  };
  const onShortcut = (id: ShortcutId, hit: ShortcutHit, event: KeyboardEvent): boolean => {
    const rowId = hit.rowId && !isTempId(hit.rowId) ? hit.rowId : null;
    const row = rowId ? categories.flatMap((c) => c.items).find((i) => i.id === rowId) : undefined;
    const editRow = canEdit && mode === 'edit' && row !== undefined;
    // The design panel replaces the outline: only Esc (close), "?" and ⌘Z apply.
    if (designOpen && id !== 'escape' && id !== 'help' && id !== 'undo') return false;
    // Empty menu (setup): nothing to search or edit yet.
    if (empty && id !== 'escape' && id !== 'help' && id !== 'undo' && id !== 'newCategory') return false;
    switch (id) {
      case 'escape':
        return escapeCascade(hit);
      case 'search':
        focusSearch();
        return true;
      case 'help':
        setShortcutsOpen(true);
        return true;
      case 'newItem': {
        if (!canEdit) return false;
        const target = activeCategoryId ?? categories[0]?.id;
        if (target) focusQuickAdd(target);
        else focusNewCategory();
        return true;
      }
      case 'newCategory':
        if (!canEdit) return false;
        focusNewCategory();
        return true;
      case 'togglePreview':
        if (!isDesktop) onView(phonePreview ? mode : 'preview');
        else if (itemOpen) setRightTab((t) => (t === 'preview' ? 'item' : 'preview'));
        else collapsePreview(!previewCollapsed);
        return true;
      case 'undo':
        void toaster.undoLatest();
        return true;
      case 'rowPrev':
      case 'rowNext':
        focusRowBy(hit.rowId, id === 'rowPrev' ? -1 : 1);
        return true;
      case 'open':
        // Enter on a button keeps its own meaning (inline rename on the name, the switch, ⋯).
        if (!rowId || (event.key === 'Enter' && hit.target?.closest('button,a,input,select,textarea,[role=switch]'))) return false;
        openItem(rowId);
        return true;
      case 'toggleSoldOut':
        if (!canEdit || !row) return false;
        if (!row.isAvailable) toaster.notify({ message: copy.item.hiddenNoSoldOut, tone: 'info' });
        else void actions.toggleSoldOut(row.id);
        return true;
      case 'toggleHidden':
        if (!canEdit || !row) return false;
        void (row.isAvailable ? actions.hideItem(row.id) : actions.showItem(row.id));
        return true;
      case 'select':
        if (!editRow || !row) return false;
        if (selectionRef.current) toggleSelect(row.id);
        else startSelection([row.id]);
        return true;
      case 'move':
        if (!editRow || !row || categories.length < 2) return false;
        openMoveDialog([row.id]);
        return true;
      case 'duplicate':
        if (!editRow || !row) return false;
        void actions.duplicateItem(row.id).then((r) => {
          if (r.ok && r.copyId && finePointer) {
            const copyId = r.copyId;
            requestAnimationFrame(() => requestAnimationFrame(() => openNameCell(copyId)));
          }
        });
        return true;
      case 'delete':
        if (!editRow || !row) return false;
        focusAfterRemoval(row.id);
        void actions.deleteItem(row.id);
        return true;
      case 'moveUp':
      case 'moveDown':
        if (!editRow || !row || selectionRef.current) return false;
        moveItemBy(row.id, id === 'moveUp' ? -1 : 1);
        refocusRow(row.id);
        return true;
      default:
        return false;
    }
  };
  useStudioShortcuts(singleKeys, onShortcut);

  const saveIndicator = (variant: 'desktop' | 'compact') => (
    <SaveIndicator
      variant={variant}
      published={isPublished}
      pending={pending + design.pending}
      savedAt={savedAt}
      error={saveError}
      online={online}
      lastSilentUndo={toasterState.lastSilentUndo}
      onUndo={(undoId) => void toaster.undoById(undoId)}
      onJumpToError={() => {
        const errorId = saveError?.itemId;
        if (!errorId) return;
        flashItem(errorId);
        document.getElementById(`menu-row-${errorId}`)?.focus({ preventScroll: true });
      }}
    />
  );

  const hasRail = !empty && !designDocked;
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
        // Every open bumps the nonce, so only a breakpoint remount of this same open restores the stash.
        draftStash={itemStashRef}
        draftKey={`${panelKey}#${itemNonce}`}
        preview={sheetPreviewActive ? <PhonePreview {...phoneProps} variant="bare" height={Math.round(window.innerHeight * 0.6)} /> : null}
      />
    ) : null;

  // Grid (spec §3.1). `min-[100rem]` is 1600 px in rem so it sorts after `xl:`. The rail
  // starts there too: below 1600 (with the 248 px panel sidebar) it would squeeze the list.
  const gridCols = rightVisible
    ? hasRail
      ? 'lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] min-[100rem]:grid-cols-[184px_minmax(0,1fr)_380px]'
      : 'lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] min-[100rem]:grid-cols-[minmax(0,1fr)_380px]'
    : hasRail
      ? 'lg:grid-cols-[minmax(0,1fr)] min-[100rem]:grid-cols-[184px_minmax(0,1fr)]'
      : 'lg:grid-cols-[minmax(0,1fr)]';

  const clearSearch = () => {
    setQuery('');
    setFilter('all');
  };

  return (
    <StudioContext.Provider value={studio}>
      <div className="relative mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 sm:px-7 lg:py-8">
        <StudioHeader
          restaurantName={restaurant.name}
          canDesign={canDesign}
          canShare={canShare}
          designActive={designOpen}
          onOpenDesign={() => (designOpen ? requestCloseDesign() : openDesign())}
          onOpenShare={() => setShareOpen(true)}
          analyticsHref={`${menuHref}/analytics`}
          fullPreview={openLink}
          onSortCategories={empty ? undefined : openCategoryOrder}
          onPasteList={empty ? undefined : () => openPasteSheet(null)}
          organiseDisabled={!canEdit}
          onCollapseAll={empty ? undefined : () => setAllCollapsed(true)}
          onExpandAll={empty ? undefined : () => setAllCollapsed(false)}
          onShortcuts={finePointer ? () => setShortcutsOpen(true) : undefined}
          designDisabledReason={!menuEnabled ? copy.header.designLockedReason : isViewer ? copy.header.designViewerReason : null}
        />

        {/* Hidden while the design panel is docked (≥1024): the panel and its preview take the screen. */}
        {(!empty || readOnly) && !designDocked && (
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
            {!empty && !designDocked && (
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
                    paste: () => openPasteSheet(null),
                  }}
                  readOnly={readOnly}
                  showSearch={!phonePreview}
                  selecting={selection !== null}
                  onToggleSelect={() => (selectionRef.current ? exitSelection() : startSelection())}
                  reorderMode={reorderMode}
                  onToggleReorder={toggleReorder}
                  canSelect={mode === 'edit' && hasItems}
                  canReorder={!finePointer && canEdit && mode === 'edit' && hasItems}
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
                  <div className="flex items-start justify-between gap-3 rounded-[20px] border border-pn-line bg-white px-3 py-2.5 text-[13px] text-[#525252]">
                    <p>{isPublished ? copy.service.hintLive : copy.service.hintDraft}</p>
                    <button
                      type="button"
                      onClick={() => {
                        safeLocalSet(STORAGE_KEYS.serviceHint, '1');
                        setServiceHintSeen(true);
                      }}
                      className="min-h-11 shrink-0 font-medium text-pn-ink pointer-fine:min-h-8"
                    >
                      {copy.service.hintDismiss}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className={`lg:grid lg:items-start lg:gap-5 ${gridCols}`}>
              {hasRail && (
                <CategoryRail
                  categories={categories}
                  activeId={activeCategoryId}
                  onJump={railJump}
                  onAddCategory={canEdit && mode === 'edit' ? focusNewCategory : undefined}
                  canReorder={canEdit && mode === 'edit'}
                />
              )}

              {designDocked && (
                <div className="min-w-0">
                  <DesignPanel
                    presentation="docked"
                    design={design}
                    restaurantName={restaurant.name}
                    fallbackAccent={fallbackAccent}
                    isTr={isTr}
                    isPublished={isPublished}
                    readOnly={!canDesign}
                    onRequestClose={requestCloseDesign}
                    onApplied={onDesignApplied}
                    onPreviewTop={bumpPreviewTop}
                  />
                </div>
              )}

              {inSetup && (
                // Kept mounted (hidden) while the design panel is open, so the wizard keeps its state.
                <div className="min-w-0" hidden={designDocked}>
                  {setupMode === null ? (
                    <SetupStart onPick={onSetupPick} />
                  ) : (
                    <SetupWizard
                      key={setupKey}
                      entry={setupMode === 'paste' ? 'paste' : 'template'}
                      initial={setupInitial}
                      sector={restaurant.category ? detectSector(restaurant.category) : null}
                      isTr={isTr}
                      restored={setupRestored}
                      onStartOver={exitSetup}
                      onExit={exitSetup}
                      onChange={onSetupChange}
                      onCreate={createFromSetup}
                    />
                  )}
                </div>
              )}

              {!inSetup && (
                <div
                  id="menu-items-pane"
                  hidden={pagePreview || designDocked}
                  onFocusCapture={onFocusCapture}
                  className="@container/outline min-w-0 scroll-mt-[124px] space-y-3 lg:scroll-mt-[180px] min-[100rem]:scroll-mt-[124px]"
                >
                  {empty && setupMode === 'blank' && (
                    <button
                      type="button"
                      onClick={exitSetup}
                      className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#525252] hover:text-pn-ink pointer-fine:min-h-8"
                    >
                      <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
                      {copy.setup.backToTemplates}
                    </button>
                  )}
                  <ContextBar
                    query={deferredQuery}
                    filter={filter}
                    total={filtered.total}
                    onClear={clearSearch}
                    onRestockAll={(ids) => void actions.bulkSetFlags(ids, 'markAvailable')}
                    canEdit={canEdit}
                    soldOutIds={soldOutIds}
                    dragNote={finePointer && canEdit && mode === 'edit' && filtered.active}
                    selection={
                      liveSelection
                        ? {
                            count: liveSelection.size,
                            outsideFilter: filtered.active
                              ? [...liveSelection].filter((sid) => !filtered.sections.some((s) => s.items.some((i) => i.id === sid))).length
                              : 0,
                            visible: visibleIds.length,
                            allVisibleSelected: visibleIds.length > 0 && visibleIds.every((vid) => liveSelection.has(vid)),
                            onSelectVisible: selectVisible,
                            onClear: () => setSelection(new Set()),
                          }
                        : null
                    }
                    reorder={reorderMode ? { onDone: () => setReorderMode(false) } : null}
                  />
                  <MenuOutline
                    sections={filtered.sections}
                    filterActive={filtered.active}
                    query={deferredQuery}
                    onClearSearch={clearSearch}
                    collapsed={effectiveCollapsed}
                    onToggleCollapse={onToggleCollapse}
                    completion={completion}
                    rows={rows}
                    pendingCreates={pendingCreates}
                    selection={liveSelection}
                    reorderMode={reorderMode}
                  />
                </div>
              )}

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
                  onCollapse={noToolbar ? undefined : () => collapsePreview(true)}
                  stickyTop={noToolbar ? 'page' : 'toolbar'}
                  published={isPublished}
                  openLink={openLink}
                  preview={
                    previewNothing ? (
                      <SetupPreviewEmpty />
                    ) : (
                      <PreviewPanel
                        {...phoneProps}
                        badge={
                          designOpen && designDirty
                            ? copy.preview.draftBadge
                            : itemOpen && itemDirty
                              ? copy.preview.unsavedBadge
                              : null
                        }
                      />
                    )
                  }
                  item={itemPanel('docked')}
                />
              )}
            </div>
          </>
        )}

        {!isDesktop && itemPanel('sheet')}

        {designSheetOpen && (
          <DesignPanel
            presentation="sheet"
            design={design}
            restaurantName={restaurant.name}
            fallbackAccent={fallbackAccent}
            isTr={isTr}
            isPublished={isPublished}
            readOnly={!canDesign}
            onRequestClose={requestCloseDesign}
            onApplied={onDesignApplied}
            onPreviewTop={bumpPreviewTop}
            leaveConfirm={
              designLeave
                ? {
                    onConfirm: () => designLeave(),
                    onCancel: () => setDesignLeave(null),
                  }
                : null
            }
            preview={
              previewNothing ? (
                <SetupPreviewEmpty />
              ) : (
                <PhonePreview
                  {...phoneProps}
                  variant="bare"
                  height={Math.round(window.innerHeight * (window.innerWidth >= 640 ? 0.6 : 0.38))}
                />
              )
            }
          />
        )}

        {liveSelection && liveSelection.size > 0 && canEdit && mode === 'edit' && (
          <SelectionBar selection={liveSelection} categories={categories} onClear={exitSelection} />
        )}

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
        {moveDialog && (
          <MoveToCategoryDialog
            itemIds={moveDialog.itemIds}
            onClose={() => setMoveDialog(null)}
            onMoved={moveDialog.fromSelection ? exitSelection : undefined}
          />
        )}
        {bulkPrice && <BulkPriceDialog itemIds={bulkPrice.itemIds} categories={categories} onClose={() => setBulkPrice(null)} />}
        {categoryOrderOpen && <CategoryOrderSheet categories={categories} onClose={() => setCategoryOrderOpen(false)} />}
        {pasteSheet && (
          <PasteSheet
            initialCategoryId={pasteSheet.categoryId}
            categories={stable}
            onClose={() => {
              setPasteSheet(null);
              reportPasteDirty('sheet', false);
            }}
            onDirtyChange={(dirty) => reportPasteDirty('sheet', dirty)}
          />
        )}
        {shortcutsOpen && (
          <ShortcutsDialog
            locale={locale}
            isMac={isMac}
            singleKeys={singleKeys}
            onSingleKeys={changeSingleKeys}
            onClose={() => setShortcutsOpen(false)}
          />
        )}
        {confirmDialog}
        {guard.dialog}
      </div>
    </StudioContext.Provider>
  );
}
