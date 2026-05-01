import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from './prisma';

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

export async function getSiteSettings(): Promise<SiteSettings> {
  noStore();
  try {
    const rows = await prisma.settings.findMany({
      where: { key: { startsWith: KEY_PREFIX } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const d = SITE_SETTINGS_DEFAULTS;
    return {
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
  } catch {
    return SITE_SETTINGS_DEFAULTS;
  }
}
