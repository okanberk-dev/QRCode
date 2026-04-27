'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ChevronRight, Plus, UtensilsCrossed, BarChart3 } from 'lucide-react';
import { Eyebrow, PageHeader, Tabs, type TabItem } from '@/components/ui';

interface Restaurant {
  id: string;
  name: string;
  category: string;
  primaryColor: string;
  slug: string;
  _count?: {
    menuItems?: number;
  };
}

export default function DashboardMenuSelectPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale === 'en' ? 'en' : 'tr';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  // Phase 12.4 — design's OwnerMenu has a top-level tabs row
  // ("Menü öğeleri" / "Menü analitiği"). On the multi-restaurant hub
  // this is purely navigational: switching to "analytics" routes the
  // user into the first restaurant's analytics page.
  const [tab, setTab] = useState<'items' | 'analytics'>('items');

  const copy = {
    tr: {
      title: 'Menü Yönetimi',
      subtitle: 'Düzenlemek istediğin işletmenin menüsünü seç. Tek bir konumun varsa otomatik açılır.',
      noRest: 'Henüz bir işletmeniz bulunmuyor.',
      addRest: 'İşletme Ekle',
      manage: 'Menüyü Düzenle',
      myLocations: 'İŞLETMELERİM',
      tabItems: 'Menü öğeleri',
      tabAnalytics: 'Menü analitiği',
      itemCount: (n: number) => `${n} ürün`,
    },
    en: {
      title: 'Menu Management',
      subtitle: 'Select the location whose menu you want to edit. Single-location accounts open automatically.',
      noRest: 'You don’t have any restaurants yet.',
      addRest: 'Add Restaurant',
      manage: 'Edit Menu',
      myLocations: 'MY LOCATIONS',
      tabItems: 'Menu items',
      tabAnalytics: 'Menu analytics',
      itemCount: (n: number) => `${n} items`,
    },
  }[locale];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/restaurants');
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        // Never trust a non-array shape — later .map/.filter would crash.
        const list: Restaurant[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        if (cancelled) return;
        setRestaurants(list);
        if (list.length === 1) {
          router.replace(`/${locale}/dashboard/restaurants/${list[0].id}/menu`);
          return;
        }
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [locale, router]);

  // Tab change → multi-restaurant owners with no inline editor jump into
  // the first restaurant's editor or analytics page. (Single-restaurant
  // owners never reach this code path; they auto-redirect above.)
  const handleTabChange = (id: string) => {
    if (id === 'analytics' && restaurants.length > 0) {
      router.push(`/${locale}/dashboard/restaurants/${restaurants[0].id}/menu/analytics`);
      return;
    }
    setTab(id as 'items' | 'analytics');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  const tabItems: TabItem[] = [
    {
      id: 'items',
      label: (
        <span className="flex items-center gap-1.5">
          <UtensilsCrossed size={12} strokeWidth={2} />
          {copy.tabItems}
        </span>
      ),
    },
    {
      id: 'analytics',
      label: (
        <span className="flex items-center gap-1.5">
          <BarChart3 size={12} strokeWidth={2} />
          {copy.tabAnalytics}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'MENÜ' : 'MENU'}
        title={copy.title}
        description={copy.subtitle}
      />

      {/* Top-level tabs (1:1 design OwnerMenu) */}
      <Tabs
        items={tabItems}
        active={tab}
        onChange={handleTabChange}
        ariaLabel={copy.title}
      />

      {restaurants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#EDEDED] text-[#737373]"
            aria-hidden="true"
          >
            <UtensilsCrossed size={18} strokeWidth={2} />
          </div>
          <p className="text-[14px] text-[#525252]">{copy.noRest}</p>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            {copy.addRest}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Eyebrow>{copy.myLocations}</Eyebrow>
            <Link
              href={`/${locale}/dashboard/restaurants`}
              className="inline-flex items-center gap-1 pulse-eyebrow text-[#525252] hover:text-[#0A0A0A] transition-colors"
            >
              <Plus size={11} strokeWidth={2} />
              {copy.addRest}
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {restaurants.map((r) => {
              const itemCount = r._count?.menuItems ?? 0;
              return (
                <Link
                  key={r.id}
                  href={`/${locale}/dashboard/restaurants/${r.id}/menu`}
                  className="flex items-center gap-4 bz-card p-4 transition-colors hover:border-[#C6F24E]"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-semibold text-white"
                    style={{ backgroundColor: r.primaryColor || '#0A0A0A', fontFamily: 'var(--font-heading)' }}
                  >
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="bz-h-tight truncate text-[15px] text-[#0A0A0A]">
                      {r.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="pulse-eyebrow text-[#737373] truncate">{r.category}</span>
                      <span className="pulse-eyebrow text-[#A3A3A3]">·</span>
                      <span className="pulse-eyebrow text-[#525252] bz-mono">
                        {copy.itemCount(itemCount)}
                      </span>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 pulse-eyebrow text-[#525252]">
                    {copy.manage.toUpperCase()}
                    <ChevronRight size={12} strokeWidth={2} />
                  </span>
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    className="sm:hidden text-[#A3A3A3] shrink-0"
                  />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
