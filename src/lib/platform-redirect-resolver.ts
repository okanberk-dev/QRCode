// Public review surface (`/r/[slug]`) yüksek puan müşterisini hangi platforma
// yönlendireceğine karar veren saf fonksiyon (CLAUDE.md §19.4.3 + §23.7
// Phase 11.25, Wave 3b plan).
//
// Saflık: DB çağrısı yok. Caller restaurant kaydını + opsiyonel `latestChecks`
// map'ini geçer; helper karar verir, URL döndürür. Test edilebilir, deterministik.
//
// Resolver akışı (ChatGPT'den + sıkılaştırma):
//   1. Requested provider (URL ?platform=) usable ise         → 'requested'
//   2. Restaurant.defaultRedirectPlatform usable ise          → 'default'
//   3. Sektör priority (sector-platforms.ts) sırayla usable   → 'sector_priority'
//   4. Herhangi bir aktif provider (URL var, enabled, healthy) → 'any_active'
//   5. Hiçbiri yoksa null + reason 'no_platform'
//
// "Usable" tanımı:
//   - URL non-empty
//   - enabled flag true
//   - latestChecks içinde son N saatte FAIL yok (broken skip)
//
// `latestChecks` boş Map ise broken-skip uygulanmaz — Wave 3b mevcut public
// flow'u sadece sektör priority + any_active ile zenginleştirir, broken
// skip Wave 4'e ertelenir (slug endpoint'inden latestChecks çekme refactor'u).

import type { PlatformId } from '@/components/ui';
import { detectSector, SECTOR_PLATFORMS } from '@/lib/sector-platforms';
import { isExternalReviewProvider } from '@/lib/restaurant-features';

export type RedirectProvider =
  | 'google'
  | 'yemeksepeti'
  | 'getir'
  | 'trendyol_go'
  | 'tripadvisor'
  | 'airbnb'
  | 'booking'
  | 'yandex';

// PlatformId (UI vocabulary) ↔ RedirectProvider (storage vocabulary).
// Tek farklılık: trendyol vs trendyol_go (CLAUDE.md §5 platform sistem).
const PLATFORM_ID_TO_PROVIDER: Partial<Record<PlatformId, RedirectProvider>> = {
  google: 'google',
  yemeksepeti: 'yemeksepeti',
  getir: 'getir',
  trendyol: 'trendyol_go',
  trendyol_go: 'trendyol_go',
  tripadvisor: 'tripadvisor',
  airbnb: 'airbnb',
  booking: 'booking',
  yandex: 'yandex',
};

export interface ResolveRestaurantInput {
  category: string | null;
  defaultRedirectPlatform: string | null;
  // URL field'ları (yorum platformları)
  googleReviewUrl: string | null;
  yemekSepetiUrl: string | null;
  getirYemekUrl: string | null;
  trendyolYemekUrl: string | null;
  tripAdvisorUrl: string | null;
  airbnbUrl: string | null;
  bookingUrl: string | null;
  yandexUrl: string | null;
  // Enabled flag'leri
  googleEnabled: boolean;
  yemekSepetiEnabled: boolean;
  getirEnabled: boolean;
  trendyolEnabled: boolean;
  tripAdvisorEnabled: boolean;
  airbnbEnabled: boolean;
  bookingEnabled: boolean;
  yandexEnabled: boolean;
  externalPlatformsEnabled?: boolean;
}

const PROVIDER_FIELDS: Record<
  RedirectProvider,
  { url: keyof ResolveRestaurantInput; enabled: keyof ResolveRestaurantInput }
> = {
  google: { url: 'googleReviewUrl', enabled: 'googleEnabled' },
  yemeksepeti: { url: 'yemekSepetiUrl', enabled: 'yemekSepetiEnabled' },
  getir: { url: 'getirYemekUrl', enabled: 'getirEnabled' },
  trendyol_go: { url: 'trendyolYemekUrl', enabled: 'trendyolEnabled' },
  tripadvisor: { url: 'tripAdvisorUrl', enabled: 'tripAdvisorEnabled' },
  airbnb: { url: 'airbnbUrl', enabled: 'airbnbEnabled' },
  booking: { url: 'bookingUrl', enabled: 'bookingEnabled' },
  yandex: { url: 'yandexUrl', enabled: 'yandexEnabled' },
};

export type ResolveReason =
  | 'requested'
  | 'default'
  | 'sector_priority'
  | 'any_active'
  | 'no_platform';

export interface ResolveOutput {
  provider: RedirectProvider | null;
  url: string | null;
  reason: ResolveReason;
  /** True ise requested veya default kullanılamadı, fallback'e düştük. */
  fallback: boolean;
}

export interface LatestCheckInfo {
  ok: boolean;
  checkedAt: Date;
}

export interface ResolveOptions {
  restaurant: ResolveRestaurantInput;
  /** /r/[slug]?platform= query param. Null/undefined olabilir. */
  requestedProvider?: string | null;
  /** Provider başına son test sonucu. Boş Map → broken skip yapılmaz. */
  latestChecks?: Map<string, LatestCheckInfo>;
  /** Bu kadar saat içindeki FAIL'ler "broken" sayılır. Default 24. */
  brokenWindowHours?: number;
  /** Test enjeksiyonu — şu an. */
  now?: Date;
}

function normalizeProvider(value: string | null | undefined): RedirectProvider | null {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (v in PROVIDER_FIELDS) return v as RedirectProvider;
  const mapped = PLATFORM_ID_TO_PROVIDER[v as PlatformId];
  return mapped ?? null;
}

function isBroken(
  provider: RedirectProvider,
  latestChecks: Map<string, LatestCheckInfo> | undefined,
  brokenWindowHours: number,
  now: Date,
): boolean {
  if (!latestChecks) return false;
  const check = latestChecks.get(provider);
  if (!check) return false;
  if (check.ok) return false;
  const ageMs = now.getTime() - check.checkedAt.getTime();
  return ageMs <= brokenWindowHours * 60 * 60 * 1000;
}

function isUsable(
  provider: RedirectProvider,
  restaurant: ResolveRestaurantInput,
  latestChecks: Map<string, LatestCheckInfo> | undefined,
  brokenWindowHours: number,
  now: Date,
): { url: string } | null {
  const fields = PROVIDER_FIELDS[provider];
  const url = restaurant[fields.url] as string | null;
  const enabled = restaurant[fields.enabled] as boolean;
  if (restaurant.externalPlatformsEnabled === false && isExternalReviewProvider(provider)) return null;
  if (!url || !url.trim()) return null;
  if (!enabled) return null;
  if (isBroken(provider, latestChecks, brokenWindowHours, now)) return null;
  return { url };
}

/**
 * Belirli bir public review akışı için en uygun redirect platformunu seçer.
 * Saf fonksiyon — DB çağrısı yok, deterministik. `latestChecks` boş ise
 * broken-skip uygulanmaz (legacy davranış korunur).
 */
export function resolveBestRedirectPlatform(opts: ResolveOptions): ResolveOutput {
  const {
    restaurant,
    requestedProvider,
    latestChecks,
    brokenWindowHours = 24,
    now = new Date(),
  } = opts;

  // 1. Requested provider — URL'de explicit gelen.
  const reqProv = normalizeProvider(requestedProvider);
  if (reqProv) {
    const usable = isUsable(reqProv, restaurant, latestChecks, brokenWindowHours, now);
    if (usable) {
      return { provider: reqProv, url: usable.url, reason: 'requested', fallback: false };
    }
  }

  // 2. Default redirect platform — owner panelden seçilmiş.
  const defProv = normalizeProvider(restaurant.defaultRedirectPlatform);
  if (defProv && (!reqProv || defProv !== reqProv)) {
    const usable = isUsable(defProv, restaurant, latestChecks, brokenWindowHours, now);
    if (usable) {
      return {
        provider: defProv,
        url: usable.url,
        reason: 'default',
        fallback: Boolean(reqProv),
      };
    }
  }

  // 3. Sektör priority — sector-platforms.ts'deki sıraya göre.
  const sector = detectSector(restaurant.category);
  const sectorOrder = SECTOR_PLATFORMS[sector] || [];
  const triedProviders = new Set<RedirectProvider>();
  if (reqProv) triedProviders.add(reqProv);
  if (defProv) triedProviders.add(defProv);

  for (const platformId of sectorOrder) {
    const provider = PLATFORM_ID_TO_PROVIDER[platformId];
    if (!provider || triedProviders.has(provider)) continue;
    triedProviders.add(provider);
    const usable = isUsable(provider, restaurant, latestChecks, brokenWindowHours, now);
    if (usable) {
      return {
        provider,
        url: usable.url,
        reason: 'sector_priority',
        fallback: true,
      };
    }
  }

  // 4. Any active — sektör listesinde yoksa bile (restoran kategorisi
  //    dışındaki platformlar). Owner specific bir platform doldurmuş ama
  //    sector whitelist dışındaysa onu bile kullan, hiç yönlendirememekten iyi.
  const allProviders: RedirectProvider[] = [
    'google',
    'yemeksepeti',
    'getir',
    'trendyol_go',
    'tripadvisor',
    'airbnb',
    'booking',
    'yandex',
  ];
  for (const provider of allProviders) {
    if (triedProviders.has(provider)) continue;
    const usable = isUsable(provider, restaurant, latestChecks, brokenWindowHours, now);
    if (usable) {
      return { provider, url: usable.url, reason: 'any_active', fallback: true };
    }
  }

  // 5. Hiçbir platform yok.
  return { provider: null, url: null, reason: 'no_platform', fallback: true };
}
