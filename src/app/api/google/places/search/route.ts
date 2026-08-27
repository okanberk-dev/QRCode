// Unscoped Google Places text search — used by the "Yeni İşletme" creation
// page where no restaurant id exists yet. Mirrors the scoped variant
// (`/api/restaurants/[id]/google/places/search`) but gates on "can the actor
// create a business" (same rule as POST /api/restaurants: reject `manager`)
// instead of `canWriteRestaurant(id)` since there is no target row.
//
// Not IDOR-sensitive (no DB read of a specific restaurant) — the only risk is
// Google API quota abuse, so it is rate-limited per actor.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { googlePlacesConfigured, searchGooglePlaces } from '@/lib/google-business';

export const dynamic = 'force-dynamic';

const Body = z
  .object({
    query: z.string().trim().min(2).max(180),
    locale: z.enum(['tr', 'en']).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  // Same permission boundary as POST /api/restaurants (create a business).
  // Allowlist — team_member / staff must not burn the project-wide Google
  // Places quota (§5.1.1) through a create flow they cannot complete anyway.
  if (actor.role !== 'restaurant_owner' && actor.role !== 'superadmin') {
    return ApiErrors.forbidden('Bu işlem için yetkiniz yok');
  }

  if (!googlePlacesConfigured()) {
    return ApiErrors.badRequest(
      'GOOGLE_MAPS_API_KEY env var tanımlı değil.',
      'GOOGLE_PLACES_NOT_CONFIGURED',
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-places-search:${actor.id}:new`, 20, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      'Çok fazla Google işletme araması. Biraz bekleyip tekrar deneyin.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  try {
    const places = await searchGooglePlaces(parsed.data.query, parsed.data.locale ?? 'tr');
    return NextResponse.json({ places });
  } catch (error) {
    console.error('[google places search:new] failed', error);
    return ApiErrors.internalError('Google işletme araması başarısız.');
  }
}
