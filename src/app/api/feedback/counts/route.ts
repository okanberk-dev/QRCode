import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { normalizeRestaurantParam } from '@/lib/active-business';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const actor = await getPanelActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0 });
    }

    const { searchParams } = new URL(req.url);
    const requestedRestaurantId = normalizeRestaurantParam(
      searchParams.get('restaurantId') ?? searchParams.get('restaurant'),
    );
    const scoped = await getScopedRestaurantIds(actor);
    const baseWhere =
      scoped === null
        ? requestedRestaurantId
          ? { restaurantId: requestedRestaurantId }
          : {}
        : scoped.length === 0
          ? null
          : requestedRestaurantId
            ? scoped.includes(requestedRestaurantId)
              ? { restaurantId: requestedRestaurantId }
              : null
            : { restaurantId: { in: scoped } };

    if (baseWhere === null) {
      return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0, lowUnread: 0 });
    }

    // `?only=lowUnread` — the notification bell's badge poll needs just this
    // one number; skip the other three counts (and the replies join). Callers
    // without the param get the full shape, unchanged.
    if (searchParams.get('only') === 'lowUnread') {
      const lowUnread = await prisma.feedback.count({
        where: { ...baseWhere, rating: { lte: 3 }, isRead: false },
      });
      return NextResponse.json(
        { lowUnread },
        { headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=60' } },
      );
    }

    // Stage 80 §38.160 — `lowUnread` count NotificationBell + bottom nav
    // badge için. `rating <= 3 AND isRead = false` matches NotificationBell
    // fetch URL filter (`/api/feedback?rating=low&isRead=false`) but
    // returns the **gerçek total** instead of the 5-row dropdown cap.
    // CLAUDE.md §38.137 Stage 56 (Feedback.isRead schema) + §38.83 Stage 13
    // (PATCH endpoint) + §38.159 Stage 79 (backend filter wiring) zinciri.
    const [all, attention, lowUnread] = await prisma.$transaction([
      prisma.feedback.count({ where: baseWhere }),
      // Low rating = 1–3★, same as the owner inbox and the toolbar filter.
      prisma.feedback.count({ where: { ...baseWhere, rating: { lte: 3 } } }),
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
