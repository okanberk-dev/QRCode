import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import {
  ANALYTICS_SOURCE_TYPES,
  buildUpsellInsights,
  classifyCategory,
  detectLowInterestProducts,
  type CategoryStat,
  type ProductStat,
} from '@/lib/analytics-heuristics';

const RANGE_PRESETS = { '7d': 7, '30d': 30, '90d': 90 } as const;
type RangePreset = keyof typeof RANGE_PRESETS | 'all';

// --- Time windows -----------------------------------------------------------

function resolveWindow(rangeParam: string | null): { start: Date | null; end: Date; days: number | null } {
  const end = new Date();
  if (rangeParam === 'all') return { start: null, end, days: null };
  const preset = (rangeParam && rangeParam in RANGE_PRESETS ? rangeParam : '30d') as Exclude<RangePreset, 'all'>;
  const days = RANGE_PRESETS[preset];
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end, days };
}

function previousWindow(window: { start: Date | null; end: Date; days: number | null }) {
  if (!window.start || !window.days) return null;
  const prevEnd = window.start;
  const prevStart = new Date(prevEnd.getTime() - window.days * 24 * 60 * 60 * 1000);
  return { start: prevStart, end: prevEnd };
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 1 : null;
  return (current - previous) / previous;
}

// --- Handler ---------------------------------------------------------------

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await requireRestaurantAccess(req, id);
  if (!access.ok) return access.res;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range');
  const rawCategoryId = searchParams.get('categoryId') || undefined;
  const rawSourceType = searchParams.get('sourceType');
  const locale: 'tr' | 'en' = searchParams.get('locale') === 'en' ? 'en' : 'tr';

  const window = resolveWindow(range);

  // Base filter (time + source). Source applies to every event type;
  // category filter is applied separately below because menu_view has
  // no categoryId by design — filtering it here would zero out global views.
  const baseWhere: Prisma.MenuAnalyticsEventWhereInput = {
    restaurantId: id,
    ...(window.start ? { createdAt: { gte: window.start, lte: window.end } } : {}),
    ...(rawSourceType && (ANALYTICS_SOURCE_TYPES as readonly string[]).includes(rawSourceType)
      ? { sourceType: rawSourceType }
      : {}),
  };

  try {
    // Validate categoryId: silently drop if it doesn't belong to this restaurant.
    let categoryId: string | undefined;
    if (rawCategoryId) {
      const ok = await prisma.menuCategory.findFirst({
        where: { id: rawCategoryId, restaurantId: id, deletedAt: null },
        select: { id: true },
      });
      if (ok) categoryId = rawCategoryId;
    }
    const scopedWhere: Prisma.MenuAnalyticsEventWhereInput = {
      ...baseWhere,
      ...(categoryId ? { categoryId } : {}),
    };

    const [
      menuCategories,
      menuItems,
      menuViewCount,
      upsellCount,
      scopedEventsByType,
      viewsByCategory,
      clicksByCategory,
      productViews,
      productClicks,
    ] = await prisma.$transaction([
      prisma.menuCategory.findMany({
        where: { restaurantId: id, deletedAt: null },
        select: { id: true, name: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId: id, deletedAt: null },
        select: { id: true, name: true, categoryId: true, imageUrl: true, priceCents: true, currency: true },
      }),
      // Global menu_view (never filtered by category — it has none).
      prisma.menuAnalyticsEvent.count({ where: { ...baseWhere, eventType: 'menu_view' } }),
      // Upsell clicks surface as a separate counter.
      prisma.menuAnalyticsEvent.count({ where: { ...scopedWhere, eventType: 'menu_upsell_click' } }),
      prisma.menuAnalyticsEvent.groupBy({
        by: ['eventType'],
        where: scopedWhere,
        _count: { _all: true },
      }),
      prisma.menuAnalyticsEvent.groupBy({
        by: ['categoryId'],
        where: { ...scopedWhere, eventType: 'menu_product_view' },
        _count: { _all: true },
      }),
      prisma.menuAnalyticsEvent.groupBy({
        by: ['categoryId'],
        where: { ...scopedWhere, eventType: 'menu_category_click' },
        _count: { _all: true },
      }),
      prisma.menuAnalyticsEvent.groupBy({
        by: ['productId'],
        where: { ...scopedWhere, eventType: 'menu_product_view' },
        _count: { _all: true },
      }),
      prisma.menuAnalyticsEvent.groupBy({
        by: ['productId'],
        where: { ...scopedWhere, eventType: 'menu_product_click' },
        _count: { _all: true },
      }),
    ]);

    // Overview totals
    const totalsByType: Record<string, number> = {};
    for (const row of scopedEventsByType) totalsByType[row.eventType] = row._count._all;

    const totalMenuViews = menuViewCount;
    const totalCategoryClicks = totalsByType.menu_category_click ?? 0;
    const totalProductViews = totalsByType.menu_product_view ?? 0;
    const totalProductClicks = totalsByType.menu_product_click ?? 0;
    const totalUpsellClicks = upsellCount;
    const productClickRate = totalProductViews > 0 ? totalProductClicks / totalProductViews : 0;

    // Previous-period comparison (same filters, shifted window).
    const prev = previousWindow(window);
    let compare: null | {
      menuViews: number | null;
      productViews: number | null;
      categoryClicks: number | null;
      productClickRate: number | null;
    } = null;
    if (prev) {
      const prevBase: Prisma.MenuAnalyticsEventWhereInput = {
        restaurantId: id,
        createdAt: { gte: prev.start, lte: prev.end },
        ...(rawSourceType && (ANALYTICS_SOURCE_TYPES as readonly string[]).includes(rawSourceType)
          ? { sourceType: rawSourceType }
          : {}),
      };
      const prevScoped: Prisma.MenuAnalyticsEventWhereInput = { ...prevBase, ...(categoryId ? { categoryId } : {}) };
      const [prevMenuViews, prevEvents] = await prisma.$transaction([
        prisma.menuAnalyticsEvent.count({ where: { ...prevBase, eventType: 'menu_view' } }),
        prisma.menuAnalyticsEvent.groupBy({ by: ['eventType'], where: prevScoped, _count: { _all: true } }),
      ]);
      const prevTotals: Record<string, number> = {};
      for (const row of prevEvents) prevTotals[row.eventType] = row._count._all;
      const prevViews = prevTotals.menu_product_view ?? 0;
      const prevClicks = prevTotals.menu_product_click ?? 0;
      const prevCtr = prevViews > 0 ? prevClicks / prevViews : 0;
      compare = {
        menuViews: pctChange(totalMenuViews, prevMenuViews),
        productViews: pctChange(totalProductViews, prevViews),
        categoryClicks: pctChange(totalCategoryClicks, prevTotals.menu_category_click ?? 0),
        productClickRate: productClickRate - prevCtr,
      };
    }

    // Trend: daily series (only when the window has a start).
    // Respects both categoryId and sourceType filters to stay in sync with the overview.
    let trend: { date: string; menuViews: number; productClicks: number }[] = [];
    if (window.start) {
      const raw = await prisma.$queryRaw<{ bucket: Date; event_type: string; cnt: bigint }[]>`
        SELECT date_trunc('day', "created_at") AS bucket, "event_type", COUNT(*) AS cnt
        FROM "menu_analytics_events"
        WHERE "restaurant_id" = ${id}
          AND "created_at" >= ${window.start}
          AND "created_at" <= ${window.end}
          AND (
            "event_type" = 'menu_view'
            OR (${categoryId ? Prisma.sql`"category_id" = ${categoryId}` : Prisma.sql`TRUE`})
          )
          AND (${rawSourceType && (ANALYTICS_SOURCE_TYPES as readonly string[]).includes(rawSourceType)
            ? Prisma.sql`"source_type" = ${rawSourceType}`
            : Prisma.sql`TRUE`})
        GROUP BY bucket, "event_type"
        ORDER BY bucket ASC
      `;
      const byDate = new Map<string, { menuViews: number; productClicks: number }>();
      for (const row of raw) {
        const iso = new Date(row.bucket).toISOString().slice(0, 10);
        const cell = byDate.get(iso) ?? { menuViews: 0, productClicks: 0 };
        if (row.event_type === 'menu_view') cell.menuViews = Number(row.cnt);
        else if (row.event_type === 'menu_product_click') cell.productClicks = Number(row.cnt);
        byDate.set(iso, cell);
      }
      const days = window.days ?? 30;
      const out: { date: string; menuViews: number; productClicks: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(window.end.getTime() - i * 86400000);
        const iso = d.toISOString().slice(0, 10);
        const cell = byDate.get(iso) ?? { menuViews: 0, productClicks: 0 };
        out.push({ date: iso, ...cell });
      }
      trend = out;
    }

    // Product stats — each menu item gets views + clicks from filtered events.
    const categoryById = new Map(menuCategories.map((c) => [c.id, c]));
    const viewsByProduct = new Map<string, number>();
    for (const row of productViews) if (row.productId) viewsByProduct.set(row.productId, row._count._all);
    const clicksByProduct = new Map<string, number>();
    for (const row of productClicks) if (row.productId) clicksByProduct.set(row.productId, row._count._all);

    const productStats: ProductStat[] = menuItems.map((p) => ({
      productId: p.id,
      productName: p.name,
      categoryId: p.categoryId,
      categoryName: categoryById.get(p.categoryId)?.name ?? null,
      views: viewsByProduct.get(p.id) ?? 0,
      clicks: clicksByProduct.get(p.id) ?? 0,
    }));

    const topProducts = [...productStats]
      .filter((p) => p.views > 0)
      .sort((a, b) => b.views - a.views || b.clicks - a.clicks)
      .slice(0, 20);

    // Category stats — with engagement score for better sorting.
    const catViews = new Map<string, number>();
    for (const row of viewsByCategory) if (row.categoryId) catViews.set(row.categoryId, row._count._all);
    const catClicks = new Map<string, number>();
    for (const row of clicksByCategory) if (row.categoryId) catClicks.set(row.categoryId, row._count._all);
    const productClicksByCategory = new Map<string, number>();
    for (const p of productStats) {
      productClicksByCategory.set(p.categoryId ?? '', (productClicksByCategory.get(p.categoryId ?? '') ?? 0) + p.clicks);
    }
    const categoryStats: CategoryStat[] = menuCategories.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      kind: classifyCategory(c.name),
      views: catViews.get(c.id) ?? 0,
      clicks: catClicks.get(c.id) ?? 0,
      productClicks: productClicksByCategory.get(c.id) ?? 0,
    }));

    // Sort by engagement score: category clicks weight 3x vs product view,
    // plus half weight for within-category product clicks (real engagement signal).
    const engagementScore = (c: CategoryStat) => c.clicks * 3 + c.views + c.productClicks * 2;
    const topCategories = [...categoryStats].sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 10);

    // Heuristics layer
    const lowInterest = detectLowInterestProducts(productStats);
    const insights = buildUpsellInsights({ topProducts, categoryStats, locale });

    return NextResponse.json({
      range: range ?? '30d',
      window: { start: window.start?.toISOString() ?? null, end: window.end.toISOString() },
      overview: {
        totalMenuViews,
        totalProductViews,
        totalCategoryClicks,
        totalProductClicks,
        totalUpsellClicks,
        productClickRate,
        compare,
      },
      trend,
      topProducts: topProducts.map((p) => ({
        ...p,
        ctr: p.views > 0 ? p.clicks / p.views : 0,
      })),
      topCategories,
      lowInterest,
      insights,
      categories: menuCategories.map((c) => ({ id: c.id, name: c.name })),
    });
  } catch (error) {
    console.error('[MenuAnalytics] aggregation error:', error);
    return NextResponse.json({ error: 'Analitik hesaplanamadı' }, { status: 500 });
  }
}
