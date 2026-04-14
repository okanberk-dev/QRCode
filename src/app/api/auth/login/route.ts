import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve şifre zorunludur.' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Use constant-time comparison to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$dummyhashfortimingatackprevention');
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı.' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Hesabınız askıya alınmıştır. Destek için hello@buaze.com adresine yazın.' },
        { status: 403 }
      );
    }

    // Check trial status
    const now = new Date();
    const isTrialExpired = user.plan === 'trial' && user.trialEndsAt && user.trialEndsAt < now;
    
    if (isTrialExpired) {
      return NextResponse.json(
        {
          error: 'Ücretsiz deneme süreniz sona ermiştir.',
          trialExpired: true,
        },
        { status: 402 }
      );
    }

    // Sign user JWT
    let payloadRestaurantId = null;
    try {
      const userRestaurant = await prisma.restaurant.findFirst({
        where: { userId: user.id }
      });
      if (userRestaurant) {
        payloadRestaurantId = userRestaurant.id;
      }
    } catch (e) {
      console.error("Kullanıcı restoranı çekilemedi");
    }

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      restaurantId: payloadRestaurantId
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
      },
    });

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[AUTH_LOGIN]', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
