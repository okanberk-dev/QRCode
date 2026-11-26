import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { gateGoogleReviewRoute } from '@/lib/google-review-route';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { enqueueGoogleReviewRefresh, refreshGoogleReviewCache } from '@/lib/google-review-showcase';
import { notifyNewGoogleReviews } from '@/lib/google-review-alerts';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** A page visit within this long after the last good sync does not call Google. */
const PAGE_SYNC_FRESH_MS = 2 * 60_000;

const Body = z.object({ trigger: z.enum(['page', 'manual']).optional() }).strict();

/**
 * Syncs the business's reviews from Google now. Shares the central queue's
 * lease, so a sync already running is not doubled.
 *
 * - `trigger: 'manual'` (default, "Şimdi senkronla"): every page; write
 *   permission; at most 3 per business per 10 minutes.
 * - `trigger: 'page'` (the owner opens the Google Reviews page, §54): only
 *   the newest page (new reviews, recent reply changes), skipped while the
 *   last sync is under 2 minutes old; any panel reader; at most 6 per
 *   business per 10 minutes, and a throttled visit is a quiet no-op. The
 *   global Google budget (§53) still applies inside every request.
 *
 * New reviews trigger the owner alert mail after the response (§54).
 */
async function handlePOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await req.json().catch(() => ({}));
  const parsed = validateBody<z.infer<typeof Body>>(Body, raw ?? {});
  if (!parsed.ok) return parsed.response;
  const trigger = parsed.data.trigger ?? 'manual';

  const gate = await gateGoogleReviewRoute(req, id, { write: trigger === 'manual' });
  if (!gate.ok) return gate.response;

  const now = new Date();
  if (trigger === 'page') {
    const cache = await prisma.googleReviewCache.findUnique({
      where: { restaurantId: id },
      select: { fetchedAt: true },
    });
    if (cache?.fetchedAt && now.getTime() - cache.fetchedAt.getTime() < PAGE_SYNC_FRESH_MS) {
      return NextResponse.json({ ok: true, fresh: true, inserted: 0 });
    }
    const limit = await rateLimit(`google-review-page-sync:${id}`, 6, 10 * 60_000);
    if (!limit.allowed) return NextResponse.json({ ok: true, fresh: true, throttled: true, inserted: 0 });
    // The first visit of a business the queue has not seen yet needs a row.
    await prisma.googleReviewCache.upsert({
      where: { restaurantId: id },
      create: { restaurantId: id, nextAttemptAt: now },
      update: {},
    });
  } else {
    const limit = await rateLimit(`google-review-sync:${id}`, 3, 10 * 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, code: 'SYNC_THROTTLED', retryAfterSeconds: limit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      );
    }
    await enqueueGoogleReviewRefresh(id, now);
  }

  const result = await refreshGoogleReviewCache(id, now, { mode: trigger === 'page' ? 'recent' : 'full' });
  if (result.ok) {
    if (result.inserted > 0) after(() => notifyNewGoogleReviews(id).then(() => undefined));
    return NextResponse.json({ ok: true, reviews: result.reviews, inserted: result.inserted });
  }
  if (result.skipped === 'busy') return NextResponse.json({ ok: true, busy: true, inserted: 0 });
  return NextResponse.json({ ok: false, code: result.code }, { status: 502 });
}

export const POST = withServerTiming(handlePOST);
