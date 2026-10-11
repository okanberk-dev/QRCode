// Platform link reachability + quality test (CLAUDE.md §19.4 + §23.7 Phase 11.23).
//
// Tek source: hem manuel test endpoint (POST /api/restaurants/[id]/integrations/[provider]/test)
// hem retest endpoint (POST /api/restaurants/[id]/integrations/retest) hem de
// cron (§19.4.4) bu helper'ı çağırır.
//
// Akış:
//   1. Domain check (`checkProviderUrl`) — fail ise reachability test'i atla,
//      hard error olarak kaydet (yanlış host'a HEAD atmadan koru).
//   2. HEAD request (kendi timeout'u, redirect follow). Bazı upstream HEAD reddeder.
//   3. GET fallback — ayrı timeout, body'yi okumadan sadece status'a bakar.
//   4. Sonuç DB'ye persist (`PlatformLinkCheck.create`). DB hatası UI'ı kırmaz —
//      caller fire-and-forget log + result döner.
//   5. Caller'a normalize edilmiş sonuç döner: `{ ok, statusCode, latencyMs, error?, url, checkedAt }`.

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  checkProviderUrl,
  describeDomainError,
  type IntegrationProvider,
} from '@/lib/integration-domains';
import { assertPublicHttpUrl, type SsrfBlockReason } from '@/lib/ssrf-guard';
import { PLATFORM_LINK_MESSAGES } from '@/lib/platform-link-messages';

export type PlatformLinkTestSource = 'manual' | 'cron' | 'retest_all';
export type PlatformLinkTestLocale = 'tr' | 'en';

export interface PlatformLinkTestParams {
  restaurantId: string;
  provider: IntegrationProvider;
  /** Test edilen URL — caller (test endpoint, retest, cron) restoran kaydından çeker. */
  url: string;
  source?: PlatformLinkTestSource;
  /** Override edilebilir timeout (ms) — HEAD ve GET denemelerinin HER BİRİ için. Default 5000. */
  timeoutMs?: number;
  /** false → DB'ye yazma, sadece result döndür. Default true. Cron testleri için. */
  persist?: boolean;
  /**
   * Hata mesajlarının dili. Sonuç `PlatformLinkCheck.error` olarak persist
   * edilip owner paneline olduğu gibi basıldığı için EN owner'lar TR metin
   * görmesin diye caller (test / retest endpoint) request locale'ini geçirir.
   * Cron owner locale'ini bilmez → default 'tr'.
   */
  locale?: PlatformLinkTestLocale;
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
  'Mozilla/5.0 (compatible; BuazeIntegrationsTest/1.0; +https://www.buaze.com)';

const ERROR_MAX_LEN = 500;

// Owner-facing check messages live in a client-safe module so stored
// results can be shown in the viewer's language (platform-link-messages.ts).
const MESSAGES = PLATFORM_LINK_MESSAGES;

// Kaç redirect hop'u elle takip edilir. Her hop SSRF guard'dan yeniden geçer;
// limit aşılırsa son 3xx status raporlanır (sunucu yanıt verdi → link canlı).
const MAX_REDIRECTS = 3;

function ssrfMessage(reason: SsrfBlockReason, locale: PlatformLinkTestLocale): string {
  if (reason === 'dns_unresolved') return pick(MESSAGES.unreachable, locale);
  if (reason === 'invalid_url' || reason === 'wrong_protocol') {
    return pick(MESSAGES.invalidUrl, locale);
  }
  return pick(MESSAGES.privateAddress, locale);
}

function pick(entry: { tr: string; en: string }, locale: PlatformLinkTestLocale): string {
  return entry[locale];
}

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

// Büyük platformlar (Yemeksepeti, Getir, Trendyol, Tripadvisor, Yelp,
// Foursquare, Booking, Airbnb, Yandex, Google ve sosyal ağlar) datacenter
// IP'lerinden gelen istekleri WAF / bot koruması ile 403 / 405 / 429
// döndürerek keser. Domain zaten whitelist'ten geçtiği için bu statülerin
// tamamı "sunucuya ulaşıldı, sayfa var" anlamına gelir — link kırık DEĞİL.
// Aksi halde §19.4.5 broken-skip resolver'ı sapasağlam bir Yelp linkini
// müşteri yönlendirme zincirinden düşürüyordu. Sadece owner'ın kendi
// domain'i (website / reservation) için 403 gerçek bir engel sayılır.
const WAF_TOLERANT_PROVIDERS = new Set<IntegrationProvider>([
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
  'instagram',
  'facebook',
  'whatsapp',
]);

function isWafBlockStatus(status: number): boolean {
  return status === 403 || status === 405 || status === 429 || status === 999;
}

async function attempt(
  target: string,
  method: 'HEAD' | 'GET',
  timeoutMs: number,
): Promise<
  | { status: number }
  | { aborted: true }
  | { failed: Error }
  | { blocked: SsrfBlockReason }
> {
  // Her deneme KENDİ AbortController'ını alır. Eski implementasyon tek bir
  // timer'ı HEAD + GET arasında paylaşıyordu; HEAD 4.8 sn'de düşerse GET
  // zaten süresi dolmuş bir signal ile başlıyor, hatta timer HEAD sırasında
  // tetiklendiyse GET aborted signal'le anında fırlatıyordu — fallback tam
  // da ihtiyaç duyulan yavaş-upstream durumunda hiç çalışmıyordu.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // `redirect: 'manual'` + elle takip: `follow` modunda public bir URL
    // 302 ile 127.0.0.1 / 169.254.169.254'e yönlendirip guard'ı atlatabilirdi.
    // İlk URL caller'da guard'dan geçti; her Location hop'u burada yeniden
    // doğrulanır.
    let current = target;
    for (let hop = 0; ; hop++) {
      const res = await fetch(current, {
        method,
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.7',
        },
      });
      // GET fallback body'yi okumaz — status yeterli, bağlantıyı serbest bırak.
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }

      const location = res.headers.get('location');
      const isRedirect = res.status >= 300 && res.status < 400 && Boolean(location);
      if (!isRedirect || hop >= MAX_REDIRECTS) return { status: res.status };

      let next: string;
      try {
        next = new URL(location as string, current).toString();
      } catch {
        return { status: res.status };
      }
      const guard = await assertPublicHttpUrl(next);
      if (!guard.ok) return { blocked: guard.reason };
      // HEAD/GET redirect'te method değişmez (303 dahil) — aynı method ile devam.
      current = next;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return { aborted: true };
    return { failed: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    clearTimeout(timer);
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
  const { url, provider, timeoutMs = 5000, persist = true, locale = 'tr' } = params;

  // 1. Empty URL guard (caller genelde önce filtrelese de defansif).
  if (!url || !url.trim()) {
    const result: PlatformLinkTestResult = {
      ok: false,
      statusCode: 0,
      latencyMs: 0,
      error: pick(MESSAGES.emptyUrl, locale),
      url: url ?? '',
      checkedAt,
    };
    if (persist) await persistCheck(params, result);
    return result;
  }

  // 2. Domain validation — yanlış host'a HEAD atmadan koru (CLAUDE.md §19.4).
  const domainCheck = checkProviderUrl(provider, url);
  if (!domainCheck.ok) {
    // Domain doğru ama path heuristic'i warning verdiyse (örn. getir.com
    // ana sayfası) reachability testine yine izin ver — owner "bilerek
    // koydum" demiş olabilir (§19.4 warning ≠ hard block).
    const isAllowedWarning = domainCheck.severity === 'warning';

    if (!isAllowedWarning) {
      const result: PlatformLinkTestResult = {
        ok: false,
        statusCode: 0,
        latencyMs: 0,
        error: describeDomainError(provider, domainCheck, locale),
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
      error: pick(MESSAGES.invalidUrl, locale),
      url,
      checkedAt,
    };
    if (persist) await persistCheck(params, result);
    return result;
  }

  const href = target.toString();

  // SSRF guard — free-form website / reservation linkleri iç ağa (127.0.0.1,
  // 169.254.169.254, 10/8 …) işaret edemesin. Engellenen URL'ye hiç istek
  // atılmaz; sonuç başarısız test ile aynı şekilde döner.
  const guard = await assertPublicHttpUrl(href);
  if (!guard.ok) {
    const result: PlatformLinkTestResult = {
      ok: false,
      statusCode: 0,
      latencyMs: 0,
      error: ssrfMessage(guard.reason, locale),
      url,
      checkedAt,
    };
    if (persist) await persistCheck(params, result);
    return result;
  }

  const start = Date.now();

  let outcome = await attempt(href, 'HEAD', timeoutMs);
  // GET fallback: HEAD ağ hatasıyla düştü, zaman aşımına uğradı, ya da
  // upstream HEAD'i desteklemiyor (405 / 501) veya bot filtresi HEAD'i
  // reddediyor (403 / 429). GET gerçek sayfa isteğine daha çok benzer.
  // Redirect hop'u guard'a takıldıysa GET de aynı yere gider — fallback yok.
  const needsGetFallback =
    !('blocked' in outcome) &&
    ('failed' in outcome ||
    'aborted' in outcome ||
    outcome.status === 405 ||
    outcome.status === 501 ||
    outcome.status === 403 ||
    outcome.status === 429);
  if (needsGetFallback) {
    const getOutcome = await attempt(href, 'GET', timeoutMs);
    // GET de başarısızsa HEAD'in daha bilgilendirici olan sonucunu koru
    // (örn. HEAD 403 + GET timeout → 403 raporla).
    if ('status' in getOutcome || !('status' in outcome)) outcome = getOutcome;
  }
  const latencyMs = Date.now() - start;

  let result: PlatformLinkTestResult;
  if ('status' in outcome) {
    const status = outcome.status;
    const wafTolerant = WAF_TOLERANT_PROVIDERS.has(provider);
    const isOk =
      (status >= 200 && status < 400) || (wafTolerant && isWafBlockStatus(status));

    let errorMessage: string | undefined;
    if (!isOk) {
      if (status === 404) errorMessage = pick(MESSAGES.notFound, locale);
      else if (status === 410) errorMessage = pick(MESSAGES.gone, locale);
      else if (isWafBlockStatus(status)) errorMessage = pick(MESSAGES.blocked, locale);
      else if (status >= 500) errorMessage = pick(MESSAGES.serverError, locale);
      else errorMessage = pick(MESSAGES.unverified, locale);
    }

    result = { ok: isOk, statusCode: status, latencyMs, error: errorMessage, url, checkedAt };
  } else if ('blocked' in outcome) {
    result = {
      ok: false,
      statusCode: 0,
      latencyMs,
      error: ssrfMessage(outcome.blocked, locale),
      url,
      checkedAt,
    };
  } else if ('aborted' in outcome) {
    result = {
      ok: false,
      statusCode: 0,
      latencyMs,
      error: pick(MESSAGES.timeout(timeoutMs / 1000), locale),
      url,
      checkedAt,
    };
  } else {
    result = {
      ok: false,
      statusCode: 0,
      latencyMs,
      error: outcome.failed.message || pick(MESSAGES.unreachable, locale),
      url,
      checkedAt,
    };
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

/**
 * Prisma `select` object covering every URL + enabled column PROVIDER_MAP
 * references. Retest / cron / test endpoints MUST build their select from
 * this instead of a hand-written literal: the previous hand-written lists
 * silently dropped `yelpUrl` / `foursquareUrl` so those two providers were
 * never retested (the row read `undefined` → treated as "no URL").
 */
export function providerColumnsSelect(): Record<RestaurantUrlField | RestaurantEnabledField, true> {
  const select: Partial<Record<RestaurantUrlField | RestaurantEnabledField, true>> = {};
  for (const m of PROVIDER_MAP) {
    select[m.urlField] = true;
    if (m.enabledField) select[m.enabledField] = true;
  }
  return select as Record<RestaurantUrlField | RestaurantEnabledField, true>;
}

export type ProviderRow = Partial<Record<RestaurantUrlField, string | null>> &
  Partial<Record<RestaurantEnabledField, boolean>> & { externalPlatformsEnabled?: boolean };

/**
 * Which provider links are "active" for a restaurant row — URL set, enabled
 * toggle on (review platforms), and not gated by the admin
 * `externalPlatformsEnabled` master flag. Shared by retest + cron so the two
 * paths can never disagree about what gets tested.
 */
export function collectActiveProviderLinks(
  row: ProviderRow,
  isExternal: (provider: string) => boolean,
): Array<{ mapping: ProviderMapping; url: string }> {
  const externalEnabled = row.externalPlatformsEnabled ?? true;
  const active: Array<{ mapping: ProviderMapping; url: string }> = [];
  for (const m of PROVIDER_MAP) {
    if (!externalEnabled && isExternal(m.provider)) continue;
    const url = row[m.urlField] ?? '';
    if (!url || !url.trim()) continue;
    if (m.enabledField && !row[m.enabledField]) continue;
    active.push({ mapping: m, url: url.trim() });
  }
  return active;
}

export interface LatestCheckRow {
  provider: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: Date;
  source: string;
}

/**
 * Latest `PlatformLinkCheck` row per provider for one restaurant, in a single
 * `DISTINCT ON` query. Returns a PrismaPromise so callers can batch it inside
 * `prisma.$transaction([...])` (CLAUDE.md §40.1).
 *
 * Why raw SQL: Prisma's `distinct` (without the nativeDistinct preview) is
 * applied in memory AFTER fetching every matching row, and the previous
 * "take: 200 + JS reduce" approach silently dropped providers whose last
 * check fell outside the 200-row window (daily cron ≈ 10 rows/day → ~20 days).
 */
export function latestChecksByProvider(restaurantId: string) {
  return prisma.$queryRaw<LatestCheckRow[]>(Prisma.sql`
    SELECT DISTINCT ON (provider)
      provider,
      ok,
      status_code AS "statusCode",
      latency_ms  AS "latencyMs",
      error,
      checked_at  AS "checkedAt",
      source
    FROM platform_link_checks
    WHERE restaurant_id = ${restaurantId}
    ORDER BY provider, checked_at DESC
  `);
}

/**
 * Latest check per (restaurant, provider) across a set of restaurants,
 * limited to rows newer than `since`. Powers the "pending issues" KPI on the
 * platforms page: a link counts as failing only if its MOST RECENT check
 * failed — a plain `count(ok=false, last 24h)` inflated the number every time
 * the cron + a manual retest both hit the same broken link.
 */
export function latestChecksForRestaurants(restaurantIds: string[], since: Date) {
  if (restaurantIds.length === 0) {
    return prisma.$queryRaw<Array<LatestCheckRow & { restaurantId: string }>>(Prisma.sql`SELECT NULL::text AS provider WHERE false`);
  }
  return prisma.$queryRaw<Array<LatestCheckRow & { restaurantId: string }>>(Prisma.sql`
    SELECT DISTINCT ON (restaurant_id, provider)
      restaurant_id AS "restaurantId",
      provider,
      ok,
      status_code AS "statusCode",
      latency_ms  AS "latencyMs",
      error,
      checked_at  AS "checkedAt",
      source
    FROM platform_link_checks
    WHERE restaurant_id IN (${Prisma.join(restaurantIds)})
      AND checked_at >= ${since}
    ORDER BY restaurant_id, provider, checked_at DESC
  `);
}
