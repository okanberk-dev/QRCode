// Set a new password from the reset link (CLAUDE.md §61). The link dies
// with the change: tokenVersion is bumped, older sessions sign out.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateBody } from '@/lib/api/validate';
import { getClientIp } from '@/lib/rate-limit';
import {
  CUSTOMER_SELECT,
  hashPassword,
  isAcceptablePassword,
  readResetToken,
  setCustomerCookie,
  signCustomerSession,
} from '@/lib/customer-auth';
import { fail, limited } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const Body = z.object({ token: z.string().min(20).max(2000), password: z.string().max(200) }).strict();

export async function POST(req: NextRequest) {
  const rl = await limited(`customer-reset:ip:${getClientIp(req.headers)}`, 10, 10 * 60_000);
  if (rl) return rl;
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const t = await readResetToken(parsed.data.token);
  if (!t) return fail('LINK_EXPIRED', 400);
  if (!isAcceptablePassword(parsed.data.password)) return fail('WEAK_PASSWORD');
  const res0 = await prisma.customerAccount.updateMany({
    where: { id: t.id, tokenVersion: t.v },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      tokenVersion: { increment: 1 },
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  });
  if (res0.count === 0) return fail('LINK_EXPIRED', 400);
  const account = await prisma.customerAccount.findUniqueOrThrow({ where: { id: t.id }, select: CUSTOMER_SELECT });
  const res = NextResponse.json({ ok: true });
  setCustomerCookie(res, await signCustomerSession(account), req);
  return res;
}
