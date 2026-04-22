import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';

// GET /api/restaurants/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  if (!(await canAccessRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { feedbacks: true }
        }
      }
    });

    if (!restaurant) {
      return ApiErrors.notFound('Restoran bulunamadı');
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Failed to fetch restaurant:', error);
    return ApiErrors.internalError('Restoran çekilemedi');
  }
}

// PUT /api/restaurants/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  if (!(await canAccessRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    const body = await req.json();
    const { name, slug, category, address, phone, googlePlaceId, notificationEmail, primaryColor, isActive, getirYemekUrl, yemekSepetiUrl, trendyolYemekUrl, menuLogoUrl } = body;

    // Validate slug if provided
    if (slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return ApiErrors.badRequest('Slug sadece küçük harf, rakam ve tire içerebilir', 'INVALID_SLUG');
      }

      // Check duplicate slug (excluding current restaurant)
      const existing = await prisma.restaurant.findFirst({
        where: { slug, id: { not: id } }
      });
      if (existing) {
        return ApiErrors.conflict('Bu slug zaten kullanılıyor');
      }
    }

    const currentRest = await prisma.restaurant.findUnique({ where: { id } });
    if (!currentRest) {
      return ApiErrors.notFound('Restoran bulunamadı');
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(category !== undefined && { category }),
        ...(address !== undefined && { address: address || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(googlePlaceId !== undefined && { googlePlaceId: googlePlaceId || null }),
        ...(notificationEmail !== undefined && { notificationEmail: notificationEmail || null }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(isActive !== undefined && { isActive }),
        ...(getirYemekUrl !== undefined && { getirYemekUrl: getirYemekUrl || null }),
        ...(yemekSepetiUrl !== undefined && { yemekSepetiUrl: yemekSepetiUrl || null }),
        ...(trendyolYemekUrl !== undefined && { trendyolYemekUrl: trendyolYemekUrl || null }),
        ...(menuLogoUrl !== undefined && { menuLogoUrl: menuLogoUrl || null }),
      },
    });

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Failed to update restaurant:', error);
    return ApiErrors.internalError('Restoran güncellenemedi');
  }
}

// DELETE /api/restaurants/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  if (!(await canAccessRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    const currentRest = await prisma.restaurant.findUnique({ where: { id } });
    if (!currentRest) {
      return ApiErrors.notFound('Restoran bulunamadı');
    }

    // Hard delete: delete related records first to avoid foreign key constraints
    await prisma.$transaction([
      prisma.feedback.deleteMany({ where: { restaurantId: id } }),
      prisma.qrGeneration.deleteMany({ where: { restaurantId: id } }),
      prisma.adminUser.deleteMany({ where: { restaurantId: id } }),
      prisma.restaurant.delete({ where: { id } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete restaurant:', error);
    return ApiErrors.internalError('Restoran silinemedi');
  }
}
