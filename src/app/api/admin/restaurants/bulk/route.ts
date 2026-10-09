import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { ApiErrors } from '@/lib/api-errors';
import {
  RESTAURANT_FEATURE_KEYS,
  RESTAURANT_FEATURE_SELECT,
  type RestaurantFeatureKey,
} from '@/lib/restaurant-features';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { revalidatePublicMenu } from '@/lib/restaurant-revalidate';

/**
 * POST /api/admin/restaurants/bulk — superadmin only toplu işletme aksiyonu.
 *
 * Auth: panel actor + role kontrol (superadmin). Manager bulk yapamaz —
 *   kendi restoranı zaten birkaç tane, tek tek toggle yeter; toplu pasif
 *   sadece operator'ün operasyonel ihtiyacı (CLAUDE.md §4 IDOR + role).
 * Rate limit: 10 / dk / actor (mass-action abuse koruması §14.2).
 * Batch limit: 100 id (Stage A5 §38.97 paterni — feature_override için
 *   biraz daha geniş; activate/deactivate eski 50 cap'i ile uyumlu kalır).
 *
 * Body shape (Zod `.strict()` mass-assignment guard):
 *   - { ids, action: 'activate' | 'deactivate' }
 *   - { ids, action: 'feature_override',
 *       payload: { feature: <key>, value: boolean } }
 *
 * Feature keys (CLAUDE.md §5.2): RESTAURANT_FEATURE_KEYS — 6 master flag.
 *   Single-feature toggle: minimal blast radius (her run tek feature'ı
 *   N restoranda tek değere setler). Side effects feature-access endpoint'iyle
 *   parite (menuEnabled=false ⇒ menuPublished=false; pulseAiEnabled=false
 *   ⇒ FeedbackAiDraft cleanup).
 *
 * Response: { processed: number, action, payload? }
 */

// Feature_override için pre-flight `.strict()` schema.
const FeaturePayloadSchema = z.object({
  feature: z.enum(RESTAURANT_FEATURE_KEYS),
  value: z.boolean(),
}).strict();

// Body union — discriminated union, action'a göre payload zorunlu.
const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('activate'),
    ids: z.array(z.string().min(1)).min(1).max(100),
  }).strict(),
  z.object({
    action: z.literal('deactivate'),
    ids: z.array(z.string().min(1)).min(1).max(100),
  }).strict(),
  z.object({
    action: z.literal('feature_override'),
    ids: z.array(z.string().min(1)).min(1).max(100),
    payload: FeaturePayloadSchema,
  }).strict(),
]);

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized('Yetkisiz');

  // Owner panel + manager bulk yapamaz — superadmin only
  if (actor.role !== 'superadmin') {
    return ApiErrors.forbidden('Bu işlem için süperadmin yetkisi gerekli');
  }

  const rl = await rateLimit(`restaurants-bulk:${actor.id}`, 10, 60_000);
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
  const data = parsed.data;

  // Branch 1 — activate / deactivate (legacy paterni intact, audit log
  // helper'ına geçildi).
  if (data.action === 'activate' || data.action === 'deactivate') {
    const { ids, action } = data;
    // `suspendedByAdmin` makes the pause stick: owner Settings → Durum can
    // no longer flip isActive back on while it is set (PUT returns
    // SUSPENDED_BY_ADMIN). Activating clears it again.
    const result = await prisma.restaurant.updateMany({
      where: { id: { in: ids } },
      data: { isActive: action === 'activate', suspendedByAdmin: action === 'deactivate' },
    });
    const slugs = await prisma.restaurant.findMany({
      where: { id: { in: ids } },
      select: { slug: true },
    });
    for (const r of slugs) revalidatePublicMenu(r.slug);
    await writeAdminAuditLog({
      actorId: actor.id,
      actorSource: 'admin',
      action: `admin.restaurants.bulk.${action}`,
      targetId: ids.join(','),
      payload: { count: ids.length, ids, action },
    });
    return NextResponse.json({ processed: result.count, action });
  }

  // Branch 2 — feature_override (Stage A5 §38.97).
  // Single-feature × multi-restaurant. CLAUDE.md §5.2 master flag side
  // effects feature-access endpoint'iyle paritede:
  //   menuEnabled=false ⇒ menuPublished=false (force)
  //   pulseAiEnabled=false ⇒ FeedbackAiDraft cleanup (best-effort)
  const { ids, payload } = data;
  const feature = payload.feature as RestaurantFeatureKey;
  const value = payload.value;

  const updateData: Partial<Record<RestaurantFeatureKey, boolean>> & { menuUpdatedAt?: Date } = {
    [feature]: value,
  };
  if (feature === 'menuEnabled' && value === false) {
    updateData.menuPublished = false;
  }
  if (feature === 'menuEnabled' || feature === 'menuPublished') {
    updateData.menuUpdatedAt = new Date();
  }

  // Pre-fetch affected restaurant snapshot for audit before/after delta.
  // RESTAURANT_FEATURE_SELECT zaten id: true taşıyor; sadece name'i ek olarak istiyoruz.
  const beforeRows = await prisma.restaurant.findMany({
    where: { id: { in: ids } },
    select: { ...RESTAURANT_FEATURE_SELECT, name: true, slug: true },
  });

  const result = await prisma.restaurant.updateMany({
    where: { id: { in: ids } },
    data: updateData,
  });

  // pulseAi cleanup (CLAUDE.md §15) — single feature_override için
  // best-effort. Per-id Promise.allSettled (per-row isolation §28.4).
  if (feature === 'pulseAiEnabled' && value === false) {
    const cleanupResults = await Promise.allSettled(
      ids.map((rid) =>
        prisma.feedbackAiDraft.deleteMany({
          where: { feedback: { is: { restaurantId: rid } } },
        }),
      ),
    );
    const failedCleanup = cleanupResults.filter((r) => r.status === 'rejected').length;
    if (failedCleanup > 0) {
      console.warn(`[admin restaurants/bulk feature_override] ${failedCleanup} ai-draft cleanup rejected (best-effort)`);
    }
  }

  if (feature === 'menuEnabled' || feature === 'menuPublished') {
    for (const r of beforeRows) revalidatePublicMenu(r.slug);
  }

  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: 'admin',
    action: 'admin.restaurants.bulk.feature_override',
    targetId: ids.join(','),
    payload: {
      count: ids.length,
      ids,
      feature,
      value,
      // Before snapshot (audit forensics — değişimden önceki state).
      // Tek feature için minimal: { restaurantId, name, beforeValue }.
      before: beforeRows.map((r) => ({
        id: r.id,
        name: r.name,
        beforeValue: (r as Record<string, unknown>)[feature] as boolean,
      })),
    },
  });

  return NextResponse.json({
    processed: result.count,
    action: 'feature_override',
    payload: { feature, value },
  });
}
