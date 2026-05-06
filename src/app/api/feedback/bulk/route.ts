import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, getScopedRestaurantIds, resolveOwnerUserId } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { ApiErrors } from '@/lib/api-errors';
import { AI_QUOTAS, checkLayeredAiQuota } from '@/lib/ai-quota';
import { coerceTone, generateReplyDraft, type AiDraftTone } from '@/lib/ai-draft';

/**
 * POST /api/feedback/bulk — toplu feedback eylemi.
 *
 * Auth: panel actor + role kontrol (action-bazlı):
 *   - flag/unflag/assign/bulk_mark_read → superadmin / manager only
 *     (CLAUDE.md §4 IDOR; admin reviews surface, owner panelinde bulk yok)
 *   - bulk_ai_reply → owner + manager + superadmin (§38.58 — owner için
 *     Yorumlar topbar "Toplu yanıtla" CTA, tasarım a/page-reviews.jsx:45)
 * IDOR: gönderilen id'ler scoped restaurantId'leri içinde **whitelist**
 *   edilir; başka tenant'ın id'si silently filter out (200 ama processed=0).
 * Rate limit: 10 / dk / actor (mass-action abuse koruması).
 * Batch limit: 50 id (mantıklı UI selection üst sınırı; daha fazla
 *   gerekirse repeated batch).
 *
 * Body shape (Zod):
 *   { ids: string[] (1..50), action: 'flag' | 'unflag' | 'assign' |
 *     'bulk_ai_reply' | 'bulk_mark_read',
 *     tone?: 'warm' | 'apologetic' | 'formal', locale?: 'tr' | 'en' }
 *   - 'flag'           → FeedbackFlag upsert (varsa skip)
 *   - 'unflag'         → FeedbackFlag deleteMany
 *   - 'assign'         → FeedbackAssignment upsert (assigneeId = actor.id)
 *   - 'bulk_ai_reply'  → Per-id generateReplyDraft + FeedbackAiDraft upsert.
 *      Pulse AI master gate (Restaurant.pulseAiEnabled) zorunlu; AI quota
 *      layered guard (CLAUDE.md §15.1). Owner sonra her draft'ı tek-tek
 *      onaylayıp gönderir (auto-send YOK).
 *   - 'bulk_mark_read' → Feedback.isRead=true updateMany (Stage 13 §38.83).
 *      Single atomic query + return count; flag/unflag patternleriyle parite.
 *
 * Response (flag/unflag/assign/bulk_mark_read): { processed, skipped, action }
 * Response (bulk_ai_reply): { processed, skipped, action, drafts:
 *   [{ feedbackId, source: 'openai'|'template'|'template-fallback'|'skipped' }] }
 */
const Body = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  action: z.enum(['flag', 'unflag', 'assign', 'bulk_ai_reply', 'bulk_mark_read']),
  tone: z.enum(['warm', 'apologetic', 'formal']).optional(),
  locale: z.enum(['tr', 'en']).optional(),
});

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized('Yetkisiz');

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const { ids, action, tone: bodyTone, locale: bodyLocale } = parsed.data;

  // §38.58 — Action-bazlı role guard:
  //   bulk_ai_reply → owner + manager + superadmin (owner kendi feedback'lerine
  //     bulk AI draft hazırlar; auto-send YOK, owner her birini onaylar)
  //   flag/unflag/assign → superadmin / manager only (mevcut §11.12 davranışı)
  if (action === 'bulk_ai_reply') {
    if (actor.role !== 'superadmin' && actor.role !== 'manager' && actor.role !== 'restaurant_owner') {
      return ApiErrors.forbidden('Bu işlem için yetkiniz yok');
    }
  } else {
    if (actor.role !== 'superadmin' && actor.role !== 'manager') {
      return ApiErrors.forbidden('Bu işlem için yetkiniz yok');
    }
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

  // IDOR — scoped restaurantId whitelist. Owner/Manager için kendi restoranları,
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

  // Whitelist query — başka tenant'ın id'si silently drop edilir.
  // bulk_ai_reply için ek alanlar select'lenir (rating + comment + name + platform
  // + restaurant context) çünkü generateReplyDraft helper'ı bunları kullanır.
  const allowedRows = await prisma.feedback.findMany({
    where: {
      id: { in: ids },
      ...(actor.role === 'superadmin' ? {} : { restaurantId: { in: scopedIds } }),
    },
    select:
      action === 'bulk_ai_reply'
        ? {
            id: true,
            rating: true,
            comment: true,
            name: true,
            platform: true,
            restaurantId: true,
            restaurant: {
              select: {
                name: true,
                category: true,
                aiDraftTone: true,
                pulseAiEnabled: true,
              },
            },
          }
        : { id: true },
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
  } else if (action === 'bulk_mark_read') {
    // Stage 13 (CLAUDE.md §38.83) — toplu "okundu" işaretleme. Migration
    // 20260505230000 (Feedback.isRead default false) ile zaten yazılır;
    // updateMany atomic + return count, flag/unflag patternleriyle parite
    // (Promise.allSettled gerektirmez).
    const result = await prisma.feedback.updateMany({
      where: { id: { in: allowedIds } },
      data: { isRead: true },
    });
    processed = result.count;
  }

  // §38.58 — bulk_ai_reply: per-id generateReplyDraft + FeedbackAiDraft upsert.
  // Pulse AI master gate (Restaurant.pulseAiEnabled) zorunlu; AI quota layered
  // guard (CLAUDE.md §15.1). Owner sonra her draft'ı tek-tek onaylayıp gönderir
  // (auto-send YOK; manuel review zorunlu — KVKK + UX güvenliği).
  type BulkDraftEntry = { feedbackId: string; source: 'openai' | 'template' | 'template-fallback' | 'skipped' };
  const drafts: BulkDraftEntry[] = [];
  if (action === 'bulk_ai_reply') {
    type EnrichedRow = {
      id: string;
      rating: number;
      comment: string | null;
      name: string | null;
      platform: string | null;
      restaurantId: string | null;
      restaurant: {
        name: string;
        category: string | null;
        aiDraftTone: string | null;
        pulseAiEnabled: boolean;
      } | null;
    };
    const rowsForBulk = allowedRows as unknown as EnrichedRow[];
    const locale: 'tr' | 'en' = bodyLocale === 'en' ? 'en' : 'tr';
    const ownerKey = (await resolveOwnerUserId(actor)) ?? actor.id;

    // Pulse AI master gate — Restaurant.pulseAiEnabled false ise skip
    // ('pulse_ai_disabled_by_admin' suggest-reply route'u ile uyumlu).
    const eligibleRows = rowsForBulk.filter((r) => r.restaurant?.pulseAiEnabled === true);
    const skippedAdminGate = rowsForBulk.length - eligibleRows.length;
    rowsForBulk
      .filter((r) => r.restaurant?.pulseAiEnabled !== true)
      .forEach((r) => drafts.push({ feedbackId: r.id, source: 'skipped' }));

    // AI quota layered (suggest-reply scope reuse). Her id 1 quota unit'i;
    // batch içinde sıralı check + dolarsa template fallback. Suggest-reply ile
    // aynı 3-katmanlı (user/day + ws/day + global/day) cap (CLAUDE.md §15.1).
    for (const row of eligibleRows) {
      const quota = await checkLayeredAiQuota([
        { scope: 'suggest-reply:user', identifier: actor.id, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_USER_DAY },
        { scope: 'suggest-reply:ws', identifier: ownerKey, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_WORKSPACE_DAY },
        { scope: 'suggest-reply:global', identifier: 'global', dailyLimit: AI_QUOTAS.SUGGEST_REPLY_GLOBAL_DAY },
      ]);
      if (!quota.allowed) {
        // Quota dolarsa template fallback (UI yine draft görür, kullanıcı
        // "Yeniden öner" deneyebilir; quota reset olunca AI'ya geri döner).
        drafts.push({ feedbackId: row.id, source: 'template-fallback' });
        continue;
      }
      const tone: AiDraftTone = bodyTone
        ? coerceTone(bodyTone, 'warm')
        : coerceTone(row.restaurant?.aiDraftTone, 'warm');
      try {
        const draft = await generateReplyDraft(
          {
            restaurantName: row.restaurant?.name ?? '',
            restaurantCategory: row.restaurant?.category ?? null,
            customerName: row.name,
            rating: row.rating,
            platform: row.platform,
            comment: row.comment,
          },
          tone,
          locale,
        );
        await prisma.feedbackAiDraft.upsert({
          where: { feedbackId: row.id },
          create: {
            feedbackId: row.id,
            body: draft.body,
            tone,
            source: draft.source,
            latencyMs: draft.latencyMs,
          },
          update: {
            body: draft.body,
            tone,
            source: draft.source,
            latencyMs: draft.latencyMs,
            generatedAt: new Date(),
          },
        });
        const wireSource: BulkDraftEntry['source'] =
          draft.source === 'ai_copilot'
            ? 'openai'
            : draft.latencyMs === 0
              ? 'template'
              : 'template-fallback';
        drafts.push({ feedbackId: row.id, source: wireSource });
        processed += 1;
      } catch (err) {
        console.error('[feedback-bulk] ai_reply per-id failed', row.id, (err as Error).message);
        drafts.push({ feedbackId: row.id, source: 'template-fallback' });
      }
    }

    // Response erken döner (audit log altta unified hâline gerek yok —
    // bulk_ai_reply sadece draft yazar, audit'e değer katmaz; mevcut
    // FeedbackAiDraft.generatedAt zaten kayıt taşır).
    return NextResponse.json({
      processed,
      skipped: ids.length - allowedIds.length + skippedAdminGate,
      action,
      drafts,
    });
  }

  // Audit log — superadmin/manager mass-mutation surface (CLAUDE.md §29.6).
  // Best-effort: log write failure must not undo the action that already
  // committed. Mirrors /api/admin/restaurants/bulk pattern (which logs in
  // the same transaction as the mutation, but feedback bulk's three
  // possible mutations make a single-tx wrap awkward).
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: actor.id,
        actorSource: actor.source,
        action: `feedback.bulk.${action}`,
        targetId: allowedIds.join(','),
        payload: {
          requestedCount: ids.length,
          processed,
          skipped: ids.length - allowedIds.length,
          ids: allowedIds,
        },
      },
    });
  } catch (err) {
    console.warn('[audit] feedback.bulk write failed (non-fatal)', (err as Error).message);
  }

  return NextResponse.json({
    processed,
    skipped: ids.length - allowedIds.length,
    action,
  });
}
