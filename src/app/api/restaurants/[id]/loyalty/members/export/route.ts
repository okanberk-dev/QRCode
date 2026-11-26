// Loyalty members CSV (CLAUDE.md §60). Managers only (personal data). The
// marketing-consent column tells the owner whom they may contact.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writePanelAuditLog } from '@/lib/audit-log';
import { withServerTiming } from '@/lib/server-timing';
import { gateLoyaltyRoute } from '@/lib/loyalty-route';
import { formatMemberCode } from '@/lib/loyalty';
import { loadLoyaltyProgram } from '@/lib/loyalty-server';

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  // Spreadsheet formula injection guard.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

async function handleGET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'manage');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM' }, { status: 404 });

  const rows = await prisma.loyaltyMember.findMany({
    where: { programId: program.id },
    orderBy: { createdAt: 'asc' },
    take: 20_000,
    select: {
      code: true,
      name: true,
      phone: true,
      email: true,
      birthMonth: true,
      birthDay: true,
      marketingConsent: true,
      balance: true,
      lifetimeEarned: true,
      visits: true,
      rewardsRedeemed: true,
      lastVisitAt: true,
      joinedVia: true,
      createdAt: true,
    },
  });
  const header = [
    'Card code',
    'Name',
    'Phone',
    'Email',
    'Birthday (MM-DD)',
    'Marketing consent',
    program.kind === 'points' ? 'Points' : 'Stamps',
    'Earned in total',
    'Visits',
    'Rewards given',
    'Last visit',
    'Joined via',
    'Joined at',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        formatMemberCode(r.code),
        r.name,
        r.phone,
        r.email,
        r.birthMonth && r.birthDay ? `${String(r.birthMonth).padStart(2, '0')}-${String(r.birthDay).padStart(2, '0')}` : '',
        r.marketingConsent ? 'yes' : 'no',
        r.balance,
        r.lifetimeEarned,
        r.visits,
        r.rewardsRedeemed,
        r.lastVisitAt?.toISOString() ?? '',
        r.joinedVia,
        r.createdAt.toISOString(),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  await writePanelAuditLog(gate.actor, 'owner.loyalty.members.export', id, { restaurantId: id, rows: rows.length });
  return new NextResponse(`﻿${lines.join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="loyalty-${program.slug}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export const GET = withServerTiming(handleGET);
