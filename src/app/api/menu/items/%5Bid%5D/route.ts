import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess, touchMenuUpdated } from '@/lib/menu-access';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { 
      categoryId, name, description, priceCents, 
      currency, imageUrl, isAvailable, isOutOfStock, sortOrder, badges 
    } = body;

    const existing = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    const access = await requireRestaurantAccess(req, existing.restaurantId);
    if (!access.ok) return access.res;

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        categoryId,
        name,
        description,
        priceCents,
        currency,
        imageUrl,
        isAvailable,
        isOutOfStock,
        sortOrder,
        badges,
      },
    });

    await touchMenuUpdated(existing.restaurantId);
    return NextResponse.json(item);
  } catch (error) {
    console.error('[API_ITEM_PATCH]', error);
    return NextResponse.json({ error: 'Ürün güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const existing = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    const access = await requireRestaurantAccess(req, existing.restaurantId);
    if (!access.ok) return access.res;

    // Soft delete
    await prisma.menuItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await touchMenuUpdated(existing.restaurantId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_ITEM_DELETE]', error);
    return NextResponse.json({ error: 'Ürün silinemedi' }, { status: 500 });
  }
}
