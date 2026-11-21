import type { JWTPayload } from 'jose';
import { verifyAdminTokenForLayout, verifyJwt, type PanelActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/site-settings';
import {
  adminActorFromPayload,
  adminPermissionKeys,
  adminProfileFromRow,
  isAdminRowStale,
} from '@/lib/admin-session-row';

/**
 * Fetch granular RBAC grants for a non-superadmin admin. Superadmin bypasses
 * the DB (rbac.ts:hasPermission returns true unconditionally) so we skip the
 * round-trip. Expired grants are filtered out. P2022 (column missing on a
 * preview deploy that hasn't migrated yet) returns an empty list — sidebar
 * silently degrades to role-only filtering.
 */
async function fetchAdminPermissions(adminUserId: string, role: string): Promise<string[]> {
  if (role === 'superadmin') return [];
  try {
    const now = new Date();
    const rows = await prisma.adminPermission.findMany({
      where: {
        adminUserId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { resource: true, action: true },
    });
    return adminPermissionKeys(role, rows);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2022') return [];
    console.error('[admin-profile] Failed to fetch permissions:', err);
    return [];
  }
}

export interface AdminPanelProfile {
  id: string;
  username: string | null;
  email: string | null;
  recoveryEmail?: string | null;
  name?: string | null;
  role: string;
  plan: string | null;
  trialEndsAt: string | null;
  restaurantId: string | null;
  restaurantIds: string[];
  workspaceName?: string | null;
  locationCount?: number | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  /**
   * Granular RBAC grants in `${resource}:${action}` format (e.g. `"reviews:read"`).
   * Superadmin returns `[]` since `hasPermission()` bypasses DB lookup for them.
   * Manager + staff carry the actual `AdminPermission` rows; sidebar uses this
   * Set to filter nav items annotated with `permission: { resource, action }`.
   * Expired grants (`expiresAt < now`) are excluded.
   */
  permissions: string[];
}

export async function loadAdminPanelProfile(actor: PanelActor): Promise<AdminPanelProfile> {
  const { logoUrl, faviconUrl } = await getSiteSettings();

  if (actor.role === 'restaurant_owner') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          trialEndsAt: true,
          role: true,
        },
      });

      if (user) {
        const restaurants = await prisma.restaurant.findMany({
          where: { userId: user.id },
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' },
        });
        const restaurantIds = restaurants.map((restaurant) => restaurant.id);

        return {
          id: user.id,
          username: user.email,
          email: user.email,
          name: user.name,
          role: 'restaurant_owner',
          plan: user.plan,
          trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
          restaurantId: restaurantIds[0] || null,
          restaurantIds,
          workspaceName: restaurants[0]?.name || user.name || user.email.split('@')[0],
          locationCount: restaurants.length,
          logoUrl,
          faviconUrl,
          permissions: [],
        };
      }
    } catch (error) {
      console.error('[admin-profile] Failed to fetch owner profile:', error);
    }
  }

  try {
    let adminUser: {
      id: string;
      username: string;
      role: string;
      restaurantId: string | null;
      email: string | null;
    } | null = null;

    try {
      adminUser = await prisma.adminUser.findUnique({
        where: { id: actor.id },
        select: {
          id: true,
          username: true,
          role: true,
          restaurantId: true,
          email: true,
        },
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== 'P2022') throw err;
      const fallback = await prisma.adminUser.findUnique({
        where: { id: actor.id },
        select: { id: true, username: true, role: true, restaurantId: true },
      });
      adminUser = fallback ? { ...fallback, email: null } : null;
    }

    if (adminUser) {
      const role = adminUser.role || 'superadmin';
      const permissions = await fetchAdminPermissions(adminUser.id, role);
      return adminProfileFromRow(adminUser, permissions, { logoUrl, faviconUrl });
    }
  } catch (error) {
    console.error('[admin-profile] Failed to fetch admin profile:', error);
  }

  // Token-only fallback (no AdminUser DB row matched the actor id — env-admin
  // bootstrap path). Skip permissions fetch; behaves like superadmin/manager
  // per the JWT claim.
  return {
    id: actor.id,
    username: actor.username,
    email: actor.email,
    name: actor.username,
    role: actor.role || 'superadmin',
    plan: actor.plan,
    trialEndsAt: null,
    restaurantId: actor.restaurantId || null,
    restaurantIds: actor.restaurantId ? [actor.restaurantId] : [],
    logoUrl,
    faviconUrl,
    permissions: [],
  };
}

export interface AdminLayoutAuth {
  payload: JWTPayload;
  actor: PanelActor;
  /**
   * Built from the same AdminUser read that decided staleness. Null on the
   * legacy path (env-admin, token without `iat`, or the combined read failed);
   * the caller then loads it with `loadAdminPanelProfile(actor)` as before.
   */
  profile: AdminPanelProfile | null;
}

/**
 * Admin layout auth + profile in one AdminUser read.
 *
 * Before: `verifyAdminTokenForLayout` read `passwordChangedAt`, then
 * `loadAdminPanelProfile` read the same row again and then the permission
 * grants — three sequential round-trips on every hard load of /admin/*.
 * Now one `findUnique` carries the staleness column, the profile columns
 * and the active grants. The verdict is the same as `isAdminTokenStale`
 * (missing row = stale, iat*1000 < passwordChangedAt = stale) and the
 * profile is the same as `loadAdminPanelProfile`.
 *
 * Any error on the combined read (a DB hiccup, P2022 on a preview database
 * that misses a column) falls back to the exact previous two-step path,
 * which keeps its fail-open staleness and P2022 profile fallback.
 *
 * Returns null when the token is invalid, not an admin token, or stale.
 */
export async function authenticateAdminLayout(rawToken: string): Promise<AdminLayoutAuth | null> {
  const payload = await verifyJwt(rawToken);
  const actor = payload ? adminActorFromPayload(payload) : null;
  if (!payload || !actor) return null;

  const adminId = typeof payload.id === 'string' ? payload.id : null;
  const iat = typeof payload.iat === 'number' ? payload.iat : null;
  // The fast path only runs where the staleness check would hit the DB with
  // the same id the profile uses; every other case keeps the old code path.
  if (adminId && adminId !== 'env-admin' && iat && actor.id === adminId) {
    let row:
      | {
          id: string;
          username: string;
          role: string;
          restaurantId: string | null;
          email: string | null;
          passwordChangedAt: Date | null;
          permissions: Array<{ resource: string; action: string }>;
        }
      | null
      | undefined;
    try {
      const now = new Date();
      row = await prisma.adminUser.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          username: true,
          role: true,
          restaurantId: true,
          email: true,
          passwordChangedAt: true,
          permissions: {
            where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            select: { resource: true, action: true },
          },
        },
      });
    } catch {
      row = undefined;
    }
    if (row !== undefined) {
      if (isAdminRowStale(iat, row)) return null;
      // isAdminRowStale returned false, so the row exists.
      const adminRow = row as NonNullable<typeof row>;
      const { logoUrl, faviconUrl } = await getSiteSettings();
      const role = adminRow.role || 'superadmin';
      return {
        payload,
        actor,
        profile: adminProfileFromRow(adminRow, adminPermissionKeys(role, adminRow.permissions), {
          logoUrl,
          faviconUrl,
        }),
      };
    }
  }

  const verified = await verifyAdminTokenForLayout(rawToken);
  const verifiedActor = verified ? adminActorFromPayload(verified) : null;
  if (!verified || !verifiedActor) return null;
  return { payload: verified, actor: verifiedActor, profile: null };
}
