// Prisma-free action labels for audit log rows (see audit-log.ts). Imported
// by client components, so this file must never import server-only modules.

/**
 * Action label resolver — Buaze internal action keys (e.g. `admin.users.update`)
 * mapped to human-readable TR/EN labels. Used by both admin viewer and owner
 * KVKK transparency surface.
 *
 * Unknown action codes fall through with the raw key (forensic — superadmin
 * can spot new audit actions in the wild before label is added).
 */
export const ACTION_LABELS: Record<string, { tr: string; en: string }> = {
  // Member (User restaurant_owner) lifecycle
  'admin.members.create': {
    tr: 'Yeni hesap oluşturuldu',
    en: 'Account created',
  },
  'admin.members.deactivate': {
    tr: 'Hesap pasifleştirildi',
    en: 'Account deactivated',
  },
  'admin.members.reactivate': {
    tr: 'Hesap yeniden aktive edildi',
    en: 'Account reactivated',
  },
  'admin.members.send_password_reset': {
    tr: 'Şifre sıfırlama maili gönderildi',
    en: 'Password reset email sent',
  },
  'admin.billing.update': {
    tr: 'Faturalandırma güncellendi',
    en: 'Billing updated',
  },
  'admin.invoice.create': { tr: 'Yeni fatura eklendi', en: 'Invoice created' },
  'admin.invoice.update': { tr: 'Fatura düzenlendi', en: 'Invoice updated' },
  'admin.invoice.delete': { tr: 'Fatura silindi', en: 'Invoice deleted' },
  // Admin user (AdminUser) lifecycle
  'admin.users.create': { tr: 'Yönetici hesabı eklendi', en: 'Admin user created' },
  'admin.users.update': {
    tr: 'Yönetici hesabı güncellendi',
    en: 'Admin user updated',
  },
  'admin.users.delete': {
    tr: 'Yönetici hesabı silindi',
    en: 'Admin user deleted',
  },
  // Restaurant lifecycle
  'admin.restaurants.create': { tr: 'Yeni restoran eklendi', en: 'Restaurant created' },
  'admin.restaurants.update': { tr: 'Restoran güncellendi', en: 'Restaurant updated' },
  'admin.restaurants.delete': { tr: 'Restoran silindi', en: 'Restaurant deleted' },
  'admin.restaurants.feature_access': {
    tr: 'Paket özellik erişimi güncellendi',
    en: 'Feature access updated',
  },
  // Permission grants (Stage A2 §38.94)
  'admin.permission.grant': { tr: 'Yetki verildi', en: 'Permission granted' },
  'admin.permission.revoke': { tr: 'Yetki geri alındı', en: 'Permission revoked' },
  // Bulk operations (Stage A5 §38.97)
  'admin.restaurants.bulk.activate': {
    tr: 'Toplu işletme aktivasyonu',
    en: 'Bulk restaurant activation',
  },
  'admin.restaurants.bulk.deactivate': {
    tr: 'Toplu işletme pasifleştirildi',
    en: 'Bulk restaurant deactivation',
  },
  'admin.restaurants.bulk.feature_override': {
    tr: 'Toplu özellik geçişi',
    en: 'Bulk feature override',
  },
  'admin.owners.bulk.send_email': {
    tr: 'Toplu e-posta gönderildi (işletme sahipleri)',
    en: 'Bulk email sent (owners)',
  },
  // Owner-side actions (logged when owner self-modifies)
  'user.password.change': { tr: 'Şifre değiştirildi', en: 'Password changed' },
  'user.profile.update': { tr: 'Profil güncellendi', en: 'Profile updated' },
  'user.feedback.reply': { tr: 'Yoruma yanıt verildi', en: 'Feedback replied' },
  // Owner campaigns (Stage §38.99)
  'owner.campaigns.create': {
    tr: 'Kampanya oluşturuldu',
    en: 'Campaign created',
  },
  'owner.campaigns.send': {
    tr: 'Kampanya gönderildi',
    en: 'Campaign sent',
  },
  'owner.campaigns.delete': {
    tr: 'Kampanya silindi',
    en: 'Campaign deleted',
  },
  // Stage 29 §38.105 — campaign moderation pipeline.
  // Owner submit → admin approve/reject → Resend send (admin-triggered).
  // submit/send action'ları AdminAuditLog'a actorSource='user' olarak yazılır
  // (owner aksiyonu); approve/reject actorSource='admin' (admin aksiyonu).
  'admin.campaign.submit': {
    tr: 'Kampanya onaya gönderildi',
    en: 'Campaign submitted for approval',
  },
  'admin.campaign.approve': {
    tr: 'Kampanya onaylandı',
    en: 'Campaign approved',
  },
  'admin.campaign.reject': {
    tr: 'Kampanya reddedildi',
    en: 'Campaign rejected',
  },
  'admin.campaign.send': {
    tr: 'Kampanya gönderildi (admin)',
    en: 'Campaign sent (admin)',
  },
  // Actions written by newer routes (audits, impersonation, owner-side
  // writes via writePanelAuditLog). Shared here so the admin viewer, the
  // CSV export and the owner activity log all show the same text.
  'admin.audits.categories.create': { tr: 'Denetim kategorisi oluşturuldu', en: 'Audit category created' },
  'admin.audits.categories.update': { tr: 'Denetim kategorisi güncellendi', en: 'Audit category updated' },
  'admin.audits.categories.delete': { tr: 'Denetim kategorisi silindi', en: 'Audit category deleted' },
  'admin.audits.templates.create': { tr: 'Denetim şablonu oluşturuldu', en: 'Audit template created' },
  'admin.audits.templates.update': { tr: 'Denetim şablonu güncellendi', en: 'Audit template updated' },
  'admin.audits.templates.delete': { tr: 'Denetim şablonu silindi', en: 'Audit template deleted' },
  'admin.audits.templates.publish': { tr: 'Denetim şablonu yayınlandı', en: 'Audit template published' },
  'admin.audits.templates.unpublish': { tr: 'Denetim şablonu yayından kaldırıldı', en: 'Audit template unpublished' },
  'admin.customers.hard_delete': { tr: 'Müşteri kaydı kalıcı olarak silindi', en: 'Customer record permanently deleted' },
  'admin.impersonate.start': { tr: 'İşletme sahibi gözünden görüntüleme başladı', en: 'Viewing as owner started' },
  'admin.impersonate.end': { tr: 'İşletme sahibi gözünden görüntüleme bitti', en: 'Viewing as owner ended' },
  'admin.members.update': { tr: 'İşletme sahibi güncellendi', en: 'Owner updated' },
  'admin.members.hard_delete': { tr: 'İşletme sahibi kalıcı olarak silindi', en: 'Owner permanently deleted' },
  'admin.newsletters.trigger': { tr: 'Bülten gönderimi elle başlatıldı', en: 'Newsletter send started manually' },
  'admin.restaurants.menu_settings': { tr: 'İşletme menü erişimi değiştirildi', en: 'Business menu access changed' },
  'admin.restaurants.menu_theme_update': { tr: 'İşletme menü teması güncellendi', en: 'Business menu theme updated' },
  'cron.account.scheduled_delete': { tr: 'Planlanan hesap silme uygulandı', en: 'Scheduled account deletion applied' },
  'owner.account.deletion_scheduled': { tr: 'Hesap silme planlandı', en: 'Account deletion scheduled' },
  'owner.account.deletion_canceled': { tr: 'Hesap silme talebi iptal edildi', en: 'Account deletion canceled' },
  'owner.account.security_update': { tr: 'Hesap güvenlik ayarları güncellendi', en: 'Account security settings updated' },
  'owner.google.disconnect': { tr: 'Google bağlantısı kaldırıldı', en: 'Google connection removed' },
  'owner.google.place.select': { tr: 'Google işletme profili seçildi', en: 'Google business profile selected' },
  'admin.google.place.select': { tr: 'Google işletme profili seçildi', en: 'Google business profile selected' },
  'owner.survey.create': { tr: 'Anket oluşturuldu', en: 'Survey created' },
  'owner.survey.publish': { tr: 'Anket yayınlandı', en: 'Survey published' },
  'owner.survey.unpublish': { tr: 'Anket yayından kaldırıldı', en: 'Survey unpublished' },
  'owner.survey.duplicate': { tr: 'Anket kopyalandı', en: 'Survey duplicated' },
  'owner.survey.delete': { tr: 'Anket silindi', en: 'Survey deleted' },
  'owner.survey.update': { tr: 'Yanıtlı anket soruları silindi', en: 'Answered survey questions removed' },
  'owner.restaurant.update': { tr: 'İşletme bilgileri güncellendi', en: 'Business details updated' },
  'owner.team.invite': { tr: 'Ekip üyesi davet edildi', en: 'Team member invited' },
  'owner.team.update': { tr: 'Ekip üyesi güncellendi', en: 'Team member updated' },
  'owner.team.remove': { tr: 'Ekip üyesi çıkarıldı', en: 'Team member removed' },
  'restaurant.delete': { tr: 'İşletme silindi', en: 'Business deleted' },
};

export function actionLabel(action: string, locale: 'tr' | 'en' = 'tr'): string {
  return ACTION_LABELS[action]?.[locale] || action;
}
