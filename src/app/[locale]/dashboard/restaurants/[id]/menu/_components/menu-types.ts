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
