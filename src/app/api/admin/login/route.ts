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

    // Check if any admin or regular user exists in the database
    let admin = null;
    let regularUser = null;
    try {
      admin = await prisma.adminUser.findUnique({
        where: { username }
      });
      
      if (!admin) {
        regularUser = await prisma.user.findUnique({
          where: { email: username.toLowerCase().trim() }
        });
      }
    } catch (dbError) {
      console.error("Database check failed, using fallback:", dbError);
    }

    let isPasswordValid = false;

    // BOOTSTRAP LOGIC & DB VERIFICATION
    if (admin) {
      isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    } else if (regularUser) {
      isPasswordValid = await bcrypt.compare(password, regularUser.passwordHash);
    } else {
      // Dummy compare to prevent timing attack vulnerabilities
      await bcrypt.compare(password, '$2b$12$dummyhashfortimingatackprevention');
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
      let payloadRole = 'superadmin';
      let payloadRestaurantId = null;
      let payloadId = 'env-admin';
      let payloadUsername = username;

      if (admin) {
        payloadRole = admin.role;
        payloadRestaurantId = admin.restaurantId;
        payloadId = admin.id;
      } else if (regularUser) {
        payloadRole = 'restaurant_owner';
        payloadId = regularUser.id;
        payloadUsername = regularUser.email;
        // Fetch their first restaurant to pre-select, assuming they have at least one
        try {
          const userRestaurant = await prisma.restaurant.findFirst({
            where: { userId: regularUser.id }
          });
          if (userRestaurant) {
            payloadRestaurantId = userRestaurant.id;
          }
        } catch (e) {
          console.error("Kullanıcı restoranı çekilemedi");
        }
      }

      const token = await signJwt({ 
        id: payloadId, 
        username: payloadUsername, 
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
