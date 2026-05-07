// Stage 29 §38.105 — admin campaign moderation queue list endpoint.
//
// IDOR: superadmin OR `campaigns:read` permission (CLAUDE.md §38.94 RBAC).
// Cross-workspace scope: admin tüm restoranların kampanyalarını queue'da
// görür. Owner-side `/api/customer-campaigns` GET endpoint'i scoped (kendi
// restoranları); bu endpoint global.
//
// Filter: status (pending_approval default), page/limit, restaurantId
// (optional drill-down). Cache: private 15s/60sw (CLAUDE.md §38.100 paterni).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUS_VALUES = [
  'pending_approval',
  'approved',
  'rejected',
  'sending',
  'sent',
  'failed',
  'all',
] as const;

const QuerySchema = z
  .object({
    status: z.enum(STATUS_VALUES).optional().default('pending_approval'),
    restaurantId: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).max(10000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();

const ADMIN_LIST_CACHE_HEADER = 'private, s-maxage=15, stale-while-revalidate=60';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'campaigns', 'read'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const queryRaw = {
    status: url.searchParams.get('status') ?? undefined,
    restaurantId: url.searchParams.get('restaurantId') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  };
  const parsed = QuerySchema.safeParse(queryRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { status, restaurantId, page, limit } = parsed.data;

  const where: Prisma.CustomerEmailCampaignWhereInput = {};
  if (status !== 'all') {
    where.status = status;
  }
  if (restaurantId) {
    where.restaurantId = restaurantId;
  }

  // Sort: pending_approval queue → submittedAt DESC (en yeni submission önce);
  // diğer status'larda createdAt DESC fallback.
  const orderBy: Prisma.CustomerEmailCampaignOrderByWithRelationInput =
    status === 'pending_approval'
      ? { submittedAt: 'desc' }
      : { createdAt: 'desc' };

  const [items, total] = await prisma.$transaction([
    prisma.customerEmailCampaign.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        restaurantId: true,
        subject: true,
        status: true,
        recipientCount: true,
        sentCount: true,
        failedCount: true,
        submittedAt: true,
        approvedAt: true,
        rejectedAt: true,
        sentAt: true,
        createdById: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true, userId: true } },
      },
    }),
    prisma.customerEmailCampaign.count({ where }),
  ]);

  // Owner display name resolution — restaurant.userId → User.name lookup
  // bulk fetch (N+1 önleme).
  const ownerIds = Array.from(
    new Set(
      items.map((c) => c.restaurant?.userId).filter((id): id is string => Boolean(id)),
    ),
  );
  const owners = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  const campaigns = items.map((c) => {
    const owner = c.restaurant?.userId ? ownerMap.get(c.restaurant.userId) : null;
    return {
      id: c.id,
      restaurantId: c.restaurantId,
      restaurantName: c.restaurant?.name ?? null,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      subject: c.subject,
      status: c.status,
      recipientCount: c.recipientCount,
      sentCount: c.sentCount,
      failedCount: c.failedCount,
      submittedAt: c.submittedAt?.toISOString() ?? null,
      approvedAt: c.approvedAt?.toISOString() ?? null,
      rejectedAt: c.rejectedAt?.toISOString() ?? null,
      sentAt: c.sentAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  });

  return NextResponse.json(
    {
      campaigns,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    {
      headers: { 'Cache-Control': ADMIN_LIST_CACHE_HEADER },
    },
  );
}
