/**
 * Dodo Payments customer portal route handler (CLAUDE.md §44, Stage 142 §38.222,
 * audit §38.B M4 ownership gate).
 *
 * GET /api/customer-portal[?send_email=true]
 *
 * Owner clicks "Aboneliği yönet" → BillingReadOnlyCard fetches this route →
 * SDK returns a short-lived signed customer portal URL → browser redirects.
 *
 * The owner uses Dodo's hosted portal to:
 *   • View invoices / receipts
 *   • Update payment method (card)
 *   • Cancel / reactivate subscription
 *   • Update billing address
 *
 * **Audit M4 — ownership gate.** The SDK handler reads `customer_id` straight
 * from the query string. Exporting it raw meant ANYONE who learned another
 * tenant's `providerCustomerId` got a signed portal link to that customer's
 * billing (invoices, card, cancel). The `customer_id` is now derived
 * SERVER-SIDE from the authenticated owner's own `BillingSubscription`; any
 * client-supplied value is ignored. Access mirrors `/api/billing/summary`
 * (workspace-scoped via `resolveOwnerUserId`).
 */

import { CustomerPortal } from '@dodopayments/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canManageBilling, resolveOwnerUserId } from '@/lib/panel-access';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dodo SDK `environment` literal union ('test_mode' | 'live_mode'). Env var
// is `string | undefined`; coerce defensively — non-'live_mode' (incl.
// undefined) → safe 'test_mode' fallback (CLAUDE.md §44.2 / §44.10).
const dodoEnvironment: 'test_mode' | 'live_mode' =
  process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode';

const sdkPortal = CustomerPortal({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: dodoEnvironment,
});

export async function GET(req: NextRequest): Promise<Response> {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // §38.238 — `resolveOwnerUserId` alone is NOT an authorization check: it
  // resolves the workspace owner for any active team member, viewer included.
  // The portal it hands back can cancel the subscription and change the card,
  // so it needs ownership-level authority, not workspace membership.
  if (!canManageBilling(actor)) {
    return NextResponse.json(
      { error: 'forbidden', hint: 'billing is owner-only' },
      { status: 403 },
    );
  }

  const ownerUserId = await resolveOwnerUserId(actor);
  if (!ownerUserId) {
    return NextResponse.json(
      { error: 'forbidden', hint: 'billing is workspace-scoped' },
      { status: 403 },
    );
  }

  const subscription = await prisma.billingSubscription.findUnique({
    where: { userId: ownerUserId },
    select: { providerCustomerId: true },
  });
  const customerId = subscription?.providerCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: 'no_customer' }, { status: 404 });
  }

  // Build the request the SDK sees: customer_id forced to the owner's own id,
  // `send_email` passthrough preserved. Any client `customer_id` is dropped.
  const sdkUrl = new URL(req.url);
  const sendEmail = sdkUrl.searchParams.get('send_email') === 'true';
  sdkUrl.search = '';
  sdkUrl.searchParams.set('customer_id', customerId);
  if (sendEmail) sdkUrl.searchParams.set('send_email', 'true');

  return sdkPortal(new NextRequest(sdkUrl));
}
