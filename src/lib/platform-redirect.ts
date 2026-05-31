import { prisma } from '@/lib/prisma';

// CLAUDE.md §19.4.2 + §23.7 Phase 11.24 — public review surface (`/r/[slug]`)
// müşteri yıldız verip yüksek puanla dış platforma yönlendirildiğinde fire-
// and-forget kayıt. Server-side 302 değil — client `window.location` korunur,
// open-redirect imkansız (target URL request body'de yok).
//
// Whitelist'ler `Feedback.platform` (CLAUDE.md §5) ile aynı kelime havuzu —
// drift olmasın diye. Provider/source unknown ise hiç kayıt YAZMA, attack
// surface büyütme.

const VALID_PROVIDERS = new Set([
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
  'airbnb',
  'booking',
  'yandex',
  'yelp',
  'foursquare',
]);

const VALID_SOURCES = new Set(['qr', 'direct', 'link', 'table', 'delivery']);

interface RecordRedirectInput {
  /** /r/[slug] tarafından çağrıldığında. */
  slug?: string | null;
  /** Direct admin/test caller (slug yerine). */
  restaurantId?: string | null;
  provider: string;
  source?: string | null;
  ua?: string | null;
}

/**
 * Platform redirect event recorder. Slug ya da restaurantId → restaurant
 * resolve (slug öncelikli). Inactive/missing → silent no-op (slug
 * fingerprinting önleme, qr-scan + menu-analytics ile aynı pattern).
 * Provider whitelist dışındaysa kayıt yapılmaz (attack surface).
 */
export async function recordPlatformRedirect(
  input: RecordRedirectInput,
): Promise<{ ok: boolean }> {
  const slug = input.slug ? input.slug.trim() : '';
  const restaurantId = input.restaurantId ? input.restaurantId.trim() : '';
  if (!slug && !restaurantId) return { ok: false };

  let restaurant: { id: string; isActive: boolean } | null = null;
  if (slug) {
    restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });
  } else if (restaurantId) {
    restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true },
    });
  }
  if (!restaurant || !restaurant.isActive) return { ok: true };

  const provider = String(input.provider || '')
    .trim()
    .toLowerCase();
  if (!VALID_PROVIDERS.has(provider)) return { ok: false };

  const sourceRaw = input.source ? String(input.source).trim().toLowerCase() : null;
  const source = sourceRaw && VALID_SOURCES.has(sourceRaw) ? sourceRaw : null;
  const userAgent = input.ua ? String(input.ua).slice(0, 500) || null : null;

  try {
    await prisma.platformRedirectEvent.create({
      data: {
        restaurantId: restaurant.id,
        provider,
        source,
        userAgent,
      },
    });
    return { ok: true };
  } catch (err) {
    // §37.7 — structured, PII-free (err.meta may carry the userAgent query param).
    console.error('[platform-redirect] insert failed', {
      restaurantId: restaurant.id,
      name: err instanceof Error ? err.name : 'unknown',
      message: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
    });
    return { ok: false };
  }
}
