import MenuBuilderSkeleton from '../restaurants/[id]/menu/loading';

/**
 * Owner menu hub (CLAUDE.md §40.10). The hub almost always redirects to the
 * active business's builder (the shell adds `?restaurantId`), so its loading
 * state is the builder's skeleton: menu → builder never swaps skeletons. Only
 * an owner whose shell has not picked a business yet sees the picker grid.
 */
export default function Loading() {
  return <MenuBuilderSkeleton />;
}
