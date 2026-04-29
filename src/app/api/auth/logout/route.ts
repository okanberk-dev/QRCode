import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/session-hash';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });

  // UserSession revoke — Section 8 (mevcut session'ın tokenHash'i için
  // revokedAt set, getPanelActorFromRequest revoked ise null döner).
  // Best-effort: cookie yoksa veya hash matchlemiyorsa silently devam.
  const userToken = req.cookies.get('user_token')?.value;
  if (userToken) {
    try {
      await prisma.userSession.updateMany({
        where: { tokenHash: hashToken(userToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      console.error('[AUTH_LOGOUT] revoke failed:', (err as Error).message);
    }
  }

  response.cookies.set('user_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
