// Adds a loyalty card the customer holds (its secret link) to the account
// (CLAUDE.md §61). Link + matching account phone, or link + the card phone's
// last 4 digits; a phone number alone never links a card.
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { linkCardByToken, syncLinkedCards } from '@/lib/customer-account';
import { accountErrorResponse, fail, limited, refuseCrossSite } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const Body = z.object({ token: z.string().min(10).max(80), last4: z.string().regex(/^\d{4}$/).optional() }).strict();

export async function POST(req: NextRequest) {
  const crossSite = refuseCrossSite(req);
  if (crossSite) return crossSite;
  const account = await getCustomerFromRequest(req);
  if (!account) return fail('UNAUTHORIZED', 401);
  const rl = await limited(`customer-link:${account.id}`, 20, 10 * 60_000);
  if (rl) return rl;
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  try {
    const { slug } = await linkCardByToken(account, parsed.data.token, parsed.data.last4);
    after(() => syncLinkedCards(account));
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    return accountErrorResponse(err);
  }
}
