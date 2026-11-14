/**
 * Help Center taxonomy — single source of truth for category slugs,
 * visible names (TR/EN), descriptions, page metadata and the icon key.
 *
 * Slugs are stable English strings used in URLs and DB filters
 * (`HelpArticle.category` stores the slug, never the visible label), so a
 * visible rename never changes a URL: `integrations` is shown as
 * "Platform bağlantıları" / "Platform links".
 *
 * The former `api-webhook` category was removed (2026-11): Buaze has no
 * customer API or webhooks. Its URLs need a 301 to /{locale}/help.
 *
 * `icon` is a key, not a component, so this module stays free of React and
 * can be imported anywhere (sitemap, API routes). Pages map it to a
 * lucide-react icon.
 */

export type HelpCategoryIcon =
  | 'getting-started'
  | 'qr'
  | 'reviews'
  | 'links'
  | 'team'
  | 'billing'
  | 'security';

interface HelpCategoryCopy {
  /** Visible name (sentence case). */
  title: string;
  /** One-line description shown on cards and under the category H1. */
  desc: string;
  /** <title> without the " | Buaze" suffix the layout adds (≤ 52 chars). */
  seoTitle: string;
  /** Meta description, 140–160 characters. */
  seoDescription: string;
}

export interface HelpCategoryMeta {
  slug: string;
  icon: HelpCategoryIcon;
  tr: HelpCategoryCopy;
  en: HelpCategoryCopy;
}

export const HELP_CATEGORIES: readonly HelpCategoryMeta[] = [
  {
    slug: 'getting-started',
    icon: 'getting-started',
    tr: {
      title: 'Başlarken',
      desc: 'Hesap açma, ilk işletme, panelin sayfaları ve ilk denemeler.',
      seoTitle: 'Başlarken: hesap açma, kurulum ve ilk adımlar',
      seoDescription:
        'Buaze’yi kurmak için rehberler: hesap açma, işletme bilgileri, sayfa adresi, marka ayarları ve QR kodunu basmadan önce yapılacak ilk denemeler.',
    },
    en: {
      title: 'Getting started',
      desc: 'Signing up, your first business, the panel’s pages and your first tests.',
      seoTitle: 'Getting started: sign-up, setup and first steps',
      seoDescription:
        'Guides for setting up Buaze: creating your account, business details, your page address, brand settings and the tests to run before you print a QR code.',
    },
  },
  {
    slug: 'qr-codes',
    icon: 'qr',
    tr: {
      title: 'QR kodları',
      desc: 'QR oluşturma, masa etiketi, platform seçimi, yerleşim ve baskı.',
      seoTitle: 'QR kodları: oluşturma, yerleşim ve baskı rehberi',
      seoDescription:
        'Buaze’de QR kodu oluşturma, masa etiketi ve sabit platform seçimi, QR’ı masaya, fişe ve pakete yerleştirme, PNG indirme ve PDF olarak yazdırma.',
    },
    en: {
      title: 'QR codes',
      desc: 'Creating QR codes, table labels, platform choice, placement and printing.',
      seoTitle: 'QR codes: creating, placing and printing guides',
      seoDescription:
        'Creating QR codes in Buaze, table labels and pinned platforms, placing the QR on tables, receipts and bags, downloading a PNG and printing to PDF.',
    },
  },
  {
    slug: 'review-management',
    icon: 'reviews',
    tr: {
      title: 'Yorum yönetimi',
      desc: 'Gelen kutusu, e-postayla yanıt, Pulse AI taslakları, bildirimler ve dışa aktarma.',
      seoTitle: 'Yorum yönetimi: gelen kutusu, yanıt ve Pulse AI',
      seoDescription:
        'Geri bildirimleri gelen kutusunda takip etme, düşük puanlara e-postayla yanıt verme, Pulse AI taslakları, düşük puan uyarıları ve CSV dışa aktarma.',
    },
    en: {
      title: 'Review management',
      desc: 'The inbox, e-mail replies, Pulse AI drafts, notifications and exports.',
      seoTitle: 'Review management: inbox, replies and Pulse AI',
      seoDescription:
        'Following feedback in the inbox, replying to low ratings by e-mail, Pulse AI reply drafts, low-rating alerts, the weekly summary and CSV exports.',
    },
  },
  {
    slug: 'integrations',
    icon: 'links',
    tr: {
      title: 'Platform bağlantıları',
      desc: 'Google ve diğer 9 platformun yorum bağlantılarını ekleme, eşik ve kontrol.',
      seoTitle: 'Platform bağlantıları: Google ve diğer platformlar',
      seoDescription:
        'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor ve diğer platformların yorum bağlantılarını ekleme, yönlendirme eşiği ve günlük bağlantı kontrolü.',
    },
    en: {
      title: 'Platform links',
      desc: 'Adding review links for Google and 9 other platforms, the threshold and link checks.',
      seoTitle: 'Platform links: Google and other review links',
      seoDescription:
        'Adding review links for Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor and other platforms, the redirect threshold and the daily link checks.',
    },
  },
  {
    slug: 'team-roles',
    icon: 'team',
    tr: {
      title: 'Ekip ve roller',
      desc: 'Davet, yönetici, personel ve görüntüleyici rolleri, birden çok işletme.',
      seoTitle: 'Ekip ve roller: davet, yetki ve çoklu işletme',
      seoDescription:
        'Ekip arkadaşlarını e-postayla davet etme (davet 7 gün geçerli), yönetici, personel ve görüntüleyici rolleri, işletme erişimi ve çok şubeli işletmeler.',
    },
    en: {
      title: 'Team and roles',
      desc: 'Invites, the manager, staff and viewer roles, and several businesses.',
      seoTitle: 'Team and roles: invites, permissions and businesses',
      seoDescription:
        'Inviting teammates by e-mail (invites last 7 days), the manager, staff and viewer roles, choosing which businesses they see and running several branches.',
    },
  },
  {
    slug: 'billing',
    icon: 'billing',
    tr: {
      title: 'Faturalandırma',
      desc: '14 günlük deneme, aylık abonelik, faturalar ve iptal.',
      seoTitle: 'Faturalandırma: deneme, abonelik, fatura ve iptal',
      seoDescription:
        'Kredi kartı istemeyen 14 günlük ücretsiz deneme, USD ile aylık abonelik, faturaları görme, kartı değiştirme, aboneliği iptal etme ve yıllık ödeme.',
    },
    en: {
      title: 'Billing',
      desc: 'The 14-day trial, monthly subscription, invoices and cancelling.',
      seoTitle: 'Billing: trial, plans, invoices and cancelling',
      seoDescription:
        'The 14-day free trial with no credit card, monthly subscriptions in USD, viewing invoices, changing your card, cancelling your plan and paying yearly.',
    },
  },
  {
    slug: 'security-kvkk',
    icon: 'security',
    tr: {
      title: 'Güvenlik ve KVKK',
      desc: 'Onaylar, veri saklama, dışa aktarma, oturumlar ve hesap güvenliği.',
      seoTitle: 'Güvenlik ve KVKK: onaylar, saklama ve oturumlar',
      seoDescription:
        'Müşteri onayları ve toplanan veriler, IP adreslerinin 90 gün sonra anonimleştirilmesi, dışa aktarılan dosyalar, oturum yönetimi ve hesap silme.',
    },
    en: {
      title: 'Security and privacy',
      desc: 'Consent, data retention, exports, sessions and account security.',
      seoTitle: 'Security and privacy: consent, retention, sessions',
      seoDescription:
        'Customer consent and the data collected, IP addresses anonymised after 90 days, exported files, managing sessions and deleting your account.',
    },
  },
];

export const CATEGORY_BY_SLUG: Record<string, HelpCategoryMeta> = Object.fromEntries(
  HELP_CATEGORIES.map((c) => [c.slug, c]),
);

export type Locale = 'tr' | 'en';

export function categoryLabel(slug: string, locale: Locale): string {
  return CATEGORY_BY_SLUG[slug]?.[locale].title ?? slug;
}
