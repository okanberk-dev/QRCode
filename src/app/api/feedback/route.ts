import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendFeedbackNotification } from '@/lib/email';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { isValidRating, isValidEmail, isValidPhone, sanitizeText } from '@/lib/validations';

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
      return NextResponse.json({ error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' }, { status: 429 });
    }

    const body = await req.json();
    const { rating, name, email, phone, comment, source, branch, tableNumber, restaurantSlug, serviceType, aspects, platform } = body;

    // Validate platform value if provided
    const validPlatforms = ['google', 'yemeksepeti', 'getir', 'trendyol_go'];
    const sanitizedPlatform = platform && validPlatforms.includes(platform) ? platform : null;

    // Validation
    if (!isValidRating(rating)) {
      return NextResponse.json({ error: 'Geçersiz puan' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Geçersiz e-posta' }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: 'Geçersiz telefon' }, { status: 400 });
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
        serviceType: sanitizeText(serviceType, 50),
        foodRating: aspects?.food ? Number(aspects.food) : null,
        serviceRating: aspects?.service ? Number(aspects.service) : null,
        atmosphereRating: aspects?.atmosphere ? Number(aspects.atmosphere) : null,
      },
    });

    // Send email for 1, 2, 3 stars
    if (rating <= 3) {
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
          serviceType,
          aspects,
          feedbackId: feedback.id,
        });
      } catch (err) {
        // Log but don't fail the entire request - the feedback IS in the DB!
        console.error('Email notification failed but saving succeeded:', err);
      }
    }

    return NextResponse.json({ success: true, id: feedback.id }, { status: 201 });
  } catch (error) {
    console.error('Feedback submission error (Detailed):', error);
    if (error instanceof Error) {
      console.error('ERROR MESSAGE:', error.message);
      console.error('ERROR STACK:', error.stack);
    }
    return NextResponse.json({ error: 'Sunucu hatası veya veritabanı bağlantı sorunu. Lütfen tekrar deneyiniz.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const ratingFilter = searchParams.get('rating'); // e.g. "low" or "1"
  const daysParam = searchParams.get('days');
  const restaurantId = searchParams.get('restaurantId');
  const platformFilter = searchParams.get('platform');
  
  const skip = (page - 1) * limit;

  // Build filter query
  const where: any = {};

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
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
      }
    } else {
      where.restaurantId = { in: userRestIds };
    }
  } else {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  // Rating filter
  if (ratingFilter === 'low') {
    where.rating = { lte: 3 };
  } else if (ratingFilter === 'positive') {
    where.rating = { gte: 4 };
  } else if (ratingFilter) {
    where.rating = parseInt(ratingFilter, 10);
  }

  // Date filter
  if (daysParam === 'today' || daysParam === '1') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.createdAt = {
      ...where.createdAt,
      gte: today
    };
  } else if (daysParam && daysParam !== 'all') {
    const days = parseInt(daysParam);
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    where.createdAt = {
      ...where.createdAt,
      gte: pastDate
    };
  }

  // Platform filter
  if (platformFilter && platformFilter !== 'all') {
    where.platform = platformFilter;
  }

  try {
    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
    return NextResponse.json({ error: 'Veriler çekilemedi' }, { status: 500 });
  }
}
