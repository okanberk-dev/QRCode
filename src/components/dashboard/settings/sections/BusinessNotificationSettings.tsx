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
 * `<OwnerNotificationsForm>` (263 LOC) doğrudan kullanılır:
 *   - 4 toggle (lowRatingEmail / dailyDigestEmail / weeklyReport / slackWebhook)
 *   - Auto-save on toggle (mevcut davranış)
 *   - Slack webhook validation (https zorunlu)
 *
 * Yeni bildirim kategorileri (rezervasyon/sipariş/yorum/entegrasyon hatası)
 * NotificationPreference modeline alan eklenmesi gerektiriyor — V2 scope
 * (CLAUDE.md plan §10 backend eksiklikler).
 */
export function BusinessNotificationSettings({
  locale = "tr",
}: BusinessNotificationSettingsProps) {
  return <OwnerNotificationsForm locale={locale} />;
}

export default BusinessNotificationSettings;
