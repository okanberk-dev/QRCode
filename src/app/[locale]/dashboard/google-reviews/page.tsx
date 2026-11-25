import { Suspense } from 'react';
import { cookies } from 'next/headers';
import type { Locale } from '@/lib/translations';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  actorFromUserPayload,
  canAccessRestaurant,
  canWriteForUserPayload,
  getScopedRestaurantIdsForUserPayload,
} from '@/lib/panel-access';
import { loadGoogleBusinessStatus, replyInboxReady } from '@/lib/google-business-status';
import { loadGoogleInboxPage } from '@/lib/google-inbox-page';
import { DEFAULT_INBOX_FILTER } from '@/lib/google-review-inbox';
import { googlePlacesConfigured } from '@/lib/google-business';
import { GoogleReviewsLoadingShell } from '@/components/dashboard/google/GoogleReviewsSkeleton';
import {
  GoogleReviewsClient,
  type InitialGoogleData,
  type RestaurantRow,
} from '@/components/dashboard/google/GoogleReviewsClient';

export const dynamic = 'force-dynamic';

/**
 * Google Reviews page. The server reads the owner's businesses (and whether
 * they may write and whether Places search is set up) so the client can start
 * the profile request the moment it has resolved the remembered business,
 * instead of first fetching the list.
 *
 * Cookie states (the dashboard layout already gates auth, so this page never
 * redirects):
 *   - plain `user_token` (owner or team member)  → hydrate;
 *   - `admin_token` present (an admin session, or an admin impersonating an
 *     owner)                                      → client-fetch mode, where
 *     the API layer resolves the acting user.
 */
export default async function GoogleReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const sp = await searchParams;
  const requestedId = typeof sp.restaurantId === 'string' ? sp.restaurantId : null;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'tr';

  let initialRestaurants: RestaurantRow[] | undefined;
  let canWrite: boolean | undefined;
  let placesConfigured: boolean | undefined;
  let initialGoogle: InitialGoogleData | null = null;

  const cookieStore = await cookies();
  const userToken = cookieStore.get('user_token')?.value;
  const adminToken = cookieStore.get('admin_token')?.value;

  if (userToken && !adminToken) {
    try {
      const payload = await verifyJwt(userToken);
      const userId = typeof payload?.userId === 'string' ? payload.userId : null;
      if (userId) {
        const tokenPayload = { userId, role: payload?.role, email: payload?.email };
        // Team members included — the same scope the API layer resolves
        // (CLAUDE.md §38.240); paused businesses are left out, as in the
        // default `/api/restaurants` list, so they cannot start billed calls.
        const scopedIds = await getScopedRestaurantIdsForUserPayload(tokenPayload);
        initialRestaurants = await prisma.restaurant.findMany({
          where: { id: { in: scopedIds }, isActive: true },
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            googlePlaceId: true,
            googleReviewUrl: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        canWrite = await canWriteForUserPayload(tokenPayload);
        placesConfigured = googlePlacesConfigured();

        // §56 — prepare what the page shows first (reply status + the first
        // inbox page with its counts) for the business the client will pick:
        // `?restaurantId` (the shell's links carry it), else the first one.
        // The client uses it only if it resolves the same business.
        const target =
          initialRestaurants.find((r) => r.id === requestedId) ?? initialRestaurants[0] ?? null;
        const actor = actorFromUserPayload(tokenPayload);
        if (target && (await canAccessRestaurant(actor, target.id))) {
          const status = await loadGoogleBusinessStatus(actor, target.id);
          const inbox = replyInboxReady(status)
            ? await loadGoogleInboxPage(target.id, DEFAULT_INBOX_FILTER, { limit: 20 })
            : null;
          initialGoogle = { restaurantId: target.id, status, inbox };
        }
      }
    } catch (error) {
      console.error('[GoogleReviewsPage] hydration failed', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      // Soft-fail: the client fetches the list itself.
      initialRestaurants = undefined;
      canWrite = undefined;
      placesConfigured = undefined;
      initialGoogle = null;
    }
  }

  return (
    <Suspense
      fallback={
        <GoogleReviewsLoadingShell
          withSwitcher={initialRestaurants === undefined || initialRestaurants.length > 1}
          withSummary={placesConfigured !== false}
        />
      }
    >
      <GoogleReviewsClient
        locale={locale}
        initialRestaurants={initialRestaurants}
        canWrite={canWrite}
        placesConfigured={placesConfigured}
        initialGoogle={initialGoogle}
      />
    </Suspense>
  );
}
