import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';

// GET /api/restaurants/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  if (!(await canAccessRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
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
          }
        }
      }
    });

    if (!restaurant) {
      return ApiErrors.notFound('İşletme bulunamadı');
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Failed to fetch restaurant:', error);
    return ApiErrors.internalError('İşletme çekilemedi');
  }
}

// PUT /api/restaurants/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  if (!(await canAccessRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    const body = await req.json();
    const {
      name,
      slug,
      category,
      address,
      city,
      kvkkText,
      phone,
      googlePlaceId,
      googleReviewUrl,
      notificationEmail,
      primaryColor,
      isActive,
      getirYemekUrl,
      yemekSepetiUrl,
      trendyolYemekUrl,
      menuLogoUrl,
      userId,
      defaultRedirectPlatform,
      // Per-platform enable flags (Pulse 2026-04 owner panel toggles)
      googleEnabled,
      yemekSepetiEnabled,
      getirEnabled,
      trendyolEnabled,
      // Konaklama segmenti (Step 11)
      tripAdvisorUrl,
      airbnbUrl,
      tripAdvisorEnabled,
      airbnbEnabled,
    } = body;

    // Phase 12.6 — defaultRedirectPlatform whitelist. NULL or '' = clear
    // (back to legacy Google fallback). Anything else must be one of the
    // supported keys; mirrors Feedback.platform values + /r/[slug]
    // platformUrls map. Konaklama / catch-all sectors can default to
    // tripadvisor/airbnb when those URLs are filled in.
    const ALLOWED_DEFAULT_PLATFORMS = new Set([
      'google', 'yemeksepeti', 'getir', 'trendyol_go', 'tripadvisor', 'airbnb',
    ]);
    if (defaultRedirectPlatform !== undefined && defaultRedirectPlatform !== null && defaultRedirectPlatform !== '') {
      if (typeof defaultRedirectPlatform !== 'string' || !ALLOWED_DEFAULT_PLATFORMS.has(defaultRedirectPlatform)) {
        return ApiErrors.badRequest('Geçersiz varsayılan platform', 'INVALID_DEFAULT_PLATFORM');
      }
    }

    // Validate slug if provided
    if (slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return ApiErrors.badRequest('Slug sadece küçük harf, rakam ve tire içerebilir', 'INVALID_SLUG');
      }

      // Check duplicate slug (excluding current restaurant)
      const existing = await prisma.restaurant.findFirst({
        where: { slug, id: { not: id } }
      });
      if (existing) {
        return ApiErrors.conflict('Bu slug zaten kullanılıyor');
      }
    }

    const currentRest = await prisma.restaurant.findUnique({ where: { id } });
    if (!currentRest) {
      return ApiErrors.notFound('İşletme bulunamadı');
    }

    // Orphan-default cleanup (CLAUDE.md §19.2). If this PUT clears the URL
    // backing the stored defaultRedirectPlatform — and the caller didn't
    // already set defaultRedirectPlatform explicitly — drop the default so
    // /r/[slug] doesn't silently fall back to Google with the owner none
    // the wiser. Owner explicit value always wins over derived cleanup.
    const platformUrlInBody: Record<string, unknown> = {
      google: googleReviewUrl,
      yemeksepeti: yemekSepetiUrl,
      getir: getirYemekUrl,
      trendyol_go: trendyolYemekUrl,
      tripadvisor: tripAdvisorUrl,
      airbnb: airbnbUrl,
    };
    const orphanedDefault =
      defaultRedirectPlatform === undefined &&
      !!currentRest.defaultRedirectPlatform &&
      platformUrlInBody[currentRest.defaultRedirectPlatform] !== undefined &&
      !platformUrlInBody[currentRest.defaultRedirectPlatform];

    let ownerUserId: string | null | undefined = undefined;
    if (userId !== undefined) {
      if (actor.role !== 'superadmin') {
        return ApiErrors.forbidden('İşletme sahibi atamak için yetkiniz yok');
      }
      if (userId === null || userId === '') {
        ownerUserId = null;
      } else if (typeof userId === 'string') {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
          return ApiErrors.badRequest('Belirtilen işletme sahibi bulunamadı', 'INVALID_USER_ID');
        }
        ownerUserId = userId;
      } else {
        return ApiErrors.badRequest('Geçersiz işletme sahibi', 'INVALID_USER_ID');
      }
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(category !== undefined && { category }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && {
          city: typeof city === 'string' && city.trim() ? city.trim() : null,
        }),
        ...(kvkkText !== undefined && {
          kvkkText: typeof kvkkText === 'string' && kvkkText.trim() ? kvkkText : null,
        }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(googlePlaceId !== undefined && { googlePlaceId: googlePlaceId || null }),
        ...(googleReviewUrl !== undefined && { googleReviewUrl: googleReviewUrl || null }),
        ...(notificationEmail !== undefined && { notificationEmail: notificationEmail || null }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(isActive !== undefined && { isActive }),
        ...(getirYemekUrl !== undefined && { getirYemekUrl: getirYemekUrl || null }),
        ...(yemekSepetiUrl !== undefined && { yemekSepetiUrl: yemekSepetiUrl || null }),
        ...(trendyolYemekUrl !== undefined && { trendyolYemekUrl: trendyolYemekUrl || null }),
        ...(googleEnabled !== undefined && { googleEnabled: Boolean(googleEnabled) }),
        ...(yemekSepetiEnabled !== undefined && { yemekSepetiEnabled: Boolean(yemekSepetiEnabled) }),
        ...(getirEnabled !== undefined && { getirEnabled: Boolean(getirEnabled) }),
        ...(trendyolEnabled !== undefined && { trendyolEnabled: Boolean(trendyolEnabled) }),
        ...(tripAdvisorUrl !== undefined && { tripAdvisorUrl: tripAdvisorUrl || null }),
        ...(airbnbUrl !== undefined && { airbnbUrl: airbnbUrl || null }),
        ...(tripAdvisorEnabled !== undefined && { tripAdvisorEnabled: Boolean(tripAdvisorEnabled) }),
        ...(airbnbEnabled !== undefined && { airbnbEnabled: Boolean(airbnbEnabled) }),
        ...(menuLogoUrl !== undefined && { menuLogoUrl: menuLogoUrl || null }),
        ...(defaultRedirectPlatform !== undefined && {
          defaultRedirectPlatform: defaultRedirectPlatform || null,
        }),
        ...(orphanedDefault && { defaultRedirectPlatform: null }),
        ...(ownerUserId !== undefined && { userId: ownerUserId }),
      },
    });

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Failed to update restaurant:', error);
    return ApiErrors.internalError('İşletme güncellenemedi');
  }
}

// DELETE /api/restaurants/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { id } = await params;

  if (!(await canAccessRestaurant(actor, id))) {
    return ApiErrors.forbidden();
  }

  try {
    const currentRest = await prisma.restaurant.findUnique({ where: { id } });
    if (!currentRest) {
      return ApiErrors.notFound('İşletme bulunamadı');
    }

    // Hard delete: delete related records first to avoid foreign key constraints.
    // Restaurant has several cascading relations, but menu categories are
    // protected by MenuItem.category Restrict, so clear items before categories.
    await prisma.$transaction([
      prisma.feedback.deleteMany({ where: { restaurantId: id } }),
      prisma.qrGeneration.deleteMany({ where: { restaurantId: id } }),
      prisma.adminUser.deleteMany({ where: { restaurantId: id } }),
      prisma.menuAnalyticsEvent.deleteMany({ where: { restaurantId: id } }),
      prisma.brandSettings.deleteMany({ where: { restaurantId: id } }),
      prisma.menuItem.deleteMany({ where: { restaurantId: id } }),
      prisma.menuCategory.deleteMany({ where: { restaurantId: id } }),
      prisma.restaurant.delete({ where: { id } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete restaurant:', error);
    return ApiErrors.internalError('İşletme silinemedi');
  }
}
