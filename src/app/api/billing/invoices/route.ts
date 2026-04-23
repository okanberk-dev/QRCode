// SCAFFOLDED: Billing invoice history. Wire up to BillingInvoice model
// (see scaffolding.ts) or the invoices API of your payment provider
// (Stripe, Iyzico, etc.).
import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ data: [], scaffolded: true });
}
