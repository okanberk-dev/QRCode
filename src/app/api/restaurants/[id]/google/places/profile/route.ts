import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { googlePlacesConfigured } from '@/lib/google-business';
import {
  fetchGooglePlaceDetails,
  hasManualReviewLink,
  resolveProfileState,
  resolveRestaurantPlaceId,
  type PlacesProfileResponse,
  type ResolveProfileStateResult,
} from '@/lib/google-places';
import { makeDetailsReserver, reportPlacesFailure } from '@/lib/google-places-budget';
import { timed, withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * Live Google Places profile of one business (rating, review count, up to 5
 * Google reviews, profile checklist inputs). Independent of the optional
 * Business Profile sign-in, of `googleReviewManagementEnabled` and of the
 * Business Profile quota — it only needs the saved Place ID.
 *
 * Compliance: Places content is fetched live and returned with
 * `Cache-Control: private, no-store`. It is never written to the database, a
 * log line or Sentry; only the Place ID is durable.
 *
 * Cost: every Google call is reserved against the Postgres daily counters
 * (per business, then global) BEFORE the request — see google-places-budget.
 * The soft `rateLimit()` below only smooths bursts; it is not the ceiling.
 *
 * Always HTTP 200 for the expected states so the UI has one code path:
 *   ok | not_linked | unavailable | not_found | error (upstream | limit_*)
 */

const NO_STORE = { 'Cache-Control': 'private, no-store' };

function noStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}

/**
 * Single-flight per instance: two simultaneous requests (two tabs, the React
 * StrictMode double effect) share ONE reservation and ONE Google call. The key
 * includes `canWrite` because it is the only per-actor field in the body.
 */
const inFlight = new Map<string, Promise<ResolveProfileStateResult>>();

async function handleGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return noStore(ApiErrors.unauthorized());

  const { id } = await params;

  try {
    // Reading is allowed for read-only team members; writing is reported so
    // the UI can show the "ask a business manager" copy without a probe call.
    const canWrite = await canWriteRestaurant(actor, id);
    if (!canWrite && !(await canAccessRestaurant(actor, id))) {
      return noStore(ApiErrors.forbidden());
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, googlePlaceId: true, googleReviewUrl: true },
    });
    if (!restaurant) return noStore(ApiErrors.notFound('İşletme bulunamadı.'));

    const placesConfigured = googlePlacesConfigured();
    const placeId = resolveRestaurantPlaceId(restaurant);
    const hasManualLink = hasManualReviewLink(restaurant);

    // Soft burst limiter — only when a billed call could actually follow.
    if (placesConfigured && placeId) {
      const limit = await rateLimit(`places-details:${actor.id}:${id}`, 12, 60_000);
      if (!limit.allowed) {
        const body: PlacesProfileResponse = {
          state: 'error',
          placeId,
          canWrite,
          hasManualLink,
          placesConfigured,
          error: { reason: 'upstream', retryAfterSeconds: Math.max(1, limit.retryAfterSeconds) },
        };
        return NextResponse.json(body, { headers: NO_STORE });
      }
    }

    const flightKey = `${id}:${placeId ?? '-'}:${canWrite ? 1 : 0}`;
    let flight = inFlight.get(flightKey);
    if (!flight) {
      flight = resolveProfileState({
        placeId,
        hasManualLink,
        placesConfigured,
        canWrite,
        deps: {
          reserve: makeDetailsReserver(id),
          fetchDetails: (pid) => timed('google', () => fetchGooglePlaceDetails(pid)),
          now: () => new Date(),
        },
      })
        .then((result) => {
          // Only the request that started the flight reports (and Sentry is
          // throttled per fingerprint anyway).
          if (result.failure) reportPlacesFailure(result.failure, 'details');
          return result;
        })
        .finally(() => {
          inFlight.delete(flightKey);
        });
      inFlight.set(flightKey, flight);
    }

    const { body } = await flight;
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (error) {
    // PII-safe (§37.7): never the raw error object.
    console.error('[google places profile] failed', {
      restaurantId: id,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: String(error instanceof Error ? error.message : error).slice(0, 200),
    });
    return noStore(ApiErrors.internalError('Google bilgileri alınamadı.'));
  }
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
