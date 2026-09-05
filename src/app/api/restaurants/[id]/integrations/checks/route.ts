import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { rateLimit } from '@/lib/rate-limit';
import { latestChecksByProvider } from '@/lib/platform-link-test';
import { isExternalReviewProvider } from '@/lib/restaurant-features';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Restoranın provider başına son test sonucunu döndürür (CLAUDE.md §19.4 + §23.7
// Phase 11.23). Owner panel platform sayfası mount'unda çağrılır;
// "Son test: 2 saat önce" rozetlerini doldurur.
//
// Performans: `latestChecksByProvider` (DISTINCT ON) → Postgres provider
// başına EN YENİ satırı tek round-trip'te döner. Eski "son 200 satır
// + JS reduce" yaklaşımı günlük cron ~10 satır/gün yazınca ~20 günlük pencere
// bırakıyordu; nadiren test edilen bir provider'ın son sonucu pencerenin
// dışına düşüp rozeti sessizce kayboluyordu.
//
// Restoran flag'i + check listesi tek `$transaction` (CLAUDE.md §40.1 —
// Supabase pooler connection_limit=1, iki bağımsız read tek slot).
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

  // Owner-scoped read; cheap but unbounded before — 60/dk/restoran yeter
  // (sayfa mount + provider değişimi + manuel refresh).
  const rl = await rateLimit(`integration:checks:${id}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  // §38.78 — externalPlatformsEnabled gate parity (CLAUDE.md §5.2 + retest +
  // health). Admin master flag kapalıyken external provider check'leri
  // response'a dahil edilmez.
  const [restaurant, rows] = await prisma.$transaction([
    prisma.restaurant.findUnique({
      where: { id },
      select: { externalPlatformsEnabled: true },
    }),
    latestChecksByProvider(id),
  ]);
  const externalEnabled = restaurant?.externalPlatformsEnabled ?? true;

  const checks: Record<string, CheckEntry> = {};
  for (const row of rows) {
    if (!externalEnabled && isExternalReviewProvider(row.provider)) continue;
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
      // Owner-scoped link health snapshot — refreshed by cron daily; short
      // private cache keeps the dashboard snappy without serving a stale
      // "Test et" result back to the operator (CLAUDE.md §40.6).
      headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=60' },
    },
  );
}
