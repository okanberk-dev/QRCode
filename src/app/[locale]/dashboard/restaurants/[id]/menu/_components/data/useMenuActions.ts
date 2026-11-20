'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { mapMenuApiError } from '@/lib/menu-api-error';
import type { ToasterApi } from '../kit/Toaster';
import type { MenuCopy } from '../menu-i18n';
import type { ItemPatch } from '../menu-item-form';
import {
  TEMP_PREFIX, applySavedCategory, applySavedItem, insertCategoryBySortOrder, insertItemBySortOrder, isTempId,
  moveItemLocal, moveItemsToEnd, neighbourCategoryId, patchItem, patchItems, removeCategory, removeItems, replaceItem,
  snapshotItemPositions, withIndexSortOrder,
  type SavedCategory, type SavedItem,
} from '../menu-merge';
import type { PastePlan, PastePlanItem } from '../menu-paste';
import { runPool } from '../menu-queue';
import { flagPatch, type FlagOp } from '../menu-status';
import type { CategoryShape, MenuData, RowSaveState } from '../menu-types';
import { menuApi, skippedMessage, type ApiFailure, type CreateItemPayload } from './menu-api';
import type { PhotoUploadResult } from './usePhotoUpload';
import { useSerialQueue } from './useSerialQueue';

/**
 * Every write of the Menu Studio (spec §5.4): optimistic change → per-key
 * serial queue → API → merge the answer → undo entry → feedback.
 *
 * - Revert only if unchanged since: a failed write puts the old value back
 *   only when the field still holds this call's optimistic value.
 * - Pending rows (`tmp_…`) are quick-adds without a server id yet.
 * - Access lost mid-session (`forbidden_role`, `MENU_MODULE_DISABLED`): mapped
 *   error toast + `onAccessLost` (role refetch + menu refetch), at most once per 10 s.
 * - Feedback: inline name / price / photo / quick-add / category text are
 *   silent (undo entry + SaveIndicator, G4); toggles, deletes, duplicate,
 *   bulk and category visibility toast with "Geri al". The item panel's saves
 *   hand their undo back to the panel, which toasts after it closes.
 *
 * The returned `actions` object is stable for the life of the page.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };
export type UndoRun = () => Promise<{ ok: boolean; message?: string }>;

type FieldPatch = Partial<Pick<MenuItemView, 'name' | 'priceCents' | 'isAvailable' | 'isOutOfStock' | 'imageUrl' | 'description'>>;
type CategoryPatch = { name?: string; description?: string | null; isVisible?: boolean };

export interface PendingCreate {
  status: 'saving' | 'error';
  message?: string;
}

export interface RowFeedback {
  state: RowSaveState;
  message?: string;
}

export interface MenuActions {
  renameItem(id: string, name: string): Promise<ActionResult>;
  setItemPrice(id: string, cents: number): Promise<ActionResult>;
  toggleSoldOut(id: string): Promise<ActionResult>;
  hideItem(id: string): Promise<ActionResult>;
  showItem(id: string): Promise<ActionResult>;
  /** Optimistic pending row; returns its temp id at once. */
  createItemQuick(categoryId: string, values: { name: string; priceCents: number }): string;
  retryCreate(tempId: string): void;
  discardCreate(tempId: string): void;
  /** Item panel "Kaydet" (create). The caller toasts / pushes `undo`. */
  createItem(payload: CreateItemPayload): Promise<(ActionResult & { item?: SavedItem; undo?: UndoRun })>;
  /** Item panel "Kaydet" (edit): only the changed fields. The caller toasts / pushes `undo`. */
  updateItem(id: string, patch: ItemPatch): Promise<(ActionResult & { item?: SavedItem; moved?: boolean; undo?: UndoRun })>;
  duplicateItem(id: string): Promise<ActionResult & { copyId?: string }>;
  deleteItem(id: string): Promise<ActionResult>;
  /** Upload + PATCH `imageUrl` (silent, undo entry). */
  setItemPhoto(id: string, file: File): Promise<ActionResult>;
  setItemPhotoUrl(id: string, url: string | null): Promise<ActionResult>;
  createCategory(name: string): Promise<ActionResult & { categoryId?: string }>;
  renameCategory(id: string, name: string): Promise<ActionResult>;
  setCategoryDescription(id: string, description: string | null): Promise<ActionResult>;
  setCategoryVisible(id: string, visible: boolean): Promise<ActionResult>;
  deleteCategory(
    id: string,
    opts: { deleteItems: boolean },
  ): Promise<ActionResult & { code?: string | null; itemCount?: number | null; neighbourId?: string | null }>;
  bulkSetFlags(ids: string[], op: FlagOp): Promise<ActionResult>;
  /** Drag across categories / "Başka kategoriye taşı…" (one item). `toIndex` = drop position. */
  moveItemToCategory(id: string, toCategoryId: string, toIndex?: number): Promise<ActionResult>;
  /** New order of one category (drag, Alt+↑/↓, reorder-mode arrows). Pending rows stay last. */
  reorderItems(categoryId: string, ids: string[]): Promise<ActionResult>;
  /** New category order (rail, CategoryOrderSheet, section ⋯ up / down). */
  reorderCategories(ids: string[]): Promise<ActionResult>;
  /** BulkPriceDialog: N×PATCH `{ priceCents }`. The caller toasts (dialog closes first) or shows the partial banner. */
  bulkSetPrices(
    changes: { id: string; to: number }[],
    onProgress?: (done: number) => void,
  ): Promise<ActionResult & { failedIds: string[]; updated: number; undo?: UndoRun }>;
  /** Selection → "Taşı…": lands at the end of the target in visual order. */
  bulkMove(ids: string[], toCategoryId: string): Promise<ActionResult & { movedIds: string[] }>;
  bulkDelete(ids: string[]): Promise<ActionResult>;
  /** `POST …/items/bulk` (≤30, atomic). The caller toasts. */
  bulkCreate(categoryId: string, rows: PastePlanItem[]): Promise<ActionResult & { items?: SavedItem[]; undo?: UndoRun }>;
  /** Paste review "Ekle": the picked category, then each new category; stops at the first failure. */
  commitPaste(
    input: { targetCategoryId: string | null; plan: PastePlan },
    onProgress?: (done: number, total: number) => void,
  ): Promise<CommitPasteResult>;
  publish(): Promise<ActionResult>;
  unpublish(): Promise<ActionResult>;
  clearSaveError(): void;
}

export interface CommitPasteResult {
  ok: boolean;
  message?: string;
  /** The rows for the picked category were created (or there were none). */
  targetDone: boolean;
  /** How many of `plan.newCategories` were created together with their items. */
  categoriesDone: number;
  itemsAdded: number;
  firstItemId: string | null;
  firstCategoryId: string | null;
  /** Removes everything this paste created (also after a partial failure). */
  undo?: UndoRun;
}

export interface UseMenuActionsOptions {
  restaurantId: string;
  isTr: boolean;
  copy: MenuCopy;
  menu: {
    setMenu: (fn: (m: MenuData) => MenuData) => void;
    getMenu: () => MenuData | undefined;
    touchLocal: () => void;
    fetchAll: () => Promise<boolean>;
  };
  toaster: ToasterApi;
  upload: (file: File, kind: 'item' | 'logo') => Promise<PhotoUploadResult>;
  onAccessLost: () => void;
  /** A row should flash (quick-add landed, photo saved). */
  onFlash?: (itemId: string) => void;
}

const ACCESS_CODES = new Set(['forbidden_role', 'MENU_MODULE_DISABLED']);
const ACCESS_THROTTLE_MS = 10_000;
const SAVED_ROW_MS = 1200;

function findItem(categories: CategoryShape[], id: string) {
  for (const category of categories) {
    const index = category.items.findIndex((i) => i.id === id);
    if (index !== -1) return { item: category.items[index], category, index };
  }
  return null;
}

function pick<T extends object>(source: T, keys: string[]): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const key of keys) out[key] = (source as Record<string, unknown>)[key];
  return out as Partial<T>;
}

/** Put one category's items in `ids` order (ids not listed — pending rows — stay last); sortOrder = index. */
function orderIn(categories: CategoryShape[], categoryId: string, ids: string[]): CategoryShape[] {
  return categories.map((cat) => {
    if (cat.id !== categoryId) return cat;
    const byId = new Map(cat.items.map((i) => [i.id, i]));
    const listed = new Set(ids);
    const ordered = ids.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });
    return { ...cat, items: withIndexSortOrder([...ordered, ...cat.items.filter((i) => !listed.has(i.id))]) };
  });
}

/** Category order by `ids` (unlisted ones keep their place at the end); sortOrder = index. */
function orderCategories(categories: CategoryShape[], ids: string[]): CategoryShape[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const listed = new Set(ids);
  const ordered = ids.flatMap((id) => {
    const c = byId.get(id);
    return c ? [c] : [];
  });
  return withIndexSortOrder([...ordered, ...categories.filter((c) => !listed.has(c.id))]);
}

const stableIds = (category: CategoryShape | undefined): string[] =>
  (category?.items ?? []).filter((i) => !isTempId(i.id)).map((i) => i.id);

let tempSeq = 0;

export function useMenuActions(options: UseMenuActionsOptions): {
  actions: MenuActions;
  rows: Record<string, RowFeedback>;
  pendingCreates: Record<string, PendingCreate>;
  pending: number;
  savedAt: number | null;
  saveError: { message: string; itemId?: string } | null;
  publishBusy: boolean;
} {
  const { enqueue, pending } = useSerialQueue();
  const [rows, setRows] = useState<Record<string, RowFeedback>>({});
  const [pendingCreates, setPendingCreates] = useState<Record<string, PendingCreate>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<{ message: string; itemId?: string } | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);

  const env = useRef(options);
  env.current = options;
  const rowTimers = useRef(new Map<string, number>());
  const tempPayloads = useRef(new Map<string, CreateItemPayload>());
  const lastAccessLost = useRef(0);

  useEffect(() => {
    const timers = rowTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const setRow = useCallback((id: string, state: RowSaveState | null, message?: string) => {
    const timers = rowTimers.current;
    const old = timers.get(id);
    if (old) window.clearTimeout(old);
    timers.delete(id);
    setRows((prev) => {
      if (state === null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { state, message } };
    });
    if (state === 'saved') {
      timers.set(
        id,
        window.setTimeout(() => {
          timers.delete(id);
          setRows((prev) => {
            if (prev[id]?.state !== 'saved') return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, SAVED_ROW_MS),
      );
    }
  }, []);

  const setPendingCreate = useCallback((tempId: string, value: PendingCreate | null) => {
    setPendingCreates((prev) => {
      if (value === null) {
        if (!(tempId in prev)) return prev;
        const next = { ...prev };
        delete next[tempId];
        return next;
      }
      return { ...prev, [tempId]: value };
    });
  }, []);

  const actions = useMemo<MenuActions>(() => {
    const e = () => env.current;
    const api = () => menuApi(e().restaurantId, e().isTr);
    const cats = (): CategoryShape[] => e().menu.getMenu()?.categories ?? [];
    const setCats = (fn: (c: CategoryShape[]) => CategoryShape[]) =>
      e().menu.setMenu((m) => {
        const categories = fn(m.categories);
        return categories === m.categories ? m : { ...m, categories };
      });
    const generic = () => mapMenuApiError(null, e().isTr);
    const success = () => {
      e().menu.touchLocal();
      setSavedAt(Date.now());
      setSaveError(null);
    };
    /** Access-lost handling; returns the failure for chaining. */
    const failed = (r: ApiFailure): { ok: false; message: string } => {
      if (r.code && ACCESS_CODES.has(r.code)) {
        const now = Date.now();
        if (now - lastAccessLost.current > ACCESS_THROTTLE_MS) {
          lastAccessLost.current = now;
          e().toaster.notify({ message: r.message, tone: 'error' });
          e().onAccessLost();
        }
      }
      return { ok: false, message: r.message };
    };
    const errorToast = (message: string) => e().toaster.notify({ message, tone: 'error' });
    /** Silent refetch; a failure keeps the data on screen and offers "Tekrar dene". */
    const refetch = async (): Promise<void> => {
      if (await e().menu.fetchAll()) return;
      const { errors } = e().copy;
      e().toaster.notify({ message: errors.refreshFailed, tone: 'error', action: { label: errors.retry, run: () => void refetch() } });
    };
    const toast = (message: string, undo?: UndoRun) => e().toaster.notify({ message, undo });
    const asUndo = (result: ActionResult): { ok: boolean; message?: string } =>
      result.ok ? { ok: true } : { ok: false, message: result.message };

    // ── single item field write (optimistic, revert-if-unchanged) ──
    const writeItem = async (id: string, patch: FieldPatch): Promise<ActionResult & { prev?: FieldPatch }> => {
      const found = findItem(cats(), id);
      if (!found || isTempId(id)) return { ok: false, message: generic() };
      const keys = Object.keys(patch);
      const prev = pick(found.item, keys) as FieldPatch;
      setCats((c) => patchItem(c, id, patch));
      setRow(id, 'saving');
      const r = await enqueue(`item:${id}`, () => api().updateItem(id, patch as ItemPatch));
      if (r.ok) {
        const saved = r.data?.item;
        if (saved) setCats((c) => patchItem(c, id, pick(saved, keys)));
        setRow(id, 'saved');
        success();
        return { ok: true, prev };
      }
      setCats((c) => {
        const now = findItem(c, id);
        if (!now) return c;
        const revert: Record<string, unknown> = {};
        for (const key of keys) {
          if ((now.item as unknown as Record<string, unknown>)[key] === (patch as Record<string, unknown>)[key]) {
            revert[key] = (prev as Record<string, unknown>)[key];
          }
        }
        return Object.keys(revert).length ? patchItem(c, id, revert as FieldPatch) : c;
      });
      setRow(id, 'error', r.message);
      setSaveError({ message: r.message, itemId: id });
      return failed(r);
    };

    const silentWrite = async (id: string, patch: FieldPatch, label: string): Promise<ActionResult> => {
      const r = await writeItem(id, patch);
      if (r.ok && r.prev) {
        const prev = r.prev;
        e().toaster.pushUndo(label, async () => asUndo(await writeItem(id, prev)));
      }
      return r.ok ? { ok: true } : r;
    };

    const toastWrite = async (id: string, patch: FieldPatch, message: (name: string) => string): Promise<ActionResult> => {
      const r = await writeItem(id, patch);
      if (!r.ok) {
        errorToast(r.message);
        return r;
      }
      const name = findItem(cats(), id)?.item.name ?? '';
      const prev = r.prev ?? {};
      toast(message(name), async () => asUndo(await writeItem(id, prev)));
      return { ok: true };
    };

    // ── server-side removal used by undo of creates ──
    const removeItemQuietly = async (id: string): Promise<{ ok: boolean; message?: string }> => {
      const found = findItem(cats(), id);
      if (found) setCats((c) => removeItems(c, [id]));
      const r = await enqueue(`item:${id}`, () => api().deleteItem(id));
      if (!r.ok) {
        if (found) setCats((c) => insertItemBySortOrder(c, found.category.id, found.item) ?? c);
        return failed(r);
      }
      success();
      return { ok: true };
    };

    /** Bring deleted items back (≤100 per request); a non-empty `skipped` is a partial undo. */
    const restoreItems = async (
      ids: string[],
      fallbackCategory: (id: string) => string | undefined,
    ): Promise<{ ok: boolean; message?: string }> => {
      const r = await enqueue(ids.length === 1 ? `item:${ids[0]}` : 'restore', () => api().restore({ itemIds: ids.slice(0, 100) }));
      if (!r.ok) return failed(r);
      const items = r.data?.items ?? [];
      let placed = true;
      setCats((c) =>
        items.reduce<CategoryShape[]>((acc, item) => {
          const categoryId = item.categoryId ?? fallbackCategory(item.id);
          const next = categoryId ? insertItemBySortOrder(acc, categoryId, item) : null;
          if (!next) placed = false;
          return next ?? acc;
        }, c),
      );
      if (!placed) void refetch();
      if (items.length) success();
      const skipped = skippedMessage(r.data?.skipped, e().isTr);
      if (skipped) return { ok: false, message: skipped };
      if (items.length === 0) return { ok: false, message: generic() };
      return { ok: true };
    };
    const restoreItem = (id: string, fallbackCategoryId: string) => restoreItems([id], () => fallbackCategoryId);

    /** Store the local order of each category (pending rows left out); one reorder call per category. */
    const persistOrder = async (categoryIds: string[]): Promise<ActionResult> => {
      const unique = [...new Set(categoryIds)];
      const results = await Promise.all(
        unique.map((cid) => {
          const ids = stableIds(cats().find((c) => c.id === cid));
          return enqueue(`order:items:${cid}`, () => api().reorder({ items: ids.map((id, sortOrder) => ({ id, sortOrder })) }));
        }),
      );
      const bad = results.find((r) => !r.ok);
      if (bad && !bad.ok) {
        failed(bad);
        await refetch();
        return { ok: false, message: bad.message };
      }
      success();
      return { ok: true };
    };

    const setItemOrder = async (categoryId: string, ids: string[]): Promise<ActionResult> => {
      setCats((c) => orderIn(c, categoryId, ids));
      return persistOrder([categoryId]);
    };

    const setCategoryOrder = async (ids: string[]): Promise<ActionResult> => {
      setCats((c) => orderCategories(c, ids));
      const order = cats().map((c) => c.id);
      const r = await enqueue('order:categories', () =>
        api().reorder({ categories: order.map((id, sortOrder) => ({ id, sortOrder })) }),
      );
      if (!r.ok) {
        failed(r);
        await refetch();
        return { ok: false, message: r.message };
      }
      success();
      return { ok: true };
    };

    /** `POST …/items/bulk` + merge; ids of the created items. */
    const bulkCreateRaw = async (
      categoryId: string,
      rows: PastePlanItem[],
    ): Promise<{ ok: true; items: SavedItem[] } | { ok: false; message: string }> => {
      const r = await enqueue(`append:${categoryId}`, () => api().bulkCreateItems(categoryId, rows));
      if (!r.ok) return failed(r);
      const items = [...(r.data?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      let merged = true;
      setCats((c) =>
        items.reduce<CategoryShape[]>((acc, item) => {
          const next = applySavedItem(acc, 'create', item, categoryId);
          if (!next) merged = false;
          return next ?? acc;
        }, c),
      );
      if (!merged) await refetch();
      success();
      return { ok: true, items };
    };

    /** Delete items that were just created (undo of paste / bulk add). */
    const removeCreated = async (itemIds: string[], categoryIds: string[]): Promise<{ ok: boolean; message?: string }> => {
      setCats((c) => categoryIds.reduce((acc, id) => removeCategory(acc, id), removeItems(c, itemIds)));
      const results = [
        ...(await runPool(itemIds.map((id) => () => enqueue(`item:${id}`, () => api().deleteItem(id))), 4)),
        ...(await runPool(
          categoryIds.map((id) => () => enqueue(`cat:${id}`, () => api().deleteCategory(id, { deleteItems: true }))),
          2,
        )),
      ];
      const bad = results.find((res) => res.status !== 'fulfilled' || !res.value.ok);
      if (bad) {
        await refetch();
        return { ok: false, message: bad.status === 'fulfilled' && !bad.value.ok ? failed(bad.value).message : generic() };
      }
      success();
      return { ok: true };
    };

    /** Server order of one category = the local order (pending rows left out). */
    const saveItemOrder = async (categoryId: string): Promise<boolean> => {
      const category = cats().find((c) => c.id === categoryId);
      if (!category) return false;
      const ids = category.items.filter((i) => !isTempId(i.id)).map((i) => i.id);
      setCats((c) =>
        c.map((cat) => (cat.id === categoryId ? { ...cat, items: withIndexSortOrder(cat.items) } : cat)),
      );
      const r = await enqueue(`order:items:${categoryId}`, () =>
        api().reorder({ items: ids.map((id, sortOrder) => ({ id, sortOrder })) }),
      );
      if (!r.ok) {
        failed(r);
        await refetch();
        errorToast(r.message);
        return false;
      }
      success();
      return true;
    };

    /** Move an item inside its category (local), then store that order. */
    const placeAt = async (categoryId: string, itemId: string, index: number) => {
      setCats((c) =>
        c.map((cat) => {
          if (cat.id !== categoryId) return cat;
          const item = cat.items.find((i) => i.id === itemId);
          if (!item) return cat;
          const items = cat.items.filter((i) => i.id !== itemId);
          items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
          return { ...cat, items };
        }),
      );
      return saveItemOrder(categoryId);
    };

    // ── quick add (pending rows) ──
    const submitTemp = async (tempId: string) => {
      const payload = tempPayloads.current.get(tempId);
      if (!payload) return;
      setPendingCreate(tempId, { status: 'saving' });
      const r = await enqueue(`append:${payload.categoryId}`, () => api().createItem(payload));
      if (!tempPayloads.current.has(tempId)) return; // discarded meanwhile
      if (r.ok && r.data?.item) {
        const saved = r.data.item;
        tempPayloads.current.delete(tempId);
        setCats((c) => replaceItem(c, tempId, { ...saved, categoryId: saved.categoryId ?? payload.categoryId }));
        setPendingCreate(tempId, null);
        success();
        e().onFlash?.(saved.id);
        e().toaster.pushUndo(e().copy.fmt.toast.itemAdded(saved.name), () => removeItemQuietly(saved.id));
        return;
      }
      const message = r.ok ? generic() : failed(r).message;
      setPendingCreate(tempId, { status: 'error', message });
      setSaveError({ message });
    };

    const writeCategory = async (id: string, patch: CategoryPatch): Promise<ActionResult & { prev?: CategoryPatch }> => {
      const category = cats().find((c) => c.id === id);
      if (!category) return { ok: false, message: generic() };
      const keys = Object.keys(patch);
      const prev = pick(category, keys) as CategoryPatch;
      setCats((c) => c.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)));
      const r = await enqueue(`cat:${id}`, () => api().updateCategory(id, patch));
      if (r.ok) {
        const saved = r.data?.category;
        if (saved) setCats((c) => c.map((cat) => (cat.id === id ? { ...cat, ...pick(saved, keys) } : cat)));
        success();
        return { ok: true, prev };
      }
      setCats((c) =>
        c.map((cat) => {
          if (cat.id !== id) return cat;
          const revert: Record<string, unknown> = {};
          for (const key of keys) {
            if ((cat as unknown as Record<string, unknown>)[key] === (patch as Record<string, unknown>)[key]) {
              revert[key] = (prev as Record<string, unknown>)[key];
            }
          }
          return Object.keys(revert).length ? { ...cat, ...revert } : cat;
        }),
      );
      setSaveError({ message: r.message });
      return failed(r);
    };

    const setPublished = async (next: boolean): Promise<ActionResult> => {
      setPublishBusy(true);
      const r = await api().setPublished(next);
      setPublishBusy(false);
      if (!r.ok) {
        failed(r);
        errorToast(r.message);
        return { ok: false, message: r.message };
      }
      const updated = r.data?.restaurant;
      if (updated) {
        e().menu.setMenu((m) => ({
          ...m,
          restaurant: { ...m.restaurant, menuPublished: updated.menuPublished, menuUpdatedAt: updated.menuUpdatedAt },
        }));
      } else {
        await refetch();
      }
      e().toaster.notify({ message: next ? e().copy.toast.published : e().copy.toast.unpublished, tone: 'info' });
      return { ok: true };
    };

    const self: MenuActions = {
      renameItem: (id, name) => silentWrite(id, { name }, name),
      setItemPrice: (id, cents) => silentWrite(id, { priceCents: cents }, findItem(cats(), id)?.item.name ?? ''),

      toggleSoldOut: (id) => {
        const found = findItem(cats(), id);
        if (!found) return Promise.resolve<ActionResult>({ ok: false, message: generic() });
        const next = !found.item.isOutOfStock;
        const { copy } = e();
        return toastWrite(id, { isOutOfStock: next }, (name) =>
          copy.fmt.toast.statusChanged(name, next ? copy.item.soldOut : copy.item.available),
        );
      },
      hideItem: (id) => toastWrite(id, { isAvailable: false }, e().copy.fmt.toast.hidden),
      showItem: (id) => toastWrite(id, { isAvailable: true }, e().copy.fmt.toast.shown),

      createItemQuick: (categoryId, { name, priceCents }) => {
        tempSeq += 1;
        const tempId = `${TEMP_PREFIX}${Date.now().toString(36)}${tempSeq}`;
        const payload: CreateItemPayload = {
          categoryId,
          name,
          description: null,
          priceCents,
          imageUrl: null,
          badges: [],
          allergens: [],
          isAvailable: true,
          isOutOfStock: false,
          currency: 'TRY',
        };
        tempPayloads.current.set(tempId, payload);
        setCats((c) =>
          c.map((cat) => {
            if (cat.id !== categoryId) return cat;
            const sortOrder = cat.items.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1;
            const temp: MenuItemView = {
              id: tempId, name, description: null, priceCents, currency: 'TRY', imageUrl: null,
              badges: [], allergens: [], isAvailable: true, isOutOfStock: false, sortOrder,
            };
            return { ...cat, items: [...cat.items, temp] };
          }),
        );
        void submitTemp(tempId);
        return tempId;
      },
      retryCreate: (tempId) => void submitTemp(tempId),
      discardCreate: (tempId) => {
        tempPayloads.current.delete(tempId);
        setCats((c) => removeItems(c, [tempId]));
        setPendingCreate(tempId, null);
      },

      createItem: async (payload) => {
        const r = await enqueue(`append:${payload.categoryId}`, () => api().createItem(payload));
        if (!r.ok) return failed(r);
        const saved = r.data?.item;
        if (!saved) {
          await refetch();
          return { ok: true };
        }
        let merged = true;
        setCats((c) => {
          const next = applySavedItem(c, 'create', saved, payload.categoryId);
          if (!next) merged = false;
          return next ?? c;
        });
        if (!merged) await refetch();
        success();
        return { ok: true, item: saved, undo: () => removeItemQuietly(saved.id) };
      },

      updateItem: async (id, patch) => {
        const found = findItem(cats(), id);
        if (!found) return { ok: false, message: generic() };
        const moved = Boolean(patch.categoryId && patch.categoryId !== found.category.id);
        const key = moved ? `append:${patch.categoryId}` : `item:${id}`;
        setRow(id, 'saving');
        const r = await enqueue(key, () => api().updateItem(id, patch));
        if (!r.ok) {
          setRow(id, 'error', r.message);
          return failed(r);
        }
        const saved = r.data?.item;
        let merged = Boolean(saved);
        if (saved) {
          setCats((c) => {
            const next = applySavedItem(c, 'edit', saved, patch.categoryId);
            if (!next) merged = false;
            return next ?? c;
          });
        }
        if (!merged) await refetch();
        setRow(id, 'saved');
        success();
        // Undo = the changed fields back; a category change also returns to the old position.
        const inverse: ItemPatch = {};
        const before = found.item as unknown as Record<string, unknown>;
        for (const field of Object.keys(patch) as (keyof ItemPatch)[]) {
          if (field === 'categoryId') inverse.categoryId = found.category.id;
          else (inverse as Record<string, unknown>)[field] = before[field] ?? null;
        }
        const undo: UndoRun = async () => {
          const back = await enqueue(moved ? `append:${found.category.id}` : `item:${id}`, () =>
            api().updateItem(id, inverse),
          );
          if (!back.ok) return failed(back);
          const restored = back.data?.item;
          if (restored) setCats((c) => applySavedItem(c, 'edit', restored, inverse.categoryId) ?? c);
          success();
          if (moved) await placeAt(found.category.id, id, found.index);
          return { ok: true };
        };
        return { ok: true, item: saved, moved, undo };
      },

      duplicateItem: async (id) => {
        const found = findItem(cats(), id);
        if (!found || isTempId(id)) return { ok: false, message: generic() };
        const { item, category } = found;
        const payload: CreateItemPayload = {
          categoryId: category.id,
          name: `${item.name}${e().copy.item.copySuffix}`.slice(0, 120).trim(),
          description: item.description,
          priceCents: item.priceCents,
          imageUrl: item.imageUrl,
          badges: item.badges,
          allergens: item.allergens ?? [],
          isAvailable: item.isAvailable,
          isOutOfStock: false,
          currency: item.currency,
        };
        const r = await enqueue(`append:${category.id}`, () => api().createItem(payload));
        if (!r.ok || !r.data?.item) {
          const message = r.ok ? generic() : failed(r).message;
          errorToast(message);
          return { ok: false, message };
        }
        const saved = r.data.item;
        setCats((c) => applySavedItem(c, 'create', saved, category.id) ?? c);
        success();
        // Right below the source, not at the end of the category.
        const sourceIndex = cats().find((c) => c.id === category.id)?.items.findIndex((i) => i.id === id) ?? -1;
        if (sourceIndex !== -1) await placeAt(category.id, saved.id, sourceIndex + 1);
        toast(e().copy.fmt.toast.duplicated(item.name), () => removeItemQuietly(saved.id));
        return { ok: true, copyId: saved.id };
      },

      deleteItem: async (id) => {
        const found = findItem(cats(), id);
        if (!found || isTempId(id)) return { ok: false, message: generic() };
        setCats((c) => removeItems(c, [id]));
        const r = await enqueue(`item:${id}`, () => api().deleteItem(id));
        if (!r.ok) {
          setCats((c) => insertItemBySortOrder(c, found.category.id, found.item) ?? c);
          failed(r);
          errorToast(r.message);
          return { ok: false, message: r.message };
        }
        success();
        toast(e().copy.fmt.toast.itemDeleted(found.item.name), () => restoreItem(id, found.category.id));
        return { ok: true };
      },

      setItemPhoto: async (id, file) => {
        const uploaded = await e().upload(file, 'item');
        if (!uploaded.ok) {
          setRow(id, 'error', uploaded.message);
          return { ok: false, message: uploaded.message };
        }
        const r = await silentWrite(id, { imageUrl: uploaded.url }, findItem(cats(), id)?.item.name ?? '');
        if (r.ok) e().onFlash?.(id);
        return r;
      },
      setItemPhotoUrl: (id, url) => silentWrite(id, { imageUrl: url }, findItem(cats(), id)?.item.name ?? ''),

      createCategory: async (name) => {
        const r = await enqueue('append:categories', () =>
          api().createCategory({ name, description: null, isVisible: true }),
        );
        if (!r.ok) return failed(r);
        const saved = r.data?.category;
        if (!saved) {
          await refetch();
          return { ok: true };
        }
        setCats((c) => applySavedCategory(c, 'create', saved as SavedCategory));
        success();
        toast(e().copy.fmt.toast.categoryAdded(saved.name), async () => {
          const before = cats().find((c) => c.id === saved.id);
          setCats((c) => removeCategory(c, saved.id));
          const d = await enqueue(`cat:${saved.id}`, () => api().deleteCategory(saved.id, { deleteItems: false }));
          if (!d.ok) {
            if (before) setCats((c) => insertCategoryBySortOrder(c, before));
            return failed(d);
          }
          success();
          return { ok: true };
        });
        return { ok: true, categoryId: saved.id };
      },

      renameCategory: async (id, name) => {
        const r = await writeCategory(id, { name });
        if (r.ok && r.prev) {
          const prev = r.prev;
          e().toaster.pushUndo(name, async () => asUndo(await writeCategory(id, prev)));
        }
        return r.ok ? { ok: true } : r;
      },
      setCategoryDescription: async (id, description) => {
        const r = await writeCategory(id, { description });
        if (r.ok && r.prev) {
          const prev = r.prev;
          const label = cats().find((c) => c.id === id)?.name ?? '';
          e().toaster.pushUndo(label, async () => asUndo(await writeCategory(id, prev)));
        }
        return r.ok ? { ok: true } : r;
      },
      setCategoryVisible: async (id, visible) => {
        const r = await writeCategory(id, { isVisible: visible });
        if (!r.ok) {
          errorToast(r.message);
          return r;
        }
        const name = cats().find((c) => c.id === id)?.name ?? '';
        const { fmt } = e().copy;
        toast(visible ? fmt.toast.categoryShown(name) : fmt.toast.categoryHidden(name), async () =>
          asUndo(await writeCategory(id, { isVisible: !visible })),
        );
        return { ok: true };
      },

      deleteCategory: async (id, { deleteItems }) => {
        const before = cats();
        const category = before.find((c) => c.id === id);
        if (!category) return { ok: false, message: generic() };
        const neighbourId = neighbourCategoryId(before, id);
        setCats((c) => removeCategory(c, id));
        const r = await enqueue(`cat:${id}`, () => api().deleteCategory(id, { deleteItems }));
        if (!r.ok) {
          setCats((c) => insertCategoryBySortOrder(c, category));
          if (r.code === 'CATEGORY_NOT_EMPTY') return { ok: false, message: r.message, code: r.code, itemCount: r.itemCount };
          failed(r);
          errorToast(r.message);
          return { ok: false, message: r.message, code: r.code };
        }
        success();
        const n = deleteItems ? (r.data?.deletedItems ?? category.items.filter((i) => !isTempId(i.id)).length) : 0;
        toast(e().copy.fmt.toast.categoryDeleted(category.name, n), async () => {
          const back = await enqueue(`cat:${id}`, () => api().restore({ categoryId: id }));
          if (!back.ok) return failed(back);
          const restored = back.data?.category;
          if (!restored) {
            await refetch();
            return { ok: true };
          }
          setCats((c) =>
            insertCategoryBySortOrder(c, {
              ...restored,
              items: [...(restored.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
            }),
          );
          success();
          return { ok: true };
        });
        return { ok: true, neighbourId };
      },

      bulkSetFlags: async (ids, op) => {
        const current = cats();
        const changes = ids.flatMap((id) => {
          if (isTempId(id)) return [];
          const found = findItem(current, id);
          const patch = found ? flagPatch(op, found.item) : null;
          if (!found || !patch) return [];
          return [{ id, patch: patch as FieldPatch, prev: pick(found.item, Object.keys(patch)) as FieldPatch }];
        });
        if (changes.length === 0) return { ok: true };
        setCats((c) => patchItems(c, changes.map(({ id, patch }) => ({ id, patch }))));
        const results = await runPool(
          changes.map((ch) => () => enqueue(`item:${ch.id}`, () => api().updateItem(ch.id, ch.patch as ItemPatch))),
          4,
        );
        const ok: typeof changes = [];
        const bad: typeof changes = [];
        let firstFailure: ApiFailure | null = null;
        for (let i = 0; i < results.length; i += 1) {
          const res = results[i];
          if (res.status === 'fulfilled' && res.value.ok) {
            ok.push(changes[i]);
            continue;
          }
          bad.push(changes[i]);
          if (!firstFailure && res.status === 'fulfilled' && !res.value.ok) firstFailure = res.value;
        }
        if (bad.length) {
          setCats((c) =>
            patchItems(
              c,
              bad.flatMap((ch) => {
                const now = findItem(c, ch.id);
                if (!now) return [];
                const revert: Record<string, unknown> = {};
                for (const key of Object.keys(ch.patch)) {
                  const field = key as keyof FieldPatch;
                  if (now.item[field] === ch.patch[field]) revert[key] = ch.prev[field];
                }
                return Object.keys(revert).length ? [{ id: ch.id, patch: revert as FieldPatch }] : [];
              }),
            ),
          );
          if (firstFailure) failed(firstFailure);
        }
        if (ok.length) success();
        const undo: UndoRun | undefined = ok.length
          ? async () => {
              const back = await runPool(ok.map((ch) => () => writeItem(ch.id, ch.prev)), 4);
              const failure = back.find((b) => b.status !== 'fulfilled' || !b.value.ok);
              if (!failure) return { ok: true };
              return { ok: false, message: failure.status === 'fulfilled' && !failure.value.ok ? failure.value.message : generic() };
            }
          : undefined;
        const { fmt } = e().copy;
        if (bad.length === 0) {
          toast(fmt.toast.bulkUpdated(ok.length), undo);
          return { ok: true };
        }
        e().toaster.notify({ message: fmt.toast.bulkPartial(bad.length), tone: 'error', undo });
        return { ok: false, message: fmt.toast.bulkPartial(bad.length) };
      },

      moveItemToCategory: async (id, toCategoryId, toIndex) => {
        const current = cats();
        const found = findItem(current, id);
        const target = current.find((c) => c.id === toCategoryId);
        if (!found || !target || isTempId(id)) return { ok: false, message: generic() };
        const from = found.category;
        if (from.id === toCategoryId) {
          if (toIndex === undefined) return { ok: true };
          const ids = stableIds(from).filter((x) => x !== id);
          ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, id);
          return self.reorderItems(from.id, ids);
        }
        const fromBefore = stableIds(from);
        const targetBefore = stableIds(target);
        setCats((c) => moveItemLocal(c, id, toCategoryId, toIndex) ?? c);
        const r = await enqueue(`append:${toCategoryId}`, () => api().updateItem(id, { categoryId: toCategoryId }));
        if (!r.ok) {
          failed(r);
          await refetch();
          errorToast(r.message);
          return { ok: false, message: r.message };
        }
        const saved = r.data?.item;
        if (toIndex === undefined) {
          if (saved) setCats((c) => applySavedItem(c, 'edit', saved, toCategoryId) ?? c);
          success();
        } else {
          const o = await persistOrder([toCategoryId, from.id]);
          if (!o.ok) {
            errorToast(o.message);
            return o;
          }
        }
        const undo: UndoRun = async () => {
          const back = await enqueue(`append:${from.id}`, () => api().updateItem(id, { categoryId: from.id }));
          if (!back.ok) return failed(back);
          setCats((c) => orderIn(orderIn(moveItemLocal(c, id, from.id) ?? c, from.id, fromBefore), toCategoryId, targetBefore));
          return asUndo(await persistOrder([from.id, toCategoryId]));
        };
        toast(e().copy.fmt.toast.moved(found.item.name, target.name), undo);
        return { ok: true };
      },

      reorderItems: async (categoryId, ids) => {
        const before = stableIds(cats().find((c) => c.id === categoryId));
        if (before.length === 0) return { ok: false, message: generic() };
        if (before.length === ids.length && before.every((id, i) => id === ids[i])) return { ok: true };
        const r = await setItemOrder(categoryId, ids);
        if (!r.ok) {
          errorToast(r.message);
          return r;
        }
        e().toaster.notify({
          message: e().copy.toast.orderSaved,
          undo: async () => asUndo(await setItemOrder(categoryId, before)),
          silentIfModal: true,
        });
        return { ok: true };
      },

      reorderCategories: async (ids) => {
        const before = cats().map((c) => c.id);
        if (before.length === ids.length && before.every((id, i) => id === ids[i])) return { ok: true };
        const r = await setCategoryOrder(ids);
        if (!r.ok) {
          errorToast(r.message);
          return r;
        }
        e().toaster.notify({
          message: e().copy.toast.orderSaved,
          undo: async () => asUndo(await setCategoryOrder(before)),
          silentIfModal: true,
        });
        return { ok: true };
      },

      bulkSetPrices: async (requested, onProgress) => {
        const current = cats();
        const changes = requested.flatMap(({ id, to }) => {
          const found = isTempId(id) ? null : findItem(current, id);
          if (!found || found.item.priceCents === to) return [];
          return [{ id, to, from: found.item.priceCents }];
        });
        if (changes.length === 0) return { ok: true, failedIds: [], updated: 0 };
        setCats((c) => patchItems(c, changes.map(({ id, to }) => ({ id, patch: { priceCents: to } }))));
        let done = 0;
        const results = await runPool(
          changes.map((ch) => async () => {
            const r = await enqueue(`item:${ch.id}`, () => api().updateItem(ch.id, { priceCents: ch.to }));
            done += 1;
            onProgress?.(done);
            return r;
          }),
          4,
        );
        const ok: typeof changes = [];
        const bad: typeof changes = [];
        let firstFailure: ApiFailure | null = null;
        results.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value.ok) ok.push(changes[i]);
          else {
            bad.push(changes[i]);
            if (!firstFailure && res.status === 'fulfilled' && !res.value.ok) firstFailure = res.value;
          }
        });
        if (bad.length) {
          setCats((c) =>
            patchItems(
              c,
              bad.flatMap((ch) => {
                const now = findItem(c, ch.id);
                return now && now.item.priceCents === ch.to ? [{ id: ch.id, patch: { priceCents: ch.from } }] : [];
              }),
            ),
          );
          if (firstFailure) failed(firstFailure);
        }
        if (ok.length) success();
        const undo: UndoRun | undefined = ok.length
          ? async () => {
              const back = await runPool(ok.map((ch) => () => writeItem(ch.id, { priceCents: ch.from })), 4);
              const failure = back.find((b) => b.status !== 'fulfilled' || !b.value.ok);
              if (!failure) return { ok: true };
              return { ok: false, message: failure.status === 'fulfilled' && !failure.value.ok ? failure.value.message : generic() };
            }
          : undefined;
        const message = e().copy.fmt.bulkPrice.partial(bad.length);
        return bad.length
          ? { ok: false, message, failedIds: bad.map((b) => b.id), updated: ok.length, undo }
          : { ok: true, failedIds: [], updated: ok.length, undo };
      },

      bulkMove: async (ids, toCategoryId) => {
        const current = cats();
        const target = current.find((c) => c.id === toCategoryId);
        if (!target) return { ok: false, message: generic(), movedIds: [] };
        const wanted = new Set(ids);
        // Visual order: categories top to bottom, rows top to bottom.
        const ordered = current.flatMap((c) =>
          c.id === toCategoryId ? [] : c.items.filter((i) => wanted.has(i.id) && !isTempId(i.id)).map((i) => i.id),
        );
        if (ordered.length === 0) return { ok: true, movedIds: [] };
        const snapshot = snapshotItemPositions(current, ordered);
        const sourceOrders = new Map<string, string[]>();
        for (const p of snapshot) {
          if (!sourceOrders.has(p.categoryId)) sourceOrders.set(p.categoryId, stableIds(current.find((c) => c.id === p.categoryId)));
        }
        setCats((c) => moveItemsToEnd(c, ordered, toCategoryId));
        const movedIds: string[] = [];
        let firstFailure: ApiFailure | null = null;
        for (const id of ordered) {
          const r = await enqueue(`append:${toCategoryId}`, () => api().updateItem(id, { categoryId: toCategoryId }));
          if (r.ok) {
            movedIds.push(id);
            const sortOrder = r.data?.item?.sortOrder;
            if (typeof sortOrder === 'number') setCats((c) => patchItem(c, id, { sortOrder }));
          } else if (!firstFailure) firstFailure = r;
        }
        if (firstFailure) {
          failed(firstFailure);
          await refetch();
        }
        if (movedIds.length) success();
        const moved = new Set(movedIds);
        const undo: UndoRun | undefined = movedIds.length
          ? async () => {
              for (const p of snapshot) {
                if (!moved.has(p.item.id)) continue;
                const back = await enqueue(`append:${p.categoryId}`, () => api().updateItem(p.item.id, { categoryId: p.categoryId }));
                if (!back.ok) {
                  failed(back);
                  await refetch();
                  return { ok: false, message: back.message };
                }
              }
              setCats((c) => {
                let next = c;
                for (const p of snapshot) if (moved.has(p.item.id)) next = moveItemLocal(next, p.item.id, p.categoryId) ?? next;
                for (const [cid, order] of sourceOrders) next = orderIn(next, cid, order);
                return next;
              });
              return asUndo(await persistOrder([...sourceOrders.keys()]));
            }
          : undefined;
        const { fmt } = e().copy;
        const failedCount = ordered.length - movedIds.length;
        if (failedCount === 0) {
          toast(fmt.toast.bulkMoved(movedIds.length, target.name), undo);
          return { ok: true, movedIds };
        }
        e().toaster.notify({ message: fmt.toast.bulkPartial(failedCount), tone: 'error', undo });
        return { ok: false, message: fmt.toast.bulkPartial(failedCount), movedIds };
      },

      bulkDelete: async (ids) => {
        const current = cats();
        const targets = ids.flatMap((id) => {
          const found = isTempId(id) ? null : findItem(current, id);
          return found ? [found] : [];
        });
        if (targets.length === 0) return { ok: true };
        const home = new Map(targets.map((t) => [t.item.id, t.category.id]));
        setCats((c) => removeItems(c, targets.map((t) => t.item.id)));
        const results = await runPool(
          targets.map((t) => () => enqueue(`item:${t.item.id}`, () => api().deleteItem(t.item.id))),
          4,
        );
        const okIds: string[] = [];
        const bad: typeof targets = [];
        let firstFailure: ApiFailure | null = null;
        results.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value.ok) okIds.push(targets[i].item.id);
          else {
            bad.push(targets[i]);
            if (!firstFailure && res.status === 'fulfilled' && !res.value.ok) firstFailure = res.value;
          }
        });
        if (bad.length) {
          setCats((c) => bad.reduce((acc, t) => insertItemBySortOrder(acc, t.category.id, t.item) ?? acc, c));
          if (firstFailure) failed(firstFailure);
        }
        if (okIds.length) success();
        const undo: UndoRun | undefined = okIds.length ? () => restoreItems(okIds, (id) => home.get(id)) : undefined;
        const { fmt } = e().copy;
        if (bad.length === 0) {
          toast(fmt.toast.bulkDeleted(okIds.length), undo);
          return { ok: true };
        }
        e().toaster.notify({ message: fmt.toast.bulkPartial(bad.length), tone: 'error', undo });
        return { ok: false, message: fmt.toast.bulkPartial(bad.length) };
      },

      bulkCreate: async (categoryId, rows) => {
        const r = await bulkCreateRaw(categoryId, rows);
        if (!r.ok) return r;
        const ids = r.items.map((i) => i.id);
        return { ok: true, items: r.items, undo: () => removeCreated(ids, []) };
      },

      commitPaste: async ({ targetCategoryId, plan }, onProgress) => {
        const total = plan.intoTarget.length + plan.newCategories.reduce((n, c) => n + c.items.length, 0);
        const targetItemIds: string[] = [];
        const createdCategoryIds: string[] = [];
        let done = 0;
        let targetDone = plan.intoTarget.length === 0;
        let categoriesDone = 0;
        let firstItemId: string | null = null;
        let firstCategoryId: string | null = null;
        const undo: UndoRun = () => removeCreated(targetItemIds, createdCategoryIds);
        const result = (ok: boolean, message?: string): CommitPasteResult => ({
          ok, message, targetDone, categoriesDone, itemsAdded: done, firstItemId, firstCategoryId,
          undo: targetItemIds.length || createdCategoryIds.length ? undo : undefined,
        });

        if (plan.intoTarget.length) {
          if (!targetCategoryId) return result(false, generic());
          const r = await bulkCreateRaw(targetCategoryId, plan.intoTarget);
          if (!r.ok) return result(false, r.message);
          targetItemIds.push(...r.items.map((i) => i.id));
          firstItemId = r.items[0]?.id ?? null;
          firstCategoryId = targetCategoryId;
          done += r.items.length;
          targetDone = true;
          onProgress?.(done, total);
        }
        for (const next of plan.newCategories) {
          const c = await enqueue('append:categories', () =>
            api().createCategory({ name: next.name, description: null, isVisible: true }),
          );
          if (!c.ok) return result(false, failed(c).message);
          const saved = c.data?.category;
          if (!saved) {
            await refetch();
            return result(false, generic());
          }
          setCats((x) => applySavedCategory(x, 'create', saved as SavedCategory));
          const b = await bulkCreateRaw(saved.id, next.items);
          if (!b.ok) {
            // Leave nothing half-made: the empty category goes again, so "Tekrar dene" starts clean.
            setCats((x) => removeCategory(x, saved.id));
            void enqueue(`cat:${saved.id}`, () => api().deleteCategory(saved.id, { deleteItems: false }));
            return result(false, b.message);
          }
          createdCategoryIds.push(saved.id);
          firstCategoryId ??= saved.id;
          firstItemId ??= b.items[0]?.id ?? null;
          done += b.items.length;
          categoriesDone += 1;
          onProgress?.(done, total);
        }
        return result(true);
      },

      publish: () => setPublished(true),
      unpublish: () => setPublished(false),
      clearSaveError: () => setSaveError(null),
    };
    return self;
  }, [enqueue, setRow, setPendingCreate]);

  return { actions, rows, pendingCreates, pending, savedAt, saveError, publishBusy };
}
