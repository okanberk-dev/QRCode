// Stage 16 §38.86 — Supabase Realtime token mint endpoint.
//
// CLAUDE.md §37.2 disipline:
// A) auth boundary  — getPanelActorFromRequest (Buaze custom JWT verify)
// B) IDOR           — getScopedRestaurantIds (owner-scoped restaurant list)
// D) rate limit     — 10/dk/actor (refresh ~ once per 55min in steady state;
//                     burst tolerance for tab focus + reconnect)
// G) cron secret    — N/A (not a cron endpoint)
//
// Niye 503 ve 403 ayrımı?
//   - SUPABASE_JWT_SECRET unset: 503 (config issue, transient → ops alert)
//   - actor null: 401 (auth failure, client should re-login)
//   - role === 'superadmin' || scope === null: 403 (deliberate scope limit;
//     superadmin uses admin panel, owner dashboard realtime out of scope)
//   - rate limit aşıldı: 429
//
// Token TTL 1h; client ~55min'de proactive refresh eder. Tarayıcı sekmesi
// pasif kalsa da Supabase Realtime token expire olunca channel kapanır
// (yeniden token al + reconnect).

import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { mintRealtimeToken } from '@/lib/realtime-token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Stage 16 — Realtime is for owner dashboard. Superadmin uses
  // /admin/* routes; manager/team_member/restaurant_owner have a
  // bounded restaurant list. Don't mint a service-role-equivalent
  // token in the browser (XSS amplification surface).
  const scopedIds = await getScopedRestaurantIds(actor);
  if (scopedIds === null) {
    return NextResponse.json(
      { error: 'unsupported_role', message: 'Realtime is restricted to scoped roles.' },
      { status: 403 },
    );
  }
  if (scopedIds.length === 0) {
    // Owner without a restaurant — token is technically valid but the
    // RLS policy would never match. Return 200 with empty scope so the
    // client can render the empty ActivityFeed without subscribing
    // (saves a WebSocket).
    return NextResponse.json(
      { token: null, expiresAt: 0, restaurantIds: [] },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const limit = await rateLimit(`realtime-token:${actor.source}:${actor.id}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      },
    );
  }

  try {
    const result = await mintRealtimeToken({
      userId: actor.id,
      restaurantIds: scopedIds,
      ttlSeconds: 3600,
    });
    return NextResponse.json(
      {
        token: result.token,
        expiresAt: result.expiresAt,
        restaurantIds: scopedIds,
      },
      {
        status: 200,
        // Bu response asla cache'lenmemeli — token user-bound + short-lived.
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'mint_failed';
    // Sentry capture'ı root layout'taki error reporting'e bırakıyoruz
    // (CLAUDE.md §38.13 — server-side flush kör nokta; explicit captureException
    // çağırsak da envelope dispatch edilmiyor). console.error Vercel runtime
    // log'a düşer, operatör ops izlemek için bunu kullanır.
    console.error('[realtime-token] mint failed:', message);
    return NextResponse.json(
      { error: 'realtime_unconfigured', message: 'Supabase realtime is not configured.' },
      { status: 503 },
    );
  }
}
