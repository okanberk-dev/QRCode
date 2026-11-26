// The customer leaves the loyalty program and deletes their card (KVKK,
// CLAUDE.md §60). The last 4 digits of the phone confirm it is the owner of
// the card, not someone who photographed the QR.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isCrossSiteRequest } from '@/lib/request-origin';
import { phoneLast4 } from '@/lib/loyalty';
import { clearCardCookie } from '@/lib/loyalty-device';

export const dynamic = 'force-dynamic';

const Body = z.object({ last4: z.string().regex(/^\d{4}$/) }).strict();
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (isCrossSiteRequest(req.headers)) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  const limit = await rateLimit(`loyalty-leave:${token}`, 5, 60 * 60_000);
  const ipLimit = await rateLimit(`loyalty-leave:ip:${getClientIp(req.headers)}`, 20, 60 * 60_000);
  if (!limit.allowed || !ipLimit.allowed) return NextResponse.json({ error: 'rate_limit', code: 'RATE_LIMIT' }, { status: 429, headers: NO_STORE });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;

  const member = await prisma.loyaltyMember.findUnique({
    where: { cardToken: token },
    select: { id: true, phone: true, program: { select: { slug: true } } },
  });
  if (!member) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (phoneLast4(member.phone) !== parsed.data.last4) {
    return NextResponse.json({ error: 'WRONG_DIGITS', code: 'WRONG_DIGITS' }, { status: 400, headers: NO_STORE });
  }
  await prisma.loyaltyMember.delete({ where: { id: member.id } });
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  clearCardCookie(res, member.program.slug);
  return res;
}
