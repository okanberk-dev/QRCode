import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { PLATFORMS, type PlatformId } from '@/components/ui';
import { neutralizeCsvFormula } from '@/lib/csv-safe';

// §38.50 — Owner-scoped Analytics CSV export. Tasarımdaki "Rapor al" CTA bu
// endpoint'i çağırır. URL params analytics page ile aynı (range/platform/
// branch/restaurantId/customStart/customEnd).
//
// CLAUDE.md §28 — IDOR (getPanelActorFromRequest + getScopedRestaurantIds)
// + UTF-8 BOM (Excel TR-safe).

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

function parseCustomRange(
  customStart: string | null,
  customEnd: string | null,
): { start: Date; end: Date } | null {
  if (!customStart || !customEnd) return null;
  const startMs = Date.parse(customStart);
  const endMs = Date.parse(customEnd);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  if (endMs <= startMs) return null;
  const days = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
  if (days < 1 || days > 365) return null;
  // End date is inclusive, same window as the analytics page: reviews left
  // on the last day belong in the export too.
  return { start: new Date(startMs), end: new Date(endMs + 24 * 60 * 60 * 1000 - 1) };
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  // Formula-injection guard (src/lib/csv-safe.ts); real numbers untouched.
  const str = typeof value === 'number' ? String(value) : neutralizeCsvFormula(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function platformLabel(p: string | null): string {
  if (!p) return 'Buaze QR';
  const known = PLATFORMS[p as PlatformId];
  if (known) return known.label;
  return p;
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Owner only — admin'in analytics export'u ayrı (admin/customers/export var).
  if (actor.source !== 'user') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // §38.78 — Rate limit (CLAUDE.md §14.2 paterni). CSV export 10K row HARD_LIMIT
  // taşır; per-actor 5/dk gate DDoS amplification + DB/CPU exhaust koruması.
  // IDOR (getScopedRestaurantIds) hâlâ ana savunma; rate limit ikinci kat.
  const limit = await rateLimit(`analytics-export:${actor.id}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
  }

  const scopedIds = await getScopedRestaurantIds(actor);
  if (!scopedIds || scopedIds.length === 0) {
    // Boş scope — empty CSV header dön.
    const empty = '﻿Tarih,Restoran,Şube,Platform,Puan,Yemek,Servis,Atmosfer,Yorum,Yanıt durumu,Yanıt süresi (saat),KVKK,Pazarlama,Müşteri\n';
    return new NextResponse(empty, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-export-empty.csv"`,
      },
    });
  }

  const url = new URL(req.url);
  const range = url.searchParams.get('range') ?? '30d';
  const platformFilter = url.searchParams.get('platform');
  const branchFilter = url.searchParams.get('branch');
  const restaurantIdFilter = url.searchParams.get('restaurantId');
  const customStart = url.searchParams.get('customStart');
  const customEnd = url.searchParams.get('customEnd');

  // Range parse (analytics page ile aynı semantic)
  const customRange = range === 'custom' ? parseCustomRange(customStart, customEnd) : null;
  const windowDays = customRange
    ? Math.round((customRange.end.getTime() - customRange.start.getTime()) / (24 * 60 * 60 * 1000))
    : RANGE_DAYS[range] ?? 30;
  const windowStart = customRange
    ? customRange.start
    : new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const windowEnd = customRange ? customRange.end : new Date();

  // Restaurant scope filter
  const targetIds =
    restaurantIdFilter && restaurantIdFilter !== 'all' && scopedIds.includes(restaurantIdFilter)
      ? [restaurantIdFilter]
      : scopedIds;

  // Cap: 10000 row max — DDoS koruma (1y × 50 owner × ortalama 50 yorum/gün = 90K).
  // Owner export için 10K (~tam bir yıllık iyi restoran) kabul edilir.
  const HARD_LIMIT = 10000;

  const feedbacks = await prisma.feedback.findMany({
    where: {
      restaurantId: { in: targetIds },
      createdAt: { gte: windowStart, lte: windowEnd },
      ...(platformFilter && platformFilter !== 'all' ? { platform: platformFilter } : {}),
      ...(branchFilter && branchFilter !== 'all' ? { branch: branchFilter } : {}),
    },
    select: {
      id: true,
      createdAt: true,
      rating: true,
      platform: true,
      branch: true,
      comment: true,
      foodRating: true,
      serviceRating: true,
      atmosphereRating: true,
      email: true,
      phone: true,
      hasKvkkConsent: true,
      hasMarketingConsent: true,
      restaurantId: true,
      restaurant: { select: { name: true } },
      replies: {
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: HARD_LIMIT,
  });

  // CSV build
  // Column names follow the panel language (`?locale=en`).
  const isEn = url.searchParams.get('locale') === 'en';
  const headers = isEn
    ? ['Date', 'Business', 'Branch', 'Platform', 'Rating', 'Food', 'Service', 'Atmosphere', 'Comment', 'Reply status', 'Reply time (hours)', 'KVKK', 'Marketing', 'Customer']
    : [
    'Tarih',
    'Restoran',
    'Şube',
    'Platform',
    'Puan',
    'Yemek',
    'Servis',
    'Atmosfer',
    'Yorum',
    'Yanıt durumu',
    'Yanıt süresi (saat)',
    'KVKK',
    'Pazarlama',
    'Müşteri',
  ];
  const lines: string[] = [headers.join(',')];

  for (const f of feedbacks) {
    const reply = f.replies[0];
    const replyStatus = reply ? (isEn ? 'Replied' : 'Yanıtlandı') : isEn ? 'Waiting' : 'Bekliyor';
    const responseHours = reply
      ? Math.round(((reply.createdAt.getTime() - f.createdAt.getTime()) / 3600000) * 10) / 10
      : '';
    // Müşteri label — KVKK consent var + identifier varsa göster.
    const customerLabel = (() => {
      if (!f.hasKvkkConsent) return '';
      if (f.email) return f.email;
      if (f.phone) return f.phone;
      return '';
    })();

    const row = [
      csvEscape(f.createdAt.toISOString()),
      csvEscape(f.restaurant?.name ?? ''),
      csvEscape(f.branch ?? ''),
      csvEscape(platformLabel(f.platform)),
      csvEscape(f.rating ?? ''),
      csvEscape(f.foodRating ?? ''),
      csvEscape(f.serviceRating ?? ''),
      csvEscape(f.atmosphereRating ?? ''),
      csvEscape(f.comment ?? ''),
      csvEscape(replyStatus),
      csvEscape(responseHours),
      csvEscape(f.hasKvkkConsent ? (isEn ? 'Yes' : 'Evet') : isEn ? 'No' : 'Hayır'),
      csvEscape(f.hasMarketingConsent ? (isEn ? 'Yes' : 'Evet') : isEn ? 'No' : 'Hayır'),
      csvEscape(customerLabel),
    ];
    lines.push(row.join(','));
  }

  const csv = '﻿' + lines.join('\n') + '\n'; // UTF-8 BOM

  // Filename — range info dahil
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customRange
    ? `analytics-${customStart}_${customEnd}.csv`
    : `analytics-${range}-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
