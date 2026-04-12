import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!process.env.JWT_SECRET) {
      console.warn('SECURITY WARNING: Using default JWT_SECRET. Please set one in Vercel.');
    }

    // Check if any admin exists in the database
    let admin = null;
    try {
      admin = await prisma.adminUser.findUnique({
        where: { username }
      });
    } catch (dbError) {
      console.error("Database check failed, using fallback:", dbError);
    }

    let isPasswordValid = false;

    // BOOTSTRAP LOGIC & DB VERIFICATION
    if (admin) {
      isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    } else {
      // Fallback for DB issues or first run
      const envUsername = process.env.ADMIN_USERNAME || 'admin';
      const envPassword = process.env.ADMIN_PASSWORD || '123456+';
      
      if (username === envUsername && password === envPassword) {
        isPasswordValid = true;
        try {
          const adminCount = await prisma.adminUser.count();
          if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            admin = await prisma.adminUser.create({
              data: {
                username: envUsername,
                passwordHash: hashedPassword
              }
            });
            console.log('BOOTSTRAP: Created first admin user successfully.');
          }
        } catch (e) {
          console.error("Bootstrap creation failed, continuing with env authentication", e);
        }
      }
    }

    // Verify credentials
    if (isPasswordValid) {
      const payloadRole = admin?.role || 'superadmin';
      const payloadRestaurantId = admin?.restaurantId || null;
      
      const token = await signJwt({ 
        id: admin?.id || 'env-admin', 
        username: username, 
        role: payloadRole,
        restaurantId: payloadRestaurantId
      });
      
      const response = NextResponse.json({ success: true });
      
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/'
      });

      return response;
    }

    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Sunucu hatası veya veritabanı bağlantı sorunu' }, { status: 500 });
  }
}
