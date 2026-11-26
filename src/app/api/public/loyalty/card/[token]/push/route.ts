// Card notifications on / off (CLAUDE.md §61). The card link is the
// customer's secret, so holding it is enough to subscribe that browser.
// Only the browsers' own push services are accepted as endpoints (the
// server later POSTs there: no SSRF).
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isCrossSiteRequest } from '@/lib/request-origin';
import { isAllowedPushEndpoint, validPushKeys, vapidKeys } from '@/lib/web-push';
import { deleteLoyaltyPushSubscription, saveLoyaltyPushSubscription } from '@/lib/loyalty-push';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

const Subscribe = z
  .object({
    endpoint: z.string().min(10).max(1000),
    keys: z.object({ p256dh: z.string().min(80).max(120), auth: z.string().min(16).max(40) }).strict(),
  })
  .strict();
const Unsubscribe = z.object({ endpoint: z.string().min(10).max(1000) }).strict();

type Ctx = { params: Promise<{ token: string }> };

async function guard(req: NextRequest, token: string): Promise<NextResponse | { memberId: string }> {
  if (isCrossSiteRequest(req.headers)) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  const [byCard, byIp] = await Promise.all([
    rateLimit(`loyalty-push:${token}`, 20, 60 * 60_000),
    rateLimit(`loyalty-push:ip:${getClientIp(req.headers)}`, 120, 60 * 60_000),
  ]);
  if (!byCard.allowed || !byIp.allowed) return NextResponse.json({ error: 'rate_limit', code: 'RATE_LIMIT' }, { status: 429, headers: NO_STORE });
  const member = await prisma.loyaltyMember.findUnique({
    where: { cardToken: token },
    select: { id: true, program: { select: { isActive: true, restaurant: { select: { isActive: true, loyaltyEnabled: true } } } } },
  });
  if (!member || !member.program.isActive || !member.program.restaurant.isActive || !member.program.restaurant.loyaltyEnabled) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  }
  return { memberId: member.id };
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  if (!vapidKeys()) return NextResponse.json({ error: 'push_unavailable', code: 'PUSH_UNAVAILABLE' }, { status: 503, headers: NO_STORE });
  const g = await guard(req, token);
  if (g instanceof NextResponse) return g;
  const parsed = validateBody<z.infer<typeof Subscribe>>(Subscribe, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const { endpoint, keys } = parsed.data;
  if (!isAllowedPushEndpoint(endpoint) || !validPushKeys(keys.p256dh, keys.auth)) {
    return NextResponse.json({ error: 'invalid_subscription', code: 'INVALID_SUBSCRIPTION' }, { status: 400, headers: NO_STORE });
  }
  await saveLoyaltyPushSubscription(g.memberId, { endpoint, p256dh: keys.p256dh, auth: keys.auth });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const g = await guard(req, token);
  if (g instanceof NextResponse) return g;
  const parsed = validateBody<z.infer<typeof Unsubscribe>>(Unsubscribe, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  await deleteLoyaltyPushSubscription(g.memberId, parsed.data.endpoint);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
