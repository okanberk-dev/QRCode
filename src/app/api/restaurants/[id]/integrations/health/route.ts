import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { ApiErrors } from '@/lib/api-errors';
import { getSectorPlatforms, detectSector } from '@/lib/sector-platforms';
import { PROVIDER_MAP } from '@/lib/platform-link-test';

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

// PlatformId import için sektör listesi PlatformId iken PROVIDER_MAP
// IntegrationProvider. trendyol vs trendyol_go normalize lazım.
const PLATFORM_ID_TO_PROVIDER: Record<string, string> = {
  google: 'google',
  yemeksepeti: 'yemeksepeti',
  getir: 'getir',
  trendyol: 'trendyol_go',
  tripadvisor: 'tripadvisor',
  airbnb: 'airbnb',
  booking: 'booking',
  yandex: 'yandex',
};

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

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      category: true,
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
      instagramUrl: true,
      facebookUrl: true,
      whatsappUrl: true,
      website: true,
      reservationUrl: true,
    },
  });
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı');

  // Last 200 row + JS reduce → provider başına latest (CLAUDE.md §19.4.1
  // pattern, /checks endpoint ile aynı).
  const checks = await prisma.platformLinkCheck.findMany({
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
  const latestByProvider: Record<string, PlatformHealth['latestCheck']> = {};
  for (const c of checks) {
    if (latestByProvider[c.provider]) continue;
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

  for (const m of PROVIDER_MAP) {
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
    const provider = PLATFORM_ID_TO_PROVIDER[platformId];
    if (!provider) continue;
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
  return NextResponse.json(response);
}
