import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import type { Locale } from '@/lib/translations';
import { EmptyState, PageHeader } from '@/components/ui';
import MenuHubRedirect from './_components/MenuHubRedirect';

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
    select: { id: true, isActive: true },
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

  // One business — open its menu builder straight away.
  if (restaurants.length === 1) {
    redirect(`/${locale}/dashboard/restaurants/${restaurants[0].id}/menu`);
  }

  // Several businesses and no usable `?restaurantId` (bookmark, typed URL,
  // command palette). There is no business picker here: the menu always
  // belongs to the business chosen in the panel's business switcher, and the
  // shell's "Menü" links already open that business's builder directly. The
  // client resolves the switcher's business and opens its builder.
  const restaurantIds = [
    ...restaurants.filter((r) => r.isActive).map((r) => r.id),
    ...restaurants.filter((r) => !r.isActive).map((r) => r.id),
  ];
  return <MenuHubRedirect locale={locale} restaurantIds={restaurantIds} />;
}
