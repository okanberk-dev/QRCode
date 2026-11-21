// Pure helpers for the admin layout's single AdminUser read (no Prisma, no
// runtime imports): the layout reads the row once and derives both the
// session staleness verdict and the panel profile from it. The staleness
// rule mirrors `isAdminTokenStale` in src/lib/auth.ts exactly; the profile
// mirrors the admin branch of `loadAdminPanelProfile` exactly.
import type { JWTPayload } from 'jose';
import type { PanelActor } from './auth';
import type { AdminPanelProfile } from './admin-profile';

export interface AdminSessionRow {
  id: string;
  username: string;
  role: string;
  restaurantId: string | null;
  email: string | null;
  passwordChangedAt: Date | null;
  permissions: Array<{ resource: string; action: string }>;
}

function getStringClaim(payload: JWTPayload, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * The PanelActor the admin layout builds from a verified admin JWT. Returns
 * null when the role claim is not an admin role (same gate as the layout).
 */
export function adminActorFromPayload(payload: JWTPayload): PanelActor | null {
  const role = getStringClaim(payload, 'role');
  if (role !== 'superadmin' && role !== 'manager' && role !== 'staff') return null;
  return {
    id: getStringClaim(payload, 'id') || 'env-admin',
    role,
    restaurantId: getStringClaim(payload, 'restaurantId'),
    username: getStringClaim(payload, 'username'),
    email: getStringClaim(payload, 'email') || getStringClaim(payload, 'username'),
    plan: getStringClaim(payload, 'plan'),
    source: 'admin',
  };
}

/**
 * Same verdict as `isAdminTokenStale` once the row has been read: a missing
 * row is a deleted admin (revoked), a row without `passwordChangedAt` is a
 * legacy session (fresh), otherwise a token issued before the last password
 * change is stale. `iat` is in seconds, the timestamp in milliseconds.
 */
export function isAdminRowStale(
  iatSeconds: number,
  row: { passwordChangedAt: Date | null } | null,
): boolean {
  if (!row) return true;
  if (!row.passwordChangedAt) return false;
  return iatSeconds * 1000 < row.passwordChangedAt.getTime();
}

/**
 * `${resource}:${action}` grants for the sidebar. Superadmin carries none
 * (hasPermission bypasses the table for them). Expiry is filtered by the query.
 */
export function adminPermissionKeys(
  role: string,
  rows: Array<{ resource: string; action: string }>,
): string[] {
  if (role === 'superadmin') return [];
  return rows.map((r) => `${r.resource}:${r.action}`);
}

/** The panel profile for an AdminUser row (admin branch of loadAdminPanelProfile). */
export function adminProfileFromRow(
  row: Pick<AdminSessionRow, 'id' | 'username' | 'role' | 'restaurantId' | 'email'>,
  permissions: string[],
  site: { logoUrl: string | null; faviconUrl: string | null },
): AdminPanelProfile {
  const role = row.role || 'superadmin';
  return {
    id: row.id,
    username: row.username,
    email: row.email || row.username,
    recoveryEmail: row.email || null,
    name: row.username,
    role,
    plan: null,
    trialEndsAt: null,
    restaurantId: row.restaurantId || null,
    restaurantIds: row.restaurantId ? [row.restaurantId] : [],
    logoUrl: site.logoUrl,
    faviconUrl: site.faviconUrl,
    permissions,
  };
}
