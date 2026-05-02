import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { googlePlacesConfigured, searchGooglePlaces } from '@/lib/google-business';

export const dynamic = 'force-dynamic';

const Body = z.object({
  query: z.string().trim().min(2).max(180),
  locale: z.enum(['tr', 'en']).optional(),
}).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  if (!googlePlacesConfigured()) {
    return ApiErrors.badRequest(
      'GOOGLE_MAPS_API_KEY env var tanımlı değil.',
      'GOOGLE_PLACES_NOT_CONFIGURED',
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody(Body, body);
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-places-search:${actor.id}:${id}`, 20, 60_000);
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
    console.error('[google places search] failed', error);
    return ApiErrors.internalError('Google işletme araması başarısız.');
  }
}
