import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { getManageablePlatform } from '@/lib/platform-management';

export const dynamic = 'force-dynamic';

function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.min(parsed, max);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { provider } = await params;
  const platform = getManageablePlatform(provider);
  if (!platform) return ApiErrors.badRequest('Geçersiz platform', 'INVALID_PROVIDER');

  const scopedRestaurantIds = await getScopedRestaurantIds(actor);
  if (!scopedRestaurantIds || scopedRestaurantIds.length === 0) {
    return ApiErrors.forbidden();
  }

  const { searchParams } = new URL(req.url);
  const offset = parseBoundedInt(searchParams.get('offset'), 0, 0, 10_000);
  const limit = parseBoundedInt(searchParams.get('limit'), 5, 1, 20);

  const rows = await prisma.feedback.findMany({
    where: {
      restaurantId: { in: scopedRestaurantIds },
      platform: platform.provider,
      rating: { lte: 3 },
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    select: {
      id: true,
      rating: true,
      name: true,
      comment: true,
      branch: true,
      tableNumber: true,
      hasKvkkConsent: true,
      createdAt: true,
      restaurant: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      name: row.hasKvkkConsent ? row.name : null,
      comment: row.comment,
      branch: row.branch,
      tableNumber: row.tableNumber,
      createdAt: row.createdAt.toISOString(),
      restaurantId: row.restaurant?.id ?? null,
      restaurantName: row.restaurant?.name ?? null,
    })),
    nextOffset: offset + rows.length,
    hasMore: rows.length === limit,
  });
}
