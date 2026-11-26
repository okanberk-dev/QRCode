// The signed-in customer's loyalty cards (CLAUDE.md §61).
import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { listCustomerCards } from '@/lib/customer-account';
import { fail } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const account = await getCustomerFromRequest(req);
  if (!account) return fail('UNAUTHORIZED', 401);
  return NextResponse.json({ cards: await listCustomerCards(account.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
