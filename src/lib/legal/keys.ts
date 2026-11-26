/**
 * Legal document type catalogue (CLAUDE.md §32).
 *
 * Sabit slug'lar — public sayfa URL'leri ve admin panel route'ları bu
 * key'leri kullanır. Yeni bir tür eklemek için:
 *  1) Bu listeye slug ekle
 *  2) `LEGAL_DOCUMENT_LABELS` haritasına TR/EN label ekle
 *  3) `seed-legal-documents.ts` script'inde default içerik ekle
 *  4) Public sayfa route'u `/[locale]/<slug>/page.tsx` ekle (gerekirse)
 *
 * Not: Slug'lar URL-safe + dosya yolu uyumlu (kebab-case, no diacritics).
 */
export const LEGAL_DOCUMENT_KEYS = [
  'kvkk-aydinlatma',
  'acik-riza',
  'gizlilik-politikasi',
  'kullanim-sartlari',
  'cerez-politikasi',
  'ticari-ileti',
  'kullanim-sozlesmesi',
  'mesafeli-hizmet-sozlesmesi',
  'iade-iptal-politikasi',
  'veri-isleyici-sozlesmesi',
  'kabul-edilebilir-kullanim',
  'icerik-moderasyon',
  'veri-ihlali-mudahale',
  // Loyalty card + customer account (CLAUDE.md §60, §61).
  'sadakat-uyelik-kosullari',
  'sadakat-aydinlatma',
  'musteri-hesabi-kosullari',
  'musteri-hesabi-aydinlatma',
  'sadakat-isletme-eki',
] as const;

export type LegalDocumentKey = (typeof LEGAL_DOCUMENT_KEYS)[number];

export const LEGAL_LOCALES = ['tr', 'en'] as const;
export type LegalLocale = (typeof LEGAL_LOCALES)[number];

export function isSupportedLegalKey(key: string): key is LegalDocumentKey {
  return (LEGAL_DOCUMENT_KEYS as readonly string[]).includes(key);
}

export function isSupportedLegalLocale(locale: string): locale is LegalLocale {
  return (LEGAL_LOCALES as readonly string[]).includes(locale);
}

/**
 * Admin panel + public surface label'ları. Kanonik kullanım. Yeni slug
 * eklerken her iki dilde label girilmeli. EN value `en` locale'de gösterilir,
 * TR value `tr` locale'de.
 */
export const LEGAL_DOCUMENT_LABELS: Record<
  LegalDocumentKey,
  { tr: string; en: string }
> = {
  'kvkk-aydinlatma': {
    tr: 'KVKK Aydınlatma Metni',
    en: 'KVKK Privacy Notice',
  },
  'acik-riza': {
    tr: 'Açık Rıza Metni',
    en: 'Explicit Consent Statement',
  },
  'gizlilik-politikasi': {
    tr: 'Gizlilik Politikası',
    en: 'Privacy Policy',
  },
  'kullanim-sartlari': {
    tr: 'Kullanım Şartları',
    en: 'Terms of Service',
  },
  'cerez-politikasi': {
    tr: 'Çerez Politikası',
    en: 'Cookie Policy',
  },
  'ticari-ileti': {
    tr: 'Ticari Elektronik İleti İzni',
    en: 'Commercial Electronic Message Consent',
  },
  'kullanim-sozlesmesi': {
    tr: 'Platform Kullanım Sözleşmesi',
    en: 'Platform User Agreement',
  },
  'mesafeli-hizmet-sozlesmesi': {
    tr: 'Mesafeli Hizmet Sözleşmesi',
    en: 'Distance Services Agreement',
  },
  'iade-iptal-politikasi': {
    tr: 'İade ve İptal Politikası',
    en: 'Refund & Cancellation Policy',
  },
  'veri-isleyici-sozlesmesi': {
    tr: 'Veri İşleyici Sözleşmesi (DPA)',
    en: 'Data Processing Agreement (DPA)',
  },
  'kabul-edilebilir-kullanim': {
    tr: 'Kabul Edilebilir Kullanım Politikası',
    en: 'Acceptable Use Policy',
  },
  'icerik-moderasyon': {
    tr: 'İçerik Moderasyon ve Şikâyet Politikası',
    en: 'Content Moderation & Complaints Policy',
  },
  'veri-ihlali-mudahale': {
    tr: 'Veri İhlali Müdahale Politikası',
    en: 'Data Breach Response Policy',
  },
  'sadakat-uyelik-kosullari': {
    tr: 'Sadakat Programı Üyelik Koşulları',
    en: 'Loyalty Programme Membership Terms',
  },
  'sadakat-aydinlatma': {
    tr: 'Sadakat Programı Aydınlatma Metni',
    en: 'Loyalty Programme Privacy Notice',
  },
  'musteri-hesabi-kosullari': {
    tr: 'Müşteri Hesabı Kullanım Koşulları',
    en: 'Customer Account Terms',
  },
  'musteri-hesabi-aydinlatma': {
    tr: 'Müşteri Hesabı Aydınlatma Metni',
    en: 'Customer Account Privacy Notice',
  },
  'sadakat-isletme-eki': {
    tr: 'Sadakat Programı İşletme Eki',
    en: 'Loyalty Programme Business Addendum',
  },
};

/**
 * Kısa açıklama — admin paneli liste kartlarında küçük metin.
 */
export const LEGAL_DOCUMENT_DESCRIPTIONS: Record<
  LegalDocumentKey,
  { tr: string; en: string }
> = {
  'kvkk-aydinlatma': {
    tr: 'KVKK m.10 kapsamında veri sorumlusunun aydınlatma yükümlülüğünü karşılayan metin.',
    en: 'Data controller clarification text under KVKK Article 10.',
  },
  'acik-riza': {
    tr: 'KVKK m.5/1 kapsamında işleme için kullanıcının açık rızasını belgeleyen metin.',
    en: 'Explicit consent statement for processing under KVKK Art. 5/1.',
  },
  'gizlilik-politikasi': {
    tr: 'Platformun veri toplama, saklama ve paylaşım pratiklerini özetleyen public politika.',
    en: 'Public-facing summary of platform data practices.',
  },
  'kullanim-sartlari': {
    tr: 'Hizmet kullanımına ilişkin genel hak ve yükümlülükler (TBK çerçeveli).',
    en: 'General rights and obligations covering service use.',
  },
  'cerez-politikasi': {
    tr: 'ePrivacy + KVKK uyumlu çerez kullanım açıklaması (kategoriler ve süreler).',
    en: 'ePrivacy + KVKK-compliant cookie usage statement.',
  },
  'ticari-ileti': {
    tr: 'ETK m.6 kapsamında SMS / e-posta / arama izninin koşulları + İYS bilgisi.',
    en: 'Marketing communication consent under ETK Art. 6 + IYS info.',
  },
  'kullanim-sozlesmesi': {
    tr: 'Buaze ile işletme arasındaki SaaS hizmet sözleşmesi (ödeme, SLA, fesih).',
    en: 'SaaS service agreement between Buaze and business operator.',
  },
  'mesafeli-hizmet-sozlesmesi': {
    tr: 'TKHK + Mesafeli Sözleşmeler Yönetmeliği uyarınca ön bilgilendirme + mesafeli sözleşme.',
    en: 'Pre-contract info + distance contract under Turkish consumer law.',
  },
  'iade-iptal-politikasi': {
    tr: 'Cayma hakkı, abonelik iptali, kısmi iade ve ödeme iadesi süreçlerinin operasyonel rehberi.',
    en: 'Operational guide for withdrawal, cancellation, pro-rata refund and payment processing.',
  },
  'veri-isleyici-sozlesmesi': {
    tr: 'KVKK m.12 kapsamında müşteri verilerinin işlenmesine dair veri işleyici sözleşmesi.',
    en: 'Data processor agreement under KVKK Art.12 for processing customer data.',
  },
  'kabul-edilebilir-kullanim': {
    tr: 'Yasaklı içerik, sahte yorum ve kötüye kullanım kuralları + ihlal halinde fesih hakkı.',
    en: 'Prohibited content, fake review and abuse rules + termination on breach.',
  },
  'icerik-moderasyon': {
    tr: '5651 m.5 yer sağlayıcı çerçevesinde uyar-kaldır prosedürü ve şikâyet kanalları.',
    en: 'Notice-and-takedown procedure under Internet Law Art.5 + complaints channels.',
  },
  'veri-ihlali-mudahale': {
    tr: '72 saat içinde KVKK Kuruluna bildirim ve etkilenen kişilere haber verme prosedürü.',
    en: '72-hour KVKK Authority notification + data-subject notice procedure.',
  },
  'sadakat-uyelik-kosullari': {
    tr: 'Sadakat kartı üyesi ile işletme arasındaki koşullar; her işletmenin sayfasında işletme bilgileriyle gösterilir.',
    en: 'Terms between a loyalty member and the business; shown with each business’s details.',
  },
  'sadakat-aydinlatma': {
    tr: 'Veri sorumlusu işletme olan sadakat programı aydınlatma metni (KVKK m. 10).',
    en: 'Loyalty programme privacy notice with the business as controller (KVKK Art. 10).',
  },
  'musteri-hesabi-kosullari': {
    tr: 'Buaze müşteri hesabının (tüm kartlar tek yerde) kullanım koşulları.',
    en: 'Terms of the Buaze customer account (all cards in one place).',
  },
  'musteri-hesabi-aydinlatma': {
    tr: 'Veri sorumlusu Buaze olan müşteri hesabı aydınlatma metni (KVKK m. 10).',
    en: 'Customer account privacy notice with Buaze as controller (KVKK Art. 10).',
  },
  'sadakat-isletme-eki': {
    tr: 'Sadakat kartını kullanan işletmenin veri sorumluluğu, ödül ve ticari ileti yükümlülükleri.',
    en: 'Controllership, reward and marketing obligations of a business using the loyalty card.',
  },
};

/**
 * Public surface URL slug → consent source mapping. ConsentLog.source
 * field'ında saklanır, hangi UI'dan geldiği belli olur.
 */
export type ConsentSource =
  | 'review_form'
  | 'register'
  | 'register_business'
  | 'onboarding'
  | 'newsletter'
  | 'contact'
  | 'admin'
  | 'loyalty_join'
  | 'customer_register'
  | 'customer_google'
  | 'loyalty_owner';

/**
 * Subject (consenter) type — polymorphic actor.
 */
export type ConsentSubjectType = 'user' | 'feedback' | 'email' | 'admin' | 'loyalty_member' | 'customer_account';
