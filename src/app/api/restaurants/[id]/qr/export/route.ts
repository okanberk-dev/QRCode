import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { csvCell } from '@/lib/csv-safe';

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Masaya Servis',
  takeout: 'Gel-Al',
  delivery: 'Paket Servis',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const hasAccess = await canAccessRestaurant(actor, id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const history = await prisma.qrGeneration.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        restaurant: {
          select: { name: true }
        }
      }
    });

    const header = ['ID', 'Tarih', 'İşletme', 'QR etiketi', 'Platform', 'Servis Tipi', 'Hedef URL'];
    // Formula-injection safe (src/lib/csv-safe.ts) — same quoting as before.
    const esc = (v: string) => csvCell(v);
    
    const rows = history.map((record) => [
      record.id,
      record.createdAt.toISOString(),
      esc(record.restaurant?.name || ''),
      esc(record.tableNumber || '-'),
      esc(record.platform ? (PLATFORM_LABELS[record.platform] || record.platform) : 'Varsayılan'),
      esc(record.serviceType ? (SERVICE_TYPE_LABELS[record.serviceType] || record.serviceType) : '-'),
      esc(record.qrUrl || '')
    ]);

    const csvContent = '﻿' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `qr-gecmisi-${id}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Failed to export QR CSV:', error);
    return NextResponse.json({ error: 'Dışa aktarma başarısız' }, { status: 500 });
  }
}
