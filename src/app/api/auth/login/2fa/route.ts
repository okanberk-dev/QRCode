import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/totp';
import { rateLimit, maybeSweep, getClientIp } from '@/lib/rate-limit';
import { getSecret } from '@/lib/auth';
import * as jose from 'jose';
import { issueLoginSession } from '../route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifyChallengeToken(token: string): Promise<{ userId: string; rememberMe: boolean } | null> {
  try {
    // getSecret() production'da JWT_SECRET yoksa throw eder; aşağıdaki
    // catch null döner ve kullanıcı "challenge süresi doldu" mesajı alır
    // (forged challenge token'ın imzası doğrulanmaz).
    const { payload } = await jose.jwtVerify(token, getSecret());
    if (payload.kind !== 'login_challenge') return null;
    if (typeof payload.userId !== 'string') return null;
    return { userId: payload.userId, rememberMe: !!payload.rememberMe };
  } catch {
    return null;
  }
}

/**
 * Section 8 — Login 2FA challenge verify (V2 backend gap kapatması).
 *
 * Login route'u twoFactorEnabled=true kullanıcılar için challengeToken döner;
 * burada 6 haneli TOTP kodu (veya XXXX-XXXX backup code) doğrulanır → user_token
 * cookie set + UserSession row create.
 *
 * Body: { challengeToken, code }
 *  - code: 6 haneli sayı veya 8 hane backup kod (XXXX-XXXX)
 *
 * Rate limit: 10/dk per IP (brute force defense).
 */
export async function POST(req: NextRequest) {
  maybeSweep();
  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`2fa:login:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla deneme. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  let body: { challengeToken?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }
  const challengeToken = (body.challengeToken ?? '').trim();
  const code = (body.code ?? '').trim();

  if (!challengeToken) {
    return NextResponse.json({ error: 'Eksik challenge token.' }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: 'Doğrulama kodu zorunlu.' }, { status: 400 });
  }

  const challenge = await verifyChallengeToken(challengeToken);
  if (!challenge) {
    return NextResponse.json(
      { error: 'Doğrulama oturumu süresi dolmuş. Lütfen yeniden giriş yap.' },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      trialEndsAt: true,
      isActive: true,
      twoFactorEnabled: true,
      totpSecret: true,
      twoFactorBackupCodes: true,
    },
  });
  if (!user || !user.isActive || !user.twoFactorEnabled || !user.totpSecret) {
    return NextResponse.json({ error: 'Doğrulama yapılamadı.' }, { status: 401 });
  }

  // 6-haneli TOTP kodu denemesi
  let verified = false;
  if (/^\d{6}$/.test(code)) {
    verified = verifyToken(user.totpSecret, code);
  }

  // Backup code denemesi (XXXX-XXXX format). bcrypt compare; başarılıysa
  // kullanılan kod listeden çıkarılır (one-time use).
  let usedBackupIndex: number | null = null;
  if (!verified && /^[A-Za-z0-9-]{8,}$/.test(code) && user.twoFactorBackupCodes.length > 0) {
    const cleaned = code.replace('-', '').toUpperCase();
    for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
      const hash = user.twoFactorBackupCodes[i];
      if (await bcrypt.compare(cleaned, hash)) {
        verified = true;
        usedBackupIndex = i;
        break;
      }
    }
  }

  if (!verified) {
    return NextResponse.json({ error: 'Geçersiz kod.' }, { status: 401 });
  }

  // Backup code tüketildi → DB'den sil
  if (usedBackupIndex !== null) {
    const remaining = user.twoFactorBackupCodes.filter((_, i) => i !== usedBackupIndex);
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: remaining },
    });
  }

  // Login akışını paylaşılan helper ile tamamla — JWT + UserSession + cookie
  return await issueLoginSession({
    req,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
    },
    rememberMe: challenge.rememberMe,
  });
}
