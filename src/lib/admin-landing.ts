import { prisma } from '@/lib/prisma';
import {
  getAdminNavLeaves,
  toAdminNavRole,
  type AdminNavRole,
} from '@/components/admin/admin-nav';

/** Active (non-expired) grants of a manager / staff admin as `resource:action`. */
export async function loadAdminPermissionKeys(adminId: string, role: AdminNavRole): Promise<string[]> {
  if (role === 'superadmin' || !adminId || adminId === 'env-admin') return [];
  try {
    const now = new Date();
    const rows = await prisma.adminPermission.findMany({
      where: { adminUserId: adminId, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { resource: true, action: true },
    });
    return rows.map((r) => `${r.resource}:${r.action}`);
  } catch {
    return [];
  }
}

/**
 * First admin page this account can open, used when a page it cannot see is
 * requested (e.g. the global dashboard for a restaurant-scoped manager).
 * Falls back to the profile page, which every admin can open.
 */
export async function adminLandingPath(
  adminId: string,
  rawRole: unknown,
  exclude: string,
): Promise<string> {
  const role = toAdminNavRole(rawRole);
  const permissions = new Set(await loadAdminPermissionKeys(adminId, role));
  const leaf = getAdminNavLeaves(role, permissions).find((l) => l.href !== exclude);
  return leaf?.href ?? '/admin/profile';
}
