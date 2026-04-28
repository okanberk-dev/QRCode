import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ANALYTICS_SOURCE_TYPES, ANALYTICS_THRESHOLDS, isValidEventType, type AnalyticsEventType } from '@/lib/analytics-heuristics';
import { isValidSessionId } from '@/lib/analytics-session';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';

const MAX_EVENTS_PER_REQUEST = 40;

interface IncomingEvent {
  eventType: string;
  categoryId?: string | null;
  productId?: string | null;
  sourceType?: string | null;
  relatedProductId?: string | null;
  sourceProductId?: string | null;
}

// Per-event dedupe window (ms). Returning a smaller number keeps the
// server-side recent-events query tight; the hook uses the same constants.
function dedupeWindowFor(eventType: AnalyticsEventType): number {
  switch (eventType) {
    case 'menu_view': return ANALYTICS_THRESHOLDS.dedupeMenuViewMs;
    case 'menu_category_click': return ANALYTICS_THRESHOLDS.dedupeCategoryClickMs;
    case 'menu_product_view': return ANALYTICS_THRESHOLDS.dedupeProductViewMs;
    case 'menu_product_click': return ANALYTICS_THRESHOLDS.dedupeProductClickMs;
    case 'menu_upsell_click': return ANALYTICS_THRESHOLDS.dedupeProductClickMs;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  maybeSweep();
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  const { sessionId, events } = body as { sessionId?: unknown; events?: unknown };

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 400 });
  }

  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS_PER_REQUEST) {
    return NextResponse.json({ error: 'Geçersiz olay listesi' }, { status: 400 });
  }

  const rl = await rateLimit(`menu:analytics:${sessionId}`, 300, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many events' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, isActive: true, menuEnabled: true },
  });
  // Silent accept for inactive/disabled so probing can't fingerprint valid slugs.
  if (!restaurant || !restaurant.isActive || !restaurant.menuEnabled) {
    return NextResponse.json({ ok: true });
  }

  const restaurantId = restaurant.id;
  const now = Date.now();

  // First pass: shape validation + per-request dedupe.
  const seen = new Set<string>();
  const staged: {
    eventType: AnalyticsEventType;
    categoryId: string | null;
    productId: string | null;
    sourceType: string | null;
    metadata: Record<string, unknown> | null;
  }[] = [];

  for (const raw of events as IncomingEvent[]) {
    if (!raw || typeof raw !== 'object') continue;
    if (!isValidEventType(raw.eventType)) continue;

    const categoryId = typeof raw.categoryId === 'string' && raw.categoryId ? raw.categoryId.slice(0, 64) : null;
    const productId = typeof raw.productId === 'string' && raw.productId ? raw.productId.slice(0, 64) : null;
    const sourceType =
      typeof raw.sourceType === 'string' && (ANALYTICS_SOURCE_TYPES as readonly string[]).includes(raw.sourceType)
        ? raw.sourceType
        : null;

    const dedupeKey = `${raw.eventType}|${categoryId ?? ''}|${productId ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    let metadata: Record<string, unknown> | null = null;
    if (raw.eventType === 'menu_upsell_click') {
      metadata = {
        sourceProductId: typeof raw.sourceProductId === 'string' ? raw.sourceProductId.slice(0, 64) : null,
        relatedProductId: typeof raw.relatedProductId === 'string' ? raw.relatedProductId.slice(0, 64) : null,
      };
    }

    staged.push({ eventType: raw.eventType, categoryId, productId, sourceType, metadata });
  }

  if (staged.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  // ID verification pass — ensure categoryId/productId actually belong to this
  // restaurant's menu. Unknown IDs are stripped (event kept with null). Prevents
  // external clients from polluting aggregates with phantom IDs.
  const incomingCategoryIds = new Set<string>();
  const incomingProductIds = new Set<string>();
  for (const row of staged) {
    if (row.categoryId) incomingCategoryIds.add(row.categoryId);
    if (row.productId) incomingProductIds.add(row.productId);
  }
  const [validCategories, validProducts] = await Promise.all([
    incomingCategoryIds.size > 0
      ? prisma.menuCategory.findMany({
          where: { restaurantId, id: { in: [...incomingCategoryIds] }, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve([] as { id: string }[]),
    incomingProductIds.size > 0
      ? prisma.menuItem.findMany({
          where: { restaurantId, deletedAt: null, id: { in: [...incomingProductIds] } },
          select: { id: true },
        })
      : Promise.resolve([] as { id: string }[]),
  ]);
  const validCategoryIds = new Set(validCategories.map((c) => c.id));
  const validProductIds = new Set(validProducts.map((p) => p.id));

  const rows: Prisma.MenuAnalyticsEventCreateManyInput[] = staged.map((row) => ({
    restaurantId,
    categoryId: row.categoryId && validCategoryIds.has(row.categoryId) ? row.categoryId : null,
    productId: row.productId && validProductIds.has(row.productId) ? row.productId : null,
    eventType: row.eventType,
    sessionId: sessionId as string,
    sourceType: row.sourceType,
    ...(row.metadata ? { metadata: row.metadata as Prisma.InputJsonValue } : {}),
  }));

  // Cross-request dedupe: look up recent events for this session inside the
  // largest applicable window, then skip rows that are still within their own
  // dedupe window.
  const windowMs = Math.max(...rows.map((r) => dedupeWindowFor(r.eventType as AnalyticsEventType)));
  const recentCutoff = new Date(now - windowMs);
  const recent = await prisma.menuAnalyticsEvent.findMany({
    where: { restaurantId, sessionId: sessionId as string, createdAt: { gte: recentCutoff } },
    select: { eventType: true, categoryId: true, productId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const recentByKey = new Map<string, Date>();
  for (const r of recent) {
    const key = `${r.eventType}|${r.categoryId ?? ''}|${r.productId ?? ''}`;
    if (!recentByKey.has(key)) recentByKey.set(key, r.createdAt);
  }

  const filtered = rows.filter((row) => {
    const key = `${row.eventType}|${row.categoryId ?? ''}|${row.productId ?? ''}`;
    const lastAt = recentByKey.get(key);
    if (!lastAt) return true;
    return now - lastAt.getTime() > dedupeWindowFor(row.eventType as AnalyticsEventType);
  });

  if (filtered.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, deduped: rows.length });
  }

  try {
    await prisma.menuAnalyticsEvent.createMany({ data: filtered });
  } catch (err) {
    console.error('[MenuAnalytics] insert failed:', (err as Error).message);
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  return NextResponse.json({ ok: true, inserted: filtered.length, deduped: rows.length - filtered.length });
}
