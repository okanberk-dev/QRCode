import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { getLocaleFromRequest } from '@/lib/api/locale';
import { rateLimit } from '@/lib/rate-limit';
import { writePanelAuditLog } from '@/lib/audit-log';
import { googlePlacesConfigured, googleReviewUrlFromPlaceId } from '@/lib/google-business';
import { ownerGoogleMessage } from '@/lib/google-owner-copy';
import { googleOwnerErrorResponse } from '@/lib/google-business-response';
import {
  placesSelectBodySchema,
  resolveRestaurantPlaceId,
  verifyPlaceId,
  type PlacesSelectResponse,
} from '@/lib/google-places';
import { reportPlacesFailure } from '@/lib/google-places-budget';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Pick the Google listing a business is matched to. This is the write that
 * decides where customers are sent to leave a review, so it is hardened:
 *
 *  - the body is validated with the SAME strict ID check the resolver uses
 *    (a 25-character junk string must never overwrite a working link);
 *  - when Places is configured the ID is verified with an IDs-only Google
 *    call BEFORE anything is written — 422 PLACE_NOT_FOUND when Google says
 *    it is not a place, 503 GOOGLE_UNAVAILABLE when Google could not tell
 *    (nothing is written in either case);
 *  - the change is audited (`owner.` / `admin.google.place.select`) with the
 *    owning user as target so it shows in the owner's own audit view.
 *
 * When Places is NOT configured (local dev; in production the UI cannot reach
 * this route because search is unavailable) the shape check alone applies.
 * That is documented and accepted so the route stays testable offline.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const locale = getLocaleFromRequest(req);

  const body = await req.json().catch(() => null);
  const parsed = validateBody(placesSelectBodySchema, body);
  if (!parsed.ok) return parsed.response;
  const { placeId } = parsed.data;

  // Soft burst limiter (best effort — the verification call is the real gate).
  const limit = await rateLimit(`places-select:${actor.id}:${id}`, 10, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      ownerGoogleMessage('RATE_LIMITED', locale),
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  try {
    const previous = await prisma.restaurant.findUnique({
      where: { id },
      select: { userId: true, googlePlaceId: true, googleReviewUrl: true },
    });
    if (!previous) return ApiErrors.notFound('İşletme bulunamadı.');

    if (googlePlacesConfigured()) {
      const verification = await verifyPlaceId(placeId);
      if (!verification.ok) {
        if (verification.code === 'NOT_FOUND') {
          return googleOwnerErrorResponse(422, 'PLACE_NOT_FOUND', locale);
        }
        reportPlacesFailure(
          {
            code: verification.code,
            status: verification.status,
            googleStatus: verification.googleStatus,
            reason: verification.reason,
          },
          'select',
        );
        return googleOwnerErrorResponse(503, 'GOOGLE_UNAVAILABLE', locale);
      }
    }

    // "Replaced" means a different, resolvable Place ID was saved before.
    const previousPlaceId = resolveRestaurantPlaceId(previous);
    const replaced = previousPlaceId !== null && previousPlaceId !== placeId;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        googlePlaceId: placeId,
        googleReviewUrl: googleReviewUrlFromPlaceId(placeId),
        googleEnabled: true,
      },
      select: {
        id: true,
        googlePlaceId: true,
        googleReviewUrl: true,
        googleEnabled: true,
      },
    });

    // Same pattern as PUT /api/restaurants/[id]: the target is the OWNING
    // user. `resolveOwnerUserId(actor)` is null for a superadmin, which would
    // leave the row without a target and invisible in the owner's audit view.
    await writePanelAuditLog(
      actor,
      actor.source === 'admin' ? 'admin.google.place.select' : 'owner.google.place.select',
      previous.userId ?? id,
      { restaurantId: id, replaced },
    );

    const response: PlacesSelectResponse = { restaurant, replaced };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // PII-safe (§37.7): never the raw error object.
    console.error('[google places select] failed', {
      restaurantId: id,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: String(error instanceof Error ? error.message : error).slice(0, 200),
    });
    return ApiErrors.internalError('Google işletmesi kaydedilemedi.');
  }
}
