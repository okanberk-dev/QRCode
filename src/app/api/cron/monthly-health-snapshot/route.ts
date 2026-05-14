// CLAUDE.md §X — Reputation OS Suite (monthly health snapshot cron).
//
// Her ayın 1'inde 02:00 UTC çalışır. Bağlı tüm restoranlar için
// `kind='monthly'` snapshot oluşturur. Idempotent — captureSnapshot
// aynı ay içinde tekrar çağrılırsa skip eder.
//
// Maliyet: Google API çağrıları (locations + media + Q&A + reviews) per
// restaurant. Quota duyarlı — captureSnapshot soft-fails into null
// fields, cron never throws. BATCH_SIZE konservatif tutuldu (50/run) +
// promise sequencing — Google API quota'sını paralelle patlatma.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { captureSnapshot } from '@/lib/reputation/snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BATCH_SIZE = 200;

interface SnapshotSummary {
  restaurantsChecked: number;
  snapshotsCreated: number;
  skipped: number;
  partial: number; // Google API partial fetch (some fields null)
  failures: number;
  durationMs: number;
}

export async function runMonthlyHealthSnapshot(): Promise<SnapshotSummary> {
  const start = Date.now();
  const now = new Date();

  // Sadece aktif + Google Review Management aktif restoranlar. Yeni
  // restoranlar (initial baseline yokken) burada da snapshot alır —
  // baseline hook'u Google connect anında çalışır; cron monthly history
  // tutar.
  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      googleReviewManagementEnabled: true,
    },
    take: BATCH_SIZE,
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  let snapshotsCreated = 0;
  let skipped = 0;
  let partial = 0;
  let failures = 0;

  // Sequential per restaurant — Google API quota friendly.
  for (const r of restaurants) {
    try {
      const result = await captureSnapshot(r.id, { kind: 'monthly', monthBoundary: now });
      if (result.ok) {
        snapshotsCreated += 1;
        if (result.partial) partial += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      failures += 1;
      console.error('[monthly-health-snapshot] failed', { restaurantId: r.id, err: String(err) });
    }
  }

  return {
    restaurantsChecked: restaurants.length,
    snapshotsCreated,
    skipped,
    partial,
    failures,
    durationMs: Date.now() - start,
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runMonthlyHealthSnapshot();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[monthly-health-snapshot] cron failed', err);
    const message = err instanceof Error ? err.message : 'cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
