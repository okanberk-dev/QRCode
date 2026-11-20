import type { MenuCategoryView, RestaurantView } from '@/components/menu/PublicMenuView';
import type { MenuTheme } from '@/lib/validations';

export interface RestaurantShape extends RestaurantView {
  menuEnabled: boolean;
  menuPublished: boolean;
  menuUpdatedAt: string | null;
  menuTheme: MenuTheme;
  menuAccentColor: string | null;
  menuLogoUrl: string | null;
}

export type CategoryShape = MenuCategoryView;

/** Everything the builder loads: the restaurant row and its categories (items sorted by sortOrder). */
export interface MenuData {
  restaurant: RestaurantShape;
  categories: CategoryShape[];
}

/** What the item panel is showing: a new item in a category, or an existing item. */
export type ItemTarget = { mode: 'create'; categoryId: string } | { mode: 'edit'; itemId: string };

/** Per-row save feedback for inline edits and toggles. */
export type RowSaveState = 'saving' | 'saved' | 'error';
