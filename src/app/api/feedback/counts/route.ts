// SCAFFOLDED: Tab counts for the reviews inbox (Hepsi / Yeni / Dikkat /
// Yanıtlandı). Currently the feedbacks page derives these client-side
// from the list. Once wired with aggregated queries this endpoint
// should return the tuple below so the UI can render counts before
// the list loads.
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const actor = await getPanelActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0 });
    }
    const restaurantIds = await getScopedRestaurantIds(actor);
    if (!restaurantIds || restaurantIds.length === 0) {
      return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0 });
    }
    const baseWhere = { restaurantId: { in: restaurantIds } };
    const [all, attention] = await Promise.all([
      prisma.feedback.count({ where: baseWhere }),
      prisma.feedback.count({ where: { ...baseWhere, rating: { lte: 2 } } }),
    ]);
    // `new` (unreplied) + `replied` require FeedbackReply table.
    // Until wired, expose attention as the single actionable bucket.
    return NextResponse.json({
      all,
      new: all, // placeholder until FeedbackReply exists
      attention,
      replied: 0,
    });
  } catch (error) {
    console.error('[feedback/counts]', error);
    return NextResponse.json({ all: 0, new: 0, attention: 0, replied: 0 });
  }
}
