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
