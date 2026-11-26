// The customer's card (CLAUDE.md §60) — polled by the card page so a stamp
// added at the counter shows up within seconds. The token is the secret.
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { loadPublicLoyaltyCard, toPublicCardDto } from '@/lib/loyalty-server';

export const dynamic = 'force-dynamic';

const HEADERS = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' };

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limit = await rateLimit(`loyalty-card:ip:${getClientIp(req.headers)}`, 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'rate_limit' }, { status: 429, headers: HEADERS });
  const card = await loadPublicLoyaltyCard(token);
  if (!card) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: HEADERS });
  return NextResponse.json(toPublicCardDto(card), { headers: HEADERS });
}
