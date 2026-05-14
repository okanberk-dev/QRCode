import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole, type PanelActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import type { Locale } from '@/lib/translations';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import RestaurantsClient from './_components/RestaurantsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ restaurantId?: string; restaurant?: string }>;
}

export default async function DashboardRestaurantsPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const query = await searchParams;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);
  }
  const tokenRole = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(tokenRole)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      plan: true,
      role: true,
    },
  });

  if (!user) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);

  // §22 franchise scope — owner kendi sahip olduğu tüm aktif restoranları,
  // team_member (franchise area manager) `TeamMember.locations` subset'ini
  // görür. Backend `getScopedRestaurantIds` her iki rol için doğru filtreyi
  // döner; layout-side fix ile aynı pattern (CLAUDE.md §22 + panel-access).
  const role = user.role || 'restaurant_owner';
  const actor: PanelActor = {
    id: user.id,
    role,
    restaurantId: null,
    username: null,
    email: user.email,
    plan: user.plan,
    source: 'user',
  };
  const scopedIds = await getScopedRestaurantIds(actor);
  const restaurants =
    scopedIds && scopedIds.length > 0
      ? await prisma.restaurant.findMany({
          where: { id: { in: scopedIds }, isActive: true },
          select: {
            id: true,
            slug: true,
            name: true,
            category: true,
            notificationEmail: true,
            primaryColor: true,
            isActive: true,
            createdAt: true,
            _count: { select: { feedbacks: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

  const selectedRestaurantId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: query?.restaurantId ?? query?.restaurant,
    storedRestaurantId: null,
  });
  const visibleRestaurants = selectedRestaurantId
    ? restaurants.filter((restaurant) => restaurant.id === selectedRestaurantId)
    : restaurants;

  return (
    <RestaurantsClient
      locale={locale}
      initialRestaurants={visibleRestaurants.map((restaurant) => ({
        ...restaurant,
        createdAt: restaurant.createdAt.toISOString(),
      }))}
      initialNotificationEmail={user.email}
      selectedRestaurantId={selectedRestaurantId}
      hasMultipleRestaurants={restaurants.length > 1}
      role={role}
    />
  );
}
