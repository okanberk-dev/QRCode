import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { loadAdminPanelProfile } from '@/lib/admin-profile';
import { withServerTiming } from '@/lib/server-timing';

// Stage 26 §38.102 Fix #2 — cache header (CLAUDE.md §38.100 Stage 24 paterni
// reuse). AdminSidebar her mount'ta `/api/admin/me` fetch ediyordu; admin
// profile rare mutation (username + email + role rename), 30s fresh + 2min
// SWR pencere yeterli. `private` directive Vercel CDN'de admin token-isolated
// (cookie-based partition); IDOR scope intact. Cross-tab refresh'te
// repeat fetch ~50-150ms → <10ms cache hit.
const ADMIN_ME_CACHE_HEADER = 'private, s-maxage=30, stale-while-revalidate=120';

async function handleGET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);

  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const profile = await loadAdminPanelProfile(actor);
  return NextResponse.json(profile, { headers: { 'Cache-Control': ADMIN_ME_CACHE_HEADER } });
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
