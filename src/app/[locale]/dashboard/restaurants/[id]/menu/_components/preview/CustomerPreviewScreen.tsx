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
  return (
    <div className="min-h-full">
      <div className="sticky top-[61px] z-20 flex items-center justify-between gap-3 border-b border-[#1A1A1A] bg-[#0A0A0A] px-5 py-3 text-white lg:top-14">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-2.5 py-1 text-[12px] font-semibold text-[#0A0A0A]">
            <Eye size={13} strokeWidth={2.25} aria-hidden="true" />
            {copy.preview.badge}
          </span>
          <p className="truncate text-[13.5px] font-medium">{restaurant.name}</p>
        </div>
        <Link href={builderHref} className="bz-btn-on-dark bz-btn-sm shrink-0">
          <X size={14} strokeWidth={2} aria-hidden="true" />
          {copy.preview.exit}
        </Link>
      </div>
      <PublicMenuView restaurant={restaurant} categories={categories} locale={locale} disableAnalytics />
    </div>
  );
}
