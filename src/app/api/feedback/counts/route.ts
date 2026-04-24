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

    const [all, attention] = await Promise.all([
      prisma.feedback.count({ where: baseWhere }),
      prisma.feedback.count({ where: { ...baseWhere, rating: { lte: 2 } } }),
    ]);

    // Replied count joins the FeedbackReply table which may not exist on
    // environments where `prisma db push` has not run yet. Fall back to 0
    // so the counts strip still renders instead of blanking the page.
    let replied = 0;
    try {
      replied = await prisma.feedback.count({
        where: {
          ...baseWhere,
          replies: { some: {} },
        },
      });
    } catch (err) {
      console.warn(
        '[feedback/counts] replied fallback — did `prisma db push` run?',
        (err as Error).message,
      );
    }

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
