import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { loadGoogleBusinessStatus } from '@/lib/google-business-status';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';

async function handleGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  return NextResponse.json(await loadGoogleBusinessStatus(actor, id), {
    // Owner-scoped status barely changes between requests — `private` so
    // the CDN never shares it across users; 60s/300sw covers a typical
    // dashboard polling cadence (CLAUDE.md §19.3 owner-cache pattern).
    headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300' },
  });
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
