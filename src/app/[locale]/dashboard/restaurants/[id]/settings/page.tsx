import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import RestaurantSettingsClient, { type RestaurantPayload } from './RestaurantSettingsClient';

export const dynamic = 'force-dynamic';

/**
 * Owner restaurant settings — server entry that hydrates the client with
 * the full Restaurant payload, so we skip the legacy "Yükleniyor…" flash.
 *
 * Pattern matches `restaurants/[id]/page.tsx` (Stage 101 wave 3):
 *   - Owner direct load (user_token, no admin_token) → SSR fetch + hydrate
 *   - Admin impersonation (admin_token present) → SSR skipped; client refetches
 *   - Team member / unauthorized → SSR finds nothing → client surfaces error
 *
 * §40.10 server-hydration + cross-token scope. §14.1 defensive select.
 */
export default async function RestaurantSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const userToken = cookieStore.get('user_token')?.value;
  const adminToken = cookieStore.get('admin_token')?.value;

  let initialRestaurant: RestaurantPayload | null | undefined;

  if (userToken && !adminToken) {
    try {
      const payload = await verifyJwt(userToken);
      const userId = typeof payload?.userId === 'string' ? payload.userId : null;
      if (userId) {
        // Owner-only direct match. For team_member/manager flows the JWT
        // userId doesn't match restaurant.userId → findFirst returns null
        // → client falls back to its own fetch with proper IDOR via the
        // API route (`getPanelActorFromRequest` + `canAccessRestaurant`).
        const r = await prisma.restaurant.findFirst({
          where: { id, userId },
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            description: true,
            website: true,
            address: true,
            city: true,
            phone: true,
            googlePlaceId: true,
            notificationEmail: true,
            isActive: true,
            suspendedByAdmin: true,
            googleReviewUrl: true,
            googleEnabled: true,
            yemekSepetiUrl: true,
            yemekSepetiEnabled: true,
            getirYemekUrl: true,
            getirEnabled: true,
            trendyolYemekUrl: true,
            trendyolEnabled: true,
            tripAdvisorUrl: true,
            tripAdvisorEnabled: true,
            airbnbUrl: true,
            airbnbEnabled: true,
            bookingUrl: true,
            bookingEnabled: true,
            yandexUrl: true,
            yandexEnabled: true,
            yelpUrl: true,
            yelpEnabled: true,
            foursquareUrl: true,
            foursquareEnabled: true,
            externalPlatformsEnabled: true,
            defaultRedirectPlatform: true,
            redirectMinRating: true,
            otherPlatformUrl: true,
            otherPlatformLabel: true,
            otherPlatformEnabled: true,
            instagramUrl: true,
            facebookUrl: true,
            whatsappUrl: true,
            reservationUrl: true,
            workingHours: true,
            temporarilyClosed: true,
            closedReason: true,
            targetRating: true,
          },
        });
        if (r) {
          initialRestaurant = {
            id: r.id,
            name: r.name,
            slug: r.slug,
            category: r.category ?? 'Restoran',
            description: r.description ?? null,
            website: r.website ?? null,
            address: r.address ?? null,
            city: r.city ?? null,
            phone: r.phone ?? null,
            googlePlaceId: r.googlePlaceId ?? null,
            notificationEmail: r.notificationEmail ?? null,
            isActive: r.isActive ?? true,
            suspendedByAdmin: r.suspendedByAdmin === true,
            googleReviewUrl: r.googleReviewUrl ?? null,
            googleEnabled: r.googleEnabled ?? true,
            yemekSepetiUrl: r.yemekSepetiUrl ?? null,
            yemekSepetiEnabled: r.yemekSepetiEnabled ?? true,
            getirYemekUrl: r.getirYemekUrl ?? null,
            getirEnabled: r.getirEnabled ?? true,
            trendyolYemekUrl: r.trendyolYemekUrl ?? null,
            trendyolEnabled: r.trendyolEnabled ?? true,
            tripAdvisorUrl: r.tripAdvisorUrl ?? null,
            tripAdvisorEnabled: r.tripAdvisorEnabled ?? true,
            airbnbUrl: r.airbnbUrl ?? null,
            airbnbEnabled: r.airbnbEnabled ?? true,
            bookingUrl: r.bookingUrl ?? null,
            bookingEnabled: r.bookingEnabled ?? true,
            yandexUrl: r.yandexUrl ?? null,
            yandexEnabled: r.yandexEnabled ?? true,
            yelpUrl: r.yelpUrl ?? null,
            yelpEnabled: r.yelpEnabled ?? true,
            foursquareUrl: r.foursquareUrl ?? null,
            foursquareEnabled: r.foursquareEnabled ?? true,
            externalPlatformsEnabled: r.externalPlatformsEnabled ?? true,
            defaultRedirectPlatform: r.defaultRedirectPlatform ?? null,
            redirectMinRating: r.redirectMinRating ?? null,
            otherPlatformUrl: r.otherPlatformUrl ?? null,
            otherPlatformLabel: r.otherPlatformLabel ?? null,
            otherPlatformEnabled: r.otherPlatformEnabled ?? true,
            instagramUrl: r.instagramUrl ?? null,
            facebookUrl: r.facebookUrl ?? null,
            whatsappUrl: r.whatsappUrl ?? null,
            reservationUrl: r.reservationUrl ?? null,
            workingHours: r.workingHours ?? null,
            temporarilyClosed: r.temporarilyClosed ?? false,
            closedReason: r.closedReason ?? null,
            targetRating:
              typeof r.targetRating === 'number' ? r.targetRating : null,
          };
        } else {
          // Owner check failed (not owned by this user). Client fetch
          // will hit /api/restaurants/[id] which runs the full IDOR
          // (canAccessRestaurant) — surfaces a proper 403 / 404 there.
          initialRestaurant = undefined;
        }
      }
    } catch (error) {
      console.error('[RestaurantSettingsPage] hydration failed', error);
      // Soft-fail: client refetches on mount.
      initialRestaurant = undefined;
    }
  }

  return <RestaurantSettingsClient initialRestaurant={initialRestaurant} />;
}
