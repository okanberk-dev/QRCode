import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ANALYTICS_SOURCE_TYPES, ANALYTICS_THRESHOLDS, isValidEventType } from '@/lib/analytics-heuristics';
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
  // Client-supplied timestamp is intentionally ignored; server uses createdAt default.
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

  // Rate limit per session: 300 events / min is generous but catches bots.
  const rl = rateLimit(`menu:analytics:${sessionId}`, 300, 60 * 1000);
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
  if (!restaurant || !restaurant.isActive || !restaurant.menuEnabled) {
    // Silently accept so probing can't fingerprint active slugs.
    return NextResponse.json({ ok: true });
  }

  const restaurantId = restaurant.id;
  const now = Date.now();

  // Validate + dedupe. Per-request in-memory dedupe is enough — cross-request
  // dedupe happens naturally because clients filter client-side via the hook.
  const seen = new Set<string>();
  const rows: {
    restaurantId: string;
    categoryId: string | null;
    productId: string | null;
    eventType: string;
    sessionId: string;
    sourceType: string | null;
    metadata: any;
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

    let metadata: any = null;
    if (raw.eventType === 'menu_upsell_click') {
      metadata = {
        sourceProductId: typeof raw.sourceProductId === 'string' ? raw.sourceProductId.slice(0, 64) : null,
        relatedProductId: typeof raw.relatedProductId === 'string' ? raw.relatedProductId.slice(0, 64) : null,
      };
    }

    rows.push({
      restaurantId,
      categoryId,
      productId,
      eventType: raw.eventType,
      sessionId,
      sourceType,
      metadata,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  // Server-side dedupe within recent window to prevent refresh-spam.
  const windowMs = Math.max(
    ANALYTICS_THRESHOLDS.dedupeMenuViewMs,
    ANALYTICS_THRESHOLDS.dedupeProductViewMs,
    ANALYTICS_THRESHOLDS.dedupeCategoryClickMs,
    ANALYTICS_THRESHOLDS.dedupeProductClickMs,
  );
  const recentCutoff = new Date(now - windowMs);
  const recent = await prisma.menuAnalyticsEvent.findMany({
    where: {
      restaurantId,
      sessionId,
      createdAt: { gte: recentCutoff },
    },
    select: { eventType: true, categoryId: true, productId: true, createdAt: true },
  });

  const recentByKey = new Map<string, Date>();
  for (const r of recent) {
    const key = `${r.eventType}|${r.categoryId ?? ''}|${r.productId ?? ''}`;
    const prev = recentByKey.get(key);
    if (!prev || r.createdAt > prev) recentByKey.set(key, r.createdAt);
  }

  const filtered = rows.filter((row) => {
    const key = `${row.eventType}|${row.categoryId ?? ''}|${row.productId ?? ''}`;
    const lastAt = recentByKey.get(key);
    if (!lastAt) return true;
    const windowFor =
      row.eventType === 'menu_view'
        ? ANALYTICS_THRESHOLDS.dedupeMenuViewMs
        : row.eventType === 'menu_category_click'
        ? ANALYTICS_THRESHOLDS.dedupeCategoryClickMs
        : row.eventType === 'menu_product_view'
        ? ANALYTICS_THRESHOLDS.dedupeProductViewMs
        : row.eventType === 'menu_product_click'
        ? ANALYTICS_THRESHOLDS.dedupeProductClickMs
        : ANALYTICS_THRESHOLDS.dedupeProductClickMs;
    return now - lastAt.getTime() > windowFor;
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
