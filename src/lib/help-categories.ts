/**
 * Help Center taxonomy — single source of truth for category slugs,
 * display names (TR/EN), emoji symbols and descriptions.
 *
 * Slugs are stable English strings used in URLs and DB filters.
 * The `HelpArticle.category` field on each seeded article stores the slug
 * (not the localised label) so queries stay locale-agnostic.
 */

export interface HelpCategoryMeta {
  slug: string;
  symbol: string; // unicode / glyph icon (1:1 with design)
  tr: { title: string; desc: string };
  en: { title: string; desc: string };
}

export const HELP_CATEGORIES: readonly HelpCategoryMeta[] = [
  {
    slug: 'getting-started',
    symbol: '🚀',
    tr: { title: 'Başlarken', desc: 'Kayıt olma, ilk işletme, ilk QR — 5 dakikada kurulum.' },
    en: { title: 'Getting started', desc: 'Sign up, your first business, your first QR — 5-minute setup.' },
  },
  {
    slug: 'qr-codes',
    symbol: '▦',
    tr: { title: 'QR Kodları', desc: 'Masa, fatura, kapı ve paket için QR yerleştirme rehberleri.' },
    en: { title: 'QR codes', desc: 'Placement guides for table, receipt, door and package QRs.' },
  },
  {
    slug: 'review-management',
    symbol: '✦',
    tr: { title: 'Yorum Yönetimi', desc: 'Yorumları yanıtlama, filtreleme ve AI Co-Pilot kullanımı.' },
    en: { title: 'Review management', desc: 'Replying, filtering and using AI Co-Pilot.' },
  },
  {
    slug: 'integrations',
    symbol: '⟷',
    tr: { title: 'Entegrasyonlar', desc: 'Google, Yemeksepeti, Getir ve Trendyol GO bağlantıları.' },
    en: { title: 'Integrations', desc: 'Google, Yemeksepeti, Getir and Trendyol GO connections.' },
  },
  {
    slug: 'team-roles',
    symbol: '◎',
    tr: { title: 'Ekip & Roller', desc: 'Davet, rol atama (Admin, Manager, Staff, Viewer).' },
    en: { title: 'Team & roles', desc: 'Invites, role assignments (Admin, Manager, Staff, Viewer).' },
  },
  {
    slug: 'billing',
    symbol: '$',
    tr: { title: 'Faturalandırma', desc: 'Plan değiştirme, iptal ve fatura geçmişi.' },
    en: { title: 'Billing', desc: 'Changing plans, cancelling and invoice history.' },
  },
  {
    slug: 'api-webhook',
    symbol: '{ }',
    tr: { title: 'API & Webhook', desc: 'Geliştirici API anahtarı ve webhook olayları.' },
    en: { title: 'API & Webhook', desc: 'Developer API keys and webhook events.' },
  },
  {
    slug: 'security-kvkk',
    symbol: '🛡',
    tr: { title: 'Güvenlik & KVKK', desc: 'Veri saklama, KVKK uyumu ve anonim akışlar.' },
    en: { title: 'Security & GDPR', desc: 'Data storage, GDPR compliance and anonymous flows.' },
  },
];

export const CATEGORY_BY_SLUG: Record<string, HelpCategoryMeta> = Object.fromEntries(
  HELP_CATEGORIES.map((c) => [c.slug, c]),
);

export type Locale = 'tr' | 'en';

export function categoryLabel(slug: string, locale: Locale): string {
  return CATEGORY_BY_SLUG[slug]?.[locale].title ?? slug;
}
