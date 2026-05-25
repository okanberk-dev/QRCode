/**
 * Dodo Payments customer portal route handler (CLAUDE.md §44, Stage 140).
 *
 * GET /customer-portal?customer_id=<dodo_customer_id>[&send_email=true]
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
 * Required query param: `customer_id` — comes from
 * `BillingSubscription.providerRef` (set by webhook handler on
 * `subscription.active` event).
 *
 * Optional: `send_email=true` — Dodo emails the portal link to the
 * customer instead of redirecting (useful for "send me the link" flows).
 */

import { CustomerPortal } from '@dodopayments/nextjs';

export const GET = CustomerPortal({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT,
});
