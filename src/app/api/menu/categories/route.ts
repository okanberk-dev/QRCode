import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess, touchMenuUpdated } from '@/lib/menu-access';

// GET /api/menu/categories?restaurantId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurantId zorunludur' }, { status: 400 });
  }

  const access = await requireRestaurantAccess(req, restaurantId);
  if (!access.ok) return access.res;

  try {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('[API_CATEGORIES_GET]', error);
    return NextResponse.json({ error: 'Kategoriler çekilemedi' }, { status: 500 });
  }
}

// POST /api/menu/categories
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, name, description, isVisible, sortOrder } = body;

    if (!restaurantId || !name) {
      return NextResponse.json({ error: 'restaurantId ve name zorunludur' }, { status: 400 });
    }

    const access = await requireRestaurantAccess(req, restaurantId);
    if (!access.ok) return access.res;

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name,
        description,
        isVisible: isVisible ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });

    await touchMenuUpdated(restaurantId);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('[API_CATEGORIES_POST]', error);
    return NextResponse.json({ error: 'Kategori oluşturulamadı' }, { status: 500 });
  }
}
