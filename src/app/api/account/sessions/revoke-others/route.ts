import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { hashToken } from '@/lib/session-hash';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 8 — Tüm diğer oturumlardan çıkış (Faz 3).
//
// Mevcut request'in token hash'i hariç tüm UserSession row'larını revoke eder.
// "Şüpheli oturum gördüm, hesabımı koru" akışı.

export async function POST(req: NextRequest) {
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = (payload.sub || (payload as { id?: string }).id) as string | undefined;
  if (!userId) return ApiErrors.unauthorized();

  const cookieToken = req.cookies.get('user_token')?.value || '';
  const currentTokenHash = cookieToken ? hashToken(cookieToken) : null;

  const result = await prisma.userSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {}),
    },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true, revokedCount: result.count });
}
