import type { ResolvedMenuDesign } from '@/lib/menu-design';
import type { MenuCategoryView, MenuItemView, RestaurantView } from '../PublicMenuView';
import type { MenuCopy, MenuLocale } from '../menu-labels';

/** Everything the document parts need; built once per render by PublicMenuView. */
export interface MenuRenderContext {
  d: ResolvedMenuDesign;
  restaurant: RestaurantView;
  locale: MenuLocale;
  priceLocale: string;
  copy: MenuCopy;
  /** Studio / admin preview (analytics off): never touches the page URL. */
  preview: boolean;
  setProductRef: (productId: string, el: HTMLElement | null) => void;
  onProductClick: (item: MenuItemView, categoryId: string | null) => void;
  onCategoryClick: (categoryId: string) => void;
}

/** A visible category with its available items, already sorted. */
export interface MenuSectionData {
  category: MenuCategoryView;
  items: MenuItemView[];
  index: number;
}
