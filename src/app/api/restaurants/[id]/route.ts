import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';

// GET /api/restaurants/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id } = await params;

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
      return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
    }

    if (actor.role === 'superadmin') {
      // full access
    } else if (actor.role === 'manager' && actor.restaurantId !== restaurant.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    } else if (actor.role === 'restaurant_owner' && restaurant.userId !== actor.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    } else if (actor.role !== 'manager' && actor.role !== 'restaurant_owner') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Failed to fetch restaurant:', error);
    return NextResponse.json({ error: 'Restoran çekilemedi' }, { status: 500 });
  }
}

// PUT /api/restaurants/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, slug, category, address, phone, googlePlaceId, notificationEmail, primaryColor, isActive } = body;

    // Validate slug if provided
    if (slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json({ error: 'Slug sadece küçük harf, rakam ve tire içerebilir' }, { status: 400 });
      }

      // Check duplicate slug (excluding current restaurant)
      const existing = await prisma.restaurant.findFirst({
        where: { slug, id: { not: id } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 409 });
      }
    }

    const currentRest = await prisma.restaurant.findUnique({ where: { id } });
    if (!currentRest) return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });

    if (actor.role === 'superadmin') {
      // full access
    } else if (actor.role === 'manager' && actor.restaurantId !== currentRest.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    } else if (actor.role === 'restaurant_owner' && currentRest.userId !== actor.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    } else {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
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
      },
    });

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Failed to update restaurant:', error);
    return NextResponse.json({ error: 'Restoran güncellenemedi' }, { status: 500 });
  }
}

// DELETE /api/restaurants/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const currentRest = await prisma.restaurant.findUnique({ where: { id } });
    if (!currentRest) return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });

    if (actor.role === 'superadmin') {
      // full access
    } else if (actor.role === 'manager' && actor.restaurantId !== currentRest.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    } else if (actor.role === 'restaurant_owner' && currentRest.userId !== actor.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    } else {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    // Soft delete: set isActive to false
    await prisma.restaurant.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete restaurant:', error);
    return NextResponse.json({ error: 'Restoran silinemedi' }, { status: 500 });
  }
}
