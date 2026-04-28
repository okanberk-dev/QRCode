import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MoreHorizontal, Plus, TrendingDown, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import { Eyebrow, PageHeader } from '@/components/ui';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Menü — Buaze' : 'Menu — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

interface SearchParams {
  restaurant?: string;
  category?: string;
  tab?: 'items' | 'analytics';
}

type MenuCategorySummary = {
  id: string;
  name: string;
  _count: { items: number };
};

type MenuItemSummary = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  isAvailable: boolean;
};

function isPrismaSchemaDriftError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === 'P2021' || code === 'P2022';
}

async function fetchMenuCategories(restaurantId: string): Promise<MenuCategorySummary[]> {
  try {
    return await prisma.menuCategory.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        _count: { select: { items: true } },
      },
    });
  } catch (error) {
    if (!isPrismaSchemaDriftError(error)) throw error;
    console.error('[dashboard/menu] MenuCategory schema drift fallback', error);

    try {
      return await prisma.menuCategory.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          _count: { select: { items: true } },
        },
      });
    } catch (fallbackError) {
      if (!isPrismaSchemaDriftError(fallbackError)) throw fallbackError;
      console.error('[dashboard/menu] MenuCategory fallback failed', fallbackError);
      return [];
    }
  }
}

async function fetchMenuItems(restaurantId: string, categoryId: string): Promise<MenuItemSummary[]> {
  try {
    return await prisma.menuItem.findMany({
      where: { restaurantId, categoryId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        isAvailable: true,
      },
    });
  } catch (error) {
    if (!isPrismaSchemaDriftError(error)) throw error;
    console.error('[dashboard/menu] MenuItem schema drift fallback', error);

    try {
      return await prisma.menuItem.findMany({
        where: { restaurantId, categoryId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          priceCents: true,
          isAvailable: true,
        },
      });
    } catch (fallbackError) {
      if (!isPrismaSchemaDriftError(fallbackError)) throw fallbackError;
      console.error('[dashboard/menu] MenuItem fallback failed', fallbackError);
      return [];
    }
  }
}

export default async function DashboardMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const isTr = locale === 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(`/${locale}/auth/login`);

  const restaurants = await prisma.restaurant.findMany({
    where: { userId: payload.userId },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });

  // No restaurants — empty state
  if (restaurants.length === 0) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8">
        <PageHeader
          eyebrow={isTr ? 'İŞLETME PANELİ' : 'OWNER PANEL'}
          title="menu"
        />
        <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center mt-6">
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#EDEDED] text-[#737373]"
            aria-hidden="true"
          >
            <UtensilsCrossed size={18} strokeWidth={2} />
          </div>
          <p className="text-[14px] text-[#525252]">
            {isTr ? 'Henüz bir işletmen yok.' : "You don't have any restaurants yet."}
          </p>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            {isTr ? 'İşletme Ekle' : 'Add Restaurant'}
          </Link>
        </div>
      </div>
    );
  }

  const selectedRestaurantId = sp.restaurant && restaurants.some((r) => r.id === sp.restaurant)
    ? sp.restaurant
    : restaurants[0].id;
  const tab = sp.tab === 'analytics' ? 'analytics' : 'items';

  // For "analytics" tab — redirect to the dedicated menu analytics page (which
  // has the full chart + word cloud experience). The dashboard hub focuses
  // on the items list.
  if (tab === 'analytics') {
    redirect(`/${locale}/dashboard/restaurants/${selectedRestaurantId}/menu/analytics`);
  }

  // Fetch categories + items + analytics aggregates for the selected restaurant
  const categories = await fetchMenuCategories(selectedRestaurantId);

  const activeCategoryId = sp.category && categories.some((c) => c.id === sp.category)
    ? sp.category
    : categories[0]?.id;

  const activeCategory = activeCategoryId
    ? categories.find((c) => c.id === activeCategoryId)
    : undefined;

  const items = activeCategoryId
    ? await fetchMenuItems(selectedRestaurantId, activeCategoryId)
    : [];

  // Menu analytics — views + clicks per product (last 30 days)
  // and last 14 days for trend computation. menu_analytics_events table
  // exists per CLAUDE.md §13. P2021 fallback: empty maps.
  const itemIds = items.map((i) => i.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let viewsByItem = new Map<string, number>();
  let clicksByItem = new Map<string, number>();
  let recentClicksByItem = new Map<string, number>();
  let priorClicksByItem = new Map<string, number>();
  if (itemIds.length > 0) {
    try {
      const [views, clicks, recentClicks, priorClicks] = await Promise.all([
        prisma.menuAnalyticsEvent.groupBy({
          by: ['productId'],
          where: {
            restaurantId: selectedRestaurantId,
            productId: { in: itemIds },
            eventType: 'menu_product_view',
            createdAt: { gte: thirtyDaysAgo },
          },
          _count: { _all: true },
        }),
        prisma.menuAnalyticsEvent.groupBy({
          by: ['productId'],
          where: {
            restaurantId: selectedRestaurantId,
            productId: { in: itemIds },
            eventType: 'menu_product_click',
            createdAt: { gte: thirtyDaysAgo },
          },
          _count: { _all: true },
        }),
        prisma.menuAnalyticsEvent.groupBy({
          by: ['productId'],
          where: {
            restaurantId: selectedRestaurantId,
            productId: { in: itemIds },
            eventType: 'menu_product_click',
            createdAt: { gte: sevenDaysAgo },
          },
          _count: { _all: true },
        }),
        prisma.menuAnalyticsEvent.groupBy({
          by: ['productId'],
          where: {
            restaurantId: selectedRestaurantId,
            productId: { in: itemIds },
            eventType: 'menu_product_click',
            createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
          _count: { _all: true },
        }),
      ]);
      viewsByItem = new Map(views.map((r) => [r.productId!, r._count._all]));
      clicksByItem = new Map(clicks.map((r) => [r.productId!, r._count._all]));
      recentClicksByItem = new Map(recentClicks.map((r) => [r.productId!, r._count._all]));
      priorClicksByItem = new Map(priorClicks.map((r) => [r.productId!, r._count._all]));
    } catch (err) {
      if (!isPrismaSchemaDriftError(err)) throw err;
      console.error('[dashboard/menu] MenuAnalyticsEvent unavailable', err);
      // Table/columns not migrated yet — empty maps remain.
    }
  }

  // Trend per item: comparing last 7 days clicks vs prior 7 days
  type TrendKind = 'up' | 'down' | 'flat';
  const trendOf = (id: string): TrendKind => {
    const recent = recentClicksByItem.get(id) ?? 0;
    const prior = priorClicksByItem.get(id) ?? 0;
    if (recent === 0 && prior === 0) return 'flat';
    if (prior === 0) return recent > 0 ? 'up' : 'flat';
    const ratio = recent / prior;
    if (ratio >= 1.15) return 'up';
    if (ratio <= 0.85) return 'down';
    return 'flat';
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow={isTr ? 'İŞLETME PANELİ' : 'OWNER PANEL'}
        title="menu"
        actions={
          restaurants.length > 1 ? (
            <select
              className="bz-input"
              style={{ width: 'auto' }}
              defaultValue={selectedRestaurantId}
              // SSR-only select — owner picks restaurant, navigates with query param
              name="restaurant-select"
              aria-label={isTr ? 'İşletme seç' : 'Select restaurant'}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      {/* Tabs (1:1 design OwnerMenu) — analytics tab navigates to dedicated page */}
      <div className="bz-tabs">
        <Link
          href={`/${locale}/dashboard/menu?restaurant=${selectedRestaurantId}`}
          className="bz-tab"
          aria-selected={tab === 'items'}
        >
          {isTr ? 'Menü öğeleri' : 'Menu items'}
        </Link>
        <Link
          href={`/${locale}/dashboard/restaurants/${selectedRestaurantId}/menu/analytics`}
          className="bz-tab"
          aria-selected={false}
        >
          {isTr ? 'Menü analitiği' : 'Menu analytics'}
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
          <p className="text-[14px] text-[#525252]">
            {isTr ? 'Henüz menü kategorisi eklenmemiş.' : 'No menu categories yet.'}
          </p>
          <Link
            href={`/${locale}/dashboard/restaurants/${selectedRestaurantId}/menu`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#1A1A1A] transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            {isTr ? 'Menü oluştur' : 'Create menu'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Categories sidebar (1:1 design OwnerMenu line 19-40) */}
          <div className="bz-card p-3 self-start">
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              <Eyebrow>{isTr ? 'KATEGORİLER' : 'CATEGORIES'}</Eyebrow>
              <Link
                href={`/${locale}/dashboard/restaurants/${selectedRestaurantId}/menu`}
                className="bz-btn-icon"
                aria-label={isTr ? 'Kategori ekle' : 'Add category'}
              >
                <Plus size={14} />
              </Link>
            </div>
            {categories.map((c) => {
              const active = c.id === activeCategoryId;
              return (
                <Link
                  key={c.id}
                  href={`/${locale}/dashboard/menu?restaurant=${selectedRestaurantId}&category=${c.id}`}
                  className="block w-full text-left transition-colors"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    marginBottom: 2,
                    background: active ? '#FAFAFA' : 'transparent',
                    borderLeft: `3px solid ${active ? '#0A0A0A' : 'transparent'}`,
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  <div
                    className="text-[13px]"
                    style={{ fontWeight: active ? 600 : 500 }}
                  >
                    {c.name}
                  </div>
                  <div className="text-[10.5px] text-[#A3A3A3] mt-0.5">
                    {c._count.items} {isTr ? 'ürün' : 'items'}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Items table (1:1 design OwnerMenu line 42-82) */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="bz-h-tight" style={{ fontSize: 18 }}>
                {activeCategory?.name ?? '—'}
              </div>
              <Link
                href={`/${locale}/dashboard/restaurants/${selectedRestaurantId}/menu`}
                className="bz-btn-primary inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                {isTr ? 'Ürün ekle' : 'Add item'}
              </Link>
            </div>

            {items.length === 0 ? (
              <div className="bz-card p-8 text-center">
                <p className="text-[13px] text-[#737373]">
                  {isTr ? 'Bu kategoride henüz ürün yok.' : 'No items in this category yet.'}
                </p>
              </div>
            ) : (
              <div className="bz-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="bz-table w-full">
                    <thead>
                      <tr>
                        <th>{isTr ? 'Ürün' : 'Item'}</th>
                        <th>{isTr ? 'Fiyat' : 'Price'}</th>
                        <th>{isTr ? 'Görüntülenme' : 'Views'}</th>
                        <th>{isTr ? 'Tıklanma' : 'Clicks'}</th>
                        <th>{isTr ? 'Trend' : 'Trend'}</th>
                        <th aria-label="actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => {
                        const views = viewsByItem.get(it.id) ?? 0;
                        const clicks = clicksByItem.get(it.id) ?? 0;
                        const trend = trendOf(it.id);
                        return (
                          <tr key={it.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{it.name}</div>
                              {it.description && (
                                <div className="text-[11px] text-[#737373] mt-0.5 line-clamp-1">
                                  {it.description}
                                </div>
                              )}
                            </td>
                            <td className="bz-mono" style={{ fontWeight: 600 }}>
                              {(it.priceCents / 100).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
                                style: 'currency',
                                currency: 'TRY',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td>{views.toLocaleString(isTr ? 'tr-TR' : 'en-US')}</td>
                            <td>{clicks.toLocaleString(isTr ? 'tr-TR' : 'en-US')}</td>
                            <td>
                              {trend === 'up' && (
                                <span
                                  className="inline-flex items-center gap-1 text-[12px]"
                                  style={{ color: '#16A34A', fontWeight: 600 }}
                                >
                                  <TrendingUp size={12} strokeWidth={2} />
                                  {isTr ? 'Yükseliyor' : 'Rising'}
                                </span>
                              )}
                              {trend === 'down' && (
                                <span
                                  className="inline-flex items-center gap-1 text-[12px]"
                                  style={{ color: '#DC2626', fontWeight: 600 }}
                                >
                                  <TrendingDown size={12} strokeWidth={2} />
                                  {isTr ? 'Düşüyor' : 'Falling'}
                                </span>
                              )}
                              {trend === 'flat' && (
                                <span className="text-[12px] text-[#737373]">—</span>
                              )}
                            </td>
                            <td>
                              <Link
                                href={`/${locale}/dashboard/restaurants/${selectedRestaurantId}/menu`}
                                className="bz-btn-icon inline-flex"
                                aria-label={isTr ? 'Ürünü düzenle' : 'Edit item'}
                              >
                                <MoreHorizontal size={14} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
