import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { blockKey, isBlocked, rateLimit, resetRateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { annotateRecaptchaAssessment, verifyRecaptchaToken } from '@/lib/recaptcha';

const DUMMY_BCRYPT_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8N1g9vDg0v7wv3V60N9ku74f75hJ5a';
const LOCKOUT_WINDOW_MS = 30 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);
    const { username, password, rememberMe, recaptchaToken } = await req.json();

    // Reject obviously malformed input before any DB/bcrypt work
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre zorunludur' }, { status: 400 });
    }
    if (username.length > 128 || password.length > 256) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre zorunludur' }, { status: 400 });
    }
    const ipKey = `admin-login:ip:${ip}`;
    const userKey = `admin-login:user:${normalizedUsername}`;
    const lockKey = `admin-login:lock:${normalizedUsername}:${ip}`;
    const failedKey = `admin-login:failed:${normalizedUsername}:${ip}`;

    if (isBlocked(lockKey)) {
      return NextResponse.json(
        { error: 'Çok fazla başarısız deneme. Güvenlik nedeniyle giriş geçici olarak kilitlendi.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(LOCKOUT_WINDOW_MS / 1000)) } },
      );
    }

    const captcha = await verifyRecaptchaToken(req, recaptchaToken, 'admin_login');
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Defence-in-depth: per-IP and per-username throttles before DB/bcrypt work.
    const ipLimit = await rateLimit(ipKey, 8, 10 * 60 * 1000);
    const userLimit = await rateLimit(userKey, 5, 10 * 60 * 1000);
    if (!ipLimit.allowed || !userLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, userLimit.retryAfterSeconds);
      blockKey(lockKey, LOCKOUT_WINDOW_MS);
      return NextResponse.json(
        { error: 'Çok fazla başarısız deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      );
    }

    // Only AdminUser accounts can authenticate to /admin.
    // HOTFIX: Migrate old 'admin' row to 'oknbrk' automatically
    try {
      // Hotfix migration — only `id` is read downstream (CLAUDE.md §14.1).
      const existing = await prisma.adminUser.findUnique({
        where: { username: 'admin' },
        select: { id: true },
      });
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
      // Auth path — explicit select keeps login resilient to schema drift
      // on unrelated columns (CLAUDE.md §14.1). Pinned fields are exactly
      // those consumed downstream: passwordHash for bcrypt, id/role/
      // restaurantId for the JWT payload.
      admin = await prisma.adminUser.findUnique({
        where: { username: normalizedUsername },
        select: {
          id: true,
          passwordHash: true,
          role: true,
          restaurantId: true,
        },
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
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      // Fallback for DB issues or first run
      const envUsername = process.env.ADMIN_USERNAME || 'oknbrk';
      const envPassword = process.env.ADMIN_PASSWORD || '123456+';
      
      if (normalizedUsername === envUsername.toLowerCase() && password === envPassword) {
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
          }
        } catch (e) {
          console.error("Bootstrap creation failed, continuing with env authentication", e);
        }
      }
    }

    // Verify credentials
    if (isPasswordValid) {
      // Clear the brute-force counters for this IP/username on success.
      resetRateLimit(ipKey);
      resetRateLimit(userKey);
      resetRateLimit(lockKey);
      resetRateLimit(failedKey);
      if (captcha.assessmentName) {
        await annotateRecaptchaAssessment(captcha.assessmentName, 'PASSWORD_CORRECT');
      }

      let payloadRole: 'superadmin' | 'manager' = 'superadmin';
      let payloadRestaurantId = null;
      let payloadId = 'env-admin';
      let payloadUsername = normalizedUsername;

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
      const isSecure = process.env.NODE_ENV === 'production' && 
                       (req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:');
      
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: isSecure,
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
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    if (captcha.assessmentName) {
      await annotateRecaptchaAssessment(captcha.assessmentName, 'PASSWORD_INCORRECT');
    }

    const failedLimit = await rateLimit(failedKey, 3, 10 * 60 * 1000);
    if (!failedLimit.allowed) {
      blockKey(lockKey, LOCKOUT_WINDOW_MS);
    }

    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Sunucu hatası veya veritabanı bağlantı sorunu' }, { status: 500 });
  }
}
