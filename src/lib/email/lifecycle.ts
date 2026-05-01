// Lifecycle email idempotency helpers (CLAUDE.md §21.34 + §23.7 Phase 11.30).
//
// `alreadySent` — log kontrol (cooldown opsiyonel, null ise lifetime).
// `recordSent` — log yaz.
//
// Cron her gün çalışır; her user × restaurant + her email type için bu
// helper'lar idempotency garantisini sağlar.

import { prisma } from '@/lib/prisma';

export type LifecycleEmailType =
  | 'qr_not_downloaded'
  | 'first_feedback_tips'
  | 'upgrade_suggestion'
  | 'inactive_reactivation';

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
    console.error('[lifecycle] recordSent failed', err);
  }
}
