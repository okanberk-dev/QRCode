// Customer sign-in with e-mail and password (CLAUDE.md §61). One generic
// error for wrong e-mail / wrong password / Google-only accounts.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateBody } from '@/lib/api/validate';
import { getClientIp } from '@/lib/rate-limit';
import {
  burnPasswordCheck,
  CUSTOMER_SELECT,
  setCustomerCookie,
  signCustomerSession,
  toCustomerDto,
  verifyPassword,
} from '@/lib/customer-auth';
import { fail, limited } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const Body = z.object({ email: z.string().trim().max(160), password: z.string().max(200) }).strict();

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const email = parsed.data.email.toLowerCase();
  const rl =
    (await limited(`customer-login:ip:${ip}`, 15, 10 * 60_000)) ??
    (await limited(`customer-login:email:${email}`, 8, 10 * 60_000));
  if (rl) return rl;

  const account = await prisma.customerAccount.findUnique({ where: { email }, select: CUSTOMER_SELECT });
  if (!account?.passwordHash) {
    await burnPasswordCheck(parsed.data.password);
    return fail('INVALID_CREDENTIALS', 401);
  }
  if (!(await verifyPassword(parsed.data.password, account.passwordHash))) return fail('INVALID_CREDENTIALS', 401);
  await prisma.customerAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  const res = NextResponse.json({ ok: true, account: toCustomerDto(account) });
  setCustomerCookie(res, await signCustomerSession(account), req);
  return res;
}
