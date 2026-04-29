import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 8 — Tek session revoke (Faz 3).
//
// Owner kendi UserSession row'unu revoke eder (revokedAt set). Auth middleware
// bir sonraki request'te 401 dönecek (mevcut JWT geçersizleşir). Başka kullanıcının
// session'ını revoke etmek mümkün değil — userId match zorunlu.

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = (payload.sub || (payload as { id?: string }).id) as string | undefined;
  if (!userId) return ApiErrors.unauthorized();

  // Sadece kendi session'ını revoke edebilir.
  const session = await prisma.userSession.findUnique({
    where: { id },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!session || session.userId !== userId) {
    return ApiErrors.notFound('Oturum bulunamadı');
  }
  if (session.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await prisma.userSession.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
