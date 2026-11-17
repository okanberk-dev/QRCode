/**
 * Display names for DB-driven mail templates (one entry per
 * SUPPORTED_MAIL_KEYS key in src/lib/email/copy-loader.ts). Shared by the
 * /admin/mail-templates list and MailTemplateEditor so the two can't drift —
 * a missing key shows up as a raw kebab-case title in the list.
 */
export const MAIL_TEMPLATE_LABELS: Record<string, string> = {
  welcome: 'Hoş geldin',
  newsletter: 'Aylık bülten',
  'trial-ending': 'Deneme bitiyor',
  'forgot-password': 'Şifre sıfırlama',
  'low-rating-alert': 'Düşük puan uyarısı',
  'new-review': 'Yeni 5★ yorum',
  'weekly-report': 'Haftalık rapor',
  'customer-reply': 'Müşteri yanıtı',
  'form-confirmation': 'Form onayı',
  'verify-email': 'E-posta onayı',
  'roi-customer-report': 'ROI raporu (müşteri)',
  'roi-admin-notification': 'ROI lead (admin)',
  'qr-not-downloaded': 'QR indirilmedi',
  'first-feedback-tips': 'İlk yorum rehberi',
  'upgrade-suggestion': 'Plan yükseltme önerisi',
  'audit-completed': 'Denetim tamamlandı',
  'password-changed': 'Şifre değişti (güvenlik)',
  'team-member-joined': 'Yeni ekip üyesi',
  'account-deletion-scheduled': 'Hesap silme planlandı',
  'account-deletion-canceled': 'Hesap silme iptal',
  'rating-drop-alert': 'Puan düşüşü uyarısı',
  'data-export-confirmation': 'KVKK veri indirme onayı',
};
