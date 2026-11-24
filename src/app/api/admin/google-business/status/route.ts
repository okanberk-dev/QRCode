import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import {
  APPROVED_GBP_PROJECT_NUMBER,
  allowedTenantEntries,
  googleClientProjectNumber,
  googleConnectionState,
  isGoogleTenantAllowed,
} from '@/lib/gbp-access';
import { gbpGlobalRequestsPerMinute, parseGoogleLocationsCache } from '@/lib/google-business';
import { getReplyAvailability } from '@/lib/google-business-availability';

export const dynamic = 'force-dynamic';

const QUOTA_CODES = ['GOOGLE_RATE_LIMITED', 'GOOGLE_FORBIDDEN', 'GOOGLE_API_NOT_PROVISIONED'];

/**
 * Google Business Profile operator status (CLAUDE.md §53), superadmin only.
 * Shows which Google Cloud project the OAuth client belongs to, the open
 * tenants, each connection's state and the review refresh queue. Never
 * returns a secret, a token or Google's raw error text.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: admin ? 403 : 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? null;
  const projectNumber = googleClientProjectNumber(clientId);
  const entries = [...allowedTenantEntries()];

  const [slugMatches, integrations, caches] = await prisma.$transaction([
    prisma.restaurant.findMany({
      where: { OR: [{ slug: { in: entries } }, { userId: { in: entries } }] },
      select: { id: true, slug: true, name: true, userId: true },
      take: 200,
    }),
    prisma.googleIntegration.findMany({
      where: { NOT: { userId: { startsWith: 'admin:' } } },
      select: {
        userId: true,
        clientId: true,
        refreshToken: true,
        invalidReason: true,
        invalidatedAt: true,
        expiresAt: true,
        updatedAt: true,
        locationsJson: true,
      },
      take: 500,
    }),
    prisma.googleReviewCache.findMany({
      select: {
        restaurantId: true,
        fetchedAt: true,
        nextAttemptAt: true,
        failureCount: true,
        lastErrorCode: true,
        totalReviewCount: true,
        averageRating: true,
        restaurant: { select: { name: true, slug: true, userId: true } },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: 500,
    }),
  ]);

  const ownerIds = new Set(slugMatches.map((r) => r.userId).filter(Boolean) as string[]);
  const connections = [];
  for (const row of integrations) {
    const allowed = await isGoogleTenantAllowed(row.userId);
    if (!allowed && !ownerIds.has(row.userId)) continue;
    const cache = parseGoogleLocationsCache(row.locationsJson);
    connections.push({
      ownerUserId: row.userId,
      tenantAllowed: allowed,
      state: googleConnectionState(row, clientId),
      invalidReason: row.invalidReason,
      invalidatedAt: row.invalidatedAt?.toISOString() ?? null,
      tokenProjectNumber: googleClientProjectNumber(row.clientId),
      selectedLocations: Object.keys(cache.restaurantLocations).length,
      locationsSyncedAt: cache.syncedAt,
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  return NextResponse.json(
    {
      oauth: {
        configured: Boolean(clientId && process.env.GOOGLE_CLIENT_SECRET),
        // Client ids are public (they appear in every Google sign-in URL).
        clientId,
        projectNumber,
        approvedProjectNumber: APPROVED_GBP_PROJECT_NUMBER,
        isApprovedProject: projectNumber === APPROVED_GBP_PROJECT_NUMBER,
        redirectUri: process.env.GOOGLE_REDIRECT_URI ?? null,
        globalRequestsPerMinute: gbpGlobalRequestsPerMinute(),
        replyAvailability: await getReplyAvailability(),
      },
      tenants: {
        entries,
        matchedBusinesses: slugMatches.map((r) => ({ id: r.id, slug: r.slug, name: r.name, ownerUserId: r.userId })),
      },
      connections,
      refreshQueue: caches.map((c) => ({
        restaurantId: c.restaurantId,
        name: c.restaurant.name,
        slug: c.restaurant.slug,
        fetchedAt: c.fetchedAt?.toISOString() ?? null,
        nextAttemptAt: c.nextAttemptAt?.toISOString() ?? null,
        failureCount: c.failureCount,
        lastErrorCode: c.lastErrorCode,
        totalReviewCount: c.totalReviewCount,
        averageRating: c.averageRating,
      })),
      quotaErrors: caches
        .filter((c) => c.lastErrorCode && QUOTA_CODES.includes(c.lastErrorCode))
        .map((c) => ({ slug: c.restaurant.slug, code: c.lastErrorCode, failureCount: c.failureCount })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
