// Business list query behind GET /api/restaurants (panel list branch) and the
// server-rendered /admin/restaurants page (§40.10 hydration). One source, so
// the first server render and every later client fetch return the same rows
// for the same filters.
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeRestaurantParam } from '@/lib/active-business';

export interface RestaurantListQuery {
  page: number;
  limit: number;
  skip: number;
  status: string;
  /** User.plan lifecycle bucket or 'all'. */
  planFilter: string;
  attention: string;
  requestedRestaurantId: string | null;
  /** Owner id when it passes the id-shape check, otherwise null. */
  ownerId: string | null;
}

const ATTENTION_VALUES = new Set(['quota_full', 'unverified_platform']);
// Legacy tier ids (pro/growth/starter) are no longer accepted: User.plan
// never holds them, so they only ever produced an empty list. Unknown
// values fall through to "no plan filter".
const ALLOWED_PLANS = new Set(['trial', 'monthly', 'yearly', 'enterprise', 'free']);

/** Query-string parsing of the list branch (pure). */
export function parseRestaurantListQuery(params: URLSearchParams): RestaurantListQuery {
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '20', 10) || 20));
  const ownerId = params.get('ownerId');
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    status: params.get('status') || 'active',
    // Optional plan filter (admin businesses list). Joins through `user.plan`
    // because the plan lives on the owner User row, not on Restaurant.
    // User.plan is the lifecycle bucket: trial | monthly | yearly | enterprise
    // | free (CLAUDE.md §15.2). 'all' = unfiltered.
    planFilter: params.get('plan') || 'all',
    // Admin "Needs attention" deeplink filter (CLAUDE.md §11.36).
    // - quota_full           → trial restaurants whose feedback count ≥ TRIAL_QUOTA × 0.9
    // - unverified_platform  → googleReviewUrl IS NOT NULL AND googlePlaceId IS NULL
    // Forces status=all so passive accounts surface too (deactivated trials etc.)
    attention: params.get('attention') || '',
    requestedRestaurantId: normalizeRestaurantParam(params.get('restaurantId') ?? params.get('restaurant')),
    ownerId: ownerId && /^[A-Za-z0-9_-]{6,64}$/.test(ownerId) ? ownerId : null,
  };
}

/**
 * The scoped `where` for the list. `scopedIds === null` means unscoped
 * (superadmin). The `quota_full` attention filter pre-resolves matching ids
 * with one bounded read.
 */
export async function buildRestaurantListWhere(
  query: RestaurantListQuery,
  scopedIds: string[] | null,
): Promise<Prisma.RestaurantWhereInput> {
  const { status, planFilter, attention, requestedRestaurantId, ownerId } = query;
  const attentionActive = ATTENTION_VALUES.has(attention);

  const where: Prisma.RestaurantWhereInput = {};

  if (scopedIds !== null) {
    where.id = { in: scopedIds };
  }

  if (attentionActive) {
    // attention deeplink overrides status — full superset visible
    if (attention === 'unverified_platform') {
      where.googleReviewUrl = { not: null };
      where.googlePlaceId = null;
    } else if (attention === 'quota_full') {
      // Quota-full needs row-level _count which Prisma can't filter in
      // `where` directly. Pre-resolve the matching ids, then narrow the
      // main query — keeps pagination + ordering intact.
      const TRIAL_QUOTA = 2000;
      // Scope the pre-scan to the actor's restaurants: previously any owner
      // could hit `?attention=quota_full` and trigger an unbounded GLOBAL
      // findMany (+ per-row feedback _count). Superadmin (scopedIds=null)
      // keeps the global view, capped with `take`.
      const trialRestaurants = await prisma.restaurant.findMany({
        where: {
          user: { plan: 'trial' },
          ...(scopedIds !== null ? { id: { in: scopedIds } } : {}),
        },
        select: { id: true, _count: { select: { feedbacks: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      });
      const quotaIds = trialRestaurants
        .filter((r) => r._count.feedbacks >= TRIAL_QUOTA * 0.9)
        .map((r) => r.id);
      // Narrow scope-aware id filter: when scopedIds is null (superadmin)
      // accept the full quota set; otherwise intersect.
      if (scopedIds !== null) {
        const allowed = new Set(scopedIds);
        where.id = { in: quotaIds.filter((id) => allowed.has(id)) };
      } else {
        where.id = { in: quotaIds };
      }
    }
  } else if (status === 'active') {
    where.isActive = true;
  } else if (status === 'passive') {
    where.isActive = false;
  }
  // 'all' means no filter on isActive

  // Plan filter — join user.plan. Restaurants without a user (orphans) are
  // excluded from any specific plan filter; 'all' still includes them.
  if (planFilter !== 'all' && ALLOWED_PLANS.has(planFilter)) {
    where.user = { plan: planFilter };
  }

  // §49 franchise view — one owner's businesses (admin İşletme sahipleri →
  // "İşletmeleri gör"). Scope still applies through `where.id` above.
  if (ownerId) {
    where.userId = ownerId;
  }

  if (requestedRestaurantId) {
    const allowedByScope = scopedIds === null || scopedIds.includes(requestedRestaurantId);
    if (!allowedByScope) {
      where.id = { in: [] };
    } else {
      const currentIdFilter = where.id;
      if (
        currentIdFilter &&
        typeof currentIdFilter === 'object' &&
        'in' in currentIdFilter &&
        Array.isArray(currentIdFilter.in)
      ) {
        where.id = currentIdFilter.in.includes(requestedRestaurantId)
          ? requestedRestaurantId
          : { in: [] };
      } else {
        where.id = requestedRestaurantId;
      }
    }
  }

  return where;
}

/**
 * One page of full list rows (owner, relation counts, average rating) and
 * the total for `where`.
 */
export async function loadRestaurantListPage(
  where: Prisma.RestaurantWhereInput,
  query: Pick<RestaurantListQuery, 'skip' | 'limit'>,
) {
  // Server-render read batch — Supabase pgbouncer connection_limit=1 disipline
  // gereği `Promise.all` yerine `prisma.$transaction([...])` (CLAUDE.md §14.1
  // + §38.99 Phase B). Tek connection üzerinden sıralı çalışır; pool queue
  // riski olmadan iki query batch'lenir. Read-only → batch mode.
  const [restaurants, total] = await prisma.$transaction([
    prisma.restaurant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.limit,
      // The ~0.5 MB cover data URL is only for the Studio, which reads it from
      // GET /api/restaurants/[id] (menu design spec §8.6). List rows never carry it.
      // Same for the ≤300 KB base64 menu logo: no list consumer reads it
      // (the admin detail page, the Studio and the public menu use other routes).
      omit: { menuCoverUrl: true, menuLogoUrl: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            feedbacks: true,
            menuItems: { where: { deletedAt: null } },
            qrGenerations: true,
            adminUsers: true,
          },
        },
      },
    }),
    prisma.restaurant.count({ where }),
  ]);

  // Compute avgRating per restaurant — single groupBy aggregate (no N+1).
  // AdminBusinesses table column "Puan" needs this; null means no feedbacks yet.
  const restaurantIds = restaurants.map((r) => r.id);
  const avgGroups = restaurantIds.length
    ? await prisma.feedback.groupBy({
        by: ['restaurantId'],
        where: { restaurantId: { in: restaurantIds } },
        _avg: { rating: true },
      })
    : [];
  const avgByRestaurant = new Map<string, number>(
    avgGroups
      .filter((g) => g._avg.rating !== null)
      .map((g) => [g.restaurantId, g._avg.rating as number] as [string, number]),
  );

  const data = restaurants.map((r) => ({
    ...r,
    avgRating: avgByRestaurant.get(r.id) ?? null,
  }));
  return { data, total };
}
