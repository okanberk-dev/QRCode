// Which public restaurant menus (/menu/[slug]) may be indexed.
//
// Menus are customer pages hosted on our domain. Test/demo restaurants
// ("deneme" = "test") and near-empty menus are thin pages; listing them in
// the sitemap or letting them into the index drags down how Google rates the
// whole site. Shared by sitemap.ts and the menu page's robots meta.

const TEST_MENU_PATTERN = /(^|[-\s])(deneme|test|demo|ornek|örnek|sample)([-\s]|$)/i;
export const MIN_INDEXABLE_MENU_ITEMS = 3;

export function isIndexableMenu(input: { slug: string; name: string; itemCount: number }): boolean {
  if (input.itemCount < MIN_INDEXABLE_MENU_ITEMS) return false;
  return !TEST_MENU_PATTERN.test(input.slug) && !TEST_MENU_PATTERN.test(input.name);
}
