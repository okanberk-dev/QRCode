import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Restoranın provider başına son test sonucunu döndürür (CLAUDE.md §19.4 + §23.7
// Phase 11.23). Owner panel "Platform Bağlantıları" sekmesi mount'unda çağrılır;
// "Son test: 2 saat önce · HTTP 200 · 340ms" rozetlerini doldurur.
//
// Performans: tek query (last 200 row) + JS-side reduce. Per-provider 13 ayrı
// `findFirst` (13 round-trip × 50ms) yerine tek round-trip. 8 yorum platformu +
// 4 sosyal × ~5 history kaydı = ~60 row, 200 limit yeterli.
//
// Response shape:
//   { checks: { [provider]: { ok, statusCode, latencyMs, error?, checkedAt, source } } }

interface CheckEntry {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
  source: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const rows = await prisma.platformLinkCheck.findMany({
    where: { restaurantId: id },
    orderBy: { checkedAt: 'desc' },
    take: 200,
    select: {
      provider: true,
      ok: true,
      statusCode: true,
      latencyMs: true,
      error: true,
      checkedAt: true,
      source: true,
    },
  });

  const checks: Record<string, CheckEntry> = {};
  for (const row of rows) {
    if (checks[row.provider]) continue; // önce gelen (en yeni) win
    checks[row.provider] = {
      ok: row.ok,
      statusCode: row.statusCode,
      latencyMs: row.latencyMs,
      error: row.error,
      checkedAt: row.checkedAt.toISOString(),
      source: row.source,
    };
  }

  return NextResponse.json(
    { checks },
    {
      // Owner-scoped link health snapshot — refreshed by cron daily; 120s
      // CDN cache + 600s SWR keeps the dashboard snappy without serving
      // stale "Test et" results to the operator (CLAUDE.md §19.3).
      headers: { 'Cache-Control': 'private, s-maxage=120, stale-while-revalidate=600' },
    },
  );
}
