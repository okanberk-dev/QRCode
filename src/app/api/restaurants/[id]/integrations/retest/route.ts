import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';
import { getLocaleFromRequest } from '@/lib/api/locale';
import {
  runPlatformLinkTest,
  providerColumnsSelect,
  collectActiveProviderLinks,
  type ProviderRow,
} from '@/lib/platform-link-test';
import { isExternalReviewProvider } from '@/lib/restaurant-features';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Tüm aktif platform link'lerini paralel retest et (CLAUDE.md §19.4 + §23.7
// Phase 11.23). Owner panel "Tümünü yeniden test et" butonu çağırır.
//
// "Aktif" tanımı `collectActiveProviderLinks` (platform-link-test.ts) —
// cron ile paylaşılan tek kaynak:
//   - Yorum platformları: enabled=true VE URL non-empty VE (external ise)
//     admin `externalPlatformsEnabled` master flag açık
//   - Sosyal/website: URL non-empty
//
// Prisma select de `providerColumnsSelect()`'ten türer; eski elle yazılmış
// liste yelp/foursquare kolonlarını unutmuştu → o iki platform hiç test
// edilmiyordu (row `undefined` → "URL yok" sanılıyordu).
//
// Promise.allSettled kullanılır — tek bir platform test fail olsa diğerleri
// devam eder (per-row isolation, CLAUDE.md §28.4 bulk pattern).
//
// Rate limit: 5/dk/restoran.

interface RetestResultEntry {
  provider: string;
  ok: boolean;
  statusCode: number;
  latencyMs: number;
  error?: string;
  checkedAt: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  maybeSweep();
  const { id } = await params;
  const locale = getLocaleFromRequest(req);

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const rl = await rateLimit(`integration:retest:${id}`, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error:
          locale === 'en'
            ? 'Too many retest requests. Please try again shortly.'
            : 'Çok fazla yeniden test isteği. Lütfen birazdan tekrar deneyin.',
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { ...providerColumnsSelect(), externalPlatformsEnabled: true },
  });
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı');

  const active = collectActiveProviderLinks(restaurant as ProviderRow, isExternalReviewProvider);

  if (active.length === 0) {
    const empty: RetestResultEntry[] = [];
    return NextResponse.json({ checked: 0, results: empty });
  }

  // Promise.allSettled — bir platform fail olsa diğerleri devam eder.
  const settled = await Promise.allSettled(
    active.map(({ mapping, url }) =>
      runPlatformLinkTest({
        restaurantId: id,
        provider: mapping.provider,
        url,
        source: 'retest_all',
        locale,
      }),
    ),
  );

  const results: RetestResultEntry[] = settled.map((s, idx) => {
    const provider = active[idx].mapping.provider;
    if (s.status === 'fulfilled') {
      return {
        provider,
        ok: s.value.ok,
        statusCode: s.value.statusCode,
        latencyMs: s.value.latencyMs,
        error: s.value.error,
        checkedAt: s.value.checkedAt.toISOString(),
      };
    }
    // allSettled rejected — runPlatformLinkTest hata döndürmek yerine `ok: false`
    // ile döndürdüğü için buraya nadiren gelinir; defansif fallback.
    return {
      provider,
      ok: false,
      statusCode: 0,
      latencyMs: 0,
      error:
        s.reason instanceof Error
          ? s.reason.message
          : locale === 'en'
            ? 'Test failed.'
            : 'Test başarısız.',
      checkedAt: new Date().toISOString(),
    };
  });

  return NextResponse.json(
    { checked: results.length, results },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
