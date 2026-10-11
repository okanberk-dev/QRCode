import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { latestChecksByProvider, providerColumnsSelect } from '@/lib/platform-link-test';
import {
  summarizeReviewPlatformLinks,
  type LatestCheckLite,
  type PlatformLinkSummary,
} from '@/lib/platform-link-status';
import RestaurantDetailClient from './RestaurantDetailClient';

export const dynamic = 'force-dynamic';

interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  isActive: boolean;
  temporarilyClosed: boolean;
  createdAt: string;
  updatedAt: string;
  feedbacks: number;
  menuItems: number;
  qrGenerations: number;
  /** Review-link summary for the "Platform bağlantıları" strip. */
  platformLinks: PlatformLinkSummary;
}

export default async function DashboardRestaurantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  // Auth — owner panel (user_token). Admin bypass keeps client-fetch.
  const cookieStore = await cookies();
  const userToken = cookieStore.get('user_token')?.value;
  const adminToken = cookieStore.get('admin_token')?.value;

  let initialData: RestaurantSummary | null | undefined;

  if (userToken && !adminToken) {
    try {
      const payload = await verifyJwt(userToken);
      const userId = typeof payload?.userId === 'string' ? payload.userId : null;
      if (userId) {
        // One connection, one snapshot (CLAUDE.md §40.1). The link columns +
        // latest checks feed the platform-links strip with the same counts
        // the platforms overview and settings tab show.
        const [restaurant, checkRows] = await prisma.$transaction([
          prisma.restaurant.findFirst({
            where: { id, userId },
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              isActive: true,
              temporarilyClosed: true,
              createdAt: true,
              updatedAt: true,
              externalPlatformsEnabled: true,
              defaultRedirectPlatform: true,
              ...providerColumnsSelect(),
              _count: {
                select: {
                  feedbacks: true,
                  menuItems: true,
                  qrGenerations: true,
                },
              },
            },
          }),
          latestChecksByProvider(id),
        ]);
        if (restaurant) {
          const checks: Record<string, LatestCheckLite> = {};
          for (const check of checkRows) {
            checks[check.provider] = {
              ok: check.ok,
              checkedAt: new Date(check.checkedAt).toISOString(),
              error: check.error,
              statusCode: check.statusCode,
            };
          }
          initialData = {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            category: restaurant.category ?? 'Restoran',
            isActive: restaurant.isActive ?? true,
            temporarilyClosed: restaurant.temporarilyClosed ?? false,
            createdAt: restaurant.createdAt.toISOString(),
            updatedAt: restaurant.updatedAt.toISOString(),
            feedbacks: restaurant._count.feedbacks,
            menuItems: restaurant._count.menuItems,
            qrGenerations: restaurant._count.qrGenerations,
            platformLinks: summarizeReviewPlatformLinks(restaurant, checks),
          };
        } else {
          // Not owned by this user — team members / managers reach their
          // assigned locations through the API's IDOR check, so leave it
          // undefined and let the client fetch (null showed "not found").
          initialData = undefined;
        }
      }
    } catch (error) {
      console.error('[DashboardRestaurantDetailPage] hydration failed', error);
      // Soft-fail: client refetches on mount.
    }
  }

  return <RestaurantDetailClient initialData={initialData} />;
}
