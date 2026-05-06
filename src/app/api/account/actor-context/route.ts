import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';

// GET /api/account/actor-context — minimal actor surface for owner panel
// to know if it's being viewed by an admin (CLAUDE.md §38.93 Stage A1).
//
// Stage A4 §38.96 — extended with impersonation flow fields:
//   - realAdminId / impersonationSessionId — `actor.realAdminId` server-side
//     set ise impersonation aktif; ImpersonationBanner bu alanlara bakar.
//   - impersonationEndsAt — countdown timer için (ISO string).
//   - impersonationAdminUsername — banner display "X yönetici olarak..." için.
//
// Owner /dashboard/account renders a sticky "Admin paneline dön" link when
// `source === 'admin'` (no-impersonation path) OR ImpersonationBanner when
// `realAdminId` set (active impersonation path).
//
// Response shape kept tiny — no PII; safe to cache short-window per-cookie.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  // Resolve impersonation session + admin username for the banner. PII guard:
  // adminUsername yes (no email leak); session IDs OK (forensic trail value).
  let impersonationEndsAt: string | null = null;
  let impersonationAdminUsername: string | null = null;
  if (actor.realAdminId && actor.impersonationSessionId) {
    try {
      const session = await prisma.impersonationSession.findUnique({
        where: { id: actor.impersonationSessionId },
        select: {
          endsAt: true,
          admin: { select: { username: true } },
        },
      });
      if (session) {
        impersonationEndsAt = session.endsAt.toISOString();
        impersonationAdminUsername = session.admin?.username ?? null;
      }
    } catch {
      // Non-fatal — banner shows without countdown if lookup fails.
    }
  }

  return NextResponse.json(
    {
      source: actor.source,
      role: actor.role,
      // Manager scope (admin-source) → admin/restaurants/[id] back-link target.
      // Superadmin (no scope) → /admin dashboard. Caller decides routing.
      restaurantId: actor.restaurantId ?? null,
      // Stage A4 — impersonation surface for ImpersonationBanner.
      realAdminId: actor.realAdminId ?? null,
      impersonationSessionId: actor.impersonationSessionId ?? null,
      impersonationEndsAt,
      impersonationAdminUsername,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
