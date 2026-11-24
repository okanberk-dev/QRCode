/**
 * Google Business Profile (GBP) access gate — CLAUDE.md §53.
 *
 * Google approved Business Profile API access for ONE Google Cloud project
 * (currently the "hizlakirala" project) and for that company's own listing.
 * The feature is built multi-tenant, but serving other businesses with that
 * approval is not allowed, so every Business Profile call is gated by an
 * allowlist: `GBP_ALLOWED_TENANTS`.
 *
 * A tenant is a Buaze workspace owner (User). An allowlist entry is either
 * the owner's user id or the slug of any business that owner has; matching
 * one slug opens the whole workspace. Unset / empty = nobody (fail-closed).
 *
 * The gate runs on the server in three places: connect + callback (no sign-in
 * for a closed tenant), `getFreshGoogleAccessToken` (every Business Profile
 * request), and the public review showcase. The UI only mirrors it.
 */

import { prisma } from '@/lib/prisma';

// ─── pure helpers (unit-tested) ──────────────────────────────────────────

/** Parses `GBP_ALLOWED_TENANTS` (comma / whitespace separated). */
export function parseAllowedTenants(raw: string | null | undefined): Set<string> {
  if (typeof raw !== 'string') return new Set();
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0 && entry.length <= 120),
  );
}

/** True when any owner id or business slug of the tenant is allowlisted. */
export function tenantMatchesAllowlist(
  allowlist: ReadonlySet<string>,
  tenant: { ownerIds: readonly string[]; slugs: readonly string[] },
): boolean {
  if (allowlist.size === 0) return false;
  return (
    tenant.ownerIds.some((id) => allowlist.has(id.toLowerCase())) ||
    tenant.slugs.some((slug) => allowlist.has(slug.toLowerCase()))
  );
}

/**
 * Google OAuth client ids look like `<projectNumber>-<hash>.apps.googleusercontent.com`.
 * The project number tells which Google Cloud project (and so which API
 * approval and quota) the deploy is using. Client ids are not secret.
 */
export function googleClientProjectNumber(clientId: string | null | undefined): string | null {
  if (typeof clientId !== 'string') return null;
  const match = /^(\d{6,20})-[a-z0-9]+\.apps\.googleusercontent\.com$/i.exec(clientId.trim());
  return match ? match[1] : null;
}

/** The project Google approved Business Profile access for (hizlakirala). */
export const APPROVED_GBP_PROJECT_NUMBER = '899672574996';

export type GoogleConnectionState =
  | 'not_connected'
  /** Working connection. */
  | 'connected'
  /** Token was issued for another OAuth client (env changed) — reconnect. */
  | 'reconnect_required'
  /** Google revoked the grant (invalid_grant) or the token is gone — reconnect. */
  | 'broken';

export function googleConnectionState(
  integration: {
    refreshToken: string | null;
    clientId: string | null;
    invalidReason?: string | null;
  } | null,
  currentClientId: string | null | undefined,
): GoogleConnectionState {
  if (!integration) return 'not_connected';
  // A token with no recorded client predates this column: we cannot prove it
  // belongs to the current client, so it must be reconnected.
  if (!currentClientId || integration.clientId !== currentClientId) return 'reconnect_required';
  if (!integration.refreshToken || integration.invalidReason) return 'broken';
  return 'connected';
}

// ─── database-backed ─────────────────────────────────────────────────────

const MEMO_TTL_MS = 60_000;
const memo = new Map<string, { allowed: boolean; at: number }>();

export function allowedTenantEntries(): Set<string> {
  return parseAllowedTenants(process.env.GBP_ALLOWED_TENANTS);
}

/**
 * Is the Google integration row owned by `userRef` (a user id, or
 * `admin:<id>` for admin-made rows) inside an allowed tenant? Team members
 * inherit their active workspace's tenant. Admin rows are never a tenant.
 */
export async function isGoogleTenantAllowed(userRef: string | null | undefined): Promise<boolean> {
  if (!userRef || userRef.startsWith('admin:')) return false;
  const allowlist = allowedTenantEntries();
  if (allowlist.size === 0) return false;
  if (allowlist.has(userRef.toLowerCase())) return true;

  const now = Date.now();
  const cacheKey = `${process.env.GBP_ALLOWED_TENANTS ?? ''}|${userRef}`;
  const hit = memo.get(cacheKey);
  if (hit && now - hit.at < MEMO_TTL_MS) return hit.allowed;

  let allowed = false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userRef },
      select: { email: true },
    });
    const ownerIds = [userRef];
    if (user?.email) {
      const memberships = await prisma.teamMember.findMany({
        where: { email: user.email.toLowerCase().trim(), status: 'active' },
        select: { ownerId: true },
        take: 20,
      });
      for (const m of memberships) if (!ownerIds.includes(m.ownerId)) ownerIds.push(m.ownerId);
    }
    const restaurants = await prisma.restaurant.findMany({
      where: { userId: { in: ownerIds } },
      select: { slug: true },
      take: 500,
    });
    allowed = tenantMatchesAllowlist(allowlist, {
      ownerIds,
      slugs: restaurants.map((r) => r.slug),
    });
  } catch {
    // Fail closed: a DB hiccup must never open Google access to a tenant.
    return false;
  }

  if (memo.size > 1000) memo.clear();
  memo.set(cacheKey, { allowed, at: now });
  return allowed;
}

/** Test hook. */
export function __resetGbpAccessMemoForTests(): void {
  memo.clear();
}
