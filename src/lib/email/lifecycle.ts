// Lifecycle email idempotency helpers (CLAUDE.md §21.34 + §23.7 Phase 11.30).
//
// `alreadySent` — log kontrol (cooldown opsiyonel, null ise lifetime).
// `recordSent` — log yaz.
//
// Cron her gün çalışır; her user × restaurant + her email type için bu
// helper'lar idempotency garantisini sağlar.

import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';

export type LifecycleEmailType =
  | 'qr_not_downloaded'
  | 'first_feedback_tips'
  | 'upgrade_suggestion'
  | 'inactive_reactivation'
  // Reputation OS Suite — aylık sağlık raporu maili.
  | 'monthly_health_report'
  // Wave B5 (CLAUDE.md §38.B) — first feedback activation moment.
  // Synchronous trigger from /api/feedback POST when count === 1; uses the
  // lifecycle log table purely for idempotency (lifetime cooldown).
  | 'first_feedback_celebration'
  // Wave C (CLAUDE.md §38.194) — lifecycle expansion.
  // qr_no_scans_reminder    — cron, 14d cooldown per restaurant
  // rating_drop_alert       — cron, 7d cooldown per restaurant
  // first_reply_celebration — sync from google reply, lifetime per restaurant
  // (data-export-confirmation is sync per-action, no LifecycleEmailLog gate)
  | 'qr_no_scans_reminder'
  | 'rating_drop_alert'
  | 'first_reply_celebration';

export interface AlreadySentParams {
  userId?: string | null;
  restaurantId?: string | null;
  type: LifecycleEmailType;
  /** Days. undefined → lifetime (any prior log skips). */
  cooldownDays?: number;
}

export async function alreadySent(params: AlreadySentParams): Promise<boolean> {
  const where: {
    type: string;
    userId?: string;
    restaurantId?: string;
    sentAt?: { gte: Date };
  } = { type: params.type };
  if (params.userId) where.userId = params.userId;
  if (params.restaurantId) where.restaurantId = params.restaurantId;
  if (typeof params.cooldownDays === 'number') {
    where.sentAt = {
      gte: new Date(Date.now() - params.cooldownDays * 24 * 60 * 60 * 1000),
    };
  }
  const count = await prisma.lifecycleEmailLog.count({ where });
  return count > 0;
}

export interface RecordSentParams {
  userId?: string | null;
  restaurantId?: string | null;
  type: LifecycleEmailType;
  metadata?: Record<string, unknown>;
}

export async function recordSent(params: RecordSentParams): Promise<void> {
  try {
    await prisma.lifecycleEmailLog.create({
      data: {
        userId: params.userId ?? null,
        restaurantId: params.restaurantId ?? null,
        type: params.type,
        metadata: (params.metadata as never) ?? undefined,
      },
    });
  } catch (err) {
    // DB write fail loglanır ama caller'a propagate edilmez — idempotency
    // gevşek; log eksik olursa worst case 1 ek mail gönderilir, kullanıcı
    // küçük rahatsızlık yaşayabilir ama akış kırılmaz.
    //
    // Phase 11.32 audit fix: log fail Sentry'e warning olarak gönderilir
    // → operatör fark eder, recurring DB issue varsa root cause çıkar.
    // Mail mantığı değişmez (mail zaten gönderildi, sadece log eksik).
    console.error('[lifecycle] recordSent failed', err);
    Sentry.captureMessage('Lifecycle email log write failed', {
      level: 'warning',
      tags: { type: params.type },
      extra: {
        userId: params.userId ?? null,
        restaurantId: params.restaurantId ?? null,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
