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
      return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0, lowUnread: 0 });
    }

    // Stage 80 §38.160 — `lowUnread` count NotificationBell + bottom nav
    // badge için. `rating <= 3 AND isRead = false` matches NotificationBell
    // fetch URL filter (`/api/feedback?rating=low&isRead=false`) but
    // returns the **gerçek total** instead of the 5-row dropdown cap.
    // CLAUDE.md §38.137 Stage 56 (Feedback.isRead schema) + §38.83 Stage 13
    // (PATCH endpoint) + §38.159 Stage 79 (backend filter wiring) zinciri.
    const [all, attention, lowUnread] = await Promise.all([
      prisma.feedback.count({ where: baseWhere }),
      prisma.feedback.count({ where: { ...baseWhere, rating: { lte: 2 } } }),
      prisma.feedback.count({
        where: { ...baseWhere, rating: { lte: 3 }, isRead: false },
      }),
    ]);

    // Replied count joins the FeedbackReply table which may not exist on
    // environments where schema migration has not run yet. Fall back to 0
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
        '[feedback/counts] replied fallback — did schema migration run?',
        (err as Error).message,
      );
    }

    return NextResponse.json(
      {
        all,
        new: Math.max(0, all - replied),
        attention,
        replied,
        lowUnread,
      },
      {
        headers: {
          // Edge cache (CLAUDE.md §38.100 Stage 24). Tab badge counts —
          // 15s fresh + 60s SWR mevcut polling intervalleriyle hizalı.
          'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=60',
        },
      },
    );
  } catch (error) {
    console.error('[feedback/counts]', error);
    return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0, lowUnread: 0 });
  }
}
