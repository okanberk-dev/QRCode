import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';
import {
  runPlatformLinkTest,
  PROVIDER_MAP,
  type ProviderMapping,
} from '@/lib/platform-link-test';
import { isExternalReviewProvider } from '@/lib/restaurant-features';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Tüm aktif platform link'lerini paralel retest et (CLAUDE.md §19.4 + §23.7
// Phase 11.23). Owner panel "Tümünü yeniden test et" butonu çağırır.
//
// "Aktif" tanımı:
//   - Yorum platformları (google/yemeksepeti/getir/trendyol_go/tripadvisor/airbnb/booking/yandex):
//     enabled=true VE URL non-empty
//   - Sosyal/website (instagram/facebook/whatsapp/website/reservation): URL non-empty
//
// Promise.allSettled kullanılır — tek bir platform test fail olsa diğerleri
// devam eder (per-row isolation, CLAUDE.md §28.4 bulk pattern).
//
// Rate limit: 5/dk/restoran. 8 platform × 5sn timeout = max 40sn worst-case;
// frequent retest'i engellemek için tek dakikada 5 toplam retest yeter.

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

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const rl = await rateLimit(`integration:retest:${id}`, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla yeniden test isteği. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
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
      externalPlatformsEnabled: true,
      instagramUrl: true,
      facebookUrl: true,
      whatsappUrl: true,
      website: true,
      reservationUrl: true,
    },
  });
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı');

  // Filter: hangi mapping'leri test edeceğiz?
  const r = restaurant as unknown as Record<string, string | null | boolean>;
  const active: Array<{ mapping: ProviderMapping; url: string }> = [];
  for (const m of PROVIDER_MAP) {
    if (!restaurant.externalPlatformsEnabled && isExternalReviewProvider(m.provider)) continue;
    const url = (r[m.urlField] as string | null) ?? '';
    if (!url || !url.trim()) continue;
    if (m.enabledField) {
      const enabled = r[m.enabledField] as boolean;
      if (!enabled) continue;
    }
    active.push({ mapping: m, url });
  }

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
      error: s.reason instanceof Error ? s.reason.message : 'Test başarısız.',
      checkedAt: new Date().toISOString(),
    };
  });

  return NextResponse.json({ checked: results.length, results });
}
