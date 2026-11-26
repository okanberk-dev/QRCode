// Counter actions on a loyalty card (CLAUDE.md §60): add stamps / points,
// give a reward, give the birthday gift, correct the balance (managers).
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { writePanelAuditLog } from '@/lib/audit-log';
import { withServerTiming } from '@/lib/server-timing';
import { actorRef, gateLoyaltyRoute, loyaltyErrorResponse } from '@/lib/loyalty-route';
import { LOYALTY_LIMITS } from '@/lib/loyalty';
import {
  adjustLoyaltyBalance,
  earnLoyalty,
  giveBirthdayGift,
  loadLoyaltyProgram,
  redeemLoyaltyReward,
  toMemberDto,
} from '@/lib/loyalty-server';
import { resolveDisplayTimeZone } from '@/lib/timezone';

const Body = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('earn'),
      count: z.number().int().min(1).max(LOYALTY_LIMITS.stampsPerVisitMax).optional(),
      spend: z.number().int().min(0).max(LOYALTY_LIMITS.spendMax).optional(),
      override: z.boolean().optional(),
    })
    .strict(),
  z.object({ type: z.literal('redeem'), rewardId: z.string().min(1).max(40) }).strict(),
  z.object({ type: z.literal('birthday') }).strict(),
  z
    .object({
      type: z.literal('adjust'),
      delta: z.number().int().min(-LOYALTY_LIMITS.adjustMax).max(LOYALTY_LIMITS.adjustMax),
      note: z.string().trim().min(3).max(LOYALTY_LIMITS.noteMax),
    })
    .strict(),
]);

type Ctx = { params: Promise<{ id: string; memberId: string }> };

async function handlePOST(req: NextRequest, { params }: Ctx) {
  const { id, memberId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const action = parsed.data;

  const gate = await gateLoyaltyRoute(req, id, action.type === 'adjust' ? 'manage' : 'operate');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM', code: 'NO_PROGRAM' }, { status: 404 });
  if (!program.isActive) {
    return NextResponse.json({ error: 'PROGRAM_PAUSED', code: 'PROGRAM_PAUSED' }, { status: 409 });
  }
  const actor = actorRef(gate.actor);

  try {
    switch (action.type) {
      case 'earn': {
        const r = await earnLoyalty(program, memberId, action, actor);
        if (action.override) {
          await writePanelAuditLog(gate.actor, 'owner.loyalty.earn.override', id, { restaurantId: id, memberId, amount: r.amount });
        }
        return NextResponse.json({ member: toMemberDto(r.member), amount: r.amount, expired: r.expired });
      }
      case 'redeem': {
        const r = await redeemLoyaltyReward(program, memberId, action.rewardId, actor);
        return NextResponse.json({ member: toMemberDto(r.member), rewardTitle: r.rewardTitle });
      }
      case 'birthday': {
        const member = await giveBirthdayGift(program, memberId, actor, resolveDisplayTimeZone());
        return NextResponse.json({ member: toMemberDto(member) });
      }
      case 'adjust': {
        const member = await adjustLoyaltyBalance(program, memberId, action.delta, action.note, actor);
        await writePanelAuditLog(gate.actor, 'owner.loyalty.adjust', id, { restaurantId: id, memberId, delta: action.delta });
        return NextResponse.json({ member: toMemberDto(member) });
      }
    }
  } catch (err) {
    return loyaltyErrorResponse(err);
  }
}

export const POST = withServerTiming(handlePOST);
