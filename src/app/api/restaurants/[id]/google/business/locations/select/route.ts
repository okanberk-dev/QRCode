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
  GoogleBusinessApiError,
} from '@/lib/google-business';
import { captureBaselineSnapshot } from '@/lib/reputation/snapshot';
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
    select: { initialGoogleRating: true, currentGoogleRating: true },
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

  // Initial rating fetch — sadece henüz hiç rating yoksa Google'ı ara.
  // Daha önce `loadStatusAndReviews()` veya başka bir akış rating'i
  // doldurduysa burada quota yakmaya gerek yok; Google Reviews sayfası
  // mount olduğunda `/business/reviews` zaten taze rating'i getirecek.
  //
  // Bu CLAUDE.md §5.1 quota math'ı için kritik: select endpoint'inin
  // listGoogleReviews çağrısı ile aynı saniyede google-reviews/page.tsx
  // `loadStatusAndReviews` da aynı reviews'u çekiyordu → 2 quota burn
  // per location-select. Bu koşul ile fetch sıfıra iniyor (rating zaten
  // varsa) veya 1'e (ilk kez seçildiyse).
  //
  // Fail-soft: rating best-effort. 429 / reauth / network hatası
  // selection'ı bloklamaz; Sentry yukarıda capture eder.
  const shouldFetchInitialRating =
    restaurant.initialGoogleRating === null && restaurant.currentGoogleRating === null;
  const selectionForFetch = selectedGoogleLocation(nextCache, id);
  let fetchedRating: number | undefined;
  if (shouldFetchInitialRating && selectionForFetch) {
    try {
      const res = await listGoogleReviews(integration, selectionForFetch);
      if (typeof res.averageRating === 'number') {
        fetchedRating = res.averageRating;
      }
    } catch (err) {
      // GoogleBusinessApiError dahil her şey swallow — selection happy
      // path bloklanmaz. Sentry yukarıda zaten capture etti.
      if (err instanceof GoogleBusinessApiError) {
        // breadcrumb-only, no PII
      }
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

  // Reputation OS — fire-and-forget baseline snapshot. First location-select
  // event = best moment to capture "before Buaze" state for monthly delta.
  // Idempotent inside captureBaselineSnapshot (skips if baseline already
  // exists); never blocks response.
  void captureBaselineSnapshot(id);

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
