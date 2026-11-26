/**
 * Shared gate for the owner loyalty API (CLAUDE.md §60): actor, IDOR scope,
 * the three access levels (read / operate / manage), the admin / plan master
 * switch and a write budget.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getPanelActorFromRequest, type PanelActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { loyaltyAccess, type LoyaltyAccess, LoyaltyError, loyaltyErrorResponseBody } from '@/lib/loyalty-server';

export type LoyaltyNeed = keyof LoyaltyAccess;

export interface LoyaltyGateOk {
  ok: true;
  actor: PanelActor;
  access: LoyaltyAccess;
  restaurant: { id: string; name: string; slug: string; category: string | null; loyaltyEnabled: boolean };
}

export async function gateLoyaltyRoute(
  req: NextRequest,
  restaurantId: string,
  need: LoyaltyNeed,
): Promise<LoyaltyGateOk | { ok: false; response: NextResponse }> {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { ok: false, response: NextResponse.json({ error: 'Yetkisiz' }, { status: 401 }) };
  const access = await loyaltyAccess(actor, restaurantId);
  if (!access[need]) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'forbidden', code: need === 'read' ? 'FORBIDDEN' : need === 'operate' ? 'READ_ONLY' : 'MANAGER_ONLY' },
        { status: 403 },
      ),
    };
  }
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, slug: true, category: true, loyaltyEnabled: true },
  });
  if (!restaurant) return { ok: false, response: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  if (need !== 'read' && !restaurant.loyaltyEnabled) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'LOYALTY_DISABLED',
          code: 'LOYALTY_DISABLED',
          message: 'Sadakat kartı bu işletmenin paketinde kapalı.',
        },
        { status: 403 },
      ),
    };
  }
  if (need !== 'read') {
    const limit = await rateLimit(`loyalty-write:${actor.id}`, 120, 60_000);
    if (!limit.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'rate_limit', code: 'RATE_LIMIT' },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
        ),
      };
    }
  }
  return { ok: true, actor, access, restaurant };
}

export function loyaltyErrorResponse(err: unknown): NextResponse {
  if (err instanceof LoyaltyError) {
    return NextResponse.json(loyaltyErrorResponseBody(err), { status: err.status });
  }
  console.error('[loyalty] unexpected error', { error: err instanceof Error ? err.name : 'unknown' });
  return NextResponse.json({ error: 'internal', code: 'INTERNAL' }, { status: 500 });
}

export function actorRef(actor: PanelActor): { id: string; source: string } {
  return { id: actor.realAdminId ?? actor.id, source: actor.realAdminId ? 'admin' : actor.source };
}

/**
 * A branch of a chain card (§61) runs the counter but never edits the card:
 * the program, customer page and branches are changed at the home business.
 */
export function branchEditRefused(program: { restaurantId: string } | null, restaurantId: string): NextResponse | null {
  if (!program || program.restaurantId === restaurantId) return null;
  return NextResponse.json(
    { error: 'BRANCH_PROGRAM', code: 'BRANCH_PROGRAM', homeRestaurantId: program.restaurantId },
    { status: 409 },
  );
}
