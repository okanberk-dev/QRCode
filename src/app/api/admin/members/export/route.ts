import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import {
  buildMembersWhere,
  csvRow,
  parseListMembersParams,
} from '@/lib/admin-members';

// GET /api/admin/members/export — CSV download of the filtered list.
// Same filters as the list endpoint (search/plan/status), no pagination —
// returns up to 5000 rows in one response (in-memory build; safe at our scale).
// Filename: members-YYYY-MM-DD.csv
export const dynamic = 'force-dynamic';

const HEADERS = [
  'email',
  'name',
  'plan',
  'status',
  'trial_ends_at',
  'restaurants',
  'created_at',
  'deactivated_at',
];

const MAX_ROWS = 5000;

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const params = parseListMembersParams(req.nextUrl.searchParams);
  // Override pagination — export-all (capped). Status default stays consistent
  // with list defaults (active) unless caller passes status=all.
  const where = buildMembersWhere(params);

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
    select: {
      email: true,
      name: true,
      plan: true,
      isActive: true,
      trialEndsAt: true,
      createdAt: true,
      deactivatedAt: true,
      _count: { select: { restaurants: true } },
    },
  });

  const lines: string[] = [csvRow(HEADERS)];
  for (const r of rows) {
    lines.push(
      csvRow([
        r.email,
        r.name ?? '',
        r.plan,
        r.isActive ? 'active' : 'passive',
        r.trialEndsAt ? r.trialEndsAt.toISOString() : '',
        r._count.restaurants,
        r.createdAt.toISOString(),
        r.deactivatedAt ? r.deactivatedAt.toISOString() : '',
      ]),
    );
  }

  // Prepend UTF-8 BOM so Excel opens TR characters correctly without manual
  // import settings (matches /api/admin/customers/export).
  const csv = '﻿' + lines.join('\r\n');
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="members-${today}.csv"`,
    },
  });
}
