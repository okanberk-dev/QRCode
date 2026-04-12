import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendFeedbackNotification } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import { getAdminFromRequest } from '@/lib/auth';
import { isValidRating, isValidEmail, isValidPhone, sanitizeText } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown';
    
    // Rate limit: Max 3 submissions per IP per 10 minutes
    const isAllowed = rateLimit(ip, { windowMs: 10 * 60 * 1000, maxRequests: 3 });
    if (!isAllowed) {
      return NextResponse.json({ error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' }, { status: 429 });
    }

    const body = await req.json();
    const { rating, name, email, phone, comment, source, branch, tableNumber } = body;

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
        });
      } catch (err) {
        console.error('Email notification failed but saving succeeded', err);
      }
    }

    return NextResponse.json({ success: true, id: feedback.id }, { status: 201 });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Check admin auth
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const ratingFilter = searchParams.get('rating'); // e.g. "low" or "1"
  
  const skip = (page - 1) * limit;

  // Build filter query
  const where: any = {};
  if (ratingFilter === 'low') {
    where.rating = { lte: 3 };
  } else if (ratingFilter) {
    where.rating = parseInt(ratingFilter, 10);
  }

  try {
    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
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
