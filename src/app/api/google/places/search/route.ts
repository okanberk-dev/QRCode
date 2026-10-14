// Unscoped Google Places text search — used by the "Yeni İşletme" creation
// page where no restaurant id exists yet. Mirrors the scoped variant
// (`/api/restaurants/[id]/google/places/search`) but gates on "can the actor
// create a business" (same rule as POST /api/restaurants: reject `manager`)
// instead of `canWriteRestaurant(id)` since there is no target row.
//
// Not IDOR-sensitive (no DB read of a specific restaurant) — the only risk is
// Google Places spend, so every call is reserved against the Postgres daily
// counters: this actor first (HTTP 429 DAILY_LIMIT), then the global ceiling
// (HTTP 503 GOOGLE_PLACES_BUSY), on top of the soft per-minute limiter.

import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
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

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  // Same permission boundary as POST /api/restaurants (create a business).
  // Allowlist — team_member / staff must not burn the Google Places budget
  // through a create flow they cannot complete anyway.
  if (actor.role !== 'restaurant_owner' && actor.role !== 'superadmin') {
    return ApiErrors.forbidden('Bu işlem için yetkiniz yok');
  }

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
  // Language of Google's results: exactly the body `locale`, else Turkish (the
  // contract of this route). The owner-facing error copy may also follow the
  // request locale (query / Accept-Language).
  const searchLocale: 'tr' | 'en' = parsed.data.locale ?? 'tr';
  locale = parsed.data.locale ?? locale;

  const limit = await rateLimit(`google-places-search:${actor.id}:new`, 20, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      ownerGoogleMessage('RATE_LIMITED', locale),
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  const budget = await reservePlacesBudget('search', { actorId: actor.id });
  if (!budget.allowed) {
    return budget.denied === 'scope'
      ? googleOwnerErrorResponse(429, 'DAILY_LIMIT', locale, {
          'Retry-After': String(placesSecondsUntilReset()),
        })
      : googleOwnerErrorResponse(503, 'GOOGLE_PLACES_BUSY', locale);
  }

  try {
    const places = await searchGooglePlaces(parsed.data.query, searchLocale);
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
    console.error('[google places search:new] failed', {
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: String(error instanceof Error ? error.message : error).slice(0, 200),
    });
    return ApiErrors.internalError('Google işletme araması başarısız.');
  }
}
