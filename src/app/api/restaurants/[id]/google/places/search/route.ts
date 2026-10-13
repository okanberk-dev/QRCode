import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { getLocaleFromRequest } from '@/lib/api/locale';
import { rateLimit } from '@/lib/rate-limit';
import { googlePlacesConfigured, searchGooglePlaces } from '@/lib/google-business';
import { googleOwnerErrorResponse } from '@/lib/google-business-response';
import { ownerGoogleMessage } from '@/lib/google-owner-copy';
import { PlacesApiError, placesSearchBodySchema, type PlacesSearchResponse } from '@/lib/google-places';
import {
  placesSecondsUntilReset,
  reportPlacesFailure,
  reservePlacesBudget,
} from '@/lib/google-places-budget';

export const dynamic = 'force-dynamic';

/**
 * Google Places text search for one business ("find your business on
 * Google"). Billed per call, so after the soft burst limiter the call is
 * RESERVED against the Postgres daily counters — this business first (HTTP 429
 * `DAILY_LIMIT`), then the global ceiling (HTTP 503 `GOOGLE_PLACES_BUSY`).
 * The deployment without a Places key keeps answering HTTP 400
 * `GOOGLE_PLACES_NOT_CONFIGURED`: the panel and CreateBusinessClient branch on
 * that code.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  let locale = getLocaleFromRequest(req);

  if (!googlePlacesConfigured()) {
    return ApiErrors.badRequest(
      ownerGoogleMessage('GOOGLE_PLACES_NOT_CONFIGURED', locale),
      'GOOGLE_PLACES_NOT_CONFIGURED',
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody(placesSearchBodySchema, body);
  if (!parsed.ok) return parsed.response;
  locale = parsed.data.locale ?? locale;

  const limit = await rateLimit(`google-places-search:${actor.id}:${id}`, 20, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      ownerGoogleMessage('RATE_LIMITED', locale),
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  // Billing guard: this business's daily counter, then the global one.
  const budget = await reservePlacesBudget('search', { restaurantId: id });
  if (!budget.allowed) {
    return budget.denied === 'scope'
      ? googleOwnerErrorResponse(429, 'DAILY_LIMIT', locale, {
          'Retry-After': String(placesSecondsUntilReset()),
        })
      : googleOwnerErrorResponse(503, 'GOOGLE_PLACES_BUSY', locale);
  }

  try {
    const places = await searchGooglePlaces(parsed.data.query, locale);
    const response: PlacesSearchResponse = { places };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof PlacesApiError) {
      reportPlacesFailure(
        { code: error.code, status: error.status, googleStatus: error.googleStatus, reason: error.reason },
        'search',
      );
    }
    // PII-safe (§37.7): the query text is user input and stays out of logs.
    console.error('[google places search] failed', {
      restaurantId: id,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: String(error instanceof Error ? error.message : error).slice(0, 200),
    });
    return ApiErrors.internalError('Google işletme araması başarısız.');
  }
}
