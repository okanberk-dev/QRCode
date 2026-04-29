import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// GET /api/admin/members/[id]/audit — last 50 admin actions targeting this
// user. Joined with actor name/email so the timeline UI can show who did what.
// Action label translation lives client-side (TR/EN map per action key).
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const entries = await prisma.adminAuditLog.findMany({
    where: { targetId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      actorId: true,
      actorSource: true,
      action: true,
      payload: true,
      createdAt: true,
    },
  });

  // Resolve actor names — actorSource='admin' → AdminUser, 'user' → User. Bulk
  // fetch for both to avoid N+1.
  const adminIds = entries.filter((e) => e.actorSource === 'admin').map((e) => e.actorId);
  const userIds = entries.filter((e) => e.actorSource === 'user').map((e) => e.actorId);

  const [adminUsers, users] = await Promise.all([
    adminIds.length === 0
      ? []
      : prisma.adminUser.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, email: true, name: true, role: true },
        }),
    userIds.length === 0
      ? []
      : prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        }),
  ]);

  const adminMap = new Map(adminUsers.map((a) => [a.id, a]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    data: entries.map((e) => {
      const actor =
        e.actorSource === 'admin' ? adminMap.get(e.actorId) : userMap.get(e.actorId);
      return {
        id: e.id,
        action: e.action,
        actorSource: e.actorSource,
        actor: actor
          ? {
              id: actor.id,
              email: actor.email,
              name: actor.name,
              role: 'role' in actor ? actor.role : null,
            }
          : null,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      };
    }),
  });
}
