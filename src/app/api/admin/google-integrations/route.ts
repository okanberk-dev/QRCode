import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { parseGoogleLocationsCache } from '@/lib/google-business';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Superadmin-only Google Business Profile usage view.
//
// Lists every `GoogleIntegration` row plus the restaurants each integration
// owner has bound a Google location to. Used by the admin Analytics page
// (`/admin/analytics`) to answer "who's actually connected to Google
// Business Profile and what's the token health?".
//
// IDOR is N/A — superadmin role gate. Other admins (manager) deliberately
// blocked because the row contains owner email + token expiry which manager
// scope shouldn't see.
//
// PII guard: refresh / access tokens NEVER leak to the client. Only
// boolean `hasRefreshToken` + ISO `accessTokenExpiresAt` surface.

interface AdminGoogleIntegrationRestaurant {
  restaurantId: string;
  restaurantName: string;
  ownerEmail: string | null;
  selectedLocation: {
    accountId: string;
    locationId: string;
    title: string;
    selectedAt: string;
    lastReviewNotifiedAt: string | null;
  } | null;
}

interface AdminGoogleIntegrationRow {
  integrationId: string;
  integrationOwner: string; // userId or `admin:adminId`
  ownerEmail: string | null; // resolved when the owner is a User row
  hasRefreshToken: boolean;
  accessTokenExpiresAt: string;
  accessTokenExpired: boolean;
  syncedAt: string | null;
  totalLocations: number;
  restaurants: AdminGoogleIntegrationRestaurant[];
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return ApiErrors.forbidden('Bu görünüm yalnızca süperadminlere açık.');
  }

  // Pull every integration row. Volume is tiny (one per owner workspace
  // that connected Google), so no pagination needed yet — revisit if it
  // ever grows past a few hundred.
  const integrations = await prisma.googleIntegration.findMany({
    select: {
      id: true,
      userId: true,
      refreshToken: true,
      expiresAt: true,
      locationsJson: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (integrations.length === 0) {
    return NextResponse.json(
      {
        integrations: [],
        meta: { total: 0, withRefreshToken: 0, expiredAccess: 0 },
      },
      {
        headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300' },
      },
    );
  }

  // Resolve owner emails. `userId` may carry an `admin:` prefix (CLAUDE.md
  // §5.1 — `googleOwnerRef`). Skip those for email lookup; just show the
  // raw owner ref in the UI.
  const userIds = Array.from(
    new Set(integrations.map((i) => i.userId).filter((u) => !u.startsWith('admin:'))),
  );
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      })
    : [];
  const emailByUserId = new Map(users.map((u) => [u.id, u.email] as const));

  // Resolve restaurant names for every selected location across all
  // integrations in one query.
  const restaurantIds = new Set<string>();
  for (const integration of integrations) {
    const cache = parseGoogleLocationsCache(integration.locationsJson);
    for (const id of Object.keys(cache.restaurantLocations ?? {})) {
      restaurantIds.add(id);
    }
  }
  const restaurants = restaurantIds.size
    ? await prisma.restaurant.findMany({
        where: { id: { in: Array.from(restaurantIds) } },
        select: {
          id: true,
          name: true,
          user: { select: { email: true } },
        },
      })
    : [];
  const restaurantById = new Map(
    restaurants.map((r) => [r.id, { name: r.name, ownerEmail: r.user?.email ?? null }] as const),
  );

  const now = Date.now();
  const rows: AdminGoogleIntegrationRow[] = integrations.map((integration) => {
    const cache = parseGoogleLocationsCache(integration.locationsJson);
    const restaurantsForRow: AdminGoogleIntegrationRestaurant[] = Object.entries(
      cache.restaurantLocations ?? {},
    ).map(([restaurantId, selection]) => {
      const meta = restaurantById.get(restaurantId);
      return {
        restaurantId,
        restaurantName: meta?.name ?? '(silinmiş restoran)',
        ownerEmail: meta?.ownerEmail ?? null,
        selectedLocation: {
          accountId: selection.accountId,
          locationId: selection.locationId,
          title: selection.title,
          selectedAt: selection.selectedAt,
          lastReviewNotifiedAt: selection.lastReviewNotifiedAt ?? null,
        },
      };
    });

    return {
      integrationId: integration.id,
      integrationOwner: integration.userId,
      ownerEmail: emailByUserId.get(integration.userId) ?? null,
      hasRefreshToken: Boolean(integration.refreshToken),
      accessTokenExpiresAt: integration.expiresAt.toISOString(),
      accessTokenExpired: integration.expiresAt.getTime() < now,
      syncedAt: cache.syncedAt,
      totalLocations: (cache.locations ?? []).length,
      restaurants: restaurantsForRow,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(
    {
      integrations: rows,
      meta: {
        total: rows.length,
        withRefreshToken: rows.filter((r) => r.hasRefreshToken).length,
        expiredAccess: rows.filter((r) => r.accessTokenExpired).length,
      },
    },
    {
      // Slow-moving admin observability data. Same owner-cache pattern as
      // CLAUDE.md §38.9 Görev F (read endpoints) — `private` because the
      // payload includes owner emails.
      headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300' },
    },
  );
}
