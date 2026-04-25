import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';

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
        return ApiErrors.notFound('İşletme bulunamadı');
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
        getirYemekUrl: restaurant.getirYemekUrl,
        yemekSepetiUrl: restaurant.yemekSepetiUrl,
        trendyolYemekUrl: restaurant.trendyolYemekUrl,
        primaryColor: restaurant.primaryColor,
        isActive: restaurant.isActive,
      });
    } catch (error) {
      console.error('Restaurant lookup error:', error);
      return ApiErrors.internalError('Sunucu hatası');
    }
  }

  // Admin: List all restaurants
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  try {
    const { searchParams: adminParams } = new URL(req.url);
    const page = Math.max(1, parseInt(adminParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(adminParams.get('limit') || '20')));
    const status = adminParams.get('status') || 'active';
    const skip = (page - 1) * limit;

    const where: any = {};
    const scopedIds = await getScopedRestaurantIds(actor);
    
    if (scopedIds !== null) {
      where.id = { in: scopedIds };
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'passive') {
      where.isActive = false;
    }
    // 'all' means no filter on isActive

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              plan: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              feedbacks: true,
              menuItems: { where: { deletedAt: null } },
              qrGenerations: true,
              adminUsers: true,
            },
          },
        },
      }),
      prisma.restaurant.count({ where }),
    ]);

    return NextResponse.json({ 
      data: restaurants, 
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    console.error('Failed to fetch restaurants:', error);
    return ApiErrors.internalError('İşletmeler çekilemedi');
  }
}

// POST /api/restaurants - Create a new restaurant (admin only)
export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  if (actor.role === 'manager') {
    return ApiErrors.forbidden('Bu işlem için yetkiniz yok');
  }

  try {
    const body = await req.json();
    const { name, slug, category, address, phone, googlePlaceId, notificationEmail, primaryColor, getirYemekUrl, yemekSepetiUrl, trendyolYemekUrl, userId: bodyUserId } = body;

    if (!name || !slug) {
      return ApiErrors.badRequest('Ad ve slug zorunludur', 'MISSING_FIELDS');
    }

    // Validate slug format (lowercase alphanumeric + hyphens only)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return ApiErrors.badRequest('Slug sadece küçük harf, rakam ve tire içerebilir', 'INVALID_SLUG');
    }

    // Resolve owner. Owners assign to themselves. Superadmin may pass a
    // userId to attach the restaurant to a customer; omitting userId yields
    // an orphan (unassigned) restaurant — logged for audit.
    let ownerUserId: string | null = null;
    if (actor.role === 'restaurant_owner') {
      ownerUserId = actor.id;
    } else if (actor.role === 'superadmin') {
      if (bodyUserId === null || bodyUserId === undefined || bodyUserId === '') {
        ownerUserId = null;
        console.warn('[RESTAURANTS_POST] Creating orphan restaurant', { admin: actor.id, slug });
      } else {
        if (typeof bodyUserId !== 'string') {
          return ApiErrors.badRequest('Geçersiz userId', 'INVALID_USER_ID');
        }
        const user = await prisma.user.findUnique({ where: { id: bodyUserId }, select: { id: true } });
        if (!user) {
          return ApiErrors.badRequest('Belirtilen kullanıcı bulunamadı', 'INVALID_USER_ID');
        }
        ownerUserId = bodyUserId;
      }
    }

    // Check duplicate slug
    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (existing) {
      return ApiErrors.conflict('Bu slug zaten kullanılıyor');
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
        primaryColor: primaryColor || '#C6F24E',
        getirYemekUrl: getirYemekUrl || null,
        yemekSepetiUrl: yemekSepetiUrl || null,
        trendyolYemekUrl: trendyolYemekUrl || null,
        userId: ownerUserId,
      },
    });

    return NextResponse.json(restaurant, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return ApiErrors.conflict('Bu slug zaten kullanılıyor');
    }
    console.error('Failed to create restaurant:', error);
    return ApiErrors.internalError('İşletme oluşturulamadı');
  }
}
