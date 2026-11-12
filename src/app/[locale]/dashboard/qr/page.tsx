import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { dedupeQrRows } from '@/lib/qr-signature';
import QrClient, { type QrHistoryItem } from './QrClient';

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

/**
 * Upper bound for the server-rendered QR history (all scoped businesses in
 * one query, ~70 KB of page payload at most). Above it the page skips
 * hydration and QrClient loads each business through
 * `/api/restaurants/[id]/qr/history` when it is shown, so a large franchise
 * neither ships every business's list in the HTML nor gets a truncated one.
 */
const HISTORY_HYDRATION_LIMIT = 300;

export default async function DashboardQrPage() {
  // Auth — owner panel (user_token). Admin bypass handled by dashboard/layout.
  const cookieStore = await cookies();
  const userToken = cookieStore.get('user_token')?.value;
  const adminToken = cookieStore.get('admin_token')?.value;

  let initialRestaurants: Restaurant[] | undefined;
  let initialHistories: Record<string, QrHistoryItem[]> | undefined;

  // Only hydrate from user_token — admin sessions keep client-fetch path
  // (consistent with /dashboard/account hydration scope, §38).
  if (userToken && !adminToken) {
    try {
      const payload = await verifyJwt(userToken);
      const userId = typeof payload?.userId === 'string' ? payload.userId : null;
      if (userId) {
        // Team members included — same scope the API layer resolves
        // (CLAUDE.md §38.240). `where: { userId }` returned [] for an invited
        // team member, and QrClient treats an SSR [] as "already loaded", so
        // the member saw "no business" and a disabled "Yeni QR oluştur".
        const scopedIds = await getScopedRestaurantIdsForUserPayload({
          userId,
          role: payload?.role,
          email: payload?.email,
        });
        initialRestaurants = await prisma.restaurant.findMany({
          where: { id: { in: scopedIds } },
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

  // QR history for every listed business in one query — the page used to
  // show skeleton cards until one request per business had returned
  // (§40.10 server hydration). Same filter and fields as
  // GET /api/restaurants/[id]/qr/history. Any failure (e.g. a preview DB
  // without the newer colour columns) leaves `initialHistories` undefined
  // and QrClient fetches per business as before.
  if (initialRestaurants) {
    const ids = initialRestaurants.map((r) => r.id);
    if (ids.length === 0) {
      initialHistories = {};
    } else {
      try {
        const rows = await prisma.qrGeneration.findMany({
          where: { restaurantId: { in: ids }, type: 'feedback' },
          orderBy: { createdAt: 'desc' },
          take: HISTORY_HYDRATION_LIMIT + 1,
          select: {
            id: true,
            restaurantId: true,
            qrUrl: true,
            tableNumber: true,
            platform: true,
            serviceType: true,
            type: true,
            darkColor: true,
            lightColor: true,
            templateId: true,
            createdAt: true,
          },
        });
        if (rows.length <= HISTORY_HYDRATION_LIMIT) {
          const byRestaurant: Record<string, QrHistoryItem[]> = {};
          for (const id of ids) byRestaurant[id] = [];
          for (const row of rows) {
            byRestaurant[row.restaurantId]?.push({ ...row, createdAt: row.createdAt.toISOString() });
          }
          for (const id of ids) byRestaurant[id] = dedupeQrRows(byRestaurant[id]);
          initialHistories = byRestaurant;
        }
      } catch (error) {
        console.error('[DashboardQrPage] QR history hydration failed', error);
      }
    }
  }

  return <QrClient initialRestaurants={initialRestaurants} initialHistories={initialHistories} />;
}
