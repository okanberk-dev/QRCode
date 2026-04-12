import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const daysParam = req.nextUrl.searchParams.get('days');
    const today = new Date();
    
    // Build date filter
    let dateFilter: any = {};
    if (daysParam && daysParam !== 'all') {
      const days = parseInt(daysParam);
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - days);
      dateFilter = {
        createdAt: {
          gte: pastDate
        }
      };
    }

    // Today filter
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Basic stats
    const totalCount = await prisma.feedback.count({ where: dateFilter });
    
    const todayCount = await prisma.feedback.count({
      where: {
        ...dateFilter,
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    const aggregations = await prisma.feedback.aggregate({
      _avg: { rating: true },
      where: dateFilter
    });

    const avgRating = aggregations._avg.rating?.toFixed(1) || '0.0';

    // Group by rating for distribution chart
    const distributionRaw = await prisma.feedback.groupBy({
      by: ['rating'],
      where: dateFilter,
      _count: true,
      orderBy: { rating: 'desc' }
    });
    
    // Map distribution to ensure 1-5 keys exist
    const distribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0,
    };
    distributionRaw.forEach((item) => {
      distribution[item.rating as keyof typeof distribution] = item._count;
    });

    // --- WORD CLOUD LOGIC ---
    const allComments = await prisma.feedback.findMany({
      where: {
        ...dateFilter,
        comment: { not: '' }
      },
      select: { comment: true }
    });

    const stopWords = new Set([
      'bir', 've', 'iyi', 'çok', 'için', 'bu', 'da', 'de', 'ile', 'ama', 'fakat', 
      'daha', 'güzel', 'teşekkürler', 'teşekkür', 'harika', 'gerçekten', 'kadar',
      'gibi', 'en', 'ise', 'olarak', 'var', 'yok', 'mı', 'mi', 'mu', 'mü',
      'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'bana', 'bizi', 'her', 'hiç'
    ]);

    const wordCounts: Record<string, number> = {};
    allComments.forEach(fb => {
      if (!fb.comment) return;
      const cleanString = fb.comment.toLowerCase().replace(/[^a-zçğıöşü\s]/g, ' ');
      const words = cleanString.split(/\s+/);
      words.forEach(word => {
        if (word.length > 2 && !stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    const wordCloud = Object.entries(wordCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30); // Top 30 words

    return NextResponse.json({
      totalCount,
      todayCount,
      avgRating,
      distribution,
      wordCloud
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'İstatistikler çekilemedi' }, { status: 500 });
  }
}
