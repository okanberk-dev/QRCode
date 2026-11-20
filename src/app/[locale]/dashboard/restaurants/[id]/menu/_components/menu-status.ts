/**
 * Item and category states in plain words (Menu Studio, spec §5.7 / §14.2).
 *
 * Two flags on an item make three states the owner sees:
 *   - Gizli (hidden):    `isAvailable === false` — not on the menu at all.
 *   - Tükendi (sold out): `isOutOfStock === true` — on the menu, marked "Tükendi".
 *   - Satışta (available): otherwise.
 * Row controls change ONE flag at a time (`flagPatch`), so restocking never
 * un-hides an item by accident; only the item panel's 3-state control
 * (`statusPatch`) may change both.
 *
 * Pure and React-free (node:test).
 */
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { isTempId } from './menu-merge';
import type { CategoryShape } from './menu-types';

type Flags = Pick<MenuItemView, 'isAvailable' | 'isOutOfStock'>;
type FlagPatch = { isAvailable?: boolean; isOutOfStock?: boolean };

export type ItemStatus = 'available' | 'soldOut' | 'hidden';

export function itemStatus(item: Flags): ItemStatus {
  if (!item.isAvailable) return 'hidden';
  if (item.isOutOfStock) return 'soldOut';
  return 'available';
}

/** The panel's 3-state choice as a PATCH holding only the keys that change. */
export function statusPatch(target: ItemStatus, current: Flags): FlagPatch {
  const patch: FlagPatch = {};
  if (target === 'hidden') {
    if (current.isAvailable) patch.isAvailable = false;
    return patch;
  }
  if (!current.isAvailable) patch.isAvailable = true;
  const soldOut = target === 'soldOut';
  if (current.isOutOfStock !== soldOut) patch.isOutOfStock = soldOut;
  return patch;
}

export type FlagOp = 'markAvailable' | 'markSoldOut' | 'hide' | 'show';

/** One flag per operation; `null` when the item already is that way. */
export function flagPatch(op: FlagOp, current: Flags): FlagPatch | null {
  switch (op) {
    case 'markAvailable':
      return current.isOutOfStock ? { isOutOfStock: false } : null;
    case 'markSoldOut':
      return current.isOutOfStock ? null : { isOutOfStock: true };
    case 'hide':
      return current.isAvailable ? { isAvailable: false } : null;
    case 'show':
      return current.isAvailable ? null : { isAvailable: true };
  }
}

type CategoryFlags = Pick<CategoryShape, 'isVisible'>;

export type RowBadge = 'categoryHidden' | 'hidden' | 'soldOut' | null;

/** The one badge a row shows; a hidden category outranks a hidden item, which outranks sold out. */
export function rowBadge(item: Flags, category: CategoryFlags): RowBadge {
  if (!category.isVisible) return 'categoryHidden';
  if (!item.isAvailable) return 'hidden';
  if (item.isOutOfStock) return 'soldOut';
  return null;
}

export type CustomerVisibility = 'visible' | 'soldOut' | 'hiddenItem' | 'hiddenCategory';

/** What a customer scanning the QR sees for this item. */
export function customerVisibility(item: Flags, category: CategoryFlags): CustomerVisibility {
  if (!category.isVisible) return 'hiddenCategory';
  if (!item.isAvailable) return 'hiddenItem';
  if (item.isOutOfStock) return 'soldOut';
  return 'visible';
}

// ── Completion nudges ─────────────────────────────────────────────────────
// Same definitions as the filter chips (`menu-filter.ts`), so a nudge's
// number matches the list it opens.

type NudgeItem = Pick<MenuItemView, 'id' | 'isAvailable' | 'isOutOfStock' | 'imageUrl' | 'description' | 'priceCents'>;

export const isSoldOutItem = (item: Flags): boolean => item.isAvailable && item.isOutOfStock;
export const isHiddenItem = (item: Flags, categoryVisible: boolean): boolean => !item.isAvailable || !categoryVisible;
export const lacksPhoto = (item: Pick<MenuItemView, 'imageUrl'>): boolean => !item.imageUrl;
export const lacksDescription = (item: Pick<MenuItemView, 'description'>): boolean => !item.description?.trim();
export const hasZeroPrice = (item: Pick<MenuItemView, 'priceCents'>): boolean => item.priceCents === 0;

export interface MenuNudges {
  noPhoto: number;
  soldOut: number;
  zeroPrice: number;
  noDescription: number;
  hidden: number;
}

/** Counts behind the status-card nudges. Pending (temp) rows are not counted. */
export function menuNudges(categories: { isVisible: boolean; items: NudgeItem[] }[]): MenuNudges {
  const n: MenuNudges = { noPhoto: 0, soldOut: 0, zeroPrice: 0, noDescription: 0, hidden: 0 };
  for (const category of categories) {
    for (const item of category.items) {
      if (isTempId(item.id)) continue;
      if (lacksPhoto(item)) n.noPhoto += 1;
      if (isSoldOutItem(item)) n.soldOut += 1;
      if (hasZeroPrice(item)) n.zeroPrice += 1;
      if (lacksDescription(item)) n.noDescription += 1;
      if (isHiddenItem(item, category.isVisible)) n.hidden += 1;
    }
  }
  return n;
}
