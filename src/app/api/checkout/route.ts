/**
 * Dodo Payments checkout route handler (CLAUDE.md §44, Stage 142 §38.222).
 *
 * GET  /api/checkout?productId=<dodo_product_id>            — static checkout URL
 * POST /api/checkout  body: { productId, quantity?, custom_data? } — session checkout
 *
 * SDK reference: https://docs.dodopayments.com/developer-resources/nextjs-adaptor
 *
 * Stage 140 paterninden taşıma (Stage 141 stub geri alındı, route /api/
 * altına alındı — kök neden tahminen `app/<top-level>/route.ts` adapter
 * finalize çakışması, CLAUDE.md §44.0 Stage 142 closure log).
 *
 * Notes:
 *   • Lokal dev'de SDK çağrısı `DODO_PAYMENTS_*` env'ler eksikse runtime'da
 *     fail eder. Operatör Vercel project env'lerine 4 env'i set ettikten
 *     sonra production'da çalışır.
 *   • Buaze custom_data convention: `{ user_id: string, plan_id?: string }`.
 *     Webhook handler bu field'larla `BillingSubscription.userId`'yi resolve
 *     eder (CLAUDE.md §44 user resolution paterni).
 *   • Production'da bu route'a giden trafiğe owner JWT cookie gerekiyor mu?
 *     Şu an SDK doğrudan checkout URL üretir — owner-scope filtreleme
 *     marketing /pricing kartından gelen `productId` ile yapılır (admin
 *     /admin/plans'tan seçtiği `dodoProductId` slot'una bağlı).
 */

import { Checkout } from '@dodopayments/nextjs';

// GET — Static checkout link. Marketing /pricing cards link to this route
// with `?productId=<dodo_product_id>` query; SDK redirects to Dodo's hosted
// checkout page (one URL per product, suitable for embedded "Buy" buttons).
export const GET = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT,
  type: 'static',
});

// POST — Session checkout. Owner-initiated programmatic checkout from the
// dashboard ("Upgrade" button). Body carries `productId` + optional
// `quantity` and `custom_data` (user_id, plan_id) — the SDK forwards them
// to Dodo and produces a one-shot signed checkout URL.
export const POST = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT,
  type: 'session',
});
