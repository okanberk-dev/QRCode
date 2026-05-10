import type { PanelActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface AdminPanelProfile {
  id: string;
  username: string | null;
  email: string | null;
  recoveryEmail?: string | null;
  name?: string | null;
  role: string;
  plan: string | null;
  trialEndsAt: string | null;
  restaurantId: string | null;
  restaurantIds: string[];
  workspaceName?: string | null;
  locationCount?: number | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

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

export async function loadAdminPanelProfile(actor: PanelActor): Promise<AdminPanelProfile> {
  const { logoUrl, faviconUrl } = await loadSiteBranding();

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
        },
      });

      if (user) {
        const restaurants = await prisma.restaurant.findMany({
          where: { userId: user.id },
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' },
        });
        const restaurantIds = restaurants.map((restaurant) => restaurant.id);

        return {
          id: user.id,
          username: user.email,
          email: user.email,
          name: user.name,
          role: 'restaurant_owner',
          plan: user.plan,
          trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
          restaurantId: restaurantIds[0] || null,
          restaurantIds,
          workspaceName: restaurants[0]?.name || user.name || user.email.split('@')[0],
          locationCount: restaurants.length,
          logoUrl,
          faviconUrl,
        };
      }
    } catch (error) {
      console.error('[admin-profile] Failed to fetch owner profile:', error);
    }
  }

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
      const code = (err as { code?: string })?.code;
      if (code !== 'P2022') throw err;
      const fallback = await prisma.adminUser.findUnique({
        where: { id: actor.id },
        select: { id: true, username: true, role: true, restaurantId: true },
      });
      adminUser = fallback ? { ...fallback, email: null } : null;
    }

    if (adminUser) {
      return {
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
      };
    }
  } catch (error) {
    console.error('[admin-profile] Failed to fetch admin profile:', error);
  }

  return {
    id: actor.id,
    username: actor.username,
    email: actor.email,
    name: actor.username,
    role: actor.role || 'superadmin',
    plan: actor.plan,
    trialEndsAt: null,
    restaurantId: actor.restaurantId || null,
    restaurantIds: actor.restaurantId ? [actor.restaurantId] : [],
    logoUrl,
    faviconUrl,
  };
}
