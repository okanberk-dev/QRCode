import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function loadSiteBranding(): Promise<{ logoUrl: string | null; faviconUrl: string | null }> {
  try {
    const rows = await prisma.settings.findMany({
      where: { key: { in: ['site.logo_url', 'site.favicon_url'] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      logoUrl: map['site.logo_url'] || null,
      faviconUrl: map['site.favicon_url'] || null,
    };
  } catch {
    return { logoUrl: null, faviconUrl: null };
  }
}

// Stage 26 §38.102 Fix #2 — cache header (CLAUDE.md §38.100 Stage 24 paterni
// reuse). AdminSidebar her mount'ta `/api/admin/me` fetch ediyordu; admin
// profile rare mutation (username + email + role rename), 30s fresh + 2min
// SWR pencere yeterli. `private` directive Vercel CDN'de admin token-isolated
// (cookie-based partition); IDOR scope intact. Cross-tab refresh'te
// repeat fetch ~50-150ms → <10ms cache hit.
const ADMIN_ME_CACHE_HEADER = 'private, s-maxage=30, stale-while-revalidate=120';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);

  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { logoUrl, faviconUrl } = await loadSiteBranding();

  // If this is a restaurant_owner, fetch their extra info from the users table
  if (actor.role === 'restaurant_owner') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          trialEndsAt: true,
          role: true,
        }
      });

      if (user) {
        const restaurants = await prisma.restaurant.findMany({
          where: { userId: user.id },
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' },
        });
        const restaurantIds = restaurants.map(r => r.id);

        return NextResponse.json(
          {
            id: user.id,
            username: user.email,
            email: user.email,
            name: user.name,
            role: 'restaurant_owner',
            plan: user.plan,
            trialEndsAt: user.trialEndsAt,
            restaurantId: restaurantIds[0] || null,
            restaurantIds,
            workspaceName: restaurants[0]?.name || user.name || user.email.split('@')[0],
            locationCount: restaurants.length,
            logoUrl,
            faviconUrl,
          },
          { headers: { 'Cache-Control': ADMIN_ME_CACHE_HEADER } },
        );
      }
    } catch (e) {
      console.error('[ME] Failed to fetch user details:', e);
    }
  }

  // Default — AdminUser (superadmin / manager)
  try {
    let adminUser: {
      id: string;
      username: string;
      role: string;
      restaurantId: string | null;
      email: string | null;
    } | null = null;
    try {
      adminUser = await prisma.adminUser.findUnique({
        where: { id: actor.id },
        select: {
          id: true,
          username: true,
          role: true,
          restaurantId: true,
          email: true,
        },
      });
    } catch (err) {
      // P2022: 'email' column not migrated yet — retry without it
      const code = (err as { code?: string })?.code;
      if (code === 'P2022') {
        const fallback = await prisma.adminUser.findUnique({
          where: { id: actor.id },
          select: { id: true, username: true, role: true, restaurantId: true },
        });
        adminUser = fallback ? { ...fallback, email: null } : null;
      } else {
        throw err;
      }
    }

    if (adminUser) {
      return NextResponse.json(
        {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email || adminUser.username,
          recoveryEmail: adminUser.email || null,
          name: adminUser.username,
          role: adminUser.role || 'superadmin',
          plan: null,
          trialEndsAt: null,
          restaurantId: adminUser.restaurantId || null,
          restaurantIds: adminUser.restaurantId ? [adminUser.restaurantId] : [],
          logoUrl,
          faviconUrl,
        },
        { headers: { 'Cache-Control': ADMIN_ME_CACHE_HEADER } },
      );
    }
  } catch (e) {
    console.error('[ME] Failed to fetch admin user:', e);
  }

  // Fallback (e.g. env-admin)
  return NextResponse.json(
    {
      id: actor.id,
      username: actor.username,
      email: actor.email,
      name: actor.username,
      role: actor.role || 'superadmin',
      plan: actor.plan,
      trialEndsAt: null,
      restaurantId: actor.restaurantId || null,
      logoUrl,
      faviconUrl,
    },
    { headers: { 'Cache-Control': ADMIN_ME_CACHE_HEADER } },
  );
}
