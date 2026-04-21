import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
};

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const restaurantId = searchParams.get('restaurantId');
    const daysParam = searchParams.get('days');
    const platformFilter = searchParams.get('platform');
    const ratingFilter = searchParams.get('rating');
    const branchFilter = searchParams.get('branch');
    const searchParam = (searchParams.get('search') || '').trim();
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    // ─── IDOR Security Override ───
    if (actor.role === 'superadmin') {
      if (restaurantId && restaurantId !== 'all') {
        where.restaurantId = restaurantId;
      }
    } else if (actor.role === 'manager') {
      where.restaurantId = actor.restaurantId;
    } else if (actor.role === 'restaurant_owner') {
      const userRestIds = await getScopedRestaurantIds(actor) || [];

      if (restaurantId && restaurantId !== 'all') {
        if (!userRestIds.includes(restaurantId)) {
          return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }
        where.restaurantId = restaurantId;
      } else {
        where.restaurantId = { in: userRestIds };
      }
    } else {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    // Date filter
    if (daysParam === 'today' || daysParam === '1') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.createdAt = { ...where.createdAt, gte: today };
    } else if (daysParam === 'month') {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      where.createdAt = { ...where.createdAt, gte: firstOfMonth };
    } else if (daysParam && daysParam !== 'all') {
      const days = parseInt(daysParam);
      if (Number.isFinite(days) && days > 0) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - days);
        where.createdAt = { ...where.createdAt, gte: pastDate };
      }
    }

    // Rating filter
    if (ratingFilter === 'low') {
      where.rating = { lte: 3 };
    } else if (ratingFilter === 'positive') {
      where.rating = { gte: 4 };
    } else if (ratingFilter && ratingFilter !== 'all') {
      const r = parseInt(ratingFilter, 10);
      if (Number.isFinite(r)) where.rating = r;
    }

    // Platform filter
    if (platformFilter && platformFilter !== 'all') {
      where.platform = platformFilter;
    }

    // Branch filter
    if (branchFilter && branchFilter !== 'all') {
      where.branch = branchFilter;
    }

    // Search filter
    if (searchParam) {
      where.OR = [
        { comment: { contains: searchParam, mode: 'insensitive' } },
        { name: { contains: searchParam, mode: 'insensitive' } },
      ];
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      include: {
        restaurant: {
          select: { name: true, slug: true }
        }
      }
    });

    // Generate CSV with Platform and Kaynak columns
    const header = ['ID', 'Tarih', 'Puan', 'Platform', 'Kaynak', 'Yorum', 'Restoran', 'Şube', 'Masa No'];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = feedbacks.map((f: any) => [
      f.id,
      f.createdAt.toISOString(),
      f.rating.toString(),
      esc(f.platform ? (PLATFORM_LABELS[f.platform] || f.platform) : ''),
      esc(f.source || ''),
      esc(f.comment && f.comment !== 'High Rating Redirect' ? f.comment : ''),
      esc(f.restaurant?.name || ''),
      esc(f.branch || ''),
      esc(f.tableNumber || ''),
    ]);

    const csvContent = '﻿' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = restaurantId && restaurantId !== 'all'
      ? `degerlendirmeler-${restaurantId}-${new Date().toISOString().split('T')[0]}.csv`
      : `degerlendirmeler-tumu-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Failed to export CSV:', error);
    return NextResponse.json({ error: 'Dışa aktarma başarısız' }, { status: 500 });
  }
}
