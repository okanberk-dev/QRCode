import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const actor = await getPanelActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0 });
    }

    const scoped = await getScopedRestaurantIds(actor);
    const baseWhere =
      scoped === null
        ? {}
        : scoped.length === 0
          ? null
          : { restaurantId: { in: scoped } };

    if (baseWhere === null) {
      return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0 });
    }

    const [all, attention, replied] = await Promise.all([
      prisma.feedback.count({ where: baseWhere }),
      prisma.feedback.count({ where: { ...baseWhere, rating: { lte: 2 } } }),
      prisma.feedback.count({
        where: {
          ...baseWhere,
          replies: { some: {} },
        },
      }),
    ]);

    return NextResponse.json({
      all,
      new: Math.max(0, all - replied),
      attention,
      replied,
    });
  } catch (error) {
    console.error('[feedback/counts]', error);
    return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0 });
  }
}
