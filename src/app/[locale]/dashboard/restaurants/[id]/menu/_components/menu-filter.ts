/**
 * Search and filter chips over the one continuous outline (Menu Studio,
 * spec §5.7 / §8.5).
 *
 * - Search folds Turkish characters ("cay" finds "Çay", "ISIK" finds "ışık"),
 *   matches the item name, its description and its category name, and needs
 *   every typed word (AND).
 * - Filters are single-select; counts are for the whole menu.
 * - Pending (temp) rows never count and are not shown while a search or filter
 *   is active.
 *
 * Pure and React-free (node:test).
 */
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { isTempId } from './menu-merge';
import { hasZeroPrice, isHiddenItem, isSoldOutItem, lacksDescription, lacksPhoto } from './menu-status';
import type { CategoryShape } from './menu-types';

export type MenuFilter = 'all' | 'soldOut' | 'hidden' | 'noPhoto' | 'noDescription' | 'zeroPrice';

export const MENU_FILTERS: readonly Exclude<MenuFilter, 'all'>[] = [
  'soldOut',
  'hidden',
  'noPhoto',
  'noDescription',
  'zeroPrice',
];

const FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** Lower-case (Turkish rules), strip Turkish letters to ASCII, collapse spaces. */
export function foldSearch(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/i\u0307/g, 'i') // "İ" lower-cased by a non-Turkish engine
    .replace(/[çğıöşüâîû]/g, (ch) => FOLD[ch])
    .replace(/\u0307/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Folded search words of a query ('' → none). */
export function searchTokens(query: string): string[] {
  const folded = foldSearch(query);
  return folded ? folded.split(' ') : [];
}

type FilterItem = Pick<MenuItemView, 'name' | 'description' | 'imageUrl' | 'priceCents' | 'isAvailable' | 'isOutOfStock'>;

function passesFilter(item: FilterItem, filter: MenuFilter, categoryVisible: boolean): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'soldOut':
      return isSoldOutItem(item);
    case 'hidden':
      return isHiddenItem(item, categoryVisible);
    case 'noPhoto':
      return lacksPhoto(item);
    case 'noDescription':
      return lacksDescription(item);
    case 'zeroPrice':
      return hasZeroPrice(item);
  }
}

/** `tokens` must already be folded (`searchTokens`). */
export function itemMatches(
  item: FilterItem,
  categoryName: string,
  tokens: string[],
  filter: MenuFilter,
  categoryVisible: boolean,
): boolean {
  if (!passesFilter(item, filter, categoryVisible)) return false;
  if (tokens.length === 0) return true;
  const haystack = foldSearch(`${item.name} ${item.description ?? ''} ${categoryName}`);
  return tokens.every((token) => haystack.includes(token));
}

/** Whole-menu count per filter chip (pending rows excluded). */
export function filterCounts(categories: CategoryShape[]): Record<Exclude<MenuFilter, 'all'>, number> {
  const counts = { soldOut: 0, hidden: 0, noPhoto: 0, noDescription: 0, zeroPrice: 0 };
  for (const category of categories) {
    for (const item of category.items) {
      if (isTempId(item.id)) continue;
      for (const filter of MENU_FILTERS) {
        if (passesFilter(item, filter, category.isVisible)) counts[filter] += 1;
      }
    }
  }
  return counts;
}

export interface FilteredSection {
  category: CategoryShape;
  items: MenuItemView[];
}

/**
 * The sections to render.
 * - Inactive (no query, filter `all`): every category, empty ones included, all rows.
 * - Active: only matching rows, empty sections dropped. `keepIds` keeps rows
 *   that just stopped matching on screen for a moment (completion workflow).
 */
export function filterMenu(
  categories: CategoryShape[],
  query: string,
  filter: MenuFilter,
  opts: { keepIds?: Set<string> } = {},
): { sections: FilteredSection[]; total: number; active: boolean } {
  const tokens = searchTokens(query);
  const active = tokens.length > 0 || filter !== 'all';
  if (!active) {
    return {
      sections: categories.map((category) => ({ category, items: category.items })),
      total: categories.reduce((n, c) => n + c.items.length, 0),
      active,
    };
  }
  const keep = opts.keepIds;
  const sections: FilteredSection[] = [];
  let total = 0;
  for (const category of categories) {
    const items = category.items.filter(
      (item) =>
        !isTempId(item.id) &&
        (keep?.has(item.id) || itemMatches(item, category.name, tokens, filter, category.isVisible)),
    );
    if (items.length === 0) continue;
    sections.push({ category, items });
    total += items.length;
  }
  return { sections, total, active };
}

/** Rows in visual order (for ↑/↓, price runs, Shift+click ranges); collapsed sections and pending rows skipped. */
export function visibleItemIds(sections: FilteredSection[], collapsed: Set<string>): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    if (collapsed.has(section.category.id)) continue;
    for (const item of section.items) if (!isTempId(item.id)) ids.push(item.id);
  }
  return ids;
}
