import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/menu/[slug] - Fetch the full menu for a restaurant (Public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: {
        menuCategories: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              where: { 
                deletedAt: null,
                isAvailable: true 
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
    }

    if (!restaurant.isActive) {
      return NextResponse.json({ error: 'Bu restoran şu an hizmet vermemektedir' }, { status: 403 });
    }

    // Return menu data
    return NextResponse.json({
      name: restaurant.name,
      primaryColor: restaurant.primaryColor,
      categories: restaurant.menuCategories
    });
  } catch (error) {
    console.error('[API_MENU_GET]', error);
    return NextResponse.json({ error: 'Menü çekilemedi' }, { status: 500 });
  }
}
