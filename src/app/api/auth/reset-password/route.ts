import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';

const FALLBACK_SECRET = 'cldqlkmC72MfL/WvllPYQq9O0puMk4j+LxrEtzm8PVs=';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || FALLBACK_SECRET);
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);
    const body = await req.json();
    const token = typeof body.token === 'string' ? body.token : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!token || !/^\d{6}$/.test(code) || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Kod 6 haneli olmalı ve şifre en az 8 karakter uzunluğunda olmalıdır.' },
        { status: 400 },
      );
    }
    if (newPassword.length > 256) {
      return NextResponse.json({ error: 'Şifre çok uzun.' }, { status: 400 });
    }

    // Rate limit: 10 attempts per IP / 10 min
    const ipLimit = rateLimit(`pwr-submit:ip:${ip}`, 10, 10 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
      );
    }

    let payload: jose.JWTPayload;
    try {
      const verified = await jose.jwtVerify(token, getSecret());
      payload = verified.payload;
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş sıfırlama bağlantısı. Lütfen yeni bir kod talep edin.' },
        { status: 401 },
      );
    }

    if (payload.purpose !== 'pwr' || typeof payload.userId !== 'string' || typeof payload.codeHash !== 'string') {
      return NextResponse.json({ error: 'Geçersiz token.' }, { status: 401 });
    }

    // Constant-time compare of code hash
    const submittedHash = Buffer.from(hashCode(code), 'hex');
    const expectedHash = Buffer.from(payload.codeHash, 'hex');
    if (submittedHash.length !== expectedHash.length || !crypto.timingSafeEqual(submittedHash, expectedHash)) {
      return NextResponse.json({ error: 'Doğrulama kodu hatalı.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Hesap bulunamadı veya devre dışı.' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[RESET_PASSWORD]', error);
    return NextResponse.json({ error: 'Bir hata oluştu. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
