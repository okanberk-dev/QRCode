"use client";

import OwnerNotificationsForm from "@/app/[locale]/dashboard/notifications/OwnerNotificationsForm";
import type { Locale } from "@/lib/translations";

interface BusinessNotificationSettingsProps {
  locale?: Locale;
}

/**
 * Section 6 — Bildirim Ayarları (Faz 2 — workspace level).
 *
 * `/account` workspace page'inde gösterilir — NotificationPreference modeli
 * `userId` taşır (workspace owner-level), per-restaurant değil. Mevcut
 * `<OwnerNotificationsForm>` doğrudan kullanılır:
 *   - 2 toggle (lowRatingEmail / weeklyReport)
 *   - Auto-save on toggle (mevcut davranış)
 *
 * Yeni bildirim kategorileri (rezervasyon/sipariş/yorum/entegrasyon hatası)
 * NotificationPreference modeline alan eklenmesi gerektiriyor — V2 scope.
 */
export function BusinessNotificationSettings({
  locale = "tr",
}: BusinessNotificationSettingsProps) {
  return <OwnerNotificationsForm locale={locale} />;
}

export default BusinessNotificationSettings;
