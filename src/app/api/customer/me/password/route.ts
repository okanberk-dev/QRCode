// Set or change the customer password (CLAUDE.md §61). Google-only accounts
// can add a password; changing one needs the current password. Other
// devices sign out (tokenVersion bump), this one gets a fresh cookie.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateBody } from '@/lib/api/validate';
import {
  CUSTOMER_SELECT,
  getCustomerFromRequest,
  hashPassword,
  isAcceptablePassword,
  setCustomerCookie,
  signCustomerSession,
  verifyPassword,
} from '@/lib/customer-auth';
import { fail, limited, refuseCrossSite } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const Body = z
  .object({ currentPassword: z.string().max(200).optional(), newPassword: z.string().max(200) })
  .strict();

export async function POST(req: NextRequest) {
  const crossSite = refuseCrossSite(req);
  if (crossSite) return crossSite;
  const account = await getCustomerFromRequest(req);
  if (!account) return fail('UNAUTHORIZED', 401);
  const rl = await limited(`customer-password:${account.id}`, 6, 10 * 60_000);
  if (rl) return rl;
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  if (account.passwordHash && !(await verifyPassword(parsed.data.currentPassword ?? '', account.passwordHash))) {
    return fail('WRONG_PASSWORD', 403);
  }
  if (!isAcceptablePassword(parsed.data.newPassword)) return fail('WEAK_PASSWORD');
  const updated = await prisma.customerAccount.update({
    where: { id: account.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), tokenVersion: { increment: 1 } },
    select: CUSTOMER_SELECT,
  });
  const res = NextResponse.json({ ok: true });
  setCustomerCookie(res, await signCustomerSession(updated), req);
  return res;
}
