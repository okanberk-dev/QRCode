import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// GET /api/admin/members/[id]/audit — last 50 admin actions targeting this
// user. Joined with actor name/email so the timeline UI can show who did what.
// Action label translation lives client-side (TR/EN map per action key).
//
// Resilience: any unexpected DB error (schema drift on a preview deploy that
// hasn't run schema migration yet, transient connection blip, malformed
// payload column) used to bubble up as a 500 and break the member detail page.
// We now degrade gracefully — log + return empty data so the timeline shows
// its empty state instead of a console error wall.
export const dynamic = 'force-dynamic';

function isPrismaSchemaDriftError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === 'P2021' || code === 'P2022';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let entries: Array<{
    id: string;
    actorId: string;
    actorSource: string;
    action: string;
    payload: unknown;
    createdAt: Date;
  }> = [];

  try {
    entries = await prisma.adminAuditLog.findMany({
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
  } catch (error) {
    console.error('[admin/members/audit] adminAuditLog query failed', {
      targetId: id,
      code: (error as { code?: string } | null)?.code,
      error,
    });
    // Schema drift or any other read failure → empty timeline. The UI's
    // EmptyState ("Henüz admin aksiyonu yok") is a strictly better UX than
    // a console-error 500.
    if (isPrismaSchemaDriftError(error)) {
      return NextResponse.json({ data: [], degraded: 'schema_drift' });
    }
    return NextResponse.json({ data: [], degraded: 'read_failed' });
  }

  // Resolve actor names — actorSource='admin' → AdminUser, 'user' → User. Bulk
  // fetch for both to avoid N+1.
  const adminIds = entries.filter((e) => e.actorSource === 'admin').map((e) => e.actorId);
  const userIds = entries.filter((e) => e.actorSource === 'user').map((e) => e.actorId);

  // AdminUser model'inde `name` field'ı yok — display name için `username`
  // kullanılır (CLAUDE.md §4 — AdminUser tablosunda superadmin/manager için
  // username unique). User model'inde ise `name` field'ı mevcut. Aynı normalize
  // shape döndürmek için `name` virtual field'ı her iki kaynak için map edilir.
  let adminUsers: Array<{ id: string; email: string | null; name: string; role: string }> = [];
  let users: Array<{ id: string; email: string; name: string | null }> = [];
  try {
    const [adminRows, userRows] = await Promise.all([
      adminIds.length === 0
        ? Promise.resolve([] as Array<{ id: string; email: string | null; username: string; role: string }>)
        : prisma.adminUser.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, email: true, username: true, role: true },
          }),
      userIds.length === 0
        ? Promise.resolve([] as Array<{ id: string; email: string; name: string | null }>)
        : prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          }),
    ]);
    adminUsers = adminRows.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.username,
      role: a.role,
    }));
    users = userRows;
  } catch (error) {
    console.error('[admin/members/audit] actor resolve failed', error);
    // Non-fatal: render entries without actor names rather than 500.
  }

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
