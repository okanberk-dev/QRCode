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
    select: { googleReviewManagementEnabled: true, pulseAiEnabled: true, googleAiEnabled: true },
  });

  const reviewManagementEnabled = restaurant?.googleReviewManagementEnabled ?? false;
  const googleAiEnabled = (restaurant?.pulseAiEnabled ?? true) && (restaurant?.googleAiEnabled ?? true);
  const integration = await getGoogleIntegrationForRestaurant(actor, id);
  const cache = parseGoogleLocationsCache(integration?.locationsJson ?? null);
  const selectedLocation = selectedGoogleLocation(cache, id);
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
    },
    {
      // Owner-scoped status barely changes between requests — `private` so
      // the CDN never shares it across users; 60s/300sw covers a typical
      // dashboard polling cadence (CLAUDE.md §19.3 owner-cache pattern).
      headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300' },
    },
  );
}
