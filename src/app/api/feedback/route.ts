import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendFeedbackNotification } from '@/lib/email';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { isValidRating, isValidEmail, isValidPhone, sanitizeText } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown';
    
    // Serverless-safe Database Rate limiting: Max 3 submissions per IP per 10 mins
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentSubmissions = await prisma.feedback.count({
      where: {
        ipAddress: ip,
        createdAt: { gte: tenMinutesAgo }
      }
    });

    if (recentSubmissions >= 3) {
      return ApiErrors.tooManyRequests('Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.', 'RATE_LIMIT_EXCEEDED', 600);
    }

    const body = await req.json();
    const { rating, name, email, phone, comment, source, branch, tableNumber, restaurantSlug, aspects, platform, website } = body;

    // Honeypot check
    if (website) {
      return NextResponse.json({ success: true, message: 'Feedback received' }, { status: 201 });
    }

    // Validate platform value if provided
    const validPlatforms = ['google', 'yemeksepeti', 'getir', 'trendyol_go'];
    const sanitizedPlatform = platform && validPlatforms.includes(platform) ? platform : 'google';

    // Validation
    if (!isValidRating(rating)) {
      return ApiErrors.badRequest('Geçersiz puan', 'INVALID_RATING');
    }
    if (!isValidEmail(email)) {
      return ApiErrors.badRequest('Geçersiz e-posta', 'INVALID_EMAIL');
    }
    if (!isValidPhone(phone)) {
      return ApiErrors.badRequest('Geçersiz telefon', 'INVALID_PHONE');
    }

    // Find restaurant by slug
    let restaurantId: string | null = null;
    let notificationEmail: string | null = null;
    let restaurantName: string = 'Restoran';

    if (restaurantSlug) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug: restaurantSlug },
      });
      if (restaurant) {
        restaurantId = restaurant.id;
        notificationEmail = restaurant.notificationEmail;
        restaurantName = restaurant.name;
      }
    }

    // Save to DB
    const feedback = await prisma.feedback.create({
      data: {
        rating: Number(rating),
        name: sanitizeText(name, 100),
        email: sanitizeText(email, 100),
        phone: sanitizeText(phone, 20),
        comment: sanitizeText(comment, 2000),
        source: sanitizeText(source, 50),
        branch: sanitizeText(branch, 50),
        tableNumber: sanitizeText(tableNumber, 20),
        ipAddress: ip,
        userAgent: req.headers.get('user-agent'),
        hasKvkkConsent: body.hasKvkkConsent ?? true,
        hasMarketingConsent: body.hasMarketingConsent ?? false,
        restaurantId,
        platform: sanitizedPlatform,
        // Rich Feedback Additions
        foodRating: aspects?.food ? Number(aspects.food) : null,
        serviceRating: aspects?.service ? Number(aspects.service) : null,
        atmosphereRating: aspects?.atmosphere ? Number(aspects.atmosphere) : null,
      },
    });

    // Send email for 1, 2, 3 stars
    let emailSent: boolean | null = null;
    if (rating <= 3) {
      emailSent = false;
      try {
        await sendFeedbackNotification({
          rating,
          name,
          email,
          phone,
          comment,
          branch,
          tableNumber,
          restaurantName,
          toEmail: notificationEmail,
          aspects,
          feedbackId: feedback.id,
        });
        emailSent = true;
      } catch (err) {
        // Log but don't fail the entire request - the feedback IS in the DB!
        console.error('Email notification failed but saving succeeded:', err);
      }
    }

    return NextResponse.json({ success: true, id: feedback.id, emailSent }, { status: 201 });
  } catch (error) {
    console.error('Feedback submission error (Detailed):', error);
    return ApiErrors.internalError('Sunucu hatası veya veritabanı bağlantı sorunu. Lütfen tekrar deneyiniz.');
  }
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const ratingFilter = searchParams.get('rating'); // e.g. "low" or "1"
  const daysParam = searchParams.get('days');
  const restaurantId = searchParams.get('restaurantId');
  const platformFilter = searchParams.get('platform');
  const branchFilter = searchParams.get('branch');
  const kvkkFilter = searchParams.get('kvkk'); // 'true' or 'false'
  const searchParam = (searchParams.get('search') || '').trim();
  const sortOrderParam = searchParams.get('sortOrder');
  const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;

  // Build filter query
  const where: any = {};

  // KVKK filter
  if (kvkkFilter === 'true') {
    where.hasKvkkConsent = true;
  } else if (kvkkFilter === 'false') {
    where.hasKvkkConsent = false;
  }

  // Restaurant filter
  if (restaurantId && restaurantId !== 'all') {
    where.restaurantId = restaurantId;
  }

  // Security override: scope by role
  if (actor.role === 'superadmin') {
    // superadmin — keep any explicit restaurantId filter or show all
  } else if (actor.role === 'manager') {
    where.restaurantId = actor.restaurantId;
  } else if (actor.role === 'restaurant_owner') {
    const userRestIds = await getScopedRestaurantIds(actor) || [];

    if (where.restaurantId) {
      if (!userRestIds.includes(where.restaurantId as string)) {
        return ApiErrors.forbidden();
      }
    } else {
      where.restaurantId = { in: userRestIds };
    }
  } else {
    return ApiErrors.forbidden();
  }

  // Rating filter
  if (ratingFilter === 'low') {
    where.rating = { lte: 3 };
  } else if (ratingFilter === 'positive') {
    where.rating = { gte: 4 };
  } else if (ratingFilter && ratingFilter !== 'all') {
    const r = parseInt(ratingFilter, 10);
    if (Number.isFinite(r)) where.rating = r;
  }

  // Date filter (supports today/1, month, numeric days, all)
  // UTC-based to stay consistent regardless of server timezone.
  if (daysParam === 'today' || daysParam === '1') {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    where.createdAt = { ...where.createdAt, gte: today };
  } else if (daysParam === 'month') {
    const now = new Date();
    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    where.createdAt = { ...where.createdAt, gte: firstOfMonth };
  } else if (daysParam && daysParam !== 'all') {
    const days = parseInt(daysParam);
    if (Number.isFinite(days) && days > 0) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - days);
      where.createdAt = { ...where.createdAt, gte: pastDate };
    }
  }

  // Platform filter
  if (platformFilter && platformFilter !== 'all') {
    where.platform = platformFilter;
  }

  // Branch filter
  if (branchFilter && branchFilter !== 'all') {
    where.branch = branchFilter;
  }

  // Search filter (comment or name, case-insensitive)
  if (searchParam) {
    where.OR = [
      { comment: { contains: searchParam, mode: 'insensitive' } },
      { name: { contains: searchParam, mode: 'insensitive' } },
    ];
  }

  try {
    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
      include: {
        restaurant: {
          select: { name: true, slug: true }
        }
      }
    });

    const total = await prisma.feedback.count({ where });

    return NextResponse.json({ 
      data: feedbacks, 
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return ApiErrors.internalError('Veriler çekilemedi');
  }
}
