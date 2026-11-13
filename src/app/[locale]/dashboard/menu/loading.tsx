import MenuBuilderSkeleton from '../restaurants/[id]/menu/loading';

/**
 * Owner menu hub (CLAUDE.md §40.10). The hub never renders a page of its own:
 * it opens the active business's menu builder (server redirect, or a client
 * hand-off when only the business switcher knows the business). Its loading
 * state is therefore the builder's skeleton: menu → builder never swaps
 * skeletons. The only other state is the no-business empty state.
 */
export default function Loading() {
  return <MenuBuilderSkeleton />;
}
