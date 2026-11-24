import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import {
  getGoogleIntegrationForRestaurant,
  googleOAuthConfigured,
  googlePlacesConfigured,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
} from '@/lib/google-business';
import { getReplyAvailability } from '@/lib/google-business-availability';
import { googleConnectionState, isGoogleTenantAllowed } from '@/lib/gbp-access';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      userId: true,
      slug: true,
      googleReviewManagementEnabled: true,
      pulseAiEnabled: true,
      googleAiEnabled: true,
    },
  });

  const reviewManagementEnabled = restaurant?.googleReviewManagementEnabled ?? false;
  const googleAiEnabled = (restaurant?.pulseAiEnabled ?? true) && (restaurant?.googleAiEnabled ?? true);
  const integration = await getGoogleIntegrationForRestaurant(actor, id);
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
  const showcase = await prisma.googleReviewCache.findUnique({
    where: { restaurantId: id },
    select: { fetchedAt: true, totalReviewCount: true, lastErrorCode: true, nextAttemptAt: true },
  });
  // Cache'lenmiş accounts üzerinden hızlı flag — UI ilk render'da owner'a
  // "Business Profile yok" durumunu konum endpoint'i çağrılmadan gösterebilir.
  // null = sync henüz yapılmamış (UI: locations endpoint'ini fetch eder),
  // false = sync yapıldı, accounts boş (UI: "işletme profili açın" mesajı),
  // true = sync yapıldı, accounts var.
  const syncDone = Boolean(cache.syncedAt);
  const hasBusinessProfile = syncDone ? cache.accounts.length > 0 : null;
  const accountCount = cache.accounts.length;
  const locationCount = cache.locations.length;

  return NextResponse.json(
    {
      googleReviewManagementEnabled: reviewManagementEnabled,
      googleAiEnabled,
      placesConfigured: googlePlacesConfigured(),
      oauthConfigured: googleOAuthConfigured(),
      connected: Boolean(integration),
      expiresAt: integration?.expiresAt?.toISOString() ?? null,
      hasRefreshToken: Boolean(integration?.refreshToken),
      selectedLocation,
      syncedAt: cache.syncedAt,
      hasBusinessProfile,
      accountCount,
      locationCount,
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
    },
    {
      // Owner-scoped status barely changes between requests — `private` so
      // the CDN never shares it across users; 60s/300sw covers a typical
      // dashboard polling cadence (CLAUDE.md §19.3 owner-cache pattern).
      headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300' },
    },
  );
}
