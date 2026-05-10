import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import RestaurantsClient from './_components/RestaurantsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardRestaurantsPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      email: true,
      restaurants: {
        where: { isActive: true },
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
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);

  return (
    <RestaurantsClient
      locale={locale}
      initialRestaurants={user.restaurants.map((restaurant) => ({
        ...restaurant,
        createdAt: restaurant.createdAt.toISOString(),
      }))}
      initialNotificationEmail={user.email}
    />
  );
}
