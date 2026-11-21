import { cookies } from 'next/headers';
import { verifyAdminTokenForLayout, verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { adminActorFromPayload } from '@/lib/admin-session-row';
import { dedupeQrRows } from '@/lib/qr-signature';
import AdminQrClient, { type QrHistoryItem, type Restaurant } from './AdminQrClient';

export const dynamic = 'force-dynamic';

/**
 * Upper bounds for the server-rendered page (§40.10). Above them the client
 * keeps its original path (paged /api/restaurants + one history request per
 * business), so a very large tenant set is neither truncated nor shipped
 * whole in the HTML. Under the history limit no business can hit the
 * per-business cap of GET /api/restaurants/[id]/qr/history (500 rows), so
 * the list is the same one the per-business requests would assemble.
 */
const RESTAURANT_HYDRATION_LIMIT = 500;
const HISTORY_HYDRATION_LIMIT = 300;

export default async function AdminQrPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;

  let initialRestaurants: Restaurant[] | undefined;
  let initialItems: QrHistoryItem[] | undefined;

  // Hydrate only where the API would resolve the same admin actor: an
  // "owner gibi gör" session makes /api/restaurants answer for the
  // impersonated owner, so that case keeps the client path.
  const userToken = cookieStore.get('user_token')?.value;
  const userPeek = userToken ? await verifyJwt(userToken) : null;
  const impersonating =
    !!userPeek && typeof userPeek.impersonating === 'object' && userPeek.impersonating !== null;

  if (adminToken && !impersonating) {
    try {
      // Same gate as the API (signature + role + password-rotation staleness).
      const payload = await verifyAdminTokenForLayout(adminToken);
      const actor = payload ? adminActorFromPayload(payload) : null;
      if (actor) {
        const scopedIds = await getScopedRestaurantIds(actor);
        const rows = await prisma.restaurant.findMany({
          where: scopedIds === null ? {} : { id: { in: scopedIds } },
          // Same order as the paged list the client used to load.
          orderBy: { createdAt: 'desc' },
          take: RESTAURANT_HYDRATION_LIMIT + 1,
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
        });
        if (rows.length <= RESTAURANT_HYDRATION_LIMIT) {
          initialRestaurants = rows;
        }
      }
    } catch (error) {
      console.error('[AdminQrPage] business hydration failed', {
        errorName: error instanceof Error ? error.name : 'unknown',
      });
    }
  }

  // QR history of every listed business in one query — same filter and
  // fields as GET /api/restaurants/[id]/qr/history. Any failure (e.g. a
  // preview DB without the newer colour columns) leaves `initialItems`
  // undefined and the client loads per business as before.
  if (initialRestaurants) {
    const ids = initialRestaurants.map((r) => r.id);
    if (ids.length === 0) {
      initialItems = [];
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
          initialItems = dedupeQrRows(
            rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
          );
        }
      } catch (error) {
        console.error('[AdminQrPage] QR history hydration failed', {
          errorName: error instanceof Error ? error.name : 'unknown',
        });
      }
    }
  }

  return <AdminQrClient initialRestaurants={initialRestaurants} initialItems={initialItems} />;
}
