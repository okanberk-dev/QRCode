import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { checkPrice, type ItemFormValues } from './menu-item-form';
import type { CategoryShape } from './menu-types';

/**
 * Pure state helpers for the builder's local-merge behaviour (spec 7.2): a
 * successful create / update / delete applies the server response to the
 * in-memory menu instead of re-downloading every category and photo.
 *
 * Everything here is React-free so it can be unit-tested with node:test.
 */

/** Item as returned by the menu API (raw row, carries its category id). */
export type SavedItem = MenuItemView & { categoryId?: string };

/** Category as returned by the menu API (POST / PATCH answers carry no items). */
export type SavedCategory = Omit<CategoryShape, 'items'> & { items?: MenuItemView[] };

/**
 * Apply a saved item to the category list.
 * - create: append to the end of its category (the server places it last).
 * - edit: replace in place; when the category changed, move it to the end of
 *   the new category (the server does the same).
 * Returns null when the item cannot be placed (unknown id / category), so the
 * caller can fall back to a full refetch instead of showing a wrong list.
 */
export function applySavedItem(
  categories: CategoryShape[],
  mode: 'create' | 'edit',
  saved: SavedItem,
  fallbackCategoryId?: string,
): CategoryShape[] | null {
  const targetId = saved.categoryId ?? fallbackCategoryId;
  if (!targetId || !categories.some((c) => c.id === targetId)) return null;

  if (mode === 'create') {
    return categories.map((c) => (c.id === targetId ? { ...c, items: [...c.items, saved] } : c));
  }

  const owner = categories.find((c) => c.items.some((i) => i.id === saved.id));
  if (!owner) return null;
  if (owner.id === targetId) {
    return categories.map((c) =>
      c.id === owner.id ? { ...c, items: c.items.map((i) => (i.id === saved.id ? saved : i)) } : c,
    );
  }
  return categories.map((c) => {
    if (c.id === owner.id) return { ...c, items: c.items.filter((i) => i.id !== saved.id) };
    if (c.id === targetId) return { ...c, items: [...c.items, saved] };
    return c;
  });
}

/**
 * Apply a saved category.
 * - create: append (a new category has no items yet).
 * - edit: update name / description / visibility, keep the items already shown.
 */
export function applySavedCategory(
  categories: CategoryShape[],
  mode: 'create' | 'edit',
  saved: SavedCategory,
): CategoryShape[] {
  if (mode === 'create') {
    return [...categories, { ...saved, items: saved.items ?? [] }];
  }
  return categories.map((c) =>
    c.id === saved.id
      ? { ...c, name: saved.name, description: saved.description ?? null, isVisible: saved.isVisible }
      : c,
  );
}

export function removeItem(categories: CategoryShape[], itemId: string): CategoryShape[] {
  return categories.map((c) =>
    c.items.some((i) => i.id === itemId) ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
  );
}

export function removeCategory(categories: CategoryShape[], categoryId: string): CategoryShape[] {
  return categories.filter((c) => c.id !== categoryId);
}

/**
 * Patch one item wherever it lives (used by the optimistic toggles).
 * Categories that do not hold the item keep their identity, so memoized rows
 * in other sections do not re-render.
 */
export function patchItem(
  categories: CategoryShape[],
  itemId: string,
  patch: Partial<MenuItemView>,
): CategoryShape[] {
  return categories.map((c) =>
    c.items.some((i) => i.id === itemId)
      ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
      : c,
  );
}

/**
 * Which category becomes active once `removedId` is gone: the one that takes
 * its place (next), otherwise the previous one, otherwise none.
 */
export function neighbourCategoryId(categories: CategoryShape[], removedId: string): string | null {
  const idx = categories.findIndex((c) => c.id === removedId);
  if (idx === -1) return categories[0]?.id ?? null;
  const rest = categories.filter((c) => c.id !== removedId);
  return rest[idx]?.id ?? rest[idx - 1]?.id ?? null;
}

/**
 * The reorder endpoint writes sortOrder = position. Mirror that locally so the
 * live preview (which sorts items by sortOrder) and later merges stay in step
 * with what the server stored.
 */
export function withIndexSortOrder<T extends { sortOrder: number }>(list: T[]): T[] {
  return list.map((entry, index) => (entry.sortOrder === index ? entry : { ...entry, sortOrder: index }));
}

// ── Menu Studio additions (spec §5.7) ─────────────────────────────────────
// Everything below keeps the identity of categories it does not change, so
// memoized sections and rows elsewhere on the page do not re-render.

/** Prefix of optimistic rows that have no server id yet (quick-add pending rows). */
export const TEMP_PREFIX = 'tmp_';

export const isTempId = (id: string): boolean => id.startsWith(TEMP_PREFIX);

/** The menu without pending rows (for readiness, nudges, counts, reorder payloads and the preview). */
export function withoutTemps(categories: CategoryShape[]): CategoryShape[] {
  if (!categories.some((c) => c.items.some((i) => isTempId(i.id)))) return categories;
  return categories.map((c) =>
    c.items.some((i) => isTempId(i.id)) ? { ...c, items: c.items.filter((i) => !isTempId(i.id)) } : c,
  );
}

/**
 * Swap a pending row for the item the server created, in place.
 * - The temp row is gone (discarded meanwhile) and the id is new: append like a create.
 * - The saved id is already on screen (merged by another path): drop the temp row, never duplicate.
 */
export function replaceItem(categories: CategoryShape[], tempId: string, saved: SavedItem): CategoryShape[] {
  const alreadyShown = categories.some((c) => c.items.some((i) => i.id === saved.id));
  const holder = categories.find((c) => c.items.some((i) => i.id === tempId));
  if (!holder) {
    if (alreadyShown) return categories;
    return applySavedItem(categories, 'create', saved) ?? categories;
  }
  if (alreadyShown) return removeItems(categories, [tempId]);
  return categories.map((c) =>
    c === holder ? { ...c, items: c.items.map((i) => (i.id === tempId ? saved : i)) } : c,
  );
}

export function removeItems(categories: CategoryShape[], ids: string[]): CategoryShape[] {
  const drop = new Set(ids);
  return categories.map((c) =>
    c.items.some((i) => drop.has(i.id)) ? { ...c, items: c.items.filter((i) => !drop.has(i.id)) } : c,
  );
}

/** Patch several items at once (bulk flags / prices). Several patches for one id apply in order. */
export function patchItems(
  categories: CategoryShape[],
  patches: { id: string; patch: Partial<MenuItemView> }[],
): CategoryShape[] {
  const byId = new Map<string, Partial<MenuItemView>>();
  for (const { id, patch } of patches) byId.set(id, { ...byId.get(id), ...patch });
  if (byId.size === 0) return categories;
  return categories.map((c) =>
    c.items.some((i) => byId.has(i.id))
      ? { ...c, items: c.items.map((i) => (byId.has(i.id) ? { ...i, ...byId.get(i.id) } : i)) }
      : c,
  );
}

export interface ItemPosition {
  item: MenuItemView;
  categoryId: string;
  index: number;
}

/** Where each item is now (for undoing a move). In the order of `ids`; unknown ids are left out. */
export function snapshotItemPositions(categories: CategoryShape[], ids: string[]): ItemPosition[] {
  const found = new Map<string, ItemPosition>();
  for (const c of categories) {
    c.items.forEach((item, index) => found.set(item.id, { item, categoryId: c.id, index }));
  }
  return ids.flatMap((id) => {
    const position = found.get(id);
    return position ? [position] : [];
  });
}

function maxSortOrder(items: MenuItemView[]): number {
  return items.reduce((max, i) => Math.max(max, i.sortOrder), -1);
}

/**
 * Bulk move: the items land at the end of `toCategoryId` in their current
 * visual order, each with `sortOrder = MAX + 1` like the server does for a
 * category change. Items already in the target stay where they are (the
 * server does not move them either). Unknown target → unchanged.
 */
export function moveItemsToEnd(categories: CategoryShape[], ids: string[], toCategoryId: string): CategoryShape[] {
  const target = categories.find((c) => c.id === toCategoryId);
  if (!target) return categories;
  const wanted = new Set(ids);
  const moving: MenuItemView[] = [];
  for (const c of categories) {
    if (c.id === toCategoryId) continue;
    for (const item of c.items) if (wanted.has(item.id)) moving.push(item);
  }
  if (moving.length === 0) return categories;
  const movingIds = new Set(moving.map((i) => i.id));
  let next = maxSortOrder(target.items);
  const appended = moving.map((item) => {
    next += 1;
    return { ...item, sortOrder: next };
  });
  return categories.map((c) => {
    if (c.id === toCategoryId) return { ...c, items: [...c.items, ...appended] };
    return c.items.some((i) => movingIds.has(i.id)) ? { ...c, items: c.items.filter((i) => !movingIds.has(i.id)) } : c;
  });
}

/**
 * Put a restored item back by its stored sortOrder (after any item with the
 * same sortOrder). Replaces a row with the same id. Unknown category → null.
 */
export function insertItemBySortOrder(
  categories: CategoryShape[],
  categoryId: string,
  item: SavedItem,
): CategoryShape[] | null {
  if (!categories.some((c) => c.id === categoryId)) return null;
  const cleaned = removeItems(categories, [item.id]);
  return cleaned.map((c) => {
    if (c.id !== categoryId) return c;
    const at = c.items.findIndex((i) => i.sortOrder > item.sortOrder);
    const items = c.items.slice();
    items.splice(at === -1 ? items.length : at, 0, item);
    return { ...c, items };
  });
}

/** Put a restored category back by its sortOrder (after equals). Replaces a category with the same id. */
export function insertCategoryBySortOrder(
  categories: CategoryShape[],
  category: SavedCategory & { items: MenuItemView[] },
): CategoryShape[] {
  const restored: CategoryShape = {
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    sortOrder: category.sortOrder,
    isVisible: category.isVisible,
    items: category.items,
  };
  const rest = categories.filter((c) => c.id !== category.id);
  const at = rest.findIndex((c) => c.sortOrder > restored.sortOrder);
  rest.splice(at === -1 ? rest.length : at, 0, restored);
  return rest;
}

/**
 * Optimistic single-item move.
 * - Other category, no index: appended with `sortOrder = MAX + 1` (the server's rule).
 * - With `toIndex` (drag drop): placed there; source and target lists get
 *   `sortOrder = index`, mirroring the reorder call that follows.
 * - Same category without an index: unchanged (the server does not move it).
 * Unknown item or category → null.
 */
export function moveItemLocal(
  categories: CategoryShape[],
  itemId: string,
  toCategoryId: string,
  toIndex?: number,
): CategoryShape[] | null {
  const source = categories.find((c) => c.items.some((i) => i.id === itemId));
  const target = categories.find((c) => c.id === toCategoryId);
  if (!source || !target) return null;
  const item = source.items.find((i) => i.id === itemId)!;

  if (source.id === target.id) {
    if (toIndex === undefined) return categories;
    const items = source.items.filter((i) => i.id !== itemId);
    items.splice(Math.max(0, Math.min(toIndex, items.length)), 0, item);
    return categories.map((c) => (c.id === source.id ? { ...c, items: withIndexSortOrder(items) } : c));
  }

  const sourceItems = source.items.filter((i) => i.id !== itemId);
  let targetItems: MenuItemView[];
  if (toIndex === undefined) {
    targetItems = [...target.items, { ...item, sortOrder: maxSortOrder(target.items) + 1 }];
  } else {
    targetItems = target.items.slice();
    targetItems.splice(Math.max(0, Math.min(toIndex, targetItems.length)), 0, item);
    targetItems = withIndexSortOrder(targetItems);
  }
  return categories.map((c) => {
    if (c.id === source.id) return { ...c, items: toIndex === undefined ? sourceItems : withIndexSortOrder(sourceItems) };
    if (c.id === target.id) return { ...c, items: targetItems };
    return c;
  });
}

/** Id of the not-yet-created item shown in the preview while the panel creates one. */
export const DRAFT_ITEM_ID = '__draft__';

export interface ItemDraftOverlay {
  mode: 'create' | 'edit';
  itemId?: string;
  categoryId: string;
  values: ItemFormValues;
  /** Name shown while the name field is empty (e.g. "Yeni ürün", or the item's saved name). */
  fallbackName: string;
  currency: string;
}

/**
 * The menu as it will look once the open item panel is saved (preview only,
 * nothing is sent). A price that does not parse keeps the saved price (0 for a
 * new item). A category change moves the item to the end of the new category,
 * like the server does. Unknown item / category → the menu unchanged.
 */
export function overlayItemDraft(categories: CategoryShape[], draft: ItemDraftOverlay): CategoryShape[] {
  const { values } = draft;
  const price = checkPrice(values.price);
  const fields = (original: MenuItemView | null): MenuItemView => ({
    id: original?.id ?? DRAFT_ITEM_ID,
    name: values.name.trim() || draft.fallbackName,
    description: values.description.trim() || null,
    priceCents: price.kind === 'ok' ? price.cents : (original?.priceCents ?? 0),
    currency: original?.currency ?? draft.currency,
    imageUrl: values.imageUrl || null,
    badges: values.badges,
    allergens: values.allergens,
    isAvailable: values.isAvailable,
    isOutOfStock: values.isOutOfStock,
    sortOrder: original?.sortOrder ?? 0,
  });

  if (draft.mode === 'create') {
    const targetId = values.categoryId || draft.categoryId;
    const target = categories.find((c) => c.id === targetId);
    if (!target) return categories;
    const item = { ...fields(null), sortOrder: maxSortOrder(target.items) + 1 };
    return categories.map((c) => (c.id === targetId ? { ...c, items: [...c.items, item] } : c));
  }

  const owner = draft.itemId ? categories.find((c) => c.items.some((i) => i.id === draft.itemId)) : undefined;
  if (!owner) return categories;
  const original = owner.items.find((i) => i.id === draft.itemId)!;
  const patched = fields(original);
  const target = categories.find((c) => c.id === values.categoryId);
  if (!target || target.id === owner.id) {
    return categories.map((c) =>
      c.id === owner.id ? { ...c, items: c.items.map((i) => (i.id === original.id ? patched : i)) } : c,
    );
  }
  const moved = { ...patched, sortOrder: maxSortOrder(target.items) + 1 };
  return categories.map((c) => {
    if (c.id === owner.id) return { ...c, items: c.items.filter((i) => i.id !== original.id) };
    if (c.id === target.id) return { ...c, items: [...c.items, moved] };
    return c;
  });
}
