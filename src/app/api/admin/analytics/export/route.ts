import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

function parseRange(range: string): Date | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : NaN;
  if (!Number.isFinite(days)) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '90d';
  const format = searchParams.get('format') || 'csv';

  if (format !== 'csv') {
    return NextResponse.json({ error: 'unsupported_format', hint: 'csv only' }, { status: 400 });
  }

  const scoped = await getScopedRestaurantIds(actor);
  const where: { createdAt?: { gte: Date }; restaurantId?: { in: string[] } } = {};

  const since = parseRange(range);
  if (since) where.createdAt = { gte: since };

  if (scoped !== null) {
    if (scoped.length === 0) {
      return emptyCsv(range);
    }
    where.restaurantId = { in: scoped };
  }

  const [restaurants, feedbacks] = await Promise.all([
    prisma.restaurant.findMany({
      where: scoped !== null ? { id: { in: scoped } } : {},
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
    prisma.feedback.findMany({
      where,
      select: {
        restaurantId: true,
        rating: true,
        platform: true,
        createdAt: true,
      },
      take: 50000,
    }),
  ]);

  type Row = {
    id: string;
    name: string;
    slug: string;
    total: number;
    sumRating: number;
    lowCount: number;
    highCount: number;
    perPlatform: Record<string, number>;
    lastFeedbackAt: Date | null;
  };

  const byRestaurant = new Map<string, Row>();
  for (const r of restaurants) {
    byRestaurant.set(r.id, {
      id: r.id,
      name: r.name,
      slug: r.slug,
      total: 0,
      sumRating: 0,
      lowCount: 0,
      highCount: 0,
      perPlatform: {},
      lastFeedbackAt: null,
    });
  }

  for (const f of feedbacks) {
    if (!f.restaurantId) continue;
    const row = byRestaurant.get(f.restaurantId);
    if (!row) continue;
    row.total += 1;
    row.sumRating += f.rating;
    if (f.rating <= 3) row.lowCount += 1;
    else row.highCount += 1;
    if (f.platform) {
      row.perPlatform[f.platform] = (row.perPlatform[f.platform] ?? 0) + 1;
    }
    if (!row.lastFeedbackAt || f.createdAt > row.lastFeedbackAt) {
      row.lastFeedbackAt = f.createdAt;
    }
  }

  const header = [
    'Restoran',
    'Slug',
    'Toplam Yorum',
    'Ortalama Puan',
    'Düşük Puan (≤3)',
    'Yüksek Puan (≥4)',
    'Google',
    'Yemeksepeti',
    'Getir',
    'Trendyol GO',
    'Son Yorum',
  ];

  const rows = Array.from(byRestaurant.values())
    .sort((a, b) => b.total - a.total)
    .map((r) => [
      csvEscape(r.name),
      csvEscape(r.slug),
      r.total,
      r.total ? (r.sumRating / r.total).toFixed(2) : '',
      r.lowCount,
      r.highCount,
      r.perPlatform['google'] ?? 0,
      r.perPlatform['yemeksepeti'] ?? 0,
      r.perPlatform['getir'] ?? 0,
      r.perPlatform['trendyol_go'] ?? 0,
      r.lastFeedbackAt ? r.lastFeedbackAt.toISOString() : '',
    ]);

  const csv =
    '﻿' +
    [header.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const scopeTag = scoped === null ? 'global' : 'scoped';
  const filename = `analytics-${scopeTag}-${range}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function emptyCsv(range: string) {
  const csv =
    '﻿' +
    'Restoran,Slug,Toplam Yorum,Ortalama Puan,Düşük Puan (≤3),Yüksek Puan (≥4),Google,Yemeksepeti,Getir,Trendyol GO,Son Yorum\n';
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="analytics-empty-${range}.csv"`,
    },
  });
}
