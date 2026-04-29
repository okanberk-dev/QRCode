import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { verifyToken, generateBackupCodes } from '@/lib/totp';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 8 — 2FA verify (Faz 3).
//
// Setup endpoint'in geçici olarak yazdığı totpSecret'a karşı 6 haneli kodu
// doğrular. Başarılıysa twoFactorEnabled=true + 8 backup code üretir,
// bcrypt hash'lenmiş olarak DB'ye yazar, plaintext kodları response'da
// tek seferlik döner. Frontend kullanıcıya "Bu kodları sakla" uyarısı gösterir.
//
// Response: { ok: true, backupCodes: string[] } veya { ok: false, error }.
// Rate limit: 10/dk/user (brute force defense).

export async function POST(req: NextRequest) {
  maybeSweep();
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = (payload.sub || (payload as { id?: string }).id) as string | undefined;
  if (!userId) return ApiErrors.unauthorized();

  const rl = await rateLimit(`2fa:verify:${userId}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla deneme. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest('invalid_json');
  }
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!/^\d{6}$/.test(code)) {
    return ApiErrors.badRequest('Kod 6 haneli sayı olmalı', 'INVALID_CODE_FORMAT');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, totpSecret: true, twoFactorEnabled: true },
  });
  if (!user) return ApiErrors.notFound('Kullanıcı bulunamadı');
  if (user.twoFactorEnabled) {
    return ApiErrors.badRequest('2FA zaten aktif', 'TWO_FACTOR_ALREADY_ENABLED');
  }
  if (!user.totpSecret) {
    return ApiErrors.badRequest(
      'Önce setup adımını tamamla',
      'TWO_FACTOR_NOT_SETUP',
    );
  }

  if (!verifyToken(user.totpSecret, code)) {
    return NextResponse.json({ ok: false, error: 'Geçersiz kod' }, { status: 200 });
  }

  // Backup codes — plaintext döner (bir kerelik), DB'de bcrypt hash.
  const backupCodes = generateBackupCodes(8);
  const hashed = await Promise.all(
    backupCodes.map((c) => bcrypt.hash(c.replace('-', ''), 10)),
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashed,
    },
  });

  return NextResponse.json({ ok: true, backupCodes });
}
