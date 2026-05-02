import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/menu/[slug] - Fetch the full menu for a restaurant (Public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Explicit select — schema/DB drift immunity (CLAUDE.md §14.1). A column
    // listed in schema.prisma but missing on the live DB would otherwise
    // throw P2022 from a default `findUnique` and 500 the public menu
    // surface for every visitor. Listing only the columns the response
    // needs also keeps unrelated row data (notification e-mail, owner id,
    // billing fields, internal notes) off the wire.
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        name: true,
        isActive: true,
        menuLogoUrl: true,
        primaryColor: true,
        menuTheme: true,
        menuAccentColor: true,
        menuCategories: {
          where: { isVisible: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              where: {
                deletedAt: null,
                isAvailable: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
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
      menuLogoUrl: restaurant.menuLogoUrl,
      primaryColor: restaurant.primaryColor,
      menuTheme: restaurant.menuTheme,
      menuAccentColor: restaurant.menuAccentColor,
      categories: restaurant.menuCategories,
    });
  } catch (error) {
    console.error('[API_MENU_GET]', error);
    return NextResponse.json({ error: 'Menü çekilemedi' }, { status: 500 });
  }
}
