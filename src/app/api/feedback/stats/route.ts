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
    const daysParam = req.nextUrl.searchParams.get('days');
    const restaurantIdParam = req.nextUrl.searchParams.get('restaurantId');
    const today = new Date();

    // Build base date filter
    const dateFilter: any = {};
    if (daysParam && daysParam !== 'all') {
      const days = parseInt(daysParam);
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - days);
      dateFilter.createdAt = { gte: pastDate };
    }

    // ─── IDOR Security Override ───
    if (actor.role === 'manager') {
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
    } else if (restaurantIdParam && restaurantIdParam !== 'all') {
      // superadmin with specific restaurant selected
      dateFilter.restaurantId = restaurantIdParam;
    }

    // Today filter
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Basic stats
    const totalCount = await prisma.feedback.count({ where: dateFilter });
    const todayCount = await prisma.feedback.count({ where: { ...dateFilter, createdAt: { gte: startOfToday } } });
    const lowRatingCount = await prisma.feedback.count({ where: { ...dateFilter, rating: { lte: 3 } } });
    const googleRedirectsCount = await prisma.feedback.count({
      where: { ...dateFilter, rating: { gte: 4 }, comment: 'High Rating Redirect' }
    });

    const aggregations = await prisma.feedback.aggregate({
      _avg: { rating: true },
      where: dateFilter
    });
    const avgRating = aggregations._avg.rating?.toFixed(1) || '0.0';

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

    // Day of week distribution (Pzt, Sal, ...)
    const dayDistributionRaw = await prisma.feedback.findMany({
      where: dateFilter,
      select: { createdAt: true }
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

    // Word Cloud
    const allComments = await prisma.feedback.findMany({
      where: { ...dateFilter, comment: { not: '' } },
      select: { comment: true }
    });

    const stopWords = new Set([
      'bir', 've', 'iyi', 'çok', 'için', 'bu', 'da', 'de', 'ile', 'ama', 'fakat',
      'daha', 'güzel', 'teşekkürler', 'teşekkür', 'harika', 'gerçekten', 'kadar',
      'gibi', 'en', 'ise', 'olarak', 'var', 'yok', 'mı', 'mi', 'mu', 'mü',
      'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'bana', 'bizi', 'her', 'hiç',
      'high', 'rating', 'redirect'
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

    return NextResponse.json({
      totalCount,
      todayCount,
      avgRating,
      lowRatingCount,
      googleRedirectsCount,
      distribution,
      trends, // Detailed trend (count + rating)
      dayDistribution, // Distribution by day of week
      wordCloud
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'İstatistikler çekilemedi' }, { status: 500 });
  }
}
