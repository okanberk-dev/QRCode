import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';

// GET /api/restaurants - List all restaurants (admin) or get by slug (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  // Public lookup by slug (used by /[slug] page)
  if (slug) {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug },
      });

      if (!restaurant || !restaurant.isActive) {
        return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
      }

      // Return public-safe fields only
      return NextResponse.json({
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        category: restaurant.category,
        address: restaurant.address,
        phone: restaurant.phone,
        googlePlaceId: restaurant.googlePlaceId,
        primaryColor: restaurant.primaryColor,
        isActive: restaurant.isActive,
      });
    } catch (error) {
      console.error('Restaurant lookup error:', error);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
  }

  // Admin: List all restaurants
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const where: any = {};
    if (actor.role === 'superadmin') {
      // superadmin sees all restaurants — no filter
    } else if (actor.role === 'manager' && actor.restaurantId) {
      where.id = actor.restaurantId;
    } else if (actor.role === 'restaurant_owner') {
      where.userId = actor.id;
    } else {
      // Unknown role — deny access
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const restaurants = await prisma.restaurant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { feedbacks: true }
        }
      }
    });

    return NextResponse.json(restaurants);
  } catch (error) {
    console.error('Failed to fetch restaurants:', error);
    return NextResponse.json({ error: 'Restoranlar çekilemedi' }, { status: 500 });
  }
}

// POST /api/restaurants - Create a new restaurant (admin only)
export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  if (actor.role === 'manager') {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, slug, category, address, phone, googlePlaceId, notificationEmail, primaryColor } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Ad ve slug zorunludur' }, { status: 400 });
    }

    // Validate slug format (lowercase alphanumeric + hyphens only)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ error: 'Slug sadece küçük harf, rakam ve tire içerebilir' }, { status: 400 });
    }

    // Check duplicate slug
    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 409 });
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        category: category || 'Restoran',
        address: address || null,
        phone: phone || null,
        googlePlaceId: googlePlaceId || null,
        notificationEmail: notificationEmail || null,
        primaryColor: primaryColor || '#1a73e8',
        ...(actor.role === 'restaurant_owner' && { userId: actor.id })
      },
    });

    return NextResponse.json(restaurant, { status: 201 });
  } catch (error) {
    console.error('Failed to create restaurant:', error);
    return NextResponse.json({ error: 'Restoran oluşturulamadı' }, { status: 500 });
  }
}
