import { NextRequest, NextResponse } from 'next/server';
import { gateGoogleReviewRoute } from '@/lib/google-review-route';
import { rateLimit } from '@/lib/rate-limit';
import { enqueueGoogleReviewRefresh, refreshGoogleReviewCache } from '@/lib/google-review-showcase';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Syncs every review of the business from Google now (all pages). The same
 * refresh the central queue runs every 6–12 h; shares its lease, so a sync
 * already running is not doubled. Per business at most 3 per 10 minutes —
 * every tenant shares one Google project quota.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateGoogleReviewRoute(req, id, { write: true });
  if (!gate.ok) return gate.response;

  const limit = await rateLimit(`google-review-sync:${id}`, 3, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, code: 'SYNC_THROTTLED', retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  await enqueueGoogleReviewRefresh(id);
  const result = await refreshGoogleReviewCache(id);
  if (result.ok) return NextResponse.json({ ok: true, reviews: result.reviews });
  if (result.skipped === 'busy') return NextResponse.json({ ok: true, busy: true });
  return NextResponse.json({ ok: false, code: result.code }, { status: 502 });
}
