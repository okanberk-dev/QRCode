import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const restaurantIdParam = req.nextUrl.searchParams.get('restaurantId');
    const where: any = { branch: { not: null } };

    if (actor.role === 'superadmin') {
      if (restaurantIdParam && restaurantIdParam !== 'all') {
        where.restaurantId = restaurantIdParam;
      }
    } else if (actor.role === 'manager') {
      where.restaurantId = actor.restaurantId;
    } else if (actor.role === 'restaurant_owner') {
      const userRestIds = await getScopedRestaurantIds(actor) || [];

      if (restaurantIdParam && restaurantIdParam !== 'all') {
        if (!userRestIds.includes(restaurantIdParam)) {
          return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }
        where.restaurantId = restaurantIdParam;
      } else {
        where.restaurantId = { in: userRestIds };
      }
    } else {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const rows = await prisma.feedback.findMany({
      where,
      select: { branch: true },
      distinct: ['branch'],
    });

    const branches = rows
      .map((r: any) => (r.branch || '').trim())
      .filter((b: string) => b.length > 0)
      .sort((a: string, b: string) => a.localeCompare(b, 'tr'));

    return NextResponse.json({ branches });
  } catch (error) {
    console.error('Failed to fetch branches:', error);
    return NextResponse.json({ error: 'Şubeler alınamadı' }, { status: 500 });
  }
}
