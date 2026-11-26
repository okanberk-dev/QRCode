// Customer sign-out (CLAUDE.md §61). `{ all: true }` signs out every device.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearCustomerCookie, getCustomerFromRequest } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { all?: unknown };
  if (body?.all === true) {
    const account = await getCustomerFromRequest(req);
    if (account) {
      await prisma.customerAccount.update({ where: { id: account.id }, data: { tokenVersion: { increment: 1 } } });
    }
  }
  const res = NextResponse.json({ ok: true });
  clearCustomerCookie(res);
  return res;
}
