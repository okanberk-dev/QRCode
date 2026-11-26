// Counter lookup (CLAUDE.md §60): a scanned card QR, a card code, a phone
// number or part of a name → at most 8 members of this business's program.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { withServerTiming } from '@/lib/server-timing';
import { gateLoyaltyRoute } from '@/lib/loyalty-route';
import { parseLookupQuery } from '@/lib/loyalty';
import { findLoyaltyMembers, loadLoyaltyProgram, settleLapsedBalance, toMemberDto } from '@/lib/loyalty-server';

const Body = z.object({ query: z.string().max(300) }).strict();

async function handlePOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'read');
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(`loyalty-lookup:${gate.actor.id}`, 120, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'rate_limit', code: 'RATE_LIMIT' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;

  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ items: [], kind: 'empty' });
  const query = parseLookupQuery(parsed.data.query);
  let items = await findLoyaltyMembers(program.id, query);
  if (program.expiryDays && items.length === 1) {
    // An exact hit is about to be served at the counter: show the real balance.
    const lost = await settleLapsedBalance(program, items[0].id);
    if (lost > 0) items = await findLoyaltyMembers(program.id, query);
  }
  return NextResponse.json(
    { kind: query.kind, items: items.map((m) => toMemberDto(m, { full: gate.access.manage })) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withServerTiming(handlePOST);
