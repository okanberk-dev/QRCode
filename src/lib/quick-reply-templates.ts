// Phase 8c+ §38.33 — HIZLI YANIT ŞABLONLARI helper. Tasarım kaynağı:
// .design-owner-2026/project/page-google.jsx line 235-252 (4 template list).
//
// Kullanıcı kararı (CLAUDE.md §38.33): static 4 şablon (kod-içi) — yeni
// QuickReplyTemplate schema YOK. CLAUDE.md §15 buildReplyTemplate ile uyumlu;
// owner click → composer textarea'ya prefill. ${customerName} +
// ${restaurantName} placeholder substitute (KVKK fallback "Müşteri").

export type QuickReplyKey =
  | 'positive_thanks'
  | 'low_rating_apology'
  | 'complaint_callback'
  | 'birthday_thanks';

export type QuickReplyTone = 'warm' | 'apologetic' | 'formal';

interface TemplateBody {
  tr: string;
  en: string;
  tone: QuickReplyTone;
  /** UI label (SettingsCard list satırı). */
  labelTr: string;
  labelEn: string;
}

const TEMPLATES: Record<QuickReplyKey, TemplateBody> = {
  positive_thanks: {
    labelTr: 'Pozitif yorum teşekkürü',
    labelEn: 'Positive review thanks',
    tone: 'warm',
    tr: `Merhaba \${customerName}, güzel yorumunuz için teşekkür ederiz. \${restaurantName} ekibi olarak sizi yeniden ağırlamak için sabırsızlanıyoruz. Tavsiyeniz bizim için çok değerli.`,
    en: `Hi \${customerName}, thank you for your kind review. The \${restaurantName} team can't wait to host you again. Your recommendation means a lot to us.`,
  },
  low_rating_apology: {
    labelTr: 'Düşük puan özrü',
    labelEn: 'Low rating apology',
    tone: 'apologetic',
    tr: `Sayın \${customerName}, yaşadığınız deneyim için içtenlikle özür dileriz. Geri bildiriminizi \${restaurantName} mutfak ve servis ekibiyle paylaştık; bir sonraki ziyaretinizde fark edeceğinize eminiz.`,
    en: `Dear \${customerName}, we sincerely apologize for the experience you had. We've shared your feedback with the \${restaurantName} kitchen and service team and we're confident you'll notice the difference on your next visit.`,
  },
  complaint_callback: {
    labelTr: 'Şikayet sahibine arama',
    labelEn: 'Complaint callback',
    tone: 'formal',
    tr: `Sayın \${customerName}, yorumunuzu titizlikle değerlendirdik. \${restaurantName} olarak sizinle doğrudan iletişime geçip detayları konuşmak istiyoruz. Uygun olduğunuz bir saat için bize iletişim bilgilerinizi gönderirseniz mutlu oluruz.`,
    en: `Dear \${customerName}, we have carefully reviewed your feedback. We at \${restaurantName} would like to reach out directly to discuss the details. If you can share a convenient time and contact, we'd be glad to follow up.`,
  },
  birthday_thanks: {
    labelTr: 'Doğum günü teşekkürü',
    labelEn: 'Birthday thanks',
    tone: 'warm',
    tr: `\${customerName}, özel gününüzde \${restaurantName}'ı tercih ettiğiniz için teşekkür ederiz. Anılarınıza küçük bir dokunuş yapabildiysek ne mutlu bize. Bir sonraki kutlamanızda da yanınızda olmak isteriz.`,
    en: `\${customerName}, thank you for choosing \${restaurantName} on your special day. We're glad if we could add a little touch to your memories — we'd love to be part of your next celebration as well.`,
  },
};

export interface QuickReplyContext {
  /** KVKK consent → Anonim (null/false) ise "Müşteri"/"Customer" fallback. */
  customerName?: string | null;
  /** Restoran adı placeholder substitute. */
  restaurantName?: string | null;
  /** KVKK consent flag — false ise customerName ifşa edilmez. */
  hasKvkkConsent?: boolean | null;
}

export interface QuickReplyMeta {
  key: QuickReplyKey;
  label: string;
  tone: QuickReplyTone;
}

const FALLBACK = {
  tr: { customer: 'Müşteri', restaurant: 'Ekibimiz' },
  en: { customer: 'Customer', restaurant: 'Our team' },
} as const;

/** UI list metadata — 4 şablon iterate sırası tasarımdaki sıraya sadık. */
export function listQuickReplyTemplates(locale: 'tr' | 'en' = 'tr'): QuickReplyMeta[] {
  const isTr = locale === 'tr';
  return (Object.keys(TEMPLATES) as QuickReplyKey[]).map((key) => ({
    key,
    label: isTr ? TEMPLATES[key].labelTr : TEMPLATES[key].labelEn,
    tone: TEMPLATES[key].tone,
  }));
}

/** Ana helper — composer textarea'ya prefill için kullanılır. */
export function getQuickReplyTemplate(
  key: QuickReplyKey,
  locale: 'tr' | 'en' = 'tr',
  context: QuickReplyContext = {},
): string {
  const isTr = locale === 'tr';
  const template = TEMPLATES[key];
  if (!template) return '';
  const body = isTr ? template.tr : template.en;
  const fallback = isTr ? FALLBACK.tr : FALLBACK.en;

  // KVKK consent guard: explicit false veya hasKvkkConsent null ise
  // customerName ifşa etme (anonim feedback).
  const consentGiven =
    context.hasKvkkConsent !== false && context.hasKvkkConsent !== null;
  const customerName =
    consentGiven && context.customerName?.trim()
      ? context.customerName.trim()
      : fallback.customer;
  const restaurantName = context.restaurantName?.trim() || fallback.restaurant;

  return body
    .replace(/\$\{customerName\}/g, customerName)
    .replace(/\$\{restaurantName\}/g, restaurantName);
}
