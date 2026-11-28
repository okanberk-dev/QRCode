import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { normalizeRestaurantParam } from '@/lib/active-business';
import { NextRequest, NextResponse } from 'next/server';
import { withServerTiming } from '@/lib/server-timing';
import { NEEDS_REPLY } from '@/lib/feedback-metrics';

export const dynamic = 'force-dynamic';

async function handleGET(req: NextRequest) {
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
    let baseWhere: Prisma.FeedbackWhereInput | null =
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
      return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0, lowUnread: 0, redirects: 0 });
    }
    // §58: redirect events are not reviews — counted apart, never in tabs.
    const scopeWhere = baseWhere;
    baseWhere = { ...baseWhere, redirected: false };

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
    const [all, attention, lowUnread, redirects] = await prisma.$transaction([
      prisma.feedback.count({ where: baseWhere }),
      // Low rating = 1–3★, same as the owner inbox and the toolbar filter.
      prisma.feedback.count({ where: { ...baseWhere, rating: { lte: 3 } } }),
      prisma.feedback.count({
        where: { ...baseWhere, rating: { lte: 3 }, isRead: false },
      }),
      prisma.feedback.count({ where: { ...scopeWhere, redirected: true } }),
    ]);

    // Replied count joins the FeedbackReply table which may not exist on
    // environments where schema migration has not run yet. Fall back to 0
    // so the counts strip still renders instead of blanking the page.
    // `new` ("Yanıtsız") = feedback that needs a reply (§58): 1–3★, no reply,
    // a customer e-mail. It used to be `all - replied`, which also counted
    // high ratings and feedback without an e-mail — neither can get a reply.
    let replied = 0;
    let needsReply = 0;
    try {
      [replied, needsReply] = await prisma.$transaction([
        prisma.feedback.count({
          where: {
            ...baseWhere,
            replies: { some: {} },
          },
        }),
        prisma.feedback.count({ where: { ...baseWhere, ...NEEDS_REPLY } }),
      ]);
    } catch (err) {
      console.warn(
        '[feedback/counts] replied fallback — did schema migration run?',
        (err as Error).message,
      );
    }

    return NextResponse.json(
      {
        all,
        new: needsReply,
        attention,
        replied,
        lowUnread,
        redirects,
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

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
