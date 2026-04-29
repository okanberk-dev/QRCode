import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// POST /api/admin/members/[id]/reactivate — reverse soft delete.
// Sets isActive=true, deactivatedAt=null. Audit-logged.
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isActive: true, email: true },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  if (user.isActive) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { isActive: true, deactivatedAt: null },
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: adminId,
        actorSource: 'admin',
        action: 'admin.members.reactivate',
        targetId: id,
        payload: { email: user.email },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
