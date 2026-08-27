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
        // SSR /menu/[slug] bu iki flag'i zaten kontrol ediyordu; bu public API
        // etmiyordu. Sonuç: admin menü modülünü kapatınca (menuEnabled=false,
        // ücretli özellik gate'i §5.2) veya owner menüyü yayından kaldırınca
        // (menuPublished=false, taslak) menü SSR'de gizleniyor ama bu endpoint
        // — ve onu tüketen /r/[slug]/menu sayfası — tam menüyü servis etmeye
        // devam ediyordu.
        menuEnabled: true,
        menuPublished: true,
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

    if (!restaurant.menuEnabled || !restaurant.menuPublished) {
      // 404 (403 değil) — SSR /menu/[slug] ile aynı davranış: menünün var olup
      // olmadığı bilgisi sızdırılmaz.
      return NextResponse.json({ error: 'Menü bulunamadı' }, { status: 404 });
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
