/**
 * The setup wizard's plan as menu categories, so the customer preview can show
 * the menu before anything is created (Menu Studio, spec §10). Ids are local
 * (`setup-<i>` / `setup-<i>-<j>`) and never sent. Pure (node:test).
 */
import type { SetupPlanCategory } from './menu-setup';
import type { CategoryShape } from './menu-types';

export function planToPreviewCategories(plan: readonly SetupPlanCategory[]): CategoryShape[] {
  return plan.map((category, i) => ({
    id: `setup-${i}`,
    name: category.name,
    description: null,
    sortOrder: i,
    isVisible: true,
    items: category.items.map((item, j) => ({
      id: `setup-${i}-${j}`,
      name: item.name,
      description: null,
      priceCents: item.priceCents,
      currency: 'TRY',
      imageUrl: null,
      badges: [],
      allergens: [],
      isAvailable: true,
      isOutOfStock: false,
      sortOrder: j,
    })),
  }));
}
