import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { ApiErrors } from '@/lib/api-errors';

/**
 * POST /api/feedback/bulk — admin/manager toplu işaretleme veya atama.
 *
 * Auth: panel actor + role kontrol (superadmin / manager).
 *   Owner role'ünde bulk yok (CLAUDE.md §4 IDOR + role disiplini).
 * IDOR: gönderilen id'ler scoped restaurantId'leri içinde **whitelist**
 *   edilir; başka tenant'ın id'si silently filter out (200 ama processed=0).
 * Rate limit: 10 / dk / actor (mass-action abuse koruması).
 * Batch limit: 50 id (mantıklı UI selection üst sınırı; daha fazla
 *   gerekirse repeated batch).
 *
 * Body shape (Zod):
 *   { ids: string[] (1..50), action: 'flag' | 'unflag' | 'assign' }
 *   - 'flag'   → FeedbackFlag upsert (varsa skip)
 *   - 'unflag' → FeedbackFlag deleteMany
 *   - 'assign' → FeedbackAssignment upsert (assigneeId = actor.id, sentinel 'self')
 *
 * Response: { processed: number, skipped: number, action }
 */
const Body = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  action: z.enum(['flag', 'unflag', 'assign']),
});

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized('Yetkisiz');

  // Owner panel'de bulk yok — sadece superadmin / manager
  if (actor.role !== 'superadmin' && actor.role !== 'manager') {
    return ApiErrors.forbidden('Bu işlem için yetkiniz yok');
  }

  // Rate limit — actor başına 10 / dk. Distributed (Upstash, §14.2).
  const rl = await rateLimit(`feedback-bulk:${actor.id}`, 10, 60_000);
  if (!rl.allowed) {
    return ApiErrors.tooManyRequests(
      'Çok fazla toplu işlem. Lütfen biraz bekleyin.',
      'RATE_LIMIT_EXCEEDED',
      60,
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const { ids, action } = parsed.data;

  // IDOR — scoped restaurantId whitelist. Manager için kendi restoranı,
  // superadmin için tümü.
  let scopedIds: string[];
  if (actor.role === 'superadmin') {
    scopedIds = []; // wildcard sentinel; tüm id'ler kabul
  } else {
    scopedIds = (await getScopedRestaurantIds(actor)) || [];
    if (scopedIds.length === 0) {
      return NextResponse.json({ processed: 0, skipped: ids.length, action });
    }
  }

  // Whitelist query — başka tenant'ın id'si silently drop edilir
  const allowedRows = await prisma.feedback.findMany({
    where: {
      id: { in: ids },
      ...(actor.role === 'superadmin' ? {} : { restaurantId: { in: scopedIds } }),
    },
    select: { id: true },
  });
  const allowedIds = allowedRows.map((r) => r.id);

  if (allowedIds.length === 0) {
    return NextResponse.json({ processed: 0, skipped: ids.length, action });
  }

  // Action dispatch — Promise.all ile parallel; tek bir feedback'in
  // başarısızlığı diğerlerini bloke etmesin.
  let processed = 0;
  if (action === 'flag') {
    // Upsert: zaten flagged ise no-op (unique constraint feedbackId).
    const results = await Promise.allSettled(
      allowedIds.map((feedbackId) =>
        prisma.feedbackFlag.upsert({
          where: { feedbackId },
          create: { feedbackId, flaggedBy: actor.id },
          update: {}, // varsa dokunma
        }),
      ),
    );
    processed = results.filter((r) => r.status === 'fulfilled').length;
  } else if (action === 'unflag') {
    const result = await prisma.feedbackFlag.deleteMany({
      where: { feedbackId: { in: allowedIds } },
    });
    processed = result.count;
  } else if (action === 'assign') {
    const results = await Promise.allSettled(
      allowedIds.map((feedbackId) =>
        prisma.feedbackAssignment.upsert({
          where: { feedbackId },
          create: { feedbackId, assigneeId: actor.id, assignedById: actor.id },
          update: { assigneeId: actor.id, assignedById: actor.id },
        }),
      ),
    );
    processed = results.filter((r) => r.status === 'fulfilled').length;
  }

  return NextResponse.json({
    processed,
    skipped: ids.length - allowedIds.length,
    action,
  });
}
