import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { verifyToken } from '@/lib/totp';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';
import { writeAdminAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 8 — 2FA disable (Faz 3).
//
// Kullanıcı şifresini + opsiyonel TOTP kodu (veya backup code) ile doğrular.
// Şifre zorunlu — başkasının açık session'unu çalıp 2FA'yı kapatamaması için.
// TOTP kodu varsa öncelikle onu doğrular; yoksa backup code denenir.
//
// Body: { password, code? }
// Response: { ok: true }

export async function POST(req: NextRequest) {
  maybeSweep();
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = payload.userId;
  if (!userId) return ApiErrors.unauthorized();

  const rl = await rateLimit(`2fa:disable:${userId}`, 5, 60 * 1000);
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
  const password = typeof body.password === 'string' ? body.password : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!password) return ApiErrors.badRequest('Şifre gerekli', 'PASSWORD_REQUIRED');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      totpSecret: true,
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  });
  if (!user) return ApiErrors.notFound('Kullanıcı bulunamadı');
  if (!user.twoFactorEnabled) {
    return ApiErrors.badRequest('2FA zaten kapalı', 'TWO_FACTOR_NOT_ENABLED');
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) return ApiErrors.badRequest('Şifre hatalı', 'INVALID_PASSWORD');

  // İkinci faktör (TOTP veya backup) ZORUNLU (audit §38.B M3). 2FA'nın amacı,
  // şifre ele geçirilse / oturum çalınsa bile hesabı korumaktır; sadece şifreyle
  // 2FA kapatılması bu garantiyi yok eder. `twoFactorEnabled` burada kesin
  // (yukarıda kapalıysa early-return). Geçerli TOTP veya backup kodu şart.
  if (!code) {
    return ApiErrors.badRequest('Doğrulama kodu gerekli', 'CODE_REQUIRED');
  }
  let secondOk = false;
  if (user.totpSecret && /^\d{6}$/.test(code)) {
    secondOk = verifyToken(user.totpSecret, code);
  }
  if (!secondOk && user.twoFactorBackupCodes.length > 0) {
    const cleaned = code.replace('-', '').toUpperCase();
    for (const hash of user.twoFactorBackupCodes) {
      if (await bcrypt.compare(cleaned, hash)) {
        secondOk = true;
        break;
      }
    }
  }
  if (!secondOk) return ApiErrors.badRequest('Geçersiz kod', 'INVALID_CODE');

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      totpSecret: null,
      twoFactorBackupCodes: [],
    },
  });

  // Security downgrade — always audit-logged.
  await writeAdminAuditLog({
    actorId: userId,
    actorSource: 'user',
    action: 'owner.account.2fa_disabled',
    targetId: userId,
    payload: {},
  });

  return NextResponse.json({ ok: true });
}
