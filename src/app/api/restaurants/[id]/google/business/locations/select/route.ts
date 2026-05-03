import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import {
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  googleReviewUrlFromPlaceId,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  withSelectedGoogleLocation,
  listGoogleReviews,
} from '@/lib/google-business';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const Body = z.object({
  accountName: z.string().min(1).max(120),
  locationName: z.string().min(1).max(120),
}).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();
  if (!(await googleReviewManagementEnabled(id))) {
    return ApiErrors.forbidden(
      'Google yorum yönetimi bu işletme için kapalı.',
      'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody(Body, body);
  if (!parsed.ok) return parsed.response;

  const integration = await getGoogleIntegrationForRestaurant(actor, id);
  if (!integration) {
    return ApiErrors.badRequest('Google Business Profile hesabı bağlı değil.', 'GOOGLE_NOT_CONNECTED');
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { initialGoogleRating: true },
  });
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı.');

  const cache = parseGoogleLocationsCache(integration.locationsJson);
  const location = cache.locations.find(
    (item) =>
      item.accountName === parsed.data.accountName &&
      item.locationName === parsed.data.locationName,
  );
  if (!location) {
    return ApiErrors.notFound('Google konumu bulunamadı. Önce konumları yenileyin.');
  }

  const nextCache = withSelectedGoogleLocation(cache, id, location);
  const googlePlaceId = location.placeId ?? undefined;
  const googleReviewUrl =
    location.newReviewUri ??
    (googlePlaceId ? googleReviewUrlFromPlaceId(googlePlaceId) : undefined);

  // Fetch current rating from Google to use as initial/current rating.
  // Fail-soft: rating is best-effort. `googleBusinessFetch` already emits a
  // single Sentry event on failure (tagged `integration: 'google-business'`);
  // here we only need a PII-safe local breadcrumb so this rare path is not
  // silent. Reauth / rate-limit on rating fetch must not block the location
  // selection happy path.
  const selectionForFetch = selectedGoogleLocation(nextCache, id);
  let fetchedRating: number | undefined;
  if (selectionForFetch) {
    try {
      const res = await listGoogleReviews(integration, selectionForFetch);
      if (typeof res.averageRating === 'number') {
        fetchedRating = res.averageRating;
      }
    } catch {
      // Sentry already captured upstream; do not log raw error to avoid PII.
    }
  }

  await prisma.$transaction([
    prisma.googleIntegration.update({
      where: { id: integration.id },
      data: { locationsJson: nextCache as unknown as Prisma.InputJsonValue },
    }),
    prisma.restaurant.update({
      where: { id },
      data: {
        ...(googlePlaceId !== undefined && { googlePlaceId }),
        ...(googleReviewUrl !== undefined && { googleReviewUrl }),
        googleEnabled: true,
        ...(fetchedRating !== undefined && {
          currentGoogleRating: fetchedRating,
          ...(restaurant.initialGoogleRating === null && { initialGoogleRating: fetchedRating }),
        }),
      },
    }),
  ]);

  return NextResponse.json({
    selectedLocation: selectedGoogleLocation(nextCache, id),
    restaurant: {
      id,
      googlePlaceId: googlePlaceId ?? null,
      googleReviewUrl: googleReviewUrl ?? null,
      googleEnabled: true,
    },
  });
}
