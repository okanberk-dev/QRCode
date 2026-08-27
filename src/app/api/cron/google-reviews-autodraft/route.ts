// CLAUDE.md §X — Reputation OS Suite (Google reviews auto-draft cron).
//
// Günde bir çalışır (0 6 * * *; §21.12 Hobby plan — eskiden saat başıydı). Bağlı tüm restoranların yanıtlanmamış Google review'larına
// arka planda AI taslak hazırlar; owner panel açtığında taslak hazır gelir.
//
// Idempotent: aynı (restaurantId, reviewName) için 24 saatten taze draft varsa
// skip. Review edit edildiyse comment hash değişir → regenerate.

import { NextRequest, NextResponse } from 'next/server';
import { runGoogleReviewsAutoDraft } from '@/lib/reputation/google-draft';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runGoogleReviewsAutoDraft();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[google-reviews-autodraft] cron failed', err);
    const message = err instanceof Error ? err.message : 'cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
