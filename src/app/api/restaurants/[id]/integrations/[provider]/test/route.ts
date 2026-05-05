import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';
import {
  runPlatformLinkTest,
  getProviderMapping,
  type RestaurantUrlField,
} from '@/lib/platform-link-test';
import type { IntegrationProvider } from '@/lib/integration-domains';
import { isExternalReviewProvider } from '@/lib/restaurant-features';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 3 — Manuel Platform Link Test endpoint'i (CLAUDE.md §19.4 + §23.7
// Phase 11.23). Owner panel "Test et" butonu burayı çağırır.
//
// Logic'in çoğu `src/lib/platform-link-test.ts` helper'ında — burada sadece
// auth + rate limit + restoran URL fetch + helper delegate. Sonuç DB'ye
// `PlatformLinkCheck` olarak persist edilir (helper içinde).
//
// Response shape değişmedi (UI tüketicisi BusinessIntegrationSettings):
//   { ok, statusCode, latencyMs, error?, url }
// Yeni `checkedAt` field eklendi — UI "son test: X saat önce" rozetinde kullanır.

async function loadRestaurantUrl(
  id: string,
  field: RestaurantUrlField,
): Promise<{ url: string | null } | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      googleReviewUrl: true,
      yemekSepetiUrl: true,
      getirYemekUrl: true,
      trendyolYemekUrl: true,
      tripAdvisorUrl: true,
      airbnbUrl: true,
      bookingUrl: true,
      yandexUrl: true,
      yelpUrl: true,
      foursquareUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      whatsappUrl: true,
      website: true,
      reservationUrl: true,
    },
  });
  if (!restaurant) return null;
  return { url: (restaurant as Record<string, string | null>)[field] ?? null };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; provider: string }> },
) {
  maybeSweep();
  const { id, provider } = await params;

  const mapping = getProviderMapping(provider);
  if (!mapping) {
    return ApiErrors.badRequest('Geçersiz entegrasyon türü', 'INVALID_PROVIDER');
  }

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  if (isExternalReviewProvider(provider)) {
    const entitlement = await prisma.restaurant.findUnique({
      where: { id },
      select: { externalPlatformsEnabled: true },
    });
    if (!entitlement) return ApiErrors.notFound('İşletme bulunamadı');
    if (!entitlement.externalPlatformsEnabled) {
      return ApiErrors.forbidden(
        'Google dışındaki platformlar bu işletme için kapalı.',
        'EXTERNAL_PLATFORMS_DISABLED',
      );
    }
  }

  // 30 test/dk/restoran. Owner panelinde butona spam tıklamayı engellemek için.
  const rl = await rateLimit(`integration:test:${id}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla test isteği. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const loaded = await loadRestaurantUrl(id, mapping.urlField);
  if (!loaded) return ApiErrors.notFound('İşletme bulunamadı');

  const result = await runPlatformLinkTest({
    restaurantId: id,
    provider: provider as IntegrationProvider,
    url: loaded.url ?? '',
    source: 'manual',
  });

  return NextResponse.json(
    {
      ok: result.ok,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      error: result.error,
      url: result.url,
      checkedAt: result.checkedAt.toISOString(),
    },
    { status: 200 },
  );
}
