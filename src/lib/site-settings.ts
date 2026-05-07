import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from './prisma';

// Stage 25 §38.101 Phase A #1 — process-local cache (CLAUDE.md §15.1 paterni
// reuse). Site settings nadiren değişir (admin panel'den ayda birkaç kez);
// 60s drift tolere edilebilir. Layout chain'inde root + locale layout 2 kez
// `getSiteSettings()` çağırıyordu → tek DB hit + cache hit ratio %95+.
//
// Cache invalidation: site-settings güncelleme endpoint'i (admin panel)
// `clearSiteSettingsCache()` çağırarak fresh fetch'i tetikleyebilir; 60s
// TTL'den sonra otomatik refresh zaten gerçekleşir.
const SITE_SETTINGS_CACHE_TTL_MS = 60_000;
let siteSettingsCache: { data: SiteSettings; expiresAt: number } | null = null;

export interface SiteSettings {
  titleDefaultTr: string;
  titleDefaultEn: string;
  titleTemplate: string;
  descriptionTr: string;
  descriptionEn: string;
  keywordsTr: string[];
  keywordsEn: string[];
  ogImageUrl: string | null;
  faviconUrl: string | null;
  logoUrl: string | null;
  // Entity-disambiguation profile URLs. Surfaced as `sameAs` on the site
  // Organization schema and as outbound links on the press kit. Each field
  // is independently optional — empty values are dropped from the schema.
  // (audit §9: brand-as-dictionary-word disambiguation, §10: GEO/AI
  // entity recognition.)
  g2Url: string | null;
  wikidataUrl: string | null;
  crunchbaseUrl: string | null;
  capterraUrl: string | null;
}

export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  titleDefaultTr: 'Buaze | QR Geri Bildirim ve Dijital İtibar Yönetim Platformu',
  titleDefaultEn: 'Buaze | QR Feedback & Digital Reputation Management Platform',
  titleTemplate: '%s | Buaze',
  descriptionTr:
    'Buaze ile QR akışlarıyla şeffaf müşteri geri bildirimi toplayın, yorumları tek panelden yönetin ve Pulse AI taslaklarıyla daha hızlı yanıt verin. Restoran, otel, klinik ve yerel hizmet işletmeleri için.',
  descriptionEn:
    'Collect transparent customer feedback through QR flows, manage reviews from one dashboard, and respond faster with Pulse AI drafts. Built for restaurants, hotels, clinics and local service businesses.',
  keywordsTr: [
    'Dijital itibar yönetimi',
    'Google haritalar geri bildirim toplama',
    'Geri bildirim operasyonları',
    'QR yorum sistemi',
    'restoran itibar yönetimi',
    'dijital itibar',
    'müşteri deneyimi yönetimi',
    'müşteri memnuniyeti',
    'buaze',
  ],
  keywordsEn: [
    'Digital reputation management',
    'Increase Google Maps feedback',
    'Feedback operations',
    'QR review system',
    'reputation management',
    'digital reputation',
    'Google review collection',
    'customer feedback',
    'buaze',
  ],
  ogImageUrl: null,
  faviconUrl: null,
  logoUrl: null,
  g2Url: null,
  wikidataUrl: null,
  crunchbaseUrl: null,
  capterraUrl: null,
};

const KEY_PREFIX = 'site.';

export const SITE_SETTINGS_KEYS = {
  titleDefaultTr: `${KEY_PREFIX}title_default_tr`,
  titleDefaultEn: `${KEY_PREFIX}title_default_en`,
  titleTemplate: `${KEY_PREFIX}title_template`,
  descriptionTr: `${KEY_PREFIX}description_tr`,
  descriptionEn: `${KEY_PREFIX}description_en`,
  keywordsTr: `${KEY_PREFIX}keywords_tr`,
  keywordsEn: `${KEY_PREFIX}keywords_en`,
  ogImageUrl: `${KEY_PREFIX}og_image_url`,
  faviconUrl: `${KEY_PREFIX}favicon_url`,
  logoUrl: `${KEY_PREFIX}logo_url`,
  g2Url: `${KEY_PREFIX}g2_url`,
  wikidataUrl: `${KEY_PREFIX}wikidata_url`,
  crunchbaseUrl: `${KEY_PREFIX}crunchbase_url`,
  capterraUrl: `${KEY_PREFIX}capterra_url`,
} as const;

function parseKeywords(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : null;
}

/**
 * Manual cache invalidation hook for admin update endpoints.
 *
 * Stage 25 §38.101 Phase A #1: site settings update endpoint (admin
 * panel save action) bu helper'ı çağırarak fresh fetch'i tetikler.
 * 60s TTL window'unda admin save → cache temizlenir, sonraki
 * `getSiteSettings()` çağrısı yeni veriyi döner.
 */
export function clearSiteSettingsCache() {
  siteSettingsCache = null;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  noStore();
  // Stage 25 §38.101 Phase A #1: process-local cache hit check.
  // Layout chain'inde root + locale layout 2 kez çağrı yapıyor; cache hit
  // ile 2. çağrı ~0ms (DB round-trip yok). 60s TTL drift kabul.
  if (siteSettingsCache && siteSettingsCache.expiresAt > Date.now()) {
    return siteSettingsCache.data;
  }
  try {
    const rows = await prisma.settings.findMany({
      where: { key: { startsWith: KEY_PREFIX } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const d = SITE_SETTINGS_DEFAULTS;
    const data: SiteSettings = {
      titleDefaultTr: map[SITE_SETTINGS_KEYS.titleDefaultTr] || d.titleDefaultTr,
      titleDefaultEn: map[SITE_SETTINGS_KEYS.titleDefaultEn] || d.titleDefaultEn,
      titleTemplate: map[SITE_SETTINGS_KEYS.titleTemplate] || d.titleTemplate,
      descriptionTr: map[SITE_SETTINGS_KEYS.descriptionTr] || d.descriptionTr,
      descriptionEn: map[SITE_SETTINGS_KEYS.descriptionEn] || d.descriptionEn,
      keywordsTr: parseKeywords(map[SITE_SETTINGS_KEYS.keywordsTr]) || d.keywordsTr,
      keywordsEn: parseKeywords(map[SITE_SETTINGS_KEYS.keywordsEn]) || d.keywordsEn,
      ogImageUrl: map[SITE_SETTINGS_KEYS.ogImageUrl] || null,
      faviconUrl: map[SITE_SETTINGS_KEYS.faviconUrl] || null,
      logoUrl: map[SITE_SETTINGS_KEYS.logoUrl] || null,
      g2Url: map[SITE_SETTINGS_KEYS.g2Url] || null,
      wikidataUrl: map[SITE_SETTINGS_KEYS.wikidataUrl] || null,
      crunchbaseUrl: map[SITE_SETTINGS_KEYS.crunchbaseUrl] || null,
      capterraUrl: map[SITE_SETTINGS_KEYS.capterraUrl] || null,
    };
    siteSettingsCache = { data, expiresAt: Date.now() + SITE_SETTINGS_CACHE_TTL_MS };
    return data;
  } catch {
    // DB error → defaults döner; cache YAZILMAZ (next request retry yapsın)
    return SITE_SETTINGS_DEFAULTS;
  }
}
