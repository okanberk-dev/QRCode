import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';

async function handleGET(req: NextRequest) {
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
    // Display number — admin-set "INV-2026-04" or auto-generated.
    invoiceNumber: inv.invoiceNumber,
    date: inv.issuedAt.toISOString(),
    amount: Number(inv.amount),
    status: inv.status,
    url: inv.pdfUrl ?? undefined,
    currency: inv.currency,
    description: inv.description,
    // adminNotes deliberately excluded — admin-only (Faz 4 privacy guard,
    // mirrors BillingSubscription.adminNotes pattern).
  }));

  // Stage 87 §38.167 — owner workspace-scoped invoices list; cache
  // header private 60s/300sw (invoice generation PayNKolay return
  // periyodik, intra-day mutation rare). §38.100 paterni reuse.
  return NextResponse.json(
    { data },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
