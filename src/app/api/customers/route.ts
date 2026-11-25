import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import {
  deriveCustomerFields,
  type CustomerSegment,
  type CustomerSentiment,
} from '@/lib/customers';
import { withServerTiming } from '@/lib/server-timing';

// Owner-scoped customers list (Phase 8 Customers CRM, CLAUDE.md §23.7).
// Phase 8c (CLAUDE.md §38.16) extends each row with segment / LTV / sentiment /
// daysSinceLastVisit derived via lib/customers.ts saf helper'ları.
//
// Mirrors /api/admin/customers structure but enforces owner scope via
// getScopedRestaurantIds — same helper, different audience. Admin endpoint
// returns 403 for restaurant_owner because panel staff need cross-restaurant
// view; this endpoint is the owner counterpart.
//
// Pagination strategy: aggregate SQL'i max 5000 row cap'le çek (Buaze ölçek
// için yeterli, CLAUDE.md §19.4.4); JS-side derive, filter (segment), slice
// (page). SQL'de segment hesaplamasının duplicate olmaması (helper drift
// önleme) için bu pattern bilinçli — küçük-orta ölçek workspace için sade.

const RANGE_PRESETS = { '7d': 7, '30d': 30, '90d': 90 } as const;
type RangeKey = keyof typeof RANGE_PRESETS | 'all';

const MAX_AGGREGATE_ROWS = 5000;
const VALID_SEGMENTS = new Set<CustomerSegment>(['new', 'risk', 'vip', 'loyal', 'churned']);

interface CustomerRow {
  key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  restaurantId: string;
  restaurantName: string | null;
  branch: string | null;
  /** Last feedback's platform (null = Buaze QR). UI derives label via computeLastChannel. */
  platform: string | null;
  lastRating: number | null;
  avgRating: number | null;
  feedbackCount: number;
  lastAt: string;
  segment: CustomerSegment;
  ltv: number;
  sentiment: CustomerSentiment;
  daysSinceLastVisit: number | null;
  /** §38.47 — last feedback's aspect ratings (UI derives lastTopic via computeLastTopic). */
  lastFoodRating: number | null;
  lastServiceRating: number | null;
  lastAtmosphereRating: number | null;
}

interface AggregateRow {
  restaurant_id: string;
  restaurant_name: string | null;
  contact_key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  platform: string | null;
  last_rating: number | null;
  last_at: Date;
  feedback_count: bigint;
  avg_rating: number | null;
  // §38.47 — en son feedback'in aspect rating'leri (lastTopic için).
  // ARRAY_AGG[1] zaten en son satırı verir; null durumlar (sub-rating
  // verilmemiş) helper içinde rating-fallback'e düşer.
  last_food_rating: number | null;
  last_service_rating: number | null;
  last_atmosphere_rating: number | null;
}

interface SummaryRow {
  customers: bigint;
  feedbacks: bigint;
  avg_rating: number | null;
}

function parseRange(raw: string | null): { start: Date | null } {
  if (raw === 'all') return { start: null };
  const key = (raw && raw in RANGE_PRESETS ? raw : '30d') as Exclude<RangeKey, 'all'>;
  const days = RANGE_PRESETS[key];
  return { start: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
}

function toBool(raw: string | null): boolean {
  return raw === '1' || raw === 'true';
}

function buildFilters(opts: {
  scopedIds: string[];
  restaurantId: string | null;
  rangeStart: Date | null;
  requireEmail: boolean;
  requirePhone: boolean;
  requireComment: boolean;
  search: string | null;
}) {
  const parts: Prisma.Sql[] = [Prisma.sql`f.has_kvkk_consent = TRUE`];

  // Owner scope is ALWAYS enforced — empty list means no access (force 0 rows).
  if (opts.scopedIds.length === 0) {
    parts.push(Prisma.sql`FALSE`);
  } else {
    parts.push(Prisma.sql`f.restaurant_id IN (${Prisma.join(opts.scopedIds)})`);
  }

  if (opts.restaurantId) {
    parts.push(Prisma.sql`f.restaurant_id = ${opts.restaurantId}`);
  }
  if (opts.rangeStart) {
    parts.push(Prisma.sql`f.created_at >= ${opts.rangeStart}`);
  }
  if (opts.requireEmail) {
    parts.push(Prisma.sql`f.email IS NOT NULL AND f.email <> ''`);
  }
  if (opts.requirePhone) {
    parts.push(Prisma.sql`f.phone IS NOT NULL AND f.phone <> ''`);
  }
  if (opts.requireComment) {
    parts.push(Prisma.sql`f.comment IS NOT NULL AND f.comment <> ''`);
  }
  if (opts.search) {
    const like = `%${opts.search.toLowerCase()}%`;
    parts.push(
      Prisma.sql`(
        LOWER(COALESCE(f.name, '')) LIKE ${like}
        OR LOWER(COALESCE(f.email, '')) LIKE ${like}
        OR LOWER(COALESCE(f.phone, '')) LIKE ${like}
        OR LOWER(COALESCE(f.comment, '')) LIKE ${like}
      )`,
    );
  }

  // contact_key (LOWER(email) or phone) must not be null — anonymous feedback
  // excluded (no way to reach them, also fingerprinting risk per §13.5).
  parts.push(Prisma.sql`
    COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) IS NOT NULL
  `);

  return Prisma.join(parts, ' AND ');
}

async function handleGET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  // Phase 8 — owner-scope only. Admin/manager users have their own
  // /admin/customers view (cross-restaurant). This endpoint is for the owner
  // panel; restaurant_owner + workspace team members reach here.
  const scopedIds = await getScopedRestaurantIds(actor);
  // null means "all access" (superadmin); not the owner audience.
  if (scopedIds === null) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get('range');
  const restaurantIdParam = searchParams.get('restaurantId');
  const searchParam = (searchParams.get('search') || '').trim().slice(0, 100) || null;
  const requireEmail = toBool(searchParams.get('hasEmail'));
  const requirePhone = toBool(searchParams.get('hasPhone'));
  const requireComment = toBool(searchParams.get('hasComment'));
  const segmentParamRaw = (searchParams.get('segment') || '').trim().toLowerCase();
  const segmentParam = VALID_SEGMENTS.has(segmentParamRaw as CustomerSegment)
    ? (segmentParamRaw as CustomerSegment)
    : null;
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(searchParams.get('limit') || '25', 10) || 25));

  const { start: rangeStart } = parseRange(rangeParam);

  // Restaurant filter must be inside owner scope; otherwise silently drop.
  const restaurantId = restaurantIdParam && scopedIds.includes(restaurantIdParam)
    ? restaurantIdParam
    : null;

  const filters = buildFilters({
    scopedIds,
    restaurantId,
    rangeStart,
    requireEmail,
    requirePhone,
    requireComment,
    search: searchParam,
  });

  try {
    // Fetch up to MAX_AGGREGATE_ROWS aggregated customer rows; JS-side derive
    // segment/ltv/sentiment, then filter (segment) and slice (pagination).
    const [summary, aggregates] = await Promise.all([
      prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(DISTINCT CONCAT(f.restaurant_id, '|', COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')))) AS customers,
          COUNT(*)::bigint AS feedbacks,
          AVG(f.rating)::float AS avg_rating
        FROM feedback f
        WHERE ${filters}
      `),
      prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
        SELECT
          f.restaurant_id,
          r.name AS restaurant_name,
          COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) AS contact_key,
          (ARRAY_AGG(f.name ORDER BY f.created_at DESC) FILTER (WHERE f.name IS NOT NULL AND f.name <> ''))[1] AS name,
          (ARRAY_AGG(f.email ORDER BY f.created_at DESC) FILTER (WHERE f.email IS NOT NULL AND f.email <> ''))[1] AS email,
          (ARRAY_AGG(f.phone ORDER BY f.created_at DESC) FILTER (WHERE f.phone IS NOT NULL AND f.phone <> ''))[1] AS phone,
          (ARRAY_AGG(f.branch ORDER BY f.created_at DESC) FILTER (WHERE f.branch IS NOT NULL AND f.branch <> ''))[1] AS branch,
          (ARRAY_AGG(f.platform ORDER BY f.created_at DESC))[1] AS platform,
          (ARRAY_AGG(f.rating ORDER BY f.created_at DESC))[1] AS last_rating,
          (ARRAY_AGG(f.food_rating ORDER BY f.created_at DESC))[1] AS last_food_rating,
          (ARRAY_AGG(f.service_rating ORDER BY f.created_at DESC))[1] AS last_service_rating,
          (ARRAY_AGG(f.atmosphere_rating ORDER BY f.created_at DESC))[1] AS last_atmosphere_rating,
          AVG(f.rating)::float AS avg_rating,
          MAX(f.created_at) AS last_at,
          COUNT(*)::bigint AS feedback_count
        FROM feedback f
        LEFT JOIN restaurants r ON r.id = f.restaurant_id
        WHERE ${filters}
        GROUP BY f.restaurant_id, r.name, contact_key
        ORDER BY MAX(f.created_at) DESC
        LIMIT ${MAX_AGGREGATE_ROWS}
      `),
    ]);

    // Derive segment + LTV + sentiment + days for each row. §38.47 — segment
    // helper now consumes daysSinceLastVisit for the churned bucket; raw aspect
    // ratings + last platform are forwarded to caller (UI/CSV) which derives
    // lastTopic + lastChannel labels using locale at render time.
    const now = new Date();
    const enriched: CustomerRow[] = aggregates.map((r) => {
      const visits = Number(r.feedback_count);
      const avgRating = r.avg_rating;
      const derived = deriveCustomerFields({
        visits,
        avgRating,
        lastAt: r.last_at,
        now,
      });
      return {
        key: `${r.restaurant_id}|${r.contact_key}`,
        name: r.name,
        email: r.email,
        phone: r.phone,
        restaurantId: r.restaurant_id,
        restaurantName: r.restaurant_name,
        branch: r.branch,
        platform: r.platform,
        lastRating: r.last_rating,
        avgRating,
        feedbackCount: visits,
        lastAt: new Date(r.last_at).toISOString(),
        segment: derived.segment,
        ltv: derived.ltv,
        sentiment: derived.sentiment,
        daysSinceLastVisit: derived.daysSinceLastVisit,
        lastFoodRating: r.last_food_rating,
        lastServiceRating: r.last_service_rating,
        lastAtmosphereRating: r.last_atmosphere_rating,
      };
    });

    // Segment counts (filter pill labels) — calculated BEFORE segment filter
    // so each pill shows total in current range/scope (not after filter).
    // §38.47 — `churned` segment count eklendi.
    const segmentCounts = {
      all: enriched.length,
      vip: 0,
      loyal: 0,
      new: 0,
      risk: 0,
      churned: 0,
    };
    for (const row of enriched) {
      segmentCounts[row.segment] += 1;
    }

    // Apply segment filter (post-derive).
    const filtered = segmentParam
      ? enriched.filter((row) => row.segment === segmentParam)
      : enriched;

    // Slice for pagination.
    const total = filtered.length;
    const offset = (page - 1) * limit;
    const slice = filtered.slice(offset, offset + limit);

    const summaryRow = summary[0];
    const truncated = aggregates.length >= MAX_AGGREGATE_ROWS;

    return NextResponse.json(
      {
        data: slice,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          truncated,
        },
        summary: {
          customers: Number(summaryRow?.customers ?? 0),
          feedbacks: Number(summaryRow?.feedbacks ?? 0),
          avgRating: summaryRow?.avg_rating ?? null,
          segmentCounts,
        },
      },
      {
        // Owner-scoped read; 60s fresh + 5min SWR (CLAUDE.md §19.3 paterni).
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (error) {
    console.error('[OWNER_CUSTOMERS_GET]', error);
    return NextResponse.json({ error: 'Müşteriler getirilemedi' }, { status: 500 });
  }
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
