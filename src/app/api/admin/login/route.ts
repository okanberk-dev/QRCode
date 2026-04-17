import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { rateLimit, resetRateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);
    const { username, password, rememberMe } = await req.json();

    // Reject obviously malformed input before any DB/bcrypt work
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre zorunludur' }, { status: 400 });
    }
    if (username.length > 128 || password.length > 256) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    // 5 attempts per IP per 10 minutes, with a softer per-username cap
    const ipLimit = rateLimit(`admin-login:ip:${ip}`, 8, 10 * 60 * 1000);
    const userLimit = rateLimit(`admin-login:user:${username.toLowerCase()}`, 5, 10 * 60 * 1000);
    if (!ipLimit.allowed || !userLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, userLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: 'Çok fazla başarısız deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      );
    }

    // Only AdminUser accounts can authenticate to /admin.
    // HOTFIX: Migrate old 'admin' row to 'oknbrk' automatically
    try {
      const existing = await prisma.adminUser.findUnique({ where: { username: 'admin' } });
      if (existing) {
        await prisma.adminUser.update({ where: { id: existing.id }, data: { username: 'oknbrk' } });
      }
      
      const adminCount = await prisma.adminUser.count();
      if (adminCount === 0) {
        const defaultHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || '123456+', 12);
        await prisma.adminUser.create({
          data: {
            username: process.env.ADMIN_USERNAME || 'oknbrk',
            passwordHash: defaultHash,
          }
        });
      }
    } catch (e) {
      // Ignored if table doesn't exist
    }

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
      // Dummy compare to prevent timing attack vulnerabilities
      await bcrypt.compare(password, '$2b$12$dummyhashfortimingatackprevention');
      // Fallback for DB issues or first run
      const envUsername = process.env.ADMIN_USERNAME || 'oknbrk';
      const envPassword = process.env.ADMIN_PASSWORD || '123456+';
      
      if (username === envUsername && password === envPassword) {
        isPasswordValid = true;
        try {
          const adminCount = await prisma.adminUser.count();
          if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash(password, 12);
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
      // Clear the brute-force counters for this IP/username on success.
      resetRateLimit(`admin-login:ip:${ip}`);
      resetRateLimit(`admin-login:user:${username.toLowerCase()}`);

      let payloadRole: 'superadmin' | 'manager' = 'superadmin';
      let payloadRestaurantId = null;
      let payloadId = 'env-admin';
      let payloadUsername = username;

      if (admin) {
        payloadRole = admin.role === 'manager' ? 'manager' : 'superadmin';
        payloadRestaurantId = admin.restaurantId;
        payloadId = admin.id;
      }

      const token = await signJwt({ 
        id: payloadId, 
        username: payloadUsername, 
        role: payloadRole,
        restaurantId: payloadRestaurantId
      });
      
      const response = NextResponse.json({ success: true });
      
      const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 1; // 30 days or 1 day
      
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: cookieMaxAge,
        path: '/'
      });

      // Defence-in-depth: expose non-sensitive metadata so the UI can read
      // the role without exposing the JWT itself.
      response.headers.set('X-Admin-Role', payloadRole);

      // Clear any stale restaurant-owner session to keep panels separated.
      response.cookies.set('user_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Sunucu hatası veya veritabanı bağlantı sorunu' }, { status: 500 });
  }
}
