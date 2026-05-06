import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

// GET /api/admin/users/[id]/audit — last 50 audit entries WHERE the AdminUser
// is the **actor** (filter by actorId + actorSource='admin'). Members audit
// endpoint (CLAUDE.md §38.93 sibling) filters by targetId — admin-side detail
// page wants "what did this admin do?" history instead.
//
// Resilient — schema drift (P2021/P2022) returns empty list with degraded
// flag; UI EmptyState ("Henüz aksiyon yok") is strictly better than 500.
export const dynamic = 'force-dynamic';

function isPrismaSchemaDriftError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === 'P2021' || code === 'P2022';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Stage A2 §38.94 — RBAC: audit_logs:read.
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'audit_logs', 'read'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let entries: Array<{
    id: string;
    targetId: string | null;
    actorSource: string;
    action: string;
    payload: unknown;
    createdAt: Date;
  }> = [];

  try {
    entries = await prisma.adminAuditLog.findMany({
      where: { actorId: id, actorSource: 'admin' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        targetId: true,
        actorSource: true,
        action: true,
        payload: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('[admin/users/audit] adminAuditLog query failed', {
      actorId: id,
      code: (error as { code?: string } | null)?.code,
      error,
    });
    if (isPrismaSchemaDriftError(error)) {
      return NextResponse.json({ data: [], degraded: 'schema_drift' });
    }
    return NextResponse.json({ data: [], degraded: 'read_failed' });
  }

  // Resolve target labels — actions with targetId pointing to User/Restaurant
  // get a friendly name. Best-effort batch fetch (User + Restaurant).
  const userTargetIds = entries
    .filter((e) => e.action.startsWith('admin.members.') || e.action.startsWith('admin.billing.') || e.action.startsWith('admin.invoice.'))
    .map((e) => e.targetId)
    .filter((t): t is string => Boolean(t));
  const restaurantTargetIds = entries
    .filter((e) => e.action.startsWith('admin.restaurants.'))
    .map((e) => e.targetId)
    .filter((t): t is string => Boolean(t));
  const adminUserTargetIds = entries
    .filter((e) => e.action.startsWith('admin.users.'))
    .map((e) => e.targetId)
    .filter((t): t is string => Boolean(t));

  let users: Array<{ id: string; email: string; name: string | null }> = [];
  let restaurants: Array<{ id: string; name: string; slug: string }> = [];
  let adminUsers: Array<{ id: string; username: string; email: string | null }> = [];
  try {
    [users, restaurants, adminUsers] = await Promise.all([
      userTargetIds.length === 0
        ? Promise.resolve([] as Array<{ id: string; email: string; name: string | null }>)
        : prisma.user.findMany({
            where: { id: { in: userTargetIds } },
            select: { id: true, email: true, name: true },
          }),
      restaurantTargetIds.length === 0
        ? Promise.resolve([] as Array<{ id: string; name: string; slug: string }>)
        : prisma.restaurant.findMany({
            where: { id: { in: restaurantTargetIds } },
            select: { id: true, name: true, slug: true },
          }),
      adminUserTargetIds.length === 0
        ? Promise.resolve([] as Array<{ id: string; username: string; email: string | null }>)
        : prisma.adminUser.findMany({
            where: { id: { in: adminUserTargetIds } },
            select: { id: true, username: true, email: true },
          }),
    ]);
  } catch (error) {
    console.error('[admin/users/audit] target resolve failed', error);
    // Non-fatal — entries render without resolved target labels.
  }

  const userMap = new Map(users.map((u) => [u.id, u]));
  const restaurantMap = new Map(restaurants.map((r) => [r.id, r]));
  const adminMap = new Map(adminUsers.map((a) => [a.id, a]));

  return NextResponse.json({
    data: entries.map((e) => {
      let target: { id: string; label: string; href: string | null } | null = null;
      if (e.targetId) {
        if (e.action.startsWith('admin.members.') || e.action.startsWith('admin.billing.') || e.action.startsWith('admin.invoice.')) {
          const u = userMap.get(e.targetId);
          if (u) {
            target = {
              id: u.id,
              label: u.name || u.email,
              href: `/admin/members/${u.id}`,
            };
          }
        } else if (e.action.startsWith('admin.restaurants.')) {
          const r = restaurantMap.get(e.targetId);
          if (r) {
            target = {
              id: r.id,
              label: r.name,
              href: `/admin/restaurants/${r.id}`,
            };
          }
        } else if (e.action.startsWith('admin.users.')) {
          const a = adminMap.get(e.targetId);
          if (a) {
            target = {
              id: a.id,
              label: a.username,
              href: `/admin/users/${a.id}`,
            };
          }
        }
      }
      return {
        id: e.id,
        action: e.action,
        targetId: e.targetId,
        target,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      };
    }),
  });
}
