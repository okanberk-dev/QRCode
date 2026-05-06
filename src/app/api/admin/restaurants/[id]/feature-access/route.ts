import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { validateBody } from '@/lib/api/validate';
import {
  RESTAURANT_FEATURE_KEYS,
  RESTAURANT_FEATURE_SELECT,
  type RestaurantFeatureKey,
} from '@/lib/restaurant-features';

// §38.78 — Zod `.strict()` schema (CLAUDE.md §28.3 high-risk admin destructive
// disipline). Mass assignment kapatıcı: schema dışı field'lar 400 ile reddedilir.
// 7 boolean toggle (§38.98 campaignsEnabled eklendi), her field opsiyonel
// (en az 1 zorunluluğu `Object.keys(data).length === 0` check'inde, line ~50).
const PatchSchema = z.object({
  googleReviewManagementEnabled: z.boolean().optional(),
  pulseAiEnabled: z.boolean().optional(),
  menuEnabled: z.boolean().optional(),
  menuPublished: z.boolean().optional(),
  aiAnalyticsEnabled: z.boolean().optional(),
  externalPlatformsEnabled: z.boolean().optional(),
  campaignsEnabled: z.boolean().optional(),
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
    const restaurant = await prisma.restaurant.update({
      where: { id },
      data,
      select: RESTAURANT_FEATURE_SELECT,
    });

    if (data.pulseAiEnabled === false) {
      try {
        await prisma.feedbackAiDraft.deleteMany({
          where: { feedback: { is: { restaurantId: id } } },
        });
      } catch (draftErr) {
        console.warn('[admin restaurant feature-access] pending draft cleanup skipped:', draftErr);
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
