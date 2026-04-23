// SCAFFOLDED: Billing summary — plan, trial, feedback quota usage.
// Replace the mock response with a real Prisma query (see scaffolding.ts
// BillingSubscription + usage aggregation across Feedback).
import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({
    plan: 'trial',
    planLabel: 'Trial',
    trialDaysLeft: 14,
    renewsAt: null,
    quota: { used: 0, limit: 1000 },
    paymentMethod: null,
    scaffolded: true,
  });
}
