// CLAUDE.md §38.99 — Owner panel campaigns page (server shell + client island).

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { detectSector } from '@/lib/sector-platforms';
import { CampaignsClient } from './_components/CampaignsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string; restaurant?: string }>;
}

export default async function OwnerCampaignsPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/campaigns`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/campaigns`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/campaigns`);
  }

  // Team members included — same scope the API layer resolves
  // (getScopedRestaurantIds). `userId: payload.userId` hid every
  // restaurant from invited team members.
  const scopedIds = await getScopedRestaurantIdsForUserPayload({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: scopedIds }, isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      campaignsEnabled: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  const initialActiveRestaurantId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: sp.restaurantId ?? sp.restaurant,
    storedRestaurantId: null,
  });

  return (
    <CampaignsClient
      locale={locale}
      initialRestaurants={restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        campaignsEnabled: restaurant.campaignsEnabled !== false,
        sector: detectSector(restaurant.category),
      }))}
      initialActiveRestaurantId={initialActiveRestaurantId}
    />
  );
}
