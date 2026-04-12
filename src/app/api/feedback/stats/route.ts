import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const totalCount = await prisma.feedback.count();
    
    // Low rating count (1-3 stars)
    const lowRatingCount = await prisma.feedback.count({
      where: { rating: { lte: 3 } }
    });

    // Today's ratings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.feedback.count({
      where: { createdAt: { gte: today } }
    });

    // Calculate average
    const aggregations = await prisma.feedback.aggregate({
      _avg: { rating: true }
    });
    const avgRating = aggregations._avg.rating?.toFixed(1) || '0.0';

    // Group by rating for distribution chart
    const distributionRaw = await prisma.feedback.groupBy({
      by: ['rating'],
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

    return NextResponse.json({
      totalCount,
      avgRating,
      lowRatingCount,
      todayCount,
      distribution
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'İstatistikler çekilemedi' }, { status: 500 });
  }
}
