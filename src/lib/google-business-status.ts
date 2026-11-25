/**
 * Reply-feature status of one business (CLAUDE.md §54, §56). Shared by
 * `GET /api/restaurants/[id]/google/business/status` and the Google Reviews
 * page, which prepares it on the server so the client does not wait for it.
 * The caller has already checked `canAccessRestaurant`.
 */
import { prisma } from '@/lib/prisma';
import type { PanelActor } from '@/lib/auth';
import {
  getGoogleIntegrationForRestaurant,
  googleOAuthConfigured,
  googlePlacesConfigured,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
} from '@/lib/google-business';
import { getReplyAvailability } from '@/lib/google-business-availability';
import { googleConnectionState, isGoogleTenantAllowed } from '@/lib/gbp-access';

export type GoogleBusinessStatus = Awaited<ReturnType<typeof loadGoogleBusinessStatus>>;

export async function loadGoogleBusinessStatus(actor: PanelActor, id: string) {
  const [restaurant, integration, showcase] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id },
      select: {
        userId: true,
        slug: true,
        googleReviewManagementEnabled: true,
        pulseAiEnabled: true,
        googleAiEnabled: true,
      },
    }),
    getGoogleIntegrationForRestaurant(actor, id),
    prisma.googleReviewCache.findUnique({
      where: { restaurantId: id },
      select: { fetchedAt: true, totalReviewCount: true, lastErrorCode: true, nextAttemptAt: true },
    }),
  ]);

  const reviewManagementEnabled = restaurant?.googleReviewManagementEnabled ?? false;
  const googleAiEnabled = (restaurant?.pulseAiEnabled ?? true) && (restaurant?.googleAiEnabled ?? true);
  const cache = parseGoogleLocationsCache(integration?.locationsJson ?? null);
  const selectedLocation = selectedGoogleLocation(cache, id);
  // Platform-level: is the optional reply sign-in worth offering at all?
  // ('not_provisioned' = Google quota is 0 project-wide; 'disabled' = operator
  // switch). Never a per-owner fact, so the UI hides the connect button.
  // §53 — a workspace outside GBP_ALLOWED_TENANTS sees "coming soon" and no
  // connect button (connect + callback refuse it on the server as well).
  const tenantAllowed = await isGoogleTenantAllowed(restaurant?.userId);
  const replyAvailability = tenantAllowed ? await getReplyAvailability() : 'coming_soon';
  const connectionState = googleConnectionState(integration, process.env.GOOGLE_CLIENT_ID);
  // null = locations never synced (the UI fetches them), false = synced and
  // the Google account has no Business Profile, true = it has one.
  const syncDone = Boolean(cache.syncedAt);

  return {
    googleReviewManagementEnabled: reviewManagementEnabled,
    googleAiEnabled,
    placesConfigured: googlePlacesConfigured(),
    oauthConfigured: googleOAuthConfigured(),
    connected: Boolean(integration),
    expiresAt: integration?.expiresAt?.toISOString() ?? null,
    hasRefreshToken: Boolean(integration?.refreshToken),
    selectedLocation,
    syncedAt: cache.syncedAt,
    hasBusinessProfile: syncDone ? cache.accounts.length > 0 : null,
    accountCount: cache.accounts.length,
    locationCount: cache.locations.length,
    replyAvailability,
    tenantAllowed,
    connectionState,
    invalidReason: integration?.invalidReason ?? null,
    showcase: showcase
      ? {
          fetchedAt: showcase.fetchedAt?.toISOString() ?? null,
          totalReviewCount: showcase.totalReviewCount,
          lastErrorCode: showcase.lastErrorCode,
          nextAttemptAt: showcase.nextAttemptAt?.toISOString() ?? null,
        }
      : null,
    embedUrl: restaurant?.slug ? `/embed/${restaurant.slug}/google` : null,
  };
}

/** The reply inbox can open: management on, Google connected, a location picked. */
export function replyInboxReady(status: Pick<GoogleBusinessStatus, 'googleReviewManagementEnabled' | 'connected' | 'selectedLocation'>): boolean {
  return Boolean(status.googleReviewManagementEnabled && status.connected && status.selectedLocation);
}
