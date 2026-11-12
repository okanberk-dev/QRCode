import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Plus, UtensilsCrossed } from 'lucide-react';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import type { Locale } from '@/lib/translations';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { Badge, EmptyState, Eyebrow, PageHeader } from '@/components/ui';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Menü' : 'Menu',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

type RestaurantSummary = {
  id: string;
  name: string;
  slug: string;
  menuEnabled: boolean;
  menuPublished: boolean;
  menuLogoUrl: string | null;
  menuUpdatedAt: Date | null;
  categoryCount: number;
  itemCount: number;
};

function isPrismaSchemaDriftError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === 'P2021' || code === 'P2022';
}

async function fetchMenuCounts(restaurantId: string) {
  try {
    const [categoryCount, itemCount] = await prisma.$transaction([
      prisma.menuCategory.count({ where: { restaurantId, deletedAt: null } }),
      prisma.menuItem.count({ where: { restaurantId, deletedAt: null } }),
    ]);
    return { categoryCount, itemCount };
  } catch (error) {
    if (!isPrismaSchemaDriftError(error)) throw error;
    // Schema drift on preview deploys — fall back to count without deletedAt filter.
    try {
      const [categoryCount, itemCount] = await prisma.$transaction([
        prisma.menuCategory.count({ where: { restaurantId } }),
        prisma.menuItem.count({ where: { restaurantId } }),
      ]);
      return { categoryCount, itemCount };
    } catch {
      return { categoryCount: 0, itemCount: 0 };
    }
  }
}

export default async function DashboardMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ restaurantId?: string | string[] }>;
}) {
  const { locale } = await params;
  const { restaurantId: restaurantIdParam } = await searchParams;
  const isTr = locale === 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(`/${locale}/auth/login`);

  // Team members included — same scope the API layer resolves
  // (getScopedRestaurantIds). `userId: payload.userId` hid every
  // restaurant from invited team members.
  const scopedIds = await getScopedRestaurantIdsForUserPayload({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
  // Team members cannot create businesses (create POST gate) — hide the CTA
  // instead of sending them to a page that bounces them back.
  const canCreateBusiness = payload.role !== 'team_member';
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: scopedIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      menuEnabled: true,
      menuPublished: true,
      menuLogoUrl: true,
      menuUpdatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // 0 restaurants — friendly empty state nudges the user to create their
  // first business before they can manage a menu.
  if (restaurants.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-6">
        <PageHeader
          title={isTr ? 'Menü' : 'Menu'}
          description={
            isTr
              ? 'Menü yönetimi için önce bir işletme eklemen gerekiyor.'
              : 'You need to add a business before you can manage a menu.'
          }
        />
        <EmptyState
          icon={<UtensilsCrossed size={20} strokeWidth={2} />}
          title={isTr ? 'Henüz işletme yok' : 'No business yet'}
          body={
            isTr
              ? 'İşletmeni eklediğinde menü, kategori ve ürünleri tek ekrandan yönetebileceksin.'
              : 'Once you add a business, you can manage your menu, categories, and items from a single screen.'
          }
          action={
            canCreateBusiness ? (
              <Link href={`/${locale}/dashboard/restaurants/new`} className="bz-btn-lime">
                <Plus size={14} strokeWidth={2} />
                {isTr ? 'İşletme ekle' : 'Add business'}
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  // The shell already carries the business the owner picked at the top of the
  // panel (`?restaurantId=`) — don't make them pick it a second time. Only a
  // business inside their own scope counts; any other id is ignored (it must
  // never redirect to, or reveal, someone else's menu).
  const requestedId = Array.isArray(restaurantIdParam) ? restaurantIdParam[0] : restaurantIdParam;
  if (requestedId && restaurants.some((r) => r.id === requestedId)) {
    redirect(`/${locale}/dashboard/restaurants/${requestedId}/menu`);
  }

  // Single restaurant — skip the picker and drop the user straight into the
  // builder. Most operators have one location; this eliminates the historic
  // "Ürün ekle" → route change kopukluğu by removing the hub bounce entirely.
  if (restaurants.length === 1) {
    redirect(`/${locale}/dashboard/restaurants/${restaurants[0].id}/menu`);
  }

  // 2+ restaurants — show a clean picker. Each card carries enough context
  // (status, counts, last updated) for the operator to pick the right menu
  // without bouncing through a read-only summary first.
  const summaries: RestaurantSummary[] = [];
  for (const restaurant of restaurants) {
    const counts = await fetchMenuCounts(restaurant.id);
    summaries.push({ ...restaurant, ...counts });
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-6">
      <PageHeader
        title={isTr ? 'Menü' : 'Menu'}
        description={
          isTr
            ? 'Düzenlemek istediğin işletmenin menüsünü seç.'
            : 'Pick which business menu you want to manage.'
        }
        actions={
          canCreateBusiness ? (
            <Link href={`/${locale}/dashboard/restaurants/new`} className="bz-btn">
              <Plus size={14} strokeWidth={2} />
              {isTr ? 'İşletme ekle' : 'Add business'}
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((r) => (
          <RestaurantMenuCard key={r.id} restaurant={r} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function RestaurantMenuCard({
  restaurant,
  locale,
}: {
  restaurant: RestaurantSummary;
  locale: Locale;
}) {
  const isTr = locale === 'tr';
  const href = `/${locale}/dashboard/restaurants/${restaurant.id}/menu`;

  const statusKind: 'ok' | 'warn' | 'ghost' = !restaurant.menuEnabled
    ? 'ghost'
    : restaurant.menuPublished
    ? 'ok'
    : 'warn';
  const statusLabel = !restaurant.menuEnabled
    ? isTr
      ? 'Kapalı'
      : 'Disabled'
    : restaurant.menuPublished
    ? isTr
      ? 'Yayında'
      : 'Published'
    : isTr
    ? 'Taslak'
    : 'Draft';

  const initial = restaurant.name.trim().charAt(0).toUpperCase() || '·';

  return (
    <Link
      href={href}
      className="group block bz-card overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0A0A0A] text-[#C6F24E]"
          aria-hidden="true"
        >
          {restaurant.menuLogoUrl ? (
             
            <img
              src={restaurant.menuLogoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="bz-h-tight text-[18px]">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="bz-h-tight truncate text-[15px] text-[#0A0A0A]">
                {restaurant.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[#737373]">
                /{restaurant.slug}
              </p>
            </div>
            <Badge kind={statusKind}>{statusLabel}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#EDEDED]">
        <div className="bg-white px-4 py-3 sm:px-5">
          <Eyebrow>{isTr ? 'KATEGORİ' : 'CATEGORIES'}</Eyebrow>
          <p className="bz-mono mt-1 text-[18px] text-[#0A0A0A]" style={{ fontWeight: 600 }}>
            {restaurant.categoryCount}
          </p>
        </div>
        <div className="bg-white px-4 py-3 sm:px-5">
          <Eyebrow>{isTr ? 'ÜRÜN' : 'ITEMS'}</Eyebrow>
          <p className="bz-mono mt-1 text-[18px] text-[#0A0A0A]" style={{ fontWeight: 600 }}>
            {restaurant.itemCount}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#EDEDED] px-4 py-3 sm:px-5">
        <p className="truncate text-[11px] text-[#737373]">
          {restaurant.menuUpdatedAt
            ? `${isTr ? 'Son güncelleme' : 'Last updated'}: ${new Date(
                restaurant.menuUpdatedAt,
              ).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                // Server render — pin the business timezone (§46), not UTC.
                timeZone: resolveDisplayTimeZone(),
              })}`
            : isTr
            ? 'Henüz güncellenmemiş'
            : 'Not yet updated'}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#0A0A0A] group-hover:gap-1.5 transition-all">
          {restaurant.categoryCount === 0
            ? isTr
              ? 'Menü oluştur'
              : 'Build menu'
            : isTr
            ? 'Menüyü düzenle'
            : 'Edit menu'}
          <ArrowRight size={13} strokeWidth={2} />
        </span>
      </div>
    </Link>
  );
}
