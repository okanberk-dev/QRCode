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

// Feedback-derived restaurant customer list. Each row = one real end-customer
// (deduped by email or phone) across all accessible restaurants.
// Replaces the previous SaaS-user list (which now lives only under
// /api/admin/members).
//
// Phase 8c+ (CLAUDE.md §38.19): segment + LTV + sentiment + days enriched via
// shared lib/customers.ts helper'ı (owner /api/customers ile pattern parity).
// Pagination strategy: SQL aggregate'i max 5000 row cap'le çek, JS-side derive,
// filter (segment), slice (page) — SQL'de segment hesaplaması duplicate
// olmasın diye (helper drift önleme).

const RANGE_PRESETS = { '7d': 7, '30d': 30, '90d': 90 } as const;
type RangeKey = keyof typeof RANGE_PRESETS | 'all';

const MAX_AGGREGATE_ROWS = 5000;
// §38.47 — `churned` segment eklendi (CLAUDE.md §38.47).
const VALID_SEGMENTS = new Set<CustomerSegment>(['new', 'risk', 'vip', 'loyal', 'churned']);

interface CustomerRow {
  key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  restaurantId: string;
  restaurantName: string | null;
  branch: string | null;
  platform: string | null;
  lastRating: number | null;
  avgRating: number | null;
  feedbackCount: number;
  lastAt: string;
  segment: CustomerSegment;
  ltv: number;
  sentiment: CustomerSentiment;
  daysSinceLastVisit: number | null;
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
  avg_rating: number | null;
  last_at: Date;
  feedback_count: bigint;
}

interface SummaryRow {
  customers: bigint;
  feedbacks: bigint;
  avg_rating: number | null;
}

function parseRange(raw: string | null): { start: Date | null; days: number | null } {
  if (raw === 'all') return { start: null, days: null };
  const key = (raw && raw in RANGE_PRESETS ? raw : '30d') as Exclude<RangeKey, 'all'>;
  const days = RANGE_PRESETS[key];
  return { start: new Date(Date.now() - days * 24 * 60 * 60 * 1000), days };
}

function toBool(raw: string | null): boolean {
  return raw === '1' || raw === 'true';
}

// Shared where-clause builder. Returns a Prisma.Sql fragment (starts with AND
// segments ready to append to a WHERE).
function buildFilters(opts: {
  scopedIds: string[] | null;
  restaurantId: string | null;
  rangeStart: Date | null;
  requireEmail: boolean;
  requirePhone: boolean;
  requireComment: boolean;
  search: string | null;
}) {
  const parts: Prisma.Sql[] = [Prisma.sql`f.has_kvkk_consent = TRUE`];

  if (opts.scopedIds !== null) {
    // Manager/owner — scope by in-list. Empty array means no access: force 0 rows.
    if (opts.scopedIds.length === 0) {
      parts.push(Prisma.sql`FALSE`);
    } else {
      parts.push(Prisma.sql`f.restaurant_id IN (${Prisma.join(opts.scopedIds)})`);
    }
  } else {
    parts.push(Prisma.sql`f.restaurant_id IS NOT NULL`);
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
  // is excluded from the customer list because there's no way to reach them.
  parts.push(Prisma.sql`
    COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) IS NOT NULL
  `);

  return Prisma.join(parts, ' AND ');
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  if (actor.role === 'restaurant_owner') {
    // Restaurant owners have their own /dashboard/customers view (if any);
    // this endpoint is for panel staff.
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

  const scopedIds = await getScopedRestaurantIds(actor);
  const restaurantId = restaurantIdParam && (scopedIds === null || scopedIds.includes(restaurantIdParam))
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
    // Phase 8c+ — fetch up to MAX_AGGREGATE_ROWS aggregate rows; JS-side derive
    // segment/LTV/sentiment + filter + pagination (CLAUDE.md §38.19).
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
          (ARRAY_AGG(f.platform ORDER BY f.created_at DESC) FILTER (WHERE f.platform IS NOT NULL))[1] AS platform,
          (ARRAY_AGG(f.rating ORDER BY f.created_at DESC))[1] AS last_rating,
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

    // Derive segment + LTV + sentiment + days for each row.
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
      };
    });

    // Segment counts (filter pill labels) — pre-filter (her pill toplamı).
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('[ADMIN_CUSTOMERS_GET]', error);
    return NextResponse.json({ error: 'Müşteriler getirilemedi' }, { status: 500 });
  }
}
