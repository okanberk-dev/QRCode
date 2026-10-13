/**
 * How far along an owner's menu is, derived from the menu itself (nothing is
 * stored). Drives the three-step "add categories → add items → publish"
 * strip and decides whether "Yayına al" is enabled.
 *
 * "Publishable" mirrors the public page's own filter exactly (see
 * `src/app/menu/[slug]/page.tsx` and `PATCH …/menu/publish`): an item counts
 * when its category is visible and the item itself is available. A sold-out
 * item is still shown to customers (as "Tükendi"), so it counts too.
 *
 * Pure and dependency-free — safe for the client bundle and for tests.
 */

export type MenuReadinessStep = 'category' | 'items' | 'publish';

export interface MenuReadinessItemInput {
  isAvailable?: boolean | null;
  isOutOfStock?: boolean | null;
  deletedAt?: string | Date | null;
}

export interface MenuReadinessCategoryInput {
  isVisible?: boolean | null;
  deletedAt?: string | Date | null;
  items?: MenuReadinessItemInput[] | null;
}

export interface MenuReadiness {
  /** Categories on the menu (hidden ones included). */
  categories: number;
  /** Items on the menu, whatever their visibility. */
  items: number;
  /** Items a customer would actually see (visible category ∧ available item). */
  publishableItems: number;
  /** First step the owner still has to do. */
  nextStep: MenuReadinessStep;
  /** True when publishing would show customers at least one item. */
  canPublish: boolean;
}

export function getMenuReadiness(
  categories: MenuReadinessCategoryInput[] | null | undefined,
): MenuReadiness {
  let categoryCount = 0;
  let itemCount = 0;
  let publishableItems = 0;

  for (const category of categories ?? []) {
    if (!category || category.deletedAt) continue;
    categoryCount += 1;
    const visible = category.isVisible !== false;

    for (const item of category.items ?? []) {
      if (!item || item.deletedAt) continue;
      itemCount += 1;
      if (visible && item.isAvailable !== false) publishableItems += 1;
    }
  }

  const nextStep: MenuReadinessStep =
    categoryCount === 0 ? 'category' : publishableItems === 0 ? 'items' : 'publish';

  return {
    categories: categoryCount,
    items: itemCount,
    publishableItems,
    nextStep,
    canPublish: publishableItems > 0,
  };
}
