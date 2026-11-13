'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOwnerShellActiveRestaurantId } from '@/components/dashboard/UserDashboardShell';
import { ACTIVE_BUSINESS_STORAGE_KEY, resolveActiveRestaurantId } from '@/lib/active-business';
import MenuBuilderSkeleton from '../../restaurants/[id]/menu/loading';

/**
 * `/dashboard/menu` without a usable `?restaurantId` (bookmark, typed URL,
 * command palette). There is no business picker: the menu always belongs to
 * the business chosen in the panel's business switcher. Resolve it the same
 * way the shell does (shell scope → remembered business → first business)
 * and open that business's menu builder. The builder skeleton stays on
 * screen meanwhile, so the hand-off looks like one page load.
 */
export default function MenuHubRedirect({
  locale,
  restaurantIds,
}: {
  locale: string;
  /** Businesses the owner can manage, active ones first. */
  restaurantIds: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    let storedRestaurantId: string | null = null;
    try {
      storedRestaurantId = window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
    } catch {
      /* storage blocked */
    }
    // The shell resolves its scope in a layout effect, which has already run
    // by the time this (passive) effect fires.
    const restaurantId = resolveActiveRestaurantId({
      restaurants: restaurantIds.map((id) => ({ id })),
      queryRestaurantId: getOwnerShellActiveRestaurantId() ?? null,
      storedRestaurantId,
    });
    if (restaurantId) router.replace(`/${locale}/dashboard/restaurants/${restaurantId}/menu`);
  }, [locale, restaurantIds, router]);

  return <MenuBuilderSkeleton />;
}
