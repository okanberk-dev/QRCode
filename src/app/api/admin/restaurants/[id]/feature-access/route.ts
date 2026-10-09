import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { revalidatePublicMenu } from '@/lib/restaurant-revalidate';
import {
  RESTAURANT_FEATURE_KEYS,
  RESTAURANT_FEATURE_SELECT,
  type RestaurantFeatureKey,
} from '@/lib/restaurant-features';

// §38.78 — Zod `.strict()` schema (CLAUDE.md §28.3 high-risk admin destructive
// disipline). Mass assignment kapatıcı: schema dışı field'lar 400 ile reddedilir.
// Boolean toggle'lar, her field opsiyonel
// (en az 1 zorunluluğu `Object.keys(data).length === 0` check'inde, line ~50).
const PatchSchema = z.object({
  googleReviewManagementEnabled: z.boolean().optional(),
  pulseAiEnabled: z.boolean().optional(),
  menuEnabled: z.boolean().optional(),
  menuPublished: z.boolean().optional(),
  aiAnalyticsEnabled: z.boolean().optional(),
  externalPlatformsEnabled: z.boolean().optional(),
  surveysEnabled: z.boolean().optional(),
}).strict();

type PatchInput = z.infer<typeof PatchSchema>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: admin ? 403 : 401 });
  }

  const { id } = await params;
  const adminId = typeof admin.id === 'string' ? admin.id : 'env-admin';

  // §37.2.C — privileged write: rate limit per admin.
  const limit = await rateLimit(`admin:feature-access:${adminId}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Çok fazla istek' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<PatchInput>(PatchSchema, body);
  if (!parsed.ok) return parsed.response;

  const data: Partial<Record<RestaurantFeatureKey, boolean>> & { menuUpdatedAt?: Date } = {};
  for (const key of RESTAURANT_FEATURE_KEYS) {
    const value = parsed.data[key];
    if (typeof value === 'boolean') {
      data[key] = value;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
  }

  if (data.menuEnabled === false) {
    data.menuPublished = false;
  }
  if ('menuEnabled' in data || 'menuPublished' in data) {
    data.menuUpdatedAt = new Date();
  }

  try {
    // Snapshot for the audit trail + the owner id so the entry shows up in
    // the owner's own audit log (/api/account/audit-log matches targetId) and
    // in /admin/members/[id]/audit. Before this, flipping a paid feature off
    // left no trace anywhere and the owner had no way to learn why.
    const before = await prisma.restaurant.findUnique({
      where: { id },
      select: { ...RESTAURANT_FEATURE_SELECT, userId: true, slug: true },
    });
    if (!before) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 });
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data,
      select: RESTAURANT_FEATURE_SELECT,
    });

    const changed: Record<string, { from: boolean; to: boolean }> = {};
    for (const key of RESTAURANT_FEATURE_KEYS) {
      if (before[key] !== restaurant[key]) {
        changed[key] = { from: before[key], to: restaurant[key] };
      }
    }
    if (Object.keys(changed).length > 0) {
      await writeAdminAuditLog({
        actorId: adminId,
        actorSource: 'admin',
        action: 'admin.restaurants.feature_access',
        targetId: before.userId ?? id,
        payload: { restaurantId: id, changed },
      });
    }

    if ('menuEnabled' in data || 'menuPublished' in data) {
      revalidatePublicMenu(before.slug);
    }

    if (data.pulseAiEnabled === false) {
      try {
        await prisma.feedbackAiDraft.deleteMany({
          where: { feedback: { is: { restaurantId: id } } },
        });
      } catch (draftErr) {
        // Owner panel audit Wave 2 PR-5 (C5): cleanup fail silent
        // observability gap kapatıldı. Pulse AI master kapatılırken bekleyen
        // draft'lar temizlenmezse owner inbox'ında stale draft görünür
        // (UI rules disabled flag respekt ediyor ama DB drift olur).
        // Sentry warning (§26.5 paterni — `route` tag + `extra` payload
        // PII-safe `restaurantId` only, KVKK §37.7) → operatör dashboard'da
        // görünür, manuel cleanup tetikleyebilir.
        console.warn(
          '[admin restaurant feature-access] pending draft cleanup skipped:',
          draftErr,
        );
        Sentry.captureMessage('FeedbackAiDraft cleanup failed', {
          level: 'warning',
          tags: {
            route: 'admin.feature-access.update',
            trigger: 'pulseAiEnabled-disable',
          },
          extra: {
            restaurantId: id,
            error: (draftErr as Error)?.message ?? String(draftErr),
          },
        });
      }
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 });
    }
    console.error('[admin restaurant feature-access]', error);
    return NextResponse.json({ error: 'Ayar güncellenemedi' }, { status: 500 });
  }
}
