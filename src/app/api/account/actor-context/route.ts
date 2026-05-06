import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';

// GET /api/account/actor-context — minimal actor surface for owner panel
// to know if it's being viewed by an admin (CLAUDE.md §38.93 Stage A1).
//
// Owner /dashboard/account renders a sticky "Admin paneline dön" link when
// `source === 'admin'` — typical scenario: superadmin landed on owner panel
// directly (via deep link or impersonation flow, future Stage A4).
//
// Response shape kept tiny (source + role + restaurantId) — no PII; safe to
// cache short-window per-cookie. Auth required (no anon access).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  return NextResponse.json(
    {
      source: actor.source,
      role: actor.role,
      // Manager scope (admin-source) → admin/restaurants/[id] back-link target.
      // Superadmin (no scope) → /admin dashboard. Caller decides routing.
      restaurantId: actor.restaurantId ?? null,
    },
    {
      headers: {
        // Per-cookie owner-scoped data — short cache OK (cookie change
        // invalidates path naturally).
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
