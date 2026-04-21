import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess, touchMenuUpdated } from '@/lib/menu-access';

// GET /api/menu/items?restaurantId=...&categoryId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurantId');
  const categoryId = searchParams.get('categoryId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurantId zorunludur' }, { status: 400 });
  }

  const access = await requireRestaurantAccess(req, restaurantId);
  if (!access.ok) return access.res;

  try {
    const where: any = { restaurantId, deletedAt: null };
    if (categoryId) where.categoryId = categoryId;

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('[API_ITEMS_GET]', error);
    return NextResponse.json({ error: 'Ürünler çekilemedi' }, { status: 500 });
  }
}

// POST /api/menu/items
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      restaurantId, categoryId, name, description, 
      priceCents, currency, imageUrl, isAvailable, sortOrder, badges 
    } = body;

    if (!restaurantId || !categoryId || !name) {
      return NextResponse.json({ error: 'restaurantId, categoryId ve name zorunludur' }, { status: 400 });
    }

    const access = await requireRestaurantAccess(req, restaurantId);
    if (!access.ok) return access.res;

    const item = await prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId,
        name,
        description,
        priceCents: priceCents ?? 0,
        currency: currency ?? 'TRY',
        imageUrl,
        isAvailable: isAvailable ?? true,
        sortOrder: sortOrder ?? 0,
        badges: badges ?? [],
      },
    });

    await touchMenuUpdated(restaurantId);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('[API_ITEMS_POST]', error);
    return NextResponse.json({ error: 'Ürün oluşturulamadı' }, { status: 500 });
  }
}
