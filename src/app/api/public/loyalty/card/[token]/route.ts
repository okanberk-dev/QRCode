// The customer's card (CLAUDE.md §60) — polled by the card page so a stamp
// added at the counter shows up within seconds. The token is the secret.
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { loadPublicLoyaltyCard, toPublicCardDto } from '@/lib/loyalty-server';
import { setCardCookie } from '@/lib/loyalty-device';

export const dynamic = 'force-dynamic';

const HEADERS = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' };

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: HEADERS });
  // Many phones in one café share an IP: a generous IP cap against floods,
  // a per-card cap against a runaway tab.
  const [ipLimit, cardLimit] = await Promise.all([
    rateLimit(`loyalty-card:ip:${getClientIp(req.headers)}`, 600, 60_000),
    rateLimit(`loyalty-card:token:${token}`, 40, 60_000),
  ]);
  if (!ipLimit.allowed || !cardLimit.allowed) return NextResponse.json({ error: 'rate_limit' }, { status: 429, headers: HEADERS });
  const card = await loadPublicLoyaltyCard(token);
  if (!card) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: HEADERS });
  const res = NextResponse.json(toPublicCardDto(card), { headers: HEADERS });
  // First read from the card page: remember the card on this phone (§61).
  if (req.nextUrl.searchParams.get('remember') === '1') setCardCookie(res, card.program.slug, token, req);
  return res;
}
