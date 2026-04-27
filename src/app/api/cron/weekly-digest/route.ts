import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWeeklyDigest } from '@/lib/email';

/**
 * Weekly digest cron endpoint.
 *
 * Meant to be called by Vercel Cron (or any external scheduler) once per week.
 * Iterates over all active restaurants that have a notificationEmail (or whose
 * owner has an email) and sends a summary of the past 7 days.
 *
 * Security: protected by CRON_SECRET header to prevent unauthorized triggers.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret. CRON_SECRET must be configured — otherwise the
  // endpoint refuses every request to avoid an open public trigger.
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all active restaurants with an email target
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        notificationEmail: true,
        googlePlaceId: true,
        user: { select: { email: true, locale: true } },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const rest of restaurants) {
      const email = rest.notificationEmail || rest.user?.email;
      if (!email) {
        skipped++;
        continue;
      }

      // Gather stats for this restaurant over the past 7 days
      const where = {
        restaurantId: rest.id,
        createdAt: { gte: sevenDaysAgo },
      };

      const [total, avgAgg, distribution, highRatings, aspectAggs] = await Promise.all([
        prisma.feedback.count({ where }),
        prisma.feedback.aggregate({ _avg: { rating: true }, where }),
        prisma.feedback.groupBy({
          by: ['rating'],
          where,
          _count: true,
          orderBy: { rating: 'desc' },
        }),
        prisma.feedback.count({ where: { ...where, rating: { gte: 4 } } }),
        prisma.feedback.aggregate({
          _avg: { foodRating: true, serviceRating: true, atmosphereRating: true },
          where,
        }),
      ]);

      // Skip restaurants with zero feedback this week
      if (total === 0) {
        skipped++;
        continue;
      }

      const avgRating = avgAgg._avg.rating
        ? parseFloat(avgAgg._avg.rating.toFixed(1))
        : 0;

      const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      distribution.forEach((row: any) => {
        dist[row.rating] = row._count;
      });

      const lowRatings = (dist[1] || 0) + (dist[2] || 0) + (dist[3] || 0);

      const sentToGoogle = rest.googlePlaceId ? highRatings : 0;
      const conversionRate = highRatings > 0
        ? parseFloat(((sentToGoogle / highRatings) * 100).toFixed(0))
        : null;

      const round1 = (n: number | null | undefined) =>
        n == null ? null : parseFloat(n.toFixed(1));

      const locale = rest.user?.locale === 'en' ? 'en' : 'tr';

      await sendWeeklyDigest({
        to: email,
        locale,
        restaurantName: rest.name,
        period: {
          from: sevenDaysAgo,
          to: new Date(),
        },
        stats: {
          total,
          avgRating,
          highRatings,
          lowRatings,
          distribution: dist,
          conversionRate,
          aspects: {
            food: round1(aspectAggs._avg.foodRating),
            service: round1(aspectAggs._avg.serviceRating),
            atmosphere: round1(aspectAggs._avg.atmosphereRating),
          },
        },
      });

      sent++;
    }

    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      total: restaurants.length,
    });
  } catch (error) {
    console.error('[WEEKLY_DIGEST]', error);
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 });
  }
}
