import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function resolveOwnerUserId(actor: {
  id: string;
  role: string;
  restaurantId: string | null;
  source: 'admin' | 'user';
}): Promise<string | null> {
  if (actor.source === 'user') return actor.id;
  if (actor.role === 'manager' && actor.restaurantId) {
    const r = await prisma.restaurant.findUnique({
      where: { id: actor.restaurantId },
      select: { userId: true },
    });
    return r?.userId ?? null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) {
    return NextResponse.json({ error: 'forbidden', hint: 'billing is workspace-scoped' }, { status: 403 });
  }

  const invoices = await prisma.billingInvoice.findMany({
    where: { userId },
    orderBy: { issuedAt: 'desc' },
    take: 100,
  });

  const data = invoices.map((inv) => ({
    id: inv.id,
    date: inv.issuedAt.toISOString(),
    amount: Number(inv.amount),
    status: inv.status,
    url: inv.pdfUrl ?? undefined,
    currency: inv.currency,
  }));

  return NextResponse.json({ data });
}
