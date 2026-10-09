import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { prisma } from '@/lib/prisma';
import {
  runPlatformLinkTest,
  providerColumnsSelect,
  collectActiveProviderLinks,
  type ProviderRow,
} from '@/lib/platform-link-test';
import { isExternalReviewProvider } from '@/lib/restaurant-features';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// CLAUDE.md §19.4.4 + §23.7 Phase 11.26 — Wave 2 cron.
//
// Vercel Cron tarafından günde 1 kez çağrılır (vercel.json: 0 4 * * *).
// CRON_SECRET zorunlu (CLAUDE.md §21.13 cron pattern). Aktif platformları
// sırasıyla batch'lerde test eder; sonuçlar `PlatformLinkCheck` tablosuna
// `source: 'cron'` ile yazılır → owner panel "Son test" rozeti otomatik
// güncellenir, Wave 4 broken-skip resolver'ı için fresh data sağlar.
//
// "Aktif" tanımı (Phase 11.23 retest endpoint ile aynı):
//   - Yorum platformları: enabled=true VE URL non-empty
//   - Sosyal/website: URL non-empty
//
// Batch boyutu kasıtlı küçük (BATCH_SIZE=25): tek cron run worst-case
// 25 restoran × ~10 platform × 5sn timeout = 250 paralel HEAD/GET.
// Promise.allSettled per-row isolation (CLAUDE.md §28.4 bulk pattern) —
// bir restoran fail olsa diğerleri devam eder.
//
// Maliyet: günde 25 restoran × ~6-10 aktif platform = ~200-300 outbound
// HEAD/GET request/gün. Vercel function invocation +1/gün. Şu anki ölçek
// için çok rahat.

const BATCH_SIZE = 25;

interface CronSummary {
  restaurantsChecked: number;
  linksChecked: number;
  successes: number;
  failures: number;
  durationMs: number;
}

/**
 * Cron logic. Hem GET handler hem (gelecekte) admin manual trigger
 * doğrudan çağırabilir (CLAUDE.md §21.13 self-fetch antipattern → shared
 * helper).
 */
export async function runPlatformLinkRetest(): Promise<CronSummary> {
  const start = Date.now();

  // §38.238 — round-robin by staleness, not `createdAt asc`.
  //
  // The previous query took the first BATCH_SIZE rows ordered by creation
  // date with no cursor and no rotation, so it re-tested the same 25 oldest
  // restaurants every single day and every restaurant created after them was
  // never checked at all. That also silently disabled Wave 4 broken-skip
  // (CLAUDE.md §19.4.5) for those businesses: the resolver only skips a
  // provider that has a recent failing PlatformLinkCheck, and they never got
  // one, so their customers kept being redirected to dead links.
  //
  // Ordering by "least recently checked" makes the batch rotate on its own:
  // never-checked restaurants come first, then the stalest. Two cheap queries
  // instead of a LATERAL join — at this scale (tens to low thousands of rows)
  // the id + timestamp projection is negligible, and it needs no schema change.
  const activeIds = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const lastChecks = await prisma.platformLinkCheck.groupBy({
    by: ['restaurantId'],
    _max: { checkedAt: true },
  });
  const lastCheckedAt = new Map<string, number>();
  for (const row of lastChecks) {
    const t = row._max.checkedAt?.getTime();
    if (t !== undefined) lastCheckedAt.set(row.restaurantId, t);
  }
  const batchIds = activeIds
    .map((r) => r.id)
    // Never checked → -Infinity → sorts first.
    .sort((a, b) => (lastCheckedAt.get(a) ?? -Infinity) - (lastCheckedAt.get(b) ?? -Infinity))
    .slice(0, BATCH_SIZE);

  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: batchIds } },
    // Select + "aktif link" kuralı retest endpoint ile paylaşılan helper'lardan
    // gelir (platform-link-test.ts) — iki yol asla farklı platform seti
    // test edemez. `externalPlatformsEnabled` da dahil: admin master flag
    // kapalı işletmeler için Yemeksepeti/Getir/… satırı yazmak hem quota
    // yakıyor hem de owner'ın göremediği "bekleyen sorun" sayacını şişiriyordu.
    select: { id: true, ...providerColumnsSelect(), externalPlatformsEnabled: true },
  });

  let linksChecked = 0;
  let successes = 0;
  let failures = 0;

  for (const r of restaurants) {
    const active = collectActiveProviderLinks(r as ProviderRow, isExternalReviewProvider);
    if (active.length === 0) continue;

    const settled = await Promise.allSettled(
      active.map(({ mapping, url }) =>
        runPlatformLinkTest({
          restaurantId: r.id,
          provider: mapping.provider,
          url,
          source: 'cron',
        }),
      ),
    );
    for (const s of settled) {
      linksChecked++;
      if (s.status === 'fulfilled' && s.value.ok) successes++;
      else failures++;
    }
  }

  return {
    restaurantsChecked: restaurants.length,
    linksChecked,
    successes,
    failures,
    durationMs: Date.now() - start,
  };
}

async function handleCron(req: NextRequest) {
  // CRON_SECRET guard — open public trigger önleme (CLAUDE.md §21.13).
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runPlatformLinkRetest();
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'cron failed';
    console.error('[platform-link-retest cron] failed', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/platform-link-retest', handleCron);
