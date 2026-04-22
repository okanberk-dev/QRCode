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
}

export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  titleDefaultTr: 'Buaze | Dijital İtibar ve Geri Bildirim Yönetimi',
  titleDefaultEn: 'Buaze | Digital Reputation and Feedback Management',
  titleTemplate: '%s | Buaze',
  descriptionTr:
    'Buaze, işletmeler için QR kod tabanlı dijital itibar ve müşteri geri bildirim yönetim platformudur. Google yorumlarınızı büyütün, müşteri deneyimini ölçün.',
  descriptionEn:
    'Buaze is a QR-code based digital reputation and customer feedback management platform for businesses. Grow your Google reviews, measure customer experience.',
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
} as const;

function parseKeywords(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : null;
}

export async function getSiteSettings(): Promise<SiteSettings> {
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
    };
  } catch {
    return SITE_SETTINGS_DEFAULTS;
  }
}
