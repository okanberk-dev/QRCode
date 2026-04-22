import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest, isAdminRole } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { prisma } from '@/lib/prisma';

export async function requireRestaurantAccess(req: NextRequest, restaurantId: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return { ok: false as const, res: NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 }) };
  }
  // Superadmin: global access. Manager: scoped to their own restaurantId.
  // Everyone else (restaurant_owner): checked via canAccessRestaurant.
  const isSuperadmin = actor.role === 'superadmin';
  if (!isSuperadmin) {
    if (actor.role === 'manager') {
      if ((actor as any).restaurantId !== restaurantId) {
        return { ok: false as const, res: NextResponse.json({ error: 'Bu restorana erişiminiz yok' }, { status: 403 }) };
      }
    } else {
      const allowed = await canAccessRestaurant(actor, restaurantId);
      if (!allowed) {
        return { ok: false as const, res: NextResponse.json({ error: 'Bu restorana erişiminiz yok' }, { status: 403 }) };
      }
    }
  }
  const isAdmin = isSuperadmin || isAdminRole(actor.role);
  return { ok: true as const, actor, isAdmin };
}

export async function touchMenuUpdated(restaurantId: string) {
  try {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { menuUpdatedAt: new Date() },
    });
  } catch (error) {
    console.error('[touchMenuUpdated]', error);
  }
}
