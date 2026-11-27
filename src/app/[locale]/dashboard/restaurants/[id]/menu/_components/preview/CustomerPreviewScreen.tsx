'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Eye, X } from 'lucide-react';
import MenuBuilderSkeleton from '../../loading';
import { useMenuData } from '../data/useMenuData';
import { getMenuCopy } from '../menu-i18n';
import { LoadErrorView } from '../studio/LoadErrorView';

const PublicMenuView = dynamic(() => import('@/components/menu/PublicMenuView').then((m) => m.default), {
  ssr: false,
  loading: () => null,
});

/**
 * `?preview=1` — the draft menu full screen, as a customer would see it
 * (analytics off), with a bar back to the builder (must-keep #3).
 */
export function CustomerPreviewScreen({ restaurantId, locale }: { restaurantId: string; locale: 'tr' | 'en' }) {
  const isTr = locale === 'tr';
  const copy = getMenuCopy(locale);
  const menu = useMenuData(restaurantId, isTr);
  const builderHref = `/${locale}/dashboard/restaurants/${restaurantId}/menu`;

  if (!menu.data) {
    if (menu.isPending || menu.isLoadingFresh || !menu.loadError) return <MenuBuilderSkeleton />;
    return (
      <LoadErrorView
        copy={copy}
        message={menu.loadError}
        onRetry={() => void menu.fetchAll()}
        backHref={`/${locale}/dashboard/restaurants/${restaurantId}`}
      />
    );
  }

  const { restaurant, categories } = menu.data;
  // The menu scrolls in its own box below the panel's top bar and this bar, so its
  // sticky category nav and its anchor jumps stop under them, not behind them.
  // Height: the window minus the topbar (61 px phone / 56 px desktop) and, on
  // phones, the shell's bottom padding that clears the floating nav. No overscroll
  // containment: a trial / announcement banner above this screen makes it taller than the
  // window, and the scroll has to chain to the page to bring the menu's bottom into view.
  return (
    <div className="flex h-[calc(100dvh-72px-env(safe-area-inset-bottom,0px))] min-h-[420px] flex-col lg:h-[calc(100dvh-94px)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#3B1F8F] px-5 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pn-accent px-2.5 py-1 text-[12px] font-medium text-white">
            <Eye size={13} strokeWidth={2.25} aria-hidden="true" />
            {copy.preview.badge}
          </span>
          <p className="truncate text-[14px] font-medium">{restaurant.name}</p>
        </div>
        <Link href={builderHref} className="bz-btn-on-dark bz-btn-sm shrink-0">
          <X size={14} strokeWidth={2} aria-hidden="true" />
          {copy.preview.exit}
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PublicMenuView restaurant={restaurant} categories={categories} locale={locale} disableAnalytics />
      </div>
    </div>
  );
}
