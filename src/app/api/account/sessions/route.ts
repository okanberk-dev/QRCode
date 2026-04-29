import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { hashToken } from '@/lib/session-hash';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 8 — Aktif oturumlar listesi (Faz 3).
//
// Workspace user'ın revokedAt=null tüm UserSession row'larını döner.
// "Bu cihaz" badge için current request'in token hash'i de response'a
// eklenir; frontend karşılaştırarak vurgular.

export async function GET(req: NextRequest) {
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = (payload.sub || (payload as { id?: string }).id) as string | undefined;
  if (!userId) return ApiErrors.unauthorized();

  // Mevcut JWT'yi cookie'den al — current session badge için.
  const cookieToken = req.cookies.get('user_token')?.value || '';
  const currentTokenHash = cookieToken ? hashToken(cookieToken) : '';

  const sessions = await prisma.userSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: 'desc' },
    select: {
      id: true,
      tokenHash: true,
      userAgent: true,
      ipAddress: true,
      lastSeenAt: true,
      createdAt: true,
    },
    take: 50,
  });

  return NextResponse.json({
    currentTokenHash,
    sessions: sessions.map((s) => ({
      id: s.id,
      isCurrent: s.tokenHash === currentTokenHash,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      lastSeenAt: s.lastSeenAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
