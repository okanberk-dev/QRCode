import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/overview
 *
 * Hesap özet metrikleri — Hesabım sayfasındaki <AccountOverviewCard>
 * component'i tüketir. Owner workspace scope'unda:
 *   - createdAt, plan, trialEndsAt, locale (User row)
 *   - restaurantsActive: kullanıcının aktif işletme sayısı
 *   - totalReviews: tüm zamanlar yorum sayısı (workspace scope)
 *   - reviews30d / reviews7d: son periyot
 *   - repliesAll / replies30d: yanıt sayısı
 *
 * Workspace owner scope: restaurantId IN (user'ın restoranları). Team member
 * için role-based scoping ileriye bırakıldı (şu an sadece owner çağırıyor).
 */
export async function GET(req: NextRequest) {
  try {
    // §38.189 / §37.2.A / §40.4.A — session-aware auth: getUserFromRequest runs
    // the UserSession revoke check, so a logged-out / password-reset session is
    // rejected here (bare verifyJwt would accept it until JWT 7-day expiry).
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const userId = auth.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        trialEndsAt: true,
        createdAt: true,
        locale: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const restaurants = await prisma.restaurant.findMany({
      where: { userId, isActive: true },
      select: { id: true },
    });
    const restaurantIds = restaurants.map((r) => r.id);

    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * day);
    const sevenDaysAgo = new Date(now.getTime() - 7 * day);

    // Stage 87 §38.167 — owner workspace overview; private cache 30s
    // fresh + 2dk SWR (KPI compute, mutation periyodik). §38.100 paterni
    // reuse.
    const cacheHeaders = {
      'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
    };

    if (restaurantIds.length === 0) {
      return NextResponse.json(
        {
          ...user,
          restaurantsActive: 0,
          totalReviews: 0,
          reviews30d: 0,
          reviews7d: 0,
          repliesAll: 0,
          replies30d: 0,
        },
        { headers: cacheHeaders },
      );
    }

    // §40.1 connection_limit=1 — batch reads via $transaction (single pipelined
    // round-trip) instead of Promise.all (5 queries queue on the one pooled
    // connection). feedbackReply counts stay in a SEPARATE guarded transaction
    // so a lagging join table in a preview deploy degrades to 0 (§19 3-tier
    // resilience) without zeroing the feedback counts.
    const [totalReviews, reviews30d, reviews7d] = await prisma.$transaction([
      prisma.feedback.count({ where: { restaurantId: { in: restaurantIds } } }),
      prisma.feedback.count({
        where: { restaurantId: { in: restaurantIds }, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.feedback.count({
        where: { restaurantId: { in: restaurantIds }, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    let repliesAll = 0;
    let replies30d = 0;
    try {
      [repliesAll, replies30d] = await prisma.$transaction([
        prisma.feedbackReply.count({ where: { feedback: { restaurantId: { in: restaurantIds } } } }),
        prisma.feedbackReply.count({
          where: {
            feedback: { restaurantId: { in: restaurantIds } },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);
    } catch {
      repliesAll = 0;
      replies30d = 0;
    }

    return NextResponse.json(
      {
        ...user,
        restaurantsActive: restaurantIds.length,
        totalReviews,
        reviews30d,
        reviews7d,
        repliesAll,
        replies30d,
      },
      { headers: cacheHeaders },
    );
  } catch (error) {
    console.error('[USER_OVERVIEW]', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
