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
  | 'admin';

/**
 * Subject (consenter) type — polymorphic actor.
 */
export type ConsentSubjectType = 'user' | 'feedback' | 'email' | 'admin';
