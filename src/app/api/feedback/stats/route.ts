import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { SYSTEM_FEEDBACK } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const daysParam = req.nextUrl.searchParams.get('days');
    const restaurantIdParam = req.nextUrl.searchParams.get('restaurantId');
    const branchParam = req.nextUrl.searchParams.get('branch');
    const today = new Date();

    // Build base date filter (supports: today/1, month, numeric days, all)
    const dateFilter: any = {};
    if (daysParam === '1' || daysParam === 'today') {
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      dateFilter.createdAt = { gte: startOfToday };
    } else if (daysParam === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
      dateFilter.createdAt = { gte: firstOfMonth };
    } else if (daysParam && daysParam !== 'all') {
      const days = parseInt(daysParam);
      if (Number.isFinite(days) && days > 0) {
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - days);
        dateFilter.createdAt = { gte: pastDate };
      }
    }

    // Branch filter
    if (branchParam && branchParam !== 'all') {
      dateFilter.branch = branchParam;
    }

    // ─── IDOR Security Override ───
    if (actor.role === 'superadmin') {
      // superadmin — optionally filter to a specific restaurant
      if (restaurantIdParam && restaurantIdParam !== 'all') {
        dateFilter.restaurantId = restaurantIdParam;
      }
    } else if (actor.role === 'manager') {
      dateFilter.restaurantId = actor.restaurantId;
    } else if (actor.role === 'restaurant_owner') {
      const userRestIds = await getScopedRestaurantIds(actor) || [];

      if (restaurantIdParam && restaurantIdParam !== 'all') {
        if (!userRestIds.includes(restaurantIdParam)) {
          return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }
        dateFilter.restaurantId = restaurantIdParam;
      } else {
        dateFilter.restaurantId = { in: userRestIds };
      }
    } else {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    // Today filter
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Basic stats
    const totalCount = await prisma.feedback.count({ where: dateFilter });
    const todayCount = await prisma.feedback.count({ where: { ...dateFilter, createdAt: { gte: startOfToday } } });
    const lowRatingCount = await prisma.feedback.count({ where: { ...dateFilter, rating: { lte: 3 } } });
    const googleRedirectsCount = await prisma.feedback.count({
      where: { ...dateFilter, rating: { gte: 4 }, comment: SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT }
    });

    // ─── Google Review Conversion ───
    // A 4-5★ rating is a "conversion opportunity". We count it as actually
    // sent to Google only if the parent Restaurant has a googlePlaceId set
    // (otherwise /r/[slug] shows a thank-you page and no redirect happens).
    const highRatingCount = await prisma.feedback.count({
      where: { ...dateFilter, rating: { gte: 4 } },
    });
    const sentToGoogleCount = await prisma.feedback.count({
      where: {
        ...dateFilter,
        rating: { gte: 4 },
        restaurant: { googlePlaceId: { not: null } },
      },
    });
    const missedHighRatings = highRatingCount - sentToGoogleCount;
    const conversionRate = highRatingCount > 0
      ? parseFloat(((sentToGoogleCount / highRatingCount) * 100).toFixed(1))
      : null;

    // Per-restaurant breakdown — only useful when the caller is looking at
    // more than one restaurant. We still compute it always (≤ 3 quick
    // queries) so the frontend can decide whether to show the leaderboard.
    const isSingleRestaurant = typeof dateFilter.restaurantId === 'string';
    let byRestaurant: Array<{
      id: string;
      name: string;
      hasGoogleLink: boolean;
      highRatings: number;
      sentToGoogle: number;
      conversionRate: number | null;
    }> = [];

    if (!isSingleRestaurant) {
      // Build the groupBy where clause carefully: the dateFilter may already
      // contain a restaurantId scope (e.g. { in: [...] } for restaurant_owner).
      // We must NOT overwrite it with { not: null }.
      const groupByWhere: any = { ...dateFilter, rating: { gte: 4 } };
      if (!groupByWhere.restaurantId) {
        groupByWhere.restaurantId = { not: null };
      }
      const highByRest = await prisma.feedback.groupBy({
        by: ['restaurantId'],
        where: groupByWhere,
        _count: true,
      });

      if (highByRest.length > 0) {
        const rawIds = highByRest
          .map((r: any) => r.restaurantId as string | null)
          .filter((id): id is string => !!id);
        const restaurantIds = Array.from(new Set(rawIds));

        const restaurants = await prisma.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true, googlePlaceId: true },
        });

        const restMap = new Map(restaurants.map((r: any) => [r.id, r]));

        byRestaurant = highByRest
          .map((row: any) => {
            const rest = restMap.get(row.restaurantId);
            if (!rest) return null;
            const hasGoogleLink = !!rest.googlePlaceId;
            const sent = hasGoogleLink ? row._count : 0;
            const rate = row._count > 0
              ? parseFloat(((sent / row._count) * 100).toFixed(1))
              : null;
            return {
              id: rest.id,
              name: rest.name,
              hasGoogleLink,
              highRatings: row._count,
              sentToGoogle: sent,
              conversionRate: rate,
            };
          })
          .filter(Boolean) as typeof byRestaurant;

        // Sort: biggest opportunity first (highest highRatings, lowest rate)
        byRestaurant.sort((a, b) => b.highRatings - a.highRatings);
      }
    }

    const googleConversion = {
      totalResponses: totalCount,
      highRatings: highRatingCount,
      sentToGoogle: sentToGoogleCount,
      missedOpportunities: missedHighRatings,
      conversionRate,
      byRestaurant,
    };

    const aggregations = await prisma.feedback.aggregate({
      _avg: { rating: true },
      where: dateFilter
    });
    const avgRating = aggregations._avg.rating?.toFixed(1) || '0.0';

    // Aspect breakdown: Food / Service / Atmosphere averages + sample size.
    // Feedback rows where the respective aspect is null are automatically
    // excluded from the average and counted separately.
    const aspectAggs = await prisma.feedback.aggregate({
      _avg: {
        foodRating: true,
        serviceRating: true,
        atmosphereRating: true,
      },
      _count: {
        foodRating: true,
        serviceRating: true,
        atmosphereRating: true,
      },
      where: dateFilter,
    });

    const round1 = (n: number | null | undefined) =>
      n === null || n === undefined ? null : parseFloat(n.toFixed(1));

    const aspects = {
      food: {
        avg: round1(aspectAggs._avg.foodRating),
        count: aspectAggs._count.foodRating ?? 0,
      },
      service: {
        avg: round1(aspectAggs._avg.serviceRating),
        count: aspectAggs._count.serviceRating ?? 0,
      },
      atmosphere: {
        avg: round1(aspectAggs._avg.atmosphereRating),
        count: aspectAggs._count.atmosphereRating ?? 0,
      },
    };

    // Distribution
    const distributionRaw = await prisma.feedback.groupBy({
      by: ['rating'],
      where: dateFilter,
      _count: true,
      orderBy: { rating: 'desc' }
    });
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distributionRaw.forEach((item: any) => {
      distribution[item.rating] = item._count;
    });

    // Weekly trend (last 7 days) - Scan counts + Avg Rating
    const trends: { date: string; count: number; avgRating: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

      const trendFilter: any = { ...dateFilter, createdAt: { gte: start, lt: end } };
      
      const [count, aggregations] = await Promise.all([
        prisma.feedback.count({ where: trendFilter }),
        prisma.feedback.aggregate({
          _avg: { rating: true },
          where: trendFilter
        })
      ]);

      trends.push({
        date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        count,
        avgRating: parseFloat(aggregations._avg.rating?.toFixed(1) || '0')
      });
    }

    // Day of week distribution (Pzt, Sal, ...) - Limit to last 2000 for performance
    const dayDistributionRaw = await prisma.feedback.findMany({
      where: dateFilter,
      select: { createdAt: true },
      take: 2000,
      orderBy: { createdAt: 'desc' }
    });

    const daysMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    dayDistributionRaw.forEach((f: any) => {
      const day = f.createdAt.getDay(); // 0 is Sunday, 1 is Monday...
      daysMap[day] = (daysMap[day] || 0) + 1;
    });

    const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const dayDistribution = [1, 2, 3, 4, 5, 6, 0].map(d => ({
      name: dayLabels[d],
      count: daysMap[d]
    }));

    // Word Cloud - Sample last 1000 comments for performance
    const allComments = await prisma.feedback.findMany({
      where: { ...dateFilter, comment: { not: '' } },
      select: { comment: true },
      take: 1000,
      orderBy: { createdAt: 'desc' }
    });

    const stopWords = new Set([
      'bir', 've', 'iyi', 'çok', 'için', 'bu', 'da', 'de', 'ile', 'ama', 'fakat',
      'daha', 'güzel', 'teşekkürler', 'teşekkür', 'harika', 'gerçekten', 'kadar',
      'gibi', 'en', 'ise', 'olarak', 'var', 'yok', 'mı', 'mi', 'mu', 'mü',
      'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'bana', 'bizi', 'her', 'hiç',
      ...SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT.toLowerCase().split(' ')
    ]);

    const wordCounts: Record<string, number> = {};
    allComments.forEach((fb: any) => {
      if (!fb.comment) return;
      const cleanString = fb.comment.toLowerCase().replace(/[^a-zçğıöşü\s]/g, ' ');
      const words = cleanString.split(/\s+/);
      words.forEach((word: string) => {
        if (word.length > 2 && !stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    const wordCloud = Object.entries(wordCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30);

    // Platform distribution (with avg rating per platform)
    const platformGroupRaw = await prisma.feedback.groupBy({
      by: ['platform'],
      where: dateFilter,
      _count: true,
      _avg: { rating: true },
    });

    const platformLabels: Record<string, string> = {
      google: 'Google',
      yemeksepeti: 'Yemeksepeti',
      getir: 'Getir',
      trendyol_go: 'Trendyol GO',
    };

    const platformDistribution = platformGroupRaw.map((row: any) => ({
      platform: row.platform || 'google',
      label: row.platform ? (platformLabels[row.platform] || row.platform) : 'Google',
      count: row._count,
      avgRating: round1(row._avg?.rating),
    }));



    return NextResponse.json({
      totalCount,
      todayCount,
      avgRating,
      lowRatingCount,
      googleRedirectsCount,
      distribution,
      trends, // Detailed trend (count + rating)
      dayDistribution, // Distribution by day of week
      wordCloud,
      aspects, // Food / Service / Atmosphere breakdown
      googleConversion, // Google review conversion funnel + per-restaurant breakdown
      platformDistribution, // Platform-based review counts
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'İstatistikler çekilemedi' }, { status: 500 });
  }
}
