// Platform link reachability + quality test (CLAUDE.md §19.4 + §23.7 Phase 11.23).
//
// Tek source: hem manuel test endpoint (POST /api/restaurants/[id]/integrations/[provider]/test)
// hem retest endpoint (POST /api/restaurants/[id]/integrations/retest) hem de
// gelecekteki cron (Dalga 2) bu helper'ı çağırır.
//
// Akış:
//   1. Domain check (`checkProviderUrl`) — fail ise reachability test'i atla,
//      hard error olarak kaydet (yanlış host'a HEAD atmadan koru).
//   2. HEAD request (5sn timeout, redirect follow). Bazı upstream HEAD reddeder.
//   3. GET fallback — body'yi okumadan sadece status'a bakar.
//   4. Sonuç DB'ye persist (`PlatformLinkCheck.create`). DB hatası UI'ı kırmaz —
//      caller fire-and-forget log + result döner.
//   5. Caller'a normalize edilmiş sonuç döner: `{ ok, statusCode, latencyMs, error?, url, checkedAt }`.

import { prisma } from '@/lib/prisma';
import {
  checkProviderUrl,
  describeDomainError,
  type IntegrationProvider,
} from '@/lib/integration-domains';

export type PlatformLinkTestSource = 'manual' | 'cron' | 'retest_all';

export interface PlatformLinkTestParams {
  restaurantId: string;
  provider: IntegrationProvider;
  /** Test edilen URL — caller (test endpoint, retest, cron) restoran kaydından çeker. */
  url: string;
  source?: PlatformLinkTestSource;
  /** Override edilebilir timeout (ms). Default 5000. */
  timeoutMs?: number;
  /** false → DB'ye yazma, sadece result döndür. Default true. Cron testleri için. */
  persist?: boolean;
}

export interface PlatformLinkTestResult {
  ok: boolean;
  statusCode: number;
  latencyMs: number;
  error?: string;
  url: string;
  checkedAt: Date;
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; BuazeIntegrationsTest/1.0; +https://buaze.com)';

const ERROR_MAX_LEN = 500;

function trimError(message: string | undefined | null): string | undefined {
  if (!message) return undefined;
  const s = message.trim();
  if (!s) return undefined;
  return s.length > ERROR_MAX_LEN ? `${s.slice(0, ERROR_MAX_LEN - 1)}…` : s;
}

async function persistCheck(
  params: PlatformLinkTestParams,
  result: PlatformLinkTestResult,
): Promise<void> {
  try {
    await prisma.platformLinkCheck.create({
      data: {
        restaurantId: params.restaurantId,
        provider: params.provider,
        url: result.url,
        ok: result.ok,
        statusCode: result.statusCode || null,
        latencyMs: result.latencyMs || null,
        error: trimError(result.error) ?? null,
        source: params.source ?? 'manual',
        checkedAt: result.checkedAt,
      },
    });
  } catch (err) {
    // DB write fail UI'ı kırmasın. Sentry zaten unhandled'ı yakalar (CLAUDE.md §26),
    // explicit captureException eklemiyoruz — info-level event olarak fonksiyon
    // success path'i devam eder.
    console.error('[platform-link-test] persist failed', err);
  }
}

/**
 * Run a single platform link test. Returns normalized result + optionally
 * persists to PlatformLinkCheck. Domain validation runs first; on fail the
 * function returns immediately without making an outbound HTTP request.
 *
 * Caller responsibilities (helper does NOT handle):
 * - IDOR / auth gate (`requireRestaurantAccess`)
 * - Rate limit (caller endpoint level)
 * - URL existence check (empty URL caller'a bağlı; helper boş URL gelirse
 *   `ok: false` döner)
 */
export async function runPlatformLinkTest(
  params: PlatformLinkTestParams,
): Promise<PlatformLinkTestResult> {
  const checkedAt = new Date();
  const { url, provider, timeoutMs = 5000, persist = true } = params;

  // 1. Empty URL guard (caller genelde önce filtrelese de defansif).
  if (!url || !url.trim()) {
    const result: PlatformLinkTestResult = {
      ok: false,
      statusCode: 0,
      latencyMs: 0,
      error: 'URL boş — önce kaydet, sonra test et.',
      url: url ?? '',
      checkedAt,
    };
    if (persist) await persistCheck(params, result);
    return result;
  }

  // 2. Domain validation — yanlış host'a HEAD atmadan koru (CLAUDE.md §19.4).
  const domainCheck = checkProviderUrl(provider, url);
  if (!domainCheck.ok) {
    // google dışındaki platformlar için domain doğru ama 'warning' ise (örn: getir.com anasayfası) teste izin ver
    const isAllowedWarning = domainCheck.severity === 'warning' && provider !== 'google';
    
    if (!isAllowedWarning) {
      const result: PlatformLinkTestResult = {
        ok: false,
        statusCode: 0,
        latencyMs: 0,
        error: describeDomainError(provider, domainCheck),
        url,
        checkedAt,
      };
      if (persist) await persistCheck(params, result);
      return result;
    }
  }

  // 3. HEAD → fallback GET. URL parse zaten domainCheck'te validate edildi,
  // burada güvenle yeniden parse edilebilir.
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    const result: PlatformLinkTestResult = {
      ok: false,
      statusCode: 0,
      latencyMs: 0,
      error: 'Geçersiz URL formatı.',
      url,
      checkedAt,
    };
    if (persist) await persistCheck(params, result);
    return result;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  let result: PlatformLinkTestResult;
  try {
    let res: Response;
    try {
      res = await fetch(target.toString(), {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
      });
    } catch {
      // Bazı upstream HEAD reddediyor — GET fallback (body okunmaz, status yeter).
      res = await fetch(target.toString(), {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
      });
    }
    const latencyMs = Date.now() - start;
    
    // Yemeksepeti, Getir, Trendyol gibi platformlar Vercel/bot IP'lerini WAF ile engeller (403, 405).
    // Domain Regex ile zaten validate edildiği için, 403/405 dönmesi aslında sunucuya ulaşıldığını gösterir.
    let isOk = res.ok;
    const isWafBlock = res.status === 403 || res.status === 405 || res.status === 429;
    if (!isOk && isWafBlock && ['yemeksepeti', 'getir', 'trendyol_go', 'tripadvisor'].includes(provider)) {
      isOk = true;
    }

    let errorMessage: string | undefined;
    if (!isOk) {
      if (res.status === 404) errorMessage = 'Sayfa bulunamadı.';
      else if (isWafBlock) errorMessage = 'Bağlantı sunucu tarafından reddedildi.';
      else errorMessage = 'Bağlantı doğrulanamadı.';
    }

    result = {
      ok: isOk,
      statusCode: res.status,
      latencyMs,
      error: errorMessage,
      url,
      checkedAt,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const aborted =
      err instanceof Error && (err.name === 'AbortError' || /timeout/i.test(err.message));
    result = {
      ok: false,
      statusCode: 0,
      latencyMs,
      error: aborted
        ? `${timeoutMs / 1000} saniyede yanıt alınamadı.`
        : (err as Error).message || 'Erişilemedi.',
      url,
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }

  if (persist) await persistCheck(params, result);
  return result;
}

// Restoran tablosundaki URL/enabled field'larıyla provider arasındaki mapping.
// Test/retest endpoint'leri restoran kaydından URL çekerken bu tablo'dan
// hangi field'ı okuyacağını öğrenir. PROVIDER_FIELD_MAP eskiden test endpoint
// içinde inline'dı — helper'a taşınınca retest endpoint de aynı kaynağı kullanır.

export type RestaurantUrlField =
  | 'googleReviewUrl'
  | 'yemekSepetiUrl'
  | 'getirYemekUrl'
  | 'trendyolYemekUrl'
  | 'tripAdvisorUrl'
  | 'airbnbUrl'
  | 'bookingUrl'
  | 'yandexUrl'
  // §38.52 — Yelp + Foursquare yorum platformları
  | 'yelpUrl'
  | 'foursquareUrl'
  | 'instagramUrl'
  | 'facebookUrl'
  | 'whatsappUrl'
  | 'website'
  | 'reservationUrl';

export type RestaurantEnabledField =
  | 'googleEnabled'
  | 'yemekSepetiEnabled'
  | 'getirEnabled'
  | 'trendyolEnabled'
  | 'tripAdvisorEnabled'
  | 'airbnbEnabled'
  | 'bookingEnabled'
  | 'yandexEnabled'
  // §38.52
  | 'yelpEnabled'
  | 'foursquareEnabled';

export interface ProviderMapping {
  provider: IntegrationProvider;
  urlField: RestaurantUrlField;
  /** Yorum platformları için enabled toggle field'ı. Sosyal medya için yok. */
  enabledField?: RestaurantEnabledField;
}

export const PROVIDER_MAP: ProviderMapping[] = [
  { provider: 'google', urlField: 'googleReviewUrl', enabledField: 'googleEnabled' },
  { provider: 'yemeksepeti', urlField: 'yemekSepetiUrl', enabledField: 'yemekSepetiEnabled' },
  { provider: 'getir', urlField: 'getirYemekUrl', enabledField: 'getirEnabled' },
  { provider: 'trendyol_go', urlField: 'trendyolYemekUrl', enabledField: 'trendyolEnabled' },
  { provider: 'tripadvisor', urlField: 'tripAdvisorUrl', enabledField: 'tripAdvisorEnabled' },
  { provider: 'airbnb', urlField: 'airbnbUrl', enabledField: 'airbnbEnabled' },
  { provider: 'booking', urlField: 'bookingUrl', enabledField: 'bookingEnabled' },
  { provider: 'yandex', urlField: 'yandexUrl', enabledField: 'yandexEnabled' },
  // §38.52 — Yelp + Foursquare yorum platformları
  { provider: 'yelp', urlField: 'yelpUrl', enabledField: 'yelpEnabled' },
  { provider: 'foursquare', urlField: 'foursquareUrl', enabledField: 'foursquareEnabled' },
  { provider: 'instagram', urlField: 'instagramUrl' },
  { provider: 'facebook', urlField: 'facebookUrl' },
  { provider: 'whatsapp', urlField: 'whatsappUrl' },
  { provider: 'website', urlField: 'website' },
  { provider: 'reservation', urlField: 'reservationUrl' },
];

export function getProviderMapping(
  provider: string,
): ProviderMapping | undefined {
  return PROVIDER_MAP.find((m) => m.provider === provider);
}
