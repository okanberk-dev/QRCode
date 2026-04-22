import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);

  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

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
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });
        const restaurantIds = restaurants.map(r => r.id);

        return NextResponse.json({
          id: user.id,
          username: user.email,
          email: user.email,
          name: user.name,
          role: 'restaurant_owner',
          plan: user.plan,
          trialEndsAt: user.trialEndsAt,
          restaurantId: restaurantIds[0] || null,
          restaurantIds,
        });
      }
    } catch (e) {
      console.error('[ME] Failed to fetch user details:', e);
    }
  }

  // Default — AdminUser (superadmin / manager)
  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: actor.id },
      select: { id: true, username: true, role: true, restaurantId: true }
    });

    if (adminUser) {
      return NextResponse.json({
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.username,
        name: adminUser.username,
        role: adminUser.role || 'superadmin',
        plan: null,
        trialEndsAt: null,
        restaurantId: adminUser.restaurantId || null,
        restaurantIds: adminUser.restaurantId ? [adminUser.restaurantId] : [],
      });
    }
  } catch (e) {
    console.error('[ME] Failed to fetch admin user:', e);
  }

  // Fallback (e.g. env-admin)
  return NextResponse.json({
    id: actor.id,
    username: actor.username,
    email: actor.email,
    name: actor.username,
    role: actor.role || 'superadmin',
    plan: actor.plan,
    trialEndsAt: null,
    restaurantId: actor.restaurantId || null
  });
}
