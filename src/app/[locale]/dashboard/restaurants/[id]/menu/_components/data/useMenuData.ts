'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MENU_THEMES } from '@/lib/validations';
import { getMenuCopy } from '../menu-i18n';
import type { CategoryShape, MenuData, RestaurantShape } from '../menu-types';

/**
 * The builder's data (spec §5.1): the restaurant row and its categories with
 * items, in one React Query entry. Every mutation merges its answer into this
 * entry (`setMenu`) instead of downloading the menu again; `fetchAll` is the
 * silent refetch for the few cases that need server truth (failed reorder or
 * move, lost access, retry).
 *
 * `gcTime: 0` — every visit loads fresh, like the old builder.
 */

class LoadError extends Error {}

export async function fetchMenuData(restaurantId: string, isTr: boolean): Promise<MenuData> {
  const [rRes, cRes] = await Promise.all([
    fetch(`/api/restaurants/${restaurantId}`),
    fetch(`/api/restaurants/${restaurantId}/menu/categories`),
  ]);
  const copy = getMenuCopy(isTr ? 'tr' : 'en');
  if (!rRes.ok) throw new LoadError(copy.errors.restaurantLoad);
  if (!cRes.ok) throw new LoadError(copy.errors.menuLoad);
  const r = await rRes.json();
  const c = await cRes.json();
  const restaurant: RestaurantShape = {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    address: r.address ?? null,
    phone: r.phone ?? null,
    workingHours: r.workingHours ?? null,
    primaryColor: r.primaryColor ?? '#C6F24E',
    menuEnabled: r.menuEnabled ?? true,
    menuPublished: r.menuPublished ?? false,
    menuUpdatedAt: r.menuUpdatedAt ?? null,
    menuTheme: (MENU_THEMES as readonly string[]).includes(r.menuTheme) ? r.menuTheme : 'classic',
    menuAccentColor: r.menuAccentColor ?? null,
    menuLogoUrl: r.menuLogoUrl ?? null,
  };
  const categories: CategoryShape[] = (c.categories ?? []).map((cat: CategoryShape) => ({
    ...cat,
    items: [...(cat.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
  }));
  return { restaurant, categories };
}

export interface MenuDataHandle {
  data: MenuData | undefined;
  /** First load only. */
  isPending: boolean;
  /** A load is running with nothing on screen yet (first load or retry after an error). */
  isLoadingFresh: boolean;
  /** Localized; meaningful when `!data`. */
  loadError: string | null;
  /** Silent refetch (keeps data and scroll). Resolves to false when it failed. */
  fetchAll: () => Promise<boolean>;
  setMenu: (fn: (m: MenuData) => MenuData) => void;
  /** Latest menu, for async actions. */
  getMenu: () => MenuData | undefined;
  /** Mirror the server's `menu_updated_at` bump after a successful write. */
  touchLocal: () => void;
}

export function useMenuData(restaurantId: string, isTr: boolean): MenuDataHandle {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['menu-builder', restaurantId] as const, [restaurantId]);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchMenuData(restaurantId, isTr),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: Boolean(restaurantId),
  });

  const { refetch } = query;
  const fetchAll = useCallback(async () => {
    const result = await refetch();
    return !result.isError;
  }, [refetch]);

  const setMenu = useCallback(
    (fn: (m: MenuData) => MenuData) => {
      queryClient.setQueryData<MenuData>(queryKey, (m) => (m ? fn(m) : m));
    },
    [queryClient, queryKey],
  );

  const getMenu = useCallback(() => queryClient.getQueryData<MenuData>(queryKey), [queryClient, queryKey]);

  const touchLocal = useCallback(() => {
    setMenu((m) => ({ ...m, restaurant: { ...m.restaurant, menuUpdatedAt: new Date().toISOString() } }));
  }, [setMenu]);

  const error = query.error;
  const loadError = error
    ? error instanceof LoadError
      ? error.message
      : getMenuCopy(isTr ? 'tr' : 'en').errors.loadBody
    : null;

  return {
    data: query.data,
    isPending: query.isPending,
    isLoadingFresh: !query.data && query.isFetching,
    loadError,
    fetchAll,
    setMenu,
    getMenu,
    touchLocal,
  };
}
