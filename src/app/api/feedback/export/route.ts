import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req) as any;
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const restaurantId = req.nextUrl.searchParams.get('restaurantId');
    const where: any = {};

    // ─── IDOR Security Override ───
    if (admin.role === 'manager') {
      where.restaurantId = admin.restaurantId;
    } else if (admin.role === 'restaurant_owner') {
      const userRestaurants = await prisma.restaurant.findMany({
        where: { userId: admin.id },
        select: { id: true }
      });
      const userRestIds = userRestaurants.map((r: any) => r.id);

      if (restaurantId && restaurantId !== 'all') {
        if (!userRestIds.includes(restaurantId)) {
          return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }
        where.restaurantId = restaurantId;
      } else {
        where.restaurantId = { in: userRestIds };
      }
    } else if (restaurantId && restaurantId !== 'all') {
      where.restaurantId = restaurantId;
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: {
          select: { name: true, slug: true }
        }
      }
    });

    // Generate CSV (no personal data collected, so minimal columns)
    const header = ['ID', 'Tarih', 'Puan', 'Yorum', 'Restoran', 'Şube', 'Masa No'];
    const rows = feedbacks.map((f: any) => [
      f.id,
      f.createdAt.toISOString(),
      f.rating.toString(),
      `"${(f.comment && f.comment !== 'High Rating Redirect' ? f.comment : '').replace(/"/g, '""')}"`,
      `"${(f.restaurant?.name || '').replace(/"/g, '""')}"`,
      `"${(f.branch || '').replace(/"/g, '""')}"`,
      `"${(f.tableNumber || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\ufeff' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
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
