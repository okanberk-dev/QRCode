// CLAUDE.md §38.99 — Owner campaign log viewer (paginated CustomerEmailLog).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_SIZE = 50;
const VALID_STATUSES = ['pending', 'sent', 'failed', 'unsubscribed'] as const;

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1).optional(),
  status: z.enum(VALID_STATUSES).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify campaign exists + IDOR scope.
  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id },
    select: { id: true, restaurantId: true },
  });
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const access = await canAccessRestaurant(actor, campaign.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get('page') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { page = 1, status } = parsed.data;

  const where = {
    campaignId: id,
    ...(status ? { status } : {}),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.customerEmailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        contactKey: true,
        email: true,
        status: true,
        errorMessage: true,
        sentAt: true,
        createdAt: true,
      },
    }),
    prisma.customerEmailLog.count({ where }),
  ]);

  return NextResponse.json(
    {
      logs: logs.map((l) => ({
        id: l.id,
        contactKey: l.contactKey,
        email: l.email,
        status: l.status,
        errorMessage: l.errorMessage,
        sentAt: l.sentAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
      page,
      total,
      pageSize: PAGE_SIZE,
    },
    {
      headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120' },
    },
  );
}
