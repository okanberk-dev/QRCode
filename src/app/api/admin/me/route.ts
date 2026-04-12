import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req) as any;

  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  // If this is a restaurant_owner (came from the users table), fetch their extra info
  if (admin.role === 'restaurant_owner') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: admin.id },
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
        // Also get their first restaurant for restaurantId
        const restaurant = await prisma.restaurant.findFirst({
          where: { userId: user.id },
          select: { id: true }
        });

        return NextResponse.json({
          id: user.id,
          username: user.email,
          email: user.email,
          name: user.name,
          role: 'restaurant_owner',
          plan: user.plan,
          trialEndsAt: user.trialEndsAt,
          restaurantId: restaurant?.id || admin.restaurantId || null
        });
      }
    } catch (e) {
      console.error('[ME] Failed to fetch user details:', e);
    }
  }

  // Default — AdminUser (superadmin / manager)
  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: admin.id },
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
        restaurantId: adminUser.restaurantId || null
      });
    }
  } catch (e) {
    console.error('[ME] Failed to fetch admin user:', e);
  }

  // Fallback (e.g. env-admin)
  return NextResponse.json({
    id: admin.id,
    username: admin.username,
    email: admin.username,
    name: admin.username,
    role: admin.role || 'superadmin',
    plan: null,
    trialEndsAt: null,
    restaurantId: admin.restaurantId || null
  });
}
