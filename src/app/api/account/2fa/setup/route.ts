import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { generateSecret, buildOtpauthUrl } from '@/lib/totp';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 8 — 2FA setup (Faz 3).
//
// Yeni TOTP secret üretir, User.totpSecret'a yazar (twoFactorEnabled hâlâ
// false — verify endpoint kod doğrulanırsa true'ya çekecek). Önceki secret
// (eğer varsa ve 2FA açıksa) korunur — yanlışlıkla kapanmasın.
//
// Response: { secret, otpauthUrl } — frontend QR kodu üretir.
// Rate limit: 5/dk/user (setup spam'ini engelle).

export async function POST(req: NextRequest) {
  maybeSweep();
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = (payload.sub || (payload as { id?: string }).id) as string | undefined;
  if (!userId) return ApiErrors.unauthorized();

  const rl = await rateLimit(`2fa:setup:${userId}`, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla deneme. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, twoFactorEnabled: true },
  });
  if (!user) return ApiErrors.notFound('Kullanıcı bulunamadı');

  if (user.twoFactorEnabled) {
    return ApiErrors.badRequest(
      '2FA zaten aktif. Önce kapatıp yeniden kurulum yap.',
      'TWO_FACTOR_ALREADY_ENABLED',
    );
  }

  const secret = generateSecret();
  const otpauthUrl = buildOtpauthUrl({ secret, account: user.email, issuer: 'Buaze' });

  // Geçici olarak yaz — verify edilene kadar twoFactorEnabled false kalır.
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret },
  });

  return NextResponse.json({ secret, otpauthUrl });
}
