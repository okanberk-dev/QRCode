import {
  BarChart3,
  ClipboardCheck,
  Gift,
  Link2,
  ListChecks,
  MessageSquareText,
  QrCode,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

/**
 * Every product surface the /features hub lists, with copy that is true for
 * the product today (checked against the code, spec §2/§3). The hub renders
 * the full catalog; each feature page picks three entries for its "related
 * features" block, so a surface is described the same way everywhere.
 *
 * Paths are relative to /{locale}. Platform links live on /integrations and
 * the free generator on /solutions/qr-generator (no /features page of their
 * own).
 */

export type FeatureId =
  | 'review-management'
  | 'pulse-ai'
  | 'analytics-reports'
  | 'menu'
  | 'surveys'
  | 'loyalty'
  | 'audit-center'
  | 'platform-links'
  | 'qr-generator';

type Localized = { tr: string; en: string };

export interface FeatureCatalogEntry {
  id: FeatureId;
  /** Path after /{locale}. */
  path: string;
  icon: LucideIcon;
  group: 'feedback' | 'operations' | 'free';
  name: Localized;
  /** Two or three sentences for the hub card. */
  summary: Localized;
  /** One sentence for "related features" cards. */
  short: Localized;
  linkLabel: Localized;
}

export const FEATURE_CATALOG: readonly FeatureCatalogEntry[] = [
  {
    id: 'review-management',
    path: '/features/review-management',
    icon: MessageSquareText,
    group: 'feedback',
    name: { tr: 'Yorum yönetimi', en: 'Review management' },
    summary: {
      tr: 'Müşterilerinizin QR kodla bıraktığı puan ve yorumlar tek gelen kutusunda toplanır. 1–3 yıldızlık geri bildirimde anında e-posta alırsınız; müşteri e-posta adresini bıraktıysa yanıtınız ona e-postayla gider. Google işletme profilinizin puanını, yorum sayısını ve Google’ın paylaştığı en fazla 5 yorumu da panelde görürsünüz.',
      en: 'The ratings and comments your customers leave through your QR codes land in one inbox. You get an instant e-mail for 1–3★ feedback and, when the customer left an address, you reply by e-mail. Your Google Business Profile rating, review count and up to 5 reviews Google shares also appear in the panel.',
    },
    short: {
      tr: 'QR kodla gelen puan ve yorumlar tek gelen kutusunda; düşük puanda anında e-posta.',
      en: 'Ratings and comments from your QR codes in one inbox, with an instant e-mail for low ratings.',
    },
    linkLabel: { tr: 'Yorum yönetimini inceleyin', en: 'Explore review management' },
  },
  {
    id: 'pulse-ai',
    path: '/features/pulse-ai',
    icon: Sparkles,
    group: 'feedback',
    name: { tr: 'Pulse AI', en: 'Pulse AI' },
    summary: {
      tr: 'Düşük puanlı geri bildirime sıcak, resmi ya da özür dileyen tonda 2–4 cümlelik bir yanıt taslağı hazırlar. Taslaklar Türkçe ya da İngilizcedir; taslağı siz düzenler, onaylar ve gönderirsiniz.',
      en: 'Drafts a 2–4 sentence reply to low-rated feedback in a warm, formal or apologetic tone. Drafts are in Turkish or English; you edit them, approve them and send them yourself.',
    },
    short: {
      tr: 'Düşük puanlı geri bildirime seçtiğiniz tonda yanıt taslağı; onayınız olmadan gönderilmez.',
      en: 'Reply drafts for low-rated feedback in the tone you choose; nothing goes out without your approval.',
    },
    linkLabel: { tr: 'Pulse AI’ı inceleyin', en: 'Explore Pulse AI' },
  },
  {
    id: 'analytics-reports',
    path: '/features/analytics-reports',
    icon: BarChart3,
    group: 'feedback',
    name: { tr: 'Analitik ve raporlar', en: 'Analytics and reports' },
    summary: {
      tr: 'Son 7, 30 ya da 90 gün, son 12 ay veya seçtiğiniz bir aralık için yorum sayısını, ortalama puanı, yanıt süresini ve puanlardan tahmini NPS’i izleyin. Geri bildirimlerin hangi gün ve saatlerde yoğunlaştığını görün, raporu CSV olarak indirin; her pazartesi haftalık özet e-postası gelir.',
      en: 'Track review count, average rating, reply time and NPS estimated from ratings for the last 7, 30 or 90 days, the last 12 months or a range you pick. See the days and hours when feedback peaks, export the report as CSV and get a weekly summary e-mail every Monday.',
    },
    short: {
      tr: 'Yorum sayısı, ortalama puan, yanıt süresi ve tahmini NPS; CSV rapor ve haftalık özet.',
      en: 'Review count, average rating, reply time and estimated NPS, with CSV export and a weekly summary.',
    },
    linkLabel: { tr: 'Analitiği inceleyin', en: 'Explore analytics' },
  },
  {
    id: 'platform-links',
    path: '/integrations',
    icon: Link2,
    group: 'feedback',
    name: { tr: 'Platform bağlantıları', en: 'Platform links' },
    summary: {
      tr: 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare yorum sayfalarının bağlantısını tek yerden yönetin; bağlantılar her gün otomatik kontrol edilir. Buaze bu platformlardan yorum çekmez, müşterinin yorum yazacağı sayfanın bağlantısını tutar.',
      en: 'Manage the review-page links for Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare in one place; the links are checked automatically every day. Buaze does not import reviews from these platforms; it keeps the link to the page where the customer writes the review.',
    },
    short: {
      tr: '10 yorum platformunun bağlantısı tek yerde; her gün otomatik kontrol.',
      en: 'Links to 10 review platforms in one place, checked automatically every day.',
    },
    linkLabel: { tr: 'Platform bağlantılarını inceleyin', en: 'Explore platform links' },
  },
  {
    id: 'menu',
    path: '/features/menu',
    icon: UtensilsCrossed,
    group: 'operations',
    name: { tr: 'QR Menü', en: 'QR Menu' },
    summary: {
      tr: 'Sürükle-bırak düzenleyiciyle dijital menünüzü kurun: 7 tema, ürün görselleri, 12 rozet ve 12 alerjen etiketi. Menüye özel QR kodu PNG ya da SVG olarak indirir, hangi ürünün ilgi gördüğünü menü analitiğinde izlersiniz.',
      en: 'Build your digital menu with a drag-and-drop editor: 7 themes, product photos, 12 badges and 12 allergen labels. Download a dedicated menu QR code as PNG or SVG and see which items get attention in menu analytics.',
    },
    short: {
      tr: '7 temalı dijital menü, menüye özel QR kod ve menü analitiği.',
      en: 'A digital menu with 7 themes, its own QR code and menu analytics.',
    },
    linkLabel: { tr: 'QR Menü’yü inceleyin', en: 'Explore QR Menu' },
  },
  {
    id: 'surveys',
    path: '/features/surveys',
    icon: ListChecks,
    group: 'operations',
    name: { tr: 'Anketler', en: 'Surveys' },
    summary: {
      tr: 'Yıldız, 0–10 tavsiye (NPS), metin ve çoktan seçmeli sorularla kısa anketler hazırlayın; isterseniz 8 hazır şablondan birinden başlayın. Anketi QR kod ya da bağlantıyla paylaşır, yanıtları panelde okur ve CSV olarak indirirsiniz.',
      en: 'Create short surveys with star, 0–10 recommend (NPS), text and multiple-choice questions, starting from one of 8 templates if you like. Share them by QR code or link, read the answers in the panel and export them as CSV.',
    },
    short: {
      tr: 'QR kodla açılan kısa anketler; 0–10 tavsiye sorusu ve 8 hazır şablon.',
      en: 'Short surveys that open with a QR code, with a 0–10 recommend question and 8 templates.',
    },
    linkLabel: { tr: 'Anketleri inceleyin', en: 'Explore surveys' },
  },
  {
    id: 'loyalty',
    path: '/features/loyalty',
    icon: Gift,
    group: 'operations',
    name: { tr: 'Sadakat kartı', en: 'Loyalty card' },
    summary: {
      tr: 'Kafe, restoran, berber ve salonlar için dijital damga ya da puan kartı. Müşteri kasadaki QR ile kartını telefonunda açar; siz panelin kasa ekranından ziyaret ekler, ödülü verirsiniz. Seviyeler, doğum günü hediyesi, bakiye süresi ve 6 hazır şablon vardır.',
      en: 'A digital stamp or points card for cafés, restaurants, barbers and salons. Customers open it on their phone with the QR at the counter; you add visits and give rewards from the counter screen in the panel. Tiers, a birthday gift, balance expiry and 6 ready templates included.',
    },
    short: {
      tr: 'Uygulamasız dijital damga ya da puan kartı; kasada okutup ödülü verirsiniz.',
      en: 'An app-free digital stamp or points card you scan and reward at the counter.',
    },
    linkLabel: { tr: 'Sadakat kartını inceleyin', en: 'Explore the loyalty card' },
  },
  {
    id: 'audit-center',
    path: '/features/audit-center',
    icon: ClipboardCheck,
    group: 'operations',
    name: { tr: 'Denetim Merkezi', en: 'Audit Center' },
    summary: {
      tr: 'Hijyen, açılış ve vardiya devri kontrol listelerini ya da işe alım testlerini hazır şablonlardan (şu an Türkçe) veya sıfırdan oluşturun. Ekibiniz giriş yapmadan telefondan doldurur; puanı ve en sık sorun çıkan maddeleri siz görürsünüz.',
      en: 'Set up hygiene, opening and shift-handover checklists and hiring tests from scratch or from ready templates (currently in Turkish). Your team fills them in on a phone without logging in, and you see the score and the items that fail most often.',
    },
    short: {
      tr: 'Kontrol listeleri ve testler; ekibiniz telefondan doldurur, puanı siz görürsünüz.',
      en: 'Checklists and tests your team fills in on a phone, scored for you.',
    },
    linkLabel: { tr: 'Denetim Merkezi’ni inceleyin', en: 'Explore the Audit Center' },
  },
  {
    id: 'qr-generator',
    path: '/solutions/qr-generator',
    icon: QrCode,
    group: 'free',
    name: { tr: 'Ücretsiz QR kod oluşturucu', en: 'Free QR code generator' },
    summary: {
      tr: 'Hesap açmadan statik bir QR kod oluşturun, 4 kart temasından birini seçip PNG olarak indirin ya da A5 boyutunda PDF olarak yazdırın. Statik kodun taramaları takip edilmez; geri bildirim toplamak için QR kodunuzu panelde oluşturursunuz.',
      en: 'Make a static QR code without an account, pick one of 4 card themes and download it as PNG or print it as an A5 PDF. Scans of a static code are not tracked; to collect feedback, you create your QR code in the panel.',
    },
    short: {
      tr: 'Hesap açmadan statik QR kod; 4 kart teması, PNG indirme ve PDF yazdırma.',
      en: 'A static QR code without an account; 4 card themes, PNG download and PDF printing.',
    },
    linkLabel: { tr: 'QR kod oluşturun', en: 'Create a QR code' },
  },
];

export function getFeature(id: FeatureId): FeatureCatalogEntry {
  const entry = FEATURE_CATALOG.find((f) => f.id === id);
  if (!entry) throw new Error(`Unknown feature id: ${id}`);
  return entry;
}

/** "Related features" cards for a page: name + one sentence + link. */
export function relatedFeatureLinks(ids: readonly FeatureId[], locale: 'tr' | 'en') {
  return ids.map((id) => {
    const entry = getFeature(id);
    return {
      href: `/${locale}${entry.path}`,
      title: entry.name[locale],
      body: entry.short[locale],
      label: entry.linkLabel[locale],
      icon: entry.icon,
    };
  });
}
