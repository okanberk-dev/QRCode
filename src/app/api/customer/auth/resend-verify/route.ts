// Send the e-mail confirmation link again (CLAUDE.md §61).
import { NextRequest, NextResponse, after } from 'next/server';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { sendCustomerVerifyEmail } from '@/lib/customer-account';
import { fail, limited } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const account = await getCustomerFromRequest(req);
  if (!account) return fail('UNAUTHORIZED', 401);
  if (account.emailVerifiedAt) return NextResponse.json({ ok: true, verified: true });
  const rl = await limited(`customer-resend-verify:${account.id}`, 3, 60 * 60_000);
  if (rl) return rl;
  after(() => sendCustomerVerifyEmail(account));
  return NextResponse.json({ ok: true });
}
