import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  runPlatformLinkTest,
  PROVIDER_MAP,
  type ProviderMapping,
} from '@/lib/platform-link-test';

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

  // BATCH_SIZE'a kadar aktif restoran çek. Şu anki ölçekte (10-50 restoran)
  // tek run yeter; ileride ölçeklenirse `cursor` ile paginate edilebilir.
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      googleReviewUrl: true,
      googleEnabled: true,
      yemekSepetiUrl: true,
      yemekSepetiEnabled: true,
      getirYemekUrl: true,
      getirEnabled: true,
      trendyolYemekUrl: true,
      trendyolEnabled: true,
      tripAdvisorUrl: true,
      tripAdvisorEnabled: true,
      airbnbUrl: true,
      airbnbEnabled: true,
      bookingUrl: true,
      bookingEnabled: true,
      yandexUrl: true,
      yandexEnabled: true,
      yelpUrl: true,
      yelpEnabled: true,
      foursquareUrl: true,
      foursquareEnabled: true,
      instagramUrl: true,
      facebookUrl: true,
      whatsappUrl: true,
      website: true,
      reservationUrl: true,
    },
  });

  let linksChecked = 0;
  let successes = 0;
  let failures = 0;

  for (const r of restaurants) {
    const row = r as unknown as Record<string, string | null | boolean>;
    const active: Array<{ mapping: ProviderMapping; url: string }> = [];
    for (const m of PROVIDER_MAP) {
      const url = (row[m.urlField] as string | null) ?? '';
      if (!url || !url.trim()) continue;
      if (m.enabledField) {
        const enabled = row[m.enabledField] as boolean;
        if (!enabled) continue;
      }
      active.push({ mapping: m, url });
    }
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

export async function GET(req: NextRequest) {
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
