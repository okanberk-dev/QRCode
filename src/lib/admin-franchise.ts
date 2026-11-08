// Admin "Franchise'lar" view — businesses grouped by owner account.
// Pure (no React, no Prisma); covered by `tests/admin-franchise.test.ts`.
//
// A franchise here is simply an owner (User) with one or more businesses.
// Groups with more businesses come first so chains surface at the top;
// businesses without an owner are collected in one trailing group.

export interface FranchiseRestaurantLike {
  id: string;
  name: string;
  isActive: boolean;
  menuEnabled: boolean;
  menuPublished: boolean;
  avgRating?: number | null;
  _count: { feedbacks: number };
  user: { id: string; email: string; name: string | null; plan: string; isActive: boolean } | null;
}

export interface FranchiseGroup<T extends FranchiseRestaurantLike> {
  /** Owner id, or `null` for the "no owner" group. */
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string | null;
  ownerActive: boolean;
  restaurants: T[];
  active: number;
  reviews: number;
  /** Review-weighted average rating (null = no rated reviews). */
  avgRating: number | null;
  menuPublished: number;
}

export function groupByOwner<T extends FranchiseRestaurantLike>(rows: readonly T[], locale = 'tr-TR'): FranchiseGroup<T>[] {
  const map = new Map<string, FranchiseGroup<T>>();
  const NONE = '__none__';
  for (const row of rows) {
    const key = row.user?.id ?? NONE;
    let group = map.get(key);
    if (!group) {
      group = {
        ownerId: row.user?.id ?? null,
        ownerName: row.user?.name ?? null,
        ownerEmail: row.user?.email ?? null,
        plan: row.user?.plan ?? null,
        ownerActive: row.user?.isActive ?? true,
        restaurants: [],
        active: 0,
        reviews: 0,
        avgRating: null,
        menuPublished: 0,
      };
      map.set(key, group);
    }
    group.restaurants.push(row);
  }
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  const groups = [...map.values()].map((group) => {
    let ratingSum = 0;
    let ratingWeight = 0;
    for (const r of group.restaurants) {
      if (r.isActive) group.active += 1;
      group.reviews += r._count.feedbacks;
      if (r.menuEnabled && r.menuPublished) group.menuPublished += 1;
      if (typeof r.avgRating === 'number' && r._count.feedbacks > 0) {
        ratingSum += r.avgRating * r._count.feedbacks;
        ratingWeight += r._count.feedbacks;
      }
    }
    group.avgRating = ratingWeight > 0 ? Math.round((ratingSum / ratingWeight) * 10) / 10 : null;
    group.restaurants.sort((a, b) => collator.compare(a.name, b.name));
    return group;
  });
  const label = (g: FranchiseGroup<T>) => g.ownerName || g.ownerEmail || '';
  groups.sort((a, b) => {
    if (a.ownerId === null) return 1;
    if (b.ownerId === null) return -1;
    if (b.restaurants.length !== a.restaurants.length) return b.restaurants.length - a.restaurants.length;
    return collator.compare(label(a), label(b));
  });
  return groups;
}

/** Owners with two or more businesses (a chain) among the groups. */
export function countChains<T extends FranchiseRestaurantLike>(groups: readonly FranchiseGroup<T>[]): number {
  return groups.filter((group) => group.ownerId !== null && group.restaurants.length > 1).length;
}
