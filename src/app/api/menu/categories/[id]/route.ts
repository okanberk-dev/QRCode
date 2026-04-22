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
    const { name, description, isVisible, sortOrder } = body;

    const existing = await prisma.menuCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
    }

    const access = await requireRestaurantAccess(req, existing.restaurantId);
    if (!access.ok) return access.res;

    const category = await prisma.menuCategory.update({
      where: { id },
      data: {
        name,
        description,
        isVisible,
        sortOrder,
      },
    });

    await touchMenuUpdated(existing.restaurantId);
    return NextResponse.json(category);
  } catch (error) {
    console.error('[API_CATEGORY_PATCH]', error);
    return NextResponse.json({ error: 'Kategori güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const existing = await prisma.menuCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
    }

    const access = await requireRestaurantAccess(req, existing.restaurantId);
    if (!access.ok) return access.res;

    // Count + delete in a single transaction so a concurrent insert can't
    // slip between the check and the delete.
    try {
      await prisma.$transaction(async (tx) => {
        const itemsCount = await tx.menuItem.count({
          where: { categoryId: id, deletedAt: null },
        });
        if (itemsCount > 0) {
          throw Object.assign(new Error('CATEGORY_NOT_EMPTY'), { apiCode: 'CATEGORY_NOT_EMPTY' });
        }
        await tx.menuCategory.delete({ where: { id } });
      });
    } catch (txError: any) {
      if (txError?.apiCode === 'CATEGORY_NOT_EMPTY' || txError?.code === 'P2003') {
        return NextResponse.json(
          { error: 'İçinde ürün bulunan bir kategoriyi silemezsiniz. Önce ürünleri silin veya taşıyın.' },
          { status: 400 },
        );
      }
      throw txError;
    }

    await touchMenuUpdated(existing.restaurantId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_CATEGORY_DELETE]', error);
    return NextResponse.json({ error: 'Kategori silinemedi' }, { status: 500 });
  }
}
