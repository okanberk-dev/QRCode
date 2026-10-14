import type { MenuItemView } from '@/components/menu/PublicMenuView';
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

/** Patch one item wherever it lives (used by the optimistic toggles). */
export function patchItem(
  categories: CategoryShape[],
  itemId: string,
  patch: Partial<MenuItemView>,
): CategoryShape[] {
  return categories.map((c) => ({
    ...c,
    items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
  }));
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
