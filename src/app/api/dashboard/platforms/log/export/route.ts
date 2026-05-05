import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { PROVIDER_LABELS } from '@/lib/integration-domains';

// §38.52 — Workspace-level Platform Bağlantı Log'u CSV export. Tasarım kaynağı:
// .design-owner-2026/page-platforms.jsx PageHeader actions "Bağlantı log'u"
// (Download icon, ghost button).
//
// PlatformLinkCheck workspace aggregate son 90 gün (HARD_LIMIT 5000).
// 8 sütun: Tarih / Restoran / Platform / Status / HTTP / Latency / Error / URL.
// UTF-8 BOM Excel TR-safe. Owner-scoped IDOR (CLAUDE.md §28).

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HARD_LIMIT = 5000;
const HISTORY_DAYS = 90;

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function platformLabel(provider: string): string {
  return (PROVIDER_LABELS as Record<string, string>)[provider] ?? provider;
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // Owner only — admin için ayrı endpoint açılabilir (gelecek scope).
  if (actor.source !== 'user') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const scopedIds = await getScopedRestaurantIds(actor);
  if (!scopedIds || scopedIds.length === 0) {
    const empty = '﻿Tarih,Restoran,Platform,Status,HTTP,Latency,Error,URL\n';
    return new NextResponse(empty, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="platform-log-empty.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);

  const checks = await prisma.platformLinkCheck.findMany({
    where: {
      restaurantId: { in: scopedIds },
      checkedAt: { gte: since },
    },
    select: {
      checkedAt: true,
      provider: true,
      ok: true,
      statusCode: true,
      latencyMs: true,
      error: true,
      url: true,
      restaurant: { select: { name: true } },
    },
    orderBy: { checkedAt: 'desc' },
    take: HARD_LIMIT,
  });

  const headers = [
    'Tarih',
    'Restoran',
    'Platform',
    'Status',
    'HTTP',
    'Latency (ms)',
    'Error',
    'URL',
  ];
  const lines: string[] = [headers.join(',')];

  for (const c of checks) {
    const row = [
      csvEscape(c.checkedAt.toISOString()),
      csvEscape(c.restaurant?.name ?? ''),
      csvEscape(platformLabel(c.provider)),
      csvEscape(c.ok ? 'OK' : 'FAIL'),
      csvEscape(c.statusCode ?? ''),
      csvEscape(c.latencyMs ?? ''),
      csvEscape(c.error ?? ''),
      csvEscape(c.url ?? ''),
    ];
    lines.push(row.join(','));
  }

  const csv = '﻿' + lines.join('\n') + '\n';
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `platform-log-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
