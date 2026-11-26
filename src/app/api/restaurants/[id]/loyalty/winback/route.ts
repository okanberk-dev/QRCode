// Win-back e-mail settings of a loyalty program (CLAUDE.md §61). Turning it
// on needs the owner's confirmation that commercial messages are theirs to
// send (consent records, İYS); the first confirmation is stored with time.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { writePanelAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { withServerTiming } from '@/lib/server-timing';
import { branchEditRefused, gateLoyaltyRoute } from '@/lib/loyalty-route';
import { LOYALTY_LIMITS } from '@/lib/loyalty';
import { loadLoyaltyProgram } from '@/lib/loyalty-server';
import { moderateText } from '@/lib/loyalty-moderation';
import { WINBACK_REPEAT_DAYS } from '@/lib/loyalty-winback';

type Ctx = { params: Promise<{ id: string }> };

const Body = z
  .object({
    enabled: z.boolean(),
    days: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
    message: z.string().trim().max(LOYALTY_LIMITS.winbackMessageMax).nullable(),
    confirm: z.boolean().default(false),
  })
  .strict();

const DAY = 24 * 3600_000;

async function audience(programId: string, days: number) {
  const now = Date.now();
  const cutoff = new Date(now - days * DAY);
  const repeat = new Date(now - WINBACK_REPEAT_DAYS * DAY);
  const base = { programId, email: { not: null }, marketingConsent: true } as const;
  const [reachable, due] = await prisma.$transaction([
    prisma.loyaltyMember.count({ where: base }),
    prisma.loyaltyMember.count({
      where: {
        ...base,
        OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null, createdAt: { lt: cutoff } }],
        AND: [{ OR: [{ winbackSentAt: null }, { winbackSentAt: { lt: repeat } }] }],
      },
    }),
  ]);
  return { reachable, due };
}

function settings(p: { winbackEnabled: boolean; winbackDays: number; winbackMessage: string | null; winbackConfirmedAt: Date | null }) {
  return {
    enabled: p.winbackEnabled,
    days: p.winbackDays,
    message: p.winbackMessage,
    confirmedAt: p.winbackConfirmedAt?.toISOString() ?? null,
  };
}

async function handleGET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'read');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM', code: 'NO_PROGRAM' }, { status: 404 });
  const branch = branchEditRefused(program, id);
  if (branch) return branch;
  return NextResponse.json(
    { settings: settings(program), audience: await audience(program.id, program.winbackDays) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function handlePUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'manage');
  if (!gate.ok) return gate.response;
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM', code: 'NO_PROGRAM' }, { status: 404 });
  const branch = branchEditRefused(program, id);
  if (branch) return branch;
  if (d.enabled && !program.winbackConfirmedAt && !d.confirm) {
    return NextResponse.json({ error: 'WINBACK_CONFIRM_REQUIRED', code: 'WINBACK_CONFIRM_REQUIRED' }, { status: 400 });
  }
  const message = d.message?.trim() || null;
  if (message) {
    const blocked = moderateText(message);
    if (blocked) return NextResponse.json({ error: 'content_blocked', code: 'CONTENT_BLOCKED', issues: blocked }, { status: 422 });
  }
  const confirmNow = d.confirm && !program.winbackConfirmedAt;
  const saved = await prisma.loyaltyProgram.update({
    where: { id: program.id },
    data: {
      winbackEnabled: d.enabled,
      winbackDays: d.days,
      winbackMessage: message,
      ...(confirmNow ? { winbackConfirmedAt: new Date() } : {}),
    },
    select: { id: true, winbackEnabled: true, winbackDays: true, winbackMessage: true, winbackConfirmedAt: true },
  });
  await writePanelAuditLog(gate.actor, 'owner.loyalty.winback.update', id, {
    restaurantId: id,
    enabled: saved.winbackEnabled,
    days: saved.winbackDays,
    confirmed: confirmNow,
  });
  return NextResponse.json({ settings: settings(saved), audience: await audience(saved.id, saved.winbackDays) });
}

export const GET = withServerTiming(handleGET);
export const PUT = withServerTiming(handlePUT);
