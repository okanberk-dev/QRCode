// Business (franchise) switcher — pure helpers (no React, no storage access).
//
// The owner shell's switcher (`BusinessSwitcher`) lists every business in the
// workspace. Owners with many branches get a search box and a "recently used"
// group so the branch they work with most is one click away. Covered by
// `tests/business-switcher.test.ts`.

export const RECENT_BUSINESS_STORAGE_KEY = 'buaze.owner.recentRestaurants';
export const RECENT_BUSINESS_MAX = 4;
/** From this many businesses up the switcher shows a search box. */
export const SWITCHER_SEARCH_MIN = 5;
/** From this many businesses up (and no query) recents get their own group. */
export const SWITCHER_RECENT_MIN = 6;

export interface SwitcherBusinessLike {
  id: string;
  name: string;
  category?: string | null;
  slug?: string | null;
}

/** Lower-case, accent-free form used for matching ("Şişli" → "sisli"). */
export function foldSearchText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Most recent first, no duplicates, at most `max` ids. */
export function pushRecentBusiness(recent: readonly string[], id: string, max = RECENT_BUSINESS_MAX): string[] {
  if (!id) return recent.slice(0, max);
  return [id, ...recent.filter((value) => value !== id)].slice(0, max);
}

export function parseRecentBusinesses(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0).slice(0, RECENT_BUSINESS_MAX);
  } catch {
    return [];
  }
}

/**
 * Businesses matching `query` (name, category or slug; accent- and
 * case-insensitive). Name prefix matches come first, then the rest in their
 * original order. An empty query returns the list unchanged.
 */
export function filterBusinesses<T extends SwitcherBusinessLike>(items: readonly T[], query: string): T[] {
  const q = foldSearchText(query);
  if (!q) return items.slice();
  const prefix: T[] = [];
  const other: T[] = [];
  for (const item of items) {
    const name = foldSearchText(item.name);
    const haystack = `${name} ${foldSearchText(item.category ?? '')} ${foldSearchText(item.slug ?? '')}`;
    if (name.startsWith(q) || name.split(' ').some((word) => word.startsWith(q))) prefix.push(item);
    else if (haystack.includes(q)) other.push(item);
  }
  return [...prefix, ...other];
}

export interface SwitcherGroups<T> {
  /** Recently used businesses (only for long lists with no query). */
  recent: T[];
  /** Everything else, in the original order. */
  all: T[];
}

export function groupSwitcherBusinesses<T extends SwitcherBusinessLike>(
  items: readonly T[],
  query: string,
  recentIds: readonly string[],
): SwitcherGroups<T> {
  const filtered = filterBusinesses(items, query);
  if (foldSearchText(query) || items.length < SWITCHER_RECENT_MIN) {
    return { recent: [], all: filtered };
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const recent = recentIds.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
  const recentSet = new Set(recent.map((item) => item.id));
  return { recent, all: filtered.filter((item) => !recentSet.has(item.id)) };
}
