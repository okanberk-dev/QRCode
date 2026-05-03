import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import {
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
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
    select: { googleReviewManagementEnabled: true, googleAiEnabled: true },
  });

  const reviewManagementEnabled = restaurant?.googleReviewManagementEnabled ?? false;
  const googleAiEnabled = restaurant?.googleAiEnabled ?? true;
  const integration = await getGoogleIntegrationForRestaurant(actor, id);
  const cache = parseGoogleLocationsCache(integration?.locationsJson ?? null);
  const selectedLocation = selectedGoogleLocation(cache, id);

  return NextResponse.json({
    googleReviewManagementEnabled: reviewManagementEnabled,
    googleAiEnabled,
    placesConfigured: googlePlacesConfigured(),
    oauthConfigured: googleOAuthConfigured(),
    connected: Boolean(integration),
    expiresAt: integration?.expiresAt?.toISOString() ?? null,
    hasRefreshToken: Boolean(integration?.refreshToken),
    selectedLocation,
    syncedAt: cache.syncedAt,
  });
}
