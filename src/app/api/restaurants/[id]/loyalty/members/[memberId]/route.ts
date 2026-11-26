// One loyalty member (CLAUDE.md §60): card, history; delete (KVKK).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writePanelAuditLog } from '@/lib/audit-log';
import { withServerTiming } from '@/lib/server-timing';
import { gateLoyaltyRoute } from '@/lib/loyalty-route';
import {
  LOYALTY_MEMBER_SELECT,
  loadLoyaltyProgram,
  memberEvents,
  settleLapsedBalance,
  toMemberDto,
} from '@/lib/loyalty-server';
import { loyaltyCardPath } from '@/lib/loyalty';

type Ctx = { params: Promise<{ id: string; memberId: string }> };

async function handleGET(req: NextRequest, { params }: Ctx) {
  const { id, memberId } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'read');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM' }, { status: 404 });

  const exists = await prisma.loyaltyMember.findFirst({ where: { id: memberId, programId: program.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
  await settleLapsedBalance(program, memberId);
  const [member, events] = await Promise.all([
    prisma.loyaltyMember.findUniqueOrThrow({
      where: { id: memberId },
      select: { ...LOYALTY_MEMBER_SELECT, cardToken: true },
    }),
    memberEvents(memberId),
  ]);
  const { cardToken, ...rest } = member;
  return NextResponse.json(
    {
      member: toMemberDto(rest, { full: gate.access.manage }),
      events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
      // Staff can show the card QR to a customer who lost the link.
      cardPath: gate.access.operate ? loyaltyCardPath(program.slug, cardToken) : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function handleDELETE(req: NextRequest, { params }: Ctx) {
  const { id, memberId } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'manage');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM' }, { status: 404 });
  const res = await prisma.loyaltyMember.deleteMany({ where: { id: memberId, programId: program.id } });
  if (res.count === 0) return NextResponse.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
  await writePanelAuditLog(gate.actor, 'owner.loyalty.member.delete', id, { restaurantId: id, memberId });
  return NextResponse.json({ ok: true });
}

export const GET = withServerTiming(handleGET);
export const DELETE = withServerTiming(handleDELETE);
