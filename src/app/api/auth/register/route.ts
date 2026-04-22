import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt } from '@/lib/auth';
import { rateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);

    // Rate limit: 5 registrations per IP per 30 minutes
    const ipLimit = rateLimit(`register:ip:${ip}`, 5, 30 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla kayıt denemesi. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
      );
    }

    const { email, password, name, restaurantName, website } = await req.json();
    
    // Honeypot check
    if (website) {
      // Silently ignore or return success to trick the bot
      return NextResponse.json({ success: true, message: 'Registration received' }, { status: 201 });
    }

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve şifre zorunludur.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Şifre en az 8 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi girin.' },
        { status: 400 }
      );
    }

    // Atomically create user and restaurant
    const { user, createdRestaurantId } = await prisma.$transaction(async (tx) => {
      // 1. Check if user already exists (inside transaction for isolation)
      const existingUser = await tx.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        throw new Error('USER_EXISTS');
      }

      // 2. Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // 3. Calculate trial end date (14 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // 4. Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name: name?.trim() || null,
          plan: 'trial',
          trialEndsAt,
        },
      });

      let restaurantId = null;

      // 5. Create restaurant if name provided
      if (restaurantName) {
        let baseSlug = restaurantName.toLowerCase()
          .replace(/[çÇ]/g, 'c')
          .replace(/[ğĞ]/g, 'g')
          .replace(/[ıİ]/g, 'i')
          .replace(/[öÖ]/g, 'o')
          .replace(/[şŞ]/g, 's')
          .replace(/[üÜ]/g, 'u')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        if (!baseSlug) baseSlug = 'restoran';

        // Check for existing slug and increment if necessary
        let finalSlug = baseSlug;
        const similarSlugs = await tx.restaurant.findMany({
          where: { slug: { startsWith: baseSlug } },
          select: { slug: true }
        });

        if (similarSlugs.length > 0) {
          const slugList = similarSlugs.map(s => s.slug);
          let counter = 1;
          while (slugList.includes(finalSlug)) {
            finalSlug = `${baseSlug}-${counter}`;
            counter++;
          }
        }

        const restaurant = await tx.restaurant.create({
          data: {
            name: restaurantName.trim(),
            slug: finalSlug,
            userId: user.id,
            category: 'Restoran',
            primaryColor: '#F4B400', // Updated to premium orange default
          }
        });
        restaurantId = restaurant.id;
      }

      return { user, createdRestaurantId: restaurantId };
    }, {
      timeout: 10000 // 10s timeout for transaction to handle potential pooler lag
    });

    // 6. Sign tokens (outside transaction)
    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      restaurantId: createdRestaurantId,
    });

    const isSecure = process.env.NODE_ENV === 'production' && 
                     (req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:');

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          trialEndsAt: user.trialEndsAt,
        },
      },
      { status: 201 }
    );

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[AUTH_REGISTER]', error);
    
    if (error.message === 'USER_EXISTS') {
      return NextResponse.json(
        { error: 'Bu e-posta adresiyle zaten bir hesap mevcut.' },
        { status: 409 }
      );
    }

    // Prisma Connection Timeout
    if (error.code === 'P2024') {
      return NextResponse.json(
        { error: 'Veritabanı bağlantı zaman aşımı. Lütfen biraz bekleyip tekrar deneyin.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
