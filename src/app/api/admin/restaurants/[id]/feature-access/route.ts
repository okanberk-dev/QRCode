import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import {
  RESTAURANT_FEATURE_KEYS,
  RESTAURANT_FEATURE_SELECT,
  type RestaurantFeatureKey,
} from '@/lib/restaurant-features';

type FeaturePatch = Partial<Record<RestaurantFeatureKey, unknown>>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: admin ? 403 : 401 });
  }

  const { id } = await params;

  let body: FeaturePatch;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const data: Partial<Record<RestaurantFeatureKey, boolean>> & { menuUpdatedAt?: Date } = {};
  for (const key of RESTAURANT_FEATURE_KEYS) {
    if (typeof body[key] === 'boolean') {
      data[key] = body[key];
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
