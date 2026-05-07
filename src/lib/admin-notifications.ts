// Stage 29 §38.105 — admin in-app notification feed helper.
//
// AdminNotification tablosu için fire-and-forget writer. Caller endpoint'leri
// (campaign submit/approve/reject, gelecekte audit/lifecycle) bu helper'ı
// arka planda çağırır; helper fail durumunda console.warn + Sentry capture
// (warning level) ile graceful degrade — caller endpoint flow'u bloklanmaz.
//
// Owner NotificationBell paterni paralel (CLAUDE.md §38.100): generic feed,
// 60s polling + visibilitychange, mark-as-read state. Type literal'ları
// schema'da string olarak saklanır (CLAUDE.md §28 paterni — enum değil).
//
// Broadcast pattern: adminId=null → tüm admin'ler GET feed'inde görür
// (`/api/admin/notifications` query: WHERE adminId=actorId OR adminId IS NULL).
// Targeted: adminId=specific → sadece o admin görür (gelecek scope).

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Notification type literal — yeni event eklerken bu union'a + ACTION_LABELS
// map'ine + UI label resolver'a paralel ekle (CLAUDE.md §38.95 paterni).
export type AdminNotificationType =
  | 'campaign.submitted'
  | 'campaign.approved'
  | 'campaign.rejected';

export interface WriteAdminNotificationParams {
  /**
   * Specific admin'e mi hedeflenecek? null = broadcast (tüm admin'ler).
   * Campaign moderation event'leri broadcast (her admin queue gözlemleyebilir);
   * gelecek "assignment"-style flows için targeted gerekirse extend.
   */
  adminId?: string | null;
  type: AdminNotificationType;
  /**
   * Locale-aware caller eder (TR/EN parite zorunlu — UI'da intl format'sız
   * direkt render edilir). Caller endpoint i18n decision verir (örn. ops mail
   * locale env veya admin user locale).
   */
  title: string;
  body?: string | null;
  /**
   * Click-through metadata: campaignId/restaurantId/ownerName/restaurantName.
   * UI dropdown panel "Detay" linkini buradan üretir.
   */
  payload?: Record<string, unknown> | null;
}

/**
 * Write admin notification (fire-and-forget — caller bloklanmaz).
 *
 * @returns true on success, false on failure (silent — caller flow yine devam eder)
 */
export async function writeAdminNotification(
  params: WriteAdminNotificationParams,
): Promise<boolean> {
  try {
    await prisma.adminNotification.create({
      data: {
        adminId: params.adminId ?? null,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        payload: params.payload
          ? (params.payload as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    return true;
  } catch (err) {
    // Fail-safe: helper hatası caller flow'unu bozmaz. Vercel runtime log'da
    // görünür (CLAUDE.md §38.13 server-side Sentry flush kör nokta için
    // dual log). PII guard (CLAUDE.md §37.7): payload zaten ID-only,
    // genişletilmemeli (campaign content body'sinin ilk N karakter gibi
    // içerik passive log'a düşmemeli).
    console.warn('[admin-notification] write failed:', err);
    // Sentry import'u dynamic — helper'ın fail-safe semantic'i aynı kalır,
    // hatta Sentry config drift olsa bile.
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureMessage('AdminNotification write failed', {
        level: 'warning',
        tags: { kind: 'admin-notification', type: params.type },
        extra: { adminId: params.adminId, hasPayload: Boolean(params.payload) },
      });
    } catch {
      // Sentry config yok → silent
    }
    return false;
  }
}
