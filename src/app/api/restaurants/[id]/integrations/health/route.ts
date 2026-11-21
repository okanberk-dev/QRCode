import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { ApiErrors } from '@/lib/api-errors';
import { getSectorPlatforms, detectSector } from '@/lib/sector-platforms';
import { PROVIDER_MAP, providerColumnsSelect, latestChecksByProvider } from '@/lib/platform-link-test';
import { PLATFORM_ID_TO_PROVIDER } from '@/lib/platform-redirect-resolver';
import { isExternalReviewProvider } from '@/lib/restaurant-features';
import { rateLimit } from '@/lib/rate-limit';
import type { PlatformId } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Owner panel "Platform Bağlantıları" sekmesi için aggregate health view
// (CLAUDE.md §19.4.4 + §23.7 Phase 11.26).
//
// Tek endpoint, çoklu data:
//   - Per-provider latest check (Wave 1 PlatformLinkCheck son satırı)
//   - URL + enabled durumu (active/inactive)
//   - Sektör-bazlı missing recommended (örn. food sector + Yemeksepeti URL
//     boş → "Yemeksepeti link'i ekleyebilirsiniz")
//   - Aggregate counts: active, withWarning, withError, missing
//
// Health score (subjective formula) **çıkarıldı** — UI client-side `errors /
// total` ile derive eder, ChatGPT'nin önerdiği fixed score formülü pratikte
// drift yaratır (yeni provider eklenince formül güncellemek lazım, doğal
// metric değil).
//
// IDOR: requireRestaurantAccess. No public cache — owner-scoped, KVKK.

// PlatformId (sektör listesi) ↔ IntegrationProvider (PROVIDER_MAP) eşlemesi
// resolver'daki kanonik `PLATFORM_ID_TO_PROVIDER` map'inden gelir. Buradaki
// eski lokal kopya yelp/foursquare'i unutmuştu → food/hospitality sektörü
// için o ikisi hiçbir zaman "önerilen" listesine düşmüyordu.

interface PlatformHealth {
  provider: string;
  url: string | null;
  enabled: boolean;
  /** Tek satır snapshot — son test sonucu, varsa. */
  latestCheck: {
    ok: boolean;
    statusCode: number | null;
    latencyMs: number | null;
    error: string | null;
    checkedAt: string;
    source: string;
  } | null;
}

interface HealthResponse {
  sector: string;
  platforms: PlatformHealth[];
  /** Sektör whitelist'inde olup URL'i boş olan provider'lar (öneri). */
  missingRecommended: string[];
  counts: {
    active: number;
    inactive: number;
    untested: number;
    healthy: number;
    failing: number;
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const rl = await rateLimit(`integration:health:${id}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  // Restoran + provider başına en yeni check aynı anda okunur (eskiden tek
  // sıralı `$transaction`). DISTINCT ON helper → "son 200 satır +
  // JS reduce" pencere sorunu yok (bkz. /checks).
  const [restaurant, checks] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id },
      select: {
        category: true,
        ...providerColumnsSelect(),
        // §38.78 — externalPlatformsEnabled gate parity (CLAUDE.md §5.2).
        externalPlatformsEnabled: true,
      },
    }),
    latestChecksByProvider(id),
  ]);
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı');

  const latestByProvider: Record<string, PlatformHealth['latestCheck']> = {};
  for (const c of checks) {
    latestByProvider[c.provider] = {
      ok: c.ok,
      statusCode: c.statusCode,
      latencyMs: c.latencyMs,
      error: c.error,
      checkedAt: c.checkedAt.toISOString(),
      source: c.source,
    };
  }

  const r = restaurant as unknown as Record<string, string | null | boolean>;
  const platforms: PlatformHealth[] = [];
  let active = 0;
  let inactive = 0;
  let untested = 0;
  let healthy = 0;
  let failing = 0;

  // §38.78 — externalPlatformsEnabled gate parity (CLAUDE.md §5.2 + retest
  // route line 91). Admin master flag kapalıyken Yemeksepeti / Getir /
  // Trendyol / Tripadvisor / Airbnb / Booking / Yandex / Yelp / Foursquare
  // sağlık snapshot'larında listelenmez (info leakage azaltılır).
  const externalEnabled = (r['externalPlatformsEnabled'] as boolean) ?? true;

  for (const m of PROVIDER_MAP) {
    if (!externalEnabled && isExternalReviewProvider(m.provider)) continue;
    const url = (r[m.urlField] as string | null) ?? null;
    const enabled = m.enabledField ? (r[m.enabledField] as boolean) : true;
    const latestCheck = latestByProvider[m.provider] ?? null;

    if (url && url.trim()) {
      if (enabled) active++;
      else inactive++;
      if (!latestCheck) untested++;
      else if (latestCheck.ok) healthy++;
      else failing++;
    }

    platforms.push({
      provider: m.provider,
      url: url && url.trim() ? url : null,
      enabled,
      latestCheck,
    });
  }

  // Sektör-bazlı missing recommended.
  const sectorPlatformIds = getSectorPlatforms(restaurant.category);
  const missingRecommended: string[] = [];
  for (const platformId of sectorPlatformIds) {
    const provider = PLATFORM_ID_TO_PROVIDER[platformId as PlatformId];
    if (!provider) continue;
    if (!externalEnabled && isExternalReviewProvider(provider)) continue;
    const mapping = PROVIDER_MAP.find((m) => m.provider === provider);
    if (!mapping) continue;
    const url = (r[mapping.urlField] as string | null) ?? '';
    if (!url || !url.trim()) {
      missingRecommended.push(provider);
    }
  }

  const response: HealthResponse = {
    sector: detectSector(restaurant.category),
    platforms,
    missingRecommended,
    counts: { active, inactive, untested, healthy, failing },
  };
  return NextResponse.json(response, {
    // Owner-scoped per-provider health snapshot — driven by daily cron
    // (CLAUDE.md §19.4.4). 60s/300sw matches the dashboard polling
    // cadence (CLAUDE.md §19.3 owner-cache pattern).
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  });
}
