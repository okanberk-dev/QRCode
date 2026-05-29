import { prisma } from '@/lib/prisma';

const VALID_SOURCES = new Set(['qr', 'direct', 'link', 'table', 'delivery']);
// Canonical review platforms (CLAUDE.md §5). Unknown values are nulled (not
// rejected) — the scan still counts as a conversion event; only the platform
// attribution is dropped so analytics rows stay clean. Mirrors the `source`
// whitelist + the feedback/qr/redirect VALID_* sets.
const VALID_PLATFORMS = new Set([
  'google', 'yemeksepeti', 'getir', 'trendyol_go',
  'tripadvisor', 'airbnb', 'booking', 'yandex', 'yelp', 'foursquare',
]);

interface RecordScanInput {
  slug: string;
  tableNumber?: string | null;
  platform?: string | null;
  source?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  ua?: string | null;
}

/**
 * Public scan event recorder. Slug → restaurant resolve, inactive/missing
 * → silent no-op (slug fingerprinting önleme — CLAUDE.md §13.5 menu
 * analytics pattern'ı ile aynı). Tüm input string'leri trim + bounded.
 */
export async function recordQrScan(input: RecordScanInput): Promise<{ ok: boolean }> {
  const slug = (input.slug || '').trim();
  if (!slug) return { ok: false };

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!restaurant || !restaurant.isActive) return { ok: true };

  const tableNumber = input.tableNumber ? String(input.tableNumber).trim().slice(0, 32) || null : null;
  const platformRaw = input.platform ? String(input.platform).trim().toLowerCase().slice(0, 32) || null : null;
  const platform = platformRaw && VALID_PLATFORMS.has(platformRaw) ? platformRaw : null;
  const sourceRaw = input.source ? String(input.source).trim().toLowerCase() : null;
  const source = sourceRaw && VALID_SOURCES.has(sourceRaw) ? sourceRaw : null;
  const sessionId = input.sessionId ? String(input.sessionId).trim().slice(0, 64) || null : null;
  const ipAddress = input.ip ? String(input.ip).slice(0, 64) || null : null;
  const userAgent = input.ua ? String(input.ua).slice(0, 256) || null : null;

  try {
    await prisma.qrScan.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber,
        platform,
        source,
        sessionId,
        ipAddress,
        userAgent,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error('[qr-scan] insert failed', err);
    return { ok: false };
  }
}
