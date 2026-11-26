// Adds a loyalty card the customer holds (its secret link) to the account
// (CLAUDE.md §61). The card link is the proof of ownership; phone numbers
// alone never link a card.
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { linkCardByToken, syncLinkedCards } from '@/lib/customer-account';
import { accountErrorResponse, fail, limited } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const Body = z.object({ token: z.string().min(10).max(80) }).strict();

export async function POST(req: NextRequest) {
  const account = await getCustomerFromRequest(req);
  if (!account) return fail('UNAUTHORIZED', 401);
  const rl = await limited(`customer-link:${account.id}`, 20, 10 * 60_000);
  if (rl) return rl;
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  try {
    const { slug } = await linkCardByToken(account.id, parsed.data.token);
    after(() => syncLinkedCards(account));
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    return accountErrorResponse(err);
  }
}
