import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';
import { timingSafeEqual } from 'crypto';
import { blockKey, isBlocked, rateLimit, resetRateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';
import { annotateRecaptchaAssessment, verifyRecaptchaToken } from '@/lib/recaptcha';

const DUMMY_BCRYPT_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8N1g9vDg0v7wv3V60N9ku74f75hJ5a';
const LOCKOUT_WINDOW_MS = 30 * 60 * 1000;

// Constant-time string compare for the ENV-bootstrap password path.
// Plain `===` leaks the matching prefix length over a network and was the
// fastest way to brute-force the bootstrap admin from the outside.
function constantTimeStringEq(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Still pay the cost so we don't leak the length difference via timing.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

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

    // reCAPTCHA assessment + per-IP / per-username throttles are independent
    // network round-trips (Google + Upstash). Run them concurrently — same
    // pattern as /api/auth/login (CLAUDE.md §34.4). Order of the checks below
    // is unchanged: captcha verdict first, then throttle.
    const [captcha, ipLimit, userLimit] = await Promise.all([
      verifyRecaptchaToken(req, recaptchaToken, 'admin_login'),
      rateLimit(ipKey, 8, 10 * 60 * 1000),
      rateLimit(userKey, 5, 10 * 60 * 1000),
    ]);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Defence-in-depth: per-IP and per-username throttles before DB/bcrypt work.
    if (!ipLimit.allowed || !userLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, userLimit.retryAfterSeconds);
      blockKey(lockKey, LOCKOUT_WINDOW_MS);
      return NextResponse.json(
        { error: 'Çok fazla başarısız deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      );
    }

    // First-run bootstrap. We refuse to seed a default username/password —
    // older versions of this route fell back to a literal `oknbrk` /
    // `123456+` pair when the env was unset, which let anyone with repo
    // access take over a fresh deploy. Now both env vars must be set AND
    // the password must clear `isStrongPassword`'s 8+ char + letter +
    // digit bar; otherwise we just don't bootstrap and login fails.
    //
    // The legacy "rename `admin` → `oknbrk`" hotfix was also dropped —
    // dead code that wrote on every login attempt and leaked the canonical
    // admin username via timing/error patterns.
    try {
      const adminCount = await prisma.adminUser.count();
      if (adminCount === 0) {
        const envUsername = process.env.ADMIN_USERNAME?.trim();
        const envPassword = process.env.ADMIN_PASSWORD;
        const passwordOk =
          typeof envPassword === 'string' &&
          envPassword.length >= 8 &&
          /[A-Za-z]/.test(envPassword) &&
          /\d/.test(envPassword);
        if (envUsername && passwordOk) {
          const defaultHash = await bcrypt.hash(envPassword, BCRYPT_COST);
          await prisma.adminUser.create({
            data: {
              username: envUsername.toLowerCase(),
              passwordHash: defaultHash,
            },
          });
        } else if (process.env.NODE_ENV === 'production') {
          console.error(
            '[admin/login] No AdminUser rows and ADMIN_USERNAME/ADMIN_PASSWORD not set to strong values — refusing to seed.',
          );
        }
      }
    } catch {
      // Ignored if table doesn't exist (preview before schema migration, etc.)
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
      // Fallback for DB issues or first run. Env vars must be present AND
      // pass the same strength bar applied at bootstrap — no default
      // username / password literals. Keeps a fresh deploy from accepting
      // a known credential pair before the operator sets ADMIN_PASSWORD.
      const envUsername = process.env.ADMIN_USERNAME?.trim();
      const envPassword = process.env.ADMIN_PASSWORD;
      const envPasswordStrong =
        typeof envPassword === 'string' &&
        envPassword.length >= 8 &&
        /[A-Za-z]/.test(envPassword) &&
        /\d/.test(envPassword);

      if (
        envUsername &&
        envPasswordStrong &&
        normalizedUsername === envUsername.toLowerCase() &&
        constantTimeStringEq(password, envPassword as string)
      ) {
        isPasswordValid = true;
        try {
          const adminCount = await prisma.adminUser.count();
          if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
            admin = await prisma.adminUser.create({
              data: {
                username: envUsername.toLowerCase(),
                passwordHash: hashedPassword,
              },
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

      // Stage: 'staff' role added (CLAUDE.md §37.2 granular RBAC). The
      // login JWT must carry the exact stored role so `isAdminRole` +
      // `loadAdminPanelProfile` can resolve grants on the next request.
      // Coercing 'staff' → 'superadmin' would silently escalate privileges.
      let payloadRole: 'superadmin' | 'manager' | 'staff' = 'superadmin';
      let payloadRestaurantId = null;
      let payloadId = 'env-admin';
      const payloadUsername = normalizedUsername;

      if (admin) {
        if (admin.role === 'manager') payloadRole = 'manager';
        else if (admin.role === 'staff') payloadRole = 'staff';
        else payloadRole = 'superadmin';
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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Sunucu hatası veya veritabanı bağlantı sorunu' }, { status: 500 });
  }
}
