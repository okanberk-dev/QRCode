import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import QrClient from './QrClient';

export const dynamic = 'force-dynamic';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  isActive?: boolean;
  primaryColor?: string | null;
  category?: string | null;
  googlePlaceId?: string | null;
  yemekSepetiUrl?: string | null;
  getirYemekUrl?: string | null;
  trendyolYemekUrl?: string | null;
  tripAdvisorUrl?: string | null;
  airbnbUrl?: string | null;
  bookingUrl?: string | null;
  yandexUrl?: string | null;
  externalPlatformsEnabled?: boolean;
}

export default async function DashboardQrPage() {
  // Auth — owner panel (user_token). Admin bypass handled by dashboard/layout.
  const cookieStore = await cookies();
  const userToken = cookieStore.get('user_token')?.value;
  const adminToken = cookieStore.get('admin_token')?.value;

  let initialRestaurants: Restaurant[] | undefined;

  // Only hydrate from user_token — admin sessions keep client-fetch path
  // (consistent with /dashboard/account hydration scope, §38).
  if (userToken && !adminToken) {
    try {
      const payload = await verifyJwt(userToken);
      const userId = typeof payload?.userId === 'string' ? payload.userId : null;
      if (userId) {
        initialRestaurants = await prisma.restaurant.findMany({
          where: { userId },
          select: {
            id: true,
            slug: true,
            name: true,
            isActive: true,
            primaryColor: true,
            category: true,
            googlePlaceId: true,
            yemekSepetiUrl: true,
            getirYemekUrl: true,
            trendyolYemekUrl: true,
            tripAdvisorUrl: true,
            airbnbUrl: true,
            bookingUrl: true,
            yandexUrl: true,
            externalPlatformsEnabled: true,
          },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });
      }
    } catch (error) {
      console.error('[DashboardQrPage] hydration failed', error);
      // Soft-fail: client refetches on mount.
    }
  }

  return <QrClient initialRestaurants={initialRestaurants} />;
}
