import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { csvCell } from '@/lib/csv-safe';

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
};

function parseRange(range: string): Date | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : NaN;
  if (!Number.isFinite(days)) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function csvEscape(value: string | number | null | undefined) {
  // Formula-injection safe (src/lib/csv-safe.ts) — same quoting as before.
  return csvCell(value);
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const format = req.nextUrl.searchParams.get('format') || 'csv';
  if (format !== 'csv') {
    return NextResponse.json({ error: 'unsupported_format', hint: 'csv only' }, { status: 400 });
  }

  const range = req.nextUrl.searchParams.get('range') || '90d';
  const restaurantId = req.nextUrl.searchParams.get('restaurantId');
  const scoped = await getScopedRestaurantIds(actor);

  const where: {
    createdAt?: { gte: Date };
    restaurantId?: string | { in: string[] };
  } = {};

  const since = parseRange(range);
  if (since) where.createdAt = { gte: since };

  if (scoped !== null) {
    if (scoped.length === 0) return csvResponse([], range);
    if (restaurantId && restaurantId !== 'all') {
      if (!scoped.includes(restaurantId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      where.restaurantId = restaurantId;
    } else {
      where.restaurantId = { in: scoped };
    }
  } else if (restaurantId && restaurantId !== 'all') {
    where.restaurantId = restaurantId;
  }

  const feedbacks = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50000,
    select: {
      id: true,
      rating: true,
      platform: true,
      branch: true,
      tableNumber: true,
      createdAt: true,
      restaurant: { select: { name: true, slug: true } },
    },
  });

  const rows = feedbacks.map((f) => [
    f.createdAt.toISOString(),
    f.restaurant?.name ?? '',
    f.restaurant?.slug ?? '',
    f.rating,
    f.platform ? PLATFORM_LABELS[f.platform] ?? f.platform : '',
    f.branch ?? '',
    f.tableNumber ?? '',
  ]);

  return csvResponse(rows, range);
}

function csvResponse(rows: Array<Array<string | number>>, range: string) {
  const header = ['Tarih', 'Restoran', 'Slug', 'Puan', 'Platform', 'Şube', 'Masa'];
  const csv = '﻿' + [header.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
  const filename = `buaze-analytics-${range}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
