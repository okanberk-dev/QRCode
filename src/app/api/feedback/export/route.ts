import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { SYSTEM_FEEDBACK } from '@/lib/constants';
import { csvCell } from '@/lib/csv-safe';

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
    const kvkkFilter = searchParams.get('kvkk');
    const searchParam = (searchParams.get('search') || '').trim();
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const where: Prisma.FeedbackWhereInput = {};

    // KVKK filter
    if (kvkkFilter === 'true') {
      where.hasKvkkConsent = true;
    } else if (kvkkFilter === 'false') {
      where.hasKvkkConsent = false;
    }

    // ─── IDOR Security Override ───
    if (actor.role === 'superadmin') {
      if (restaurantId && restaurantId !== 'all') {
        where.restaurantId = restaurantId;
      }
    } else if (actor.role === 'manager') {
      // A manager with no restaurant would leave the filter undefined and
      // read every tenant; pin to an id that cannot match instead.
      where.restaurantId = actor.restaurantId ?? '__no_restaurant__';
    // `team_member` (davet edilen ekip üyesi) owner ile aynı dalda scope'lanır:
    // getScopedRestaurantIds -> getTeamMemberScope zaten SADECE TeamMember.locations
    // listesini döner (owner pasifse boş). Scope genişlemesi yok; eksik olan sadece
    // bu dalın team_member'ı kapsamamasıydı -> davetli kullanici gelen kutusunda 403
    // aliyordu (/api/feedback/counts zaten generic helper'i kullaniyordu -> sayaclar
    // dolu, liste bos = kirik cekirdek akis).
    } else if (actor.role === 'restaurant_owner' || actor.role === 'team_member') {
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
    const createdAtBase: Prisma.DateTimeFilter =
      where.createdAt && typeof where.createdAt === 'object' && !(where.createdAt instanceof Date)
        ? (where.createdAt as Prisma.DateTimeFilter)
        : {};
    if (daysParam === 'today' || daysParam === '1') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.createdAt = { ...createdAtBase, gte: today };
    } else if (daysParam === 'month') {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      where.createdAt = { ...createdAtBase, gte: firstOfMonth };
    } else if (daysParam && daysParam !== 'all') {
      const days = parseInt(daysParam);
      if (Number.isFinite(days) && days > 0) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - days);
        where.createdAt = { ...createdAtBase, gte: pastDate };
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
      take: 10000,
      include: {
        restaurant: {
          select: { name: true, slug: true }
        }
      }
    });

    // Generate CSV with Platform, Kaynak and KVKK columns
    const header = ['ID', 'Tarih', 'Puan', 'KVKK Onayı', 'Platform', 'Kaynak', 'Yorum', 'Restoran', 'Şube', 'Masa No'];
    // Formula-injection safe (src/lib/csv-safe.ts) — same quoting as before.
    const esc = (v: string) => csvCell(v);
    const rows = feedbacks.map((f) => [
      f.id,
      f.createdAt.toISOString(),
      f.rating.toString(),
      f.hasKvkkConsent ? 'Onaylı' : 'Onaylanmamış',
      esc(f.platform ? (PLATFORM_LABELS[f.platform] || f.platform) : ''),
      esc(f.source || ''),
      esc(f.comment && f.comment !== SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT ? f.comment : ''),
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
