// Password reset request (CLAUDE.md §61). Always the same answer, so the
// form does not reveal which e-mails have an account.
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateBody } from '@/lib/api/validate';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { CUSTOMER_SELECT } from '@/lib/customer-auth';
import { sendCustomerResetEmail } from '@/lib/customer-account';
import { limited } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const Body = z.object({ email: z.string().trim().max(160) }).strict();

export async function POST(req: NextRequest) {
  const rl = await limited(`customer-forgot:ip:${getClientIp(req.headers)}`, 5, 10 * 60_000);
  if (rl) return rl;
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const email = parsed.data.email.toLowerCase();
  const perEmail = await rateLimit(`customer-forgot:email:${email}`, 3, 60 * 60_000);
  if (perEmail.allowed) {
    const account = await prisma.customerAccount.findUnique({ where: { email }, select: CUSTOMER_SELECT });
    if (account) after(() => sendCustomerResetEmail(account));
  }
  return NextResponse.json({ ok: true });
}
