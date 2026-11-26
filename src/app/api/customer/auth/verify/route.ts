// E-mail confirmation link (CLAUDE.md §61) → /hesap?verified=1|0.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readVerifyToken } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const t = await readVerifyToken(token);
  let ok = false;
  if (t) {
    const res = await prisma.customerAccount.updateMany({
      where: { id: t.id, email: t.email },
      data: { emailVerifiedAt: new Date() },
    });
    ok = res.count > 0;
  }
  const url = new URL(`/hesap?verified=${ok ? 1 : 0}`, req.nextUrl.origin);
  const res = NextResponse.redirect(url, 303);
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
