/**
 * Dodo Payments checkout route handler (CLAUDE.md §44, Stage 142 §38.222,
 * Stage 149 §38.229 redirect wrapper).
 *
 * GET  /api/checkout?productId=<dodo_product_id>            — static checkout URL
 * POST /api/checkout  body: { productId, quantity?, custom_data? } — session checkout
 *
 * SDK reference: https://docs.dodopayments.com/developer-resources/nextjs-adaptor
 *
 * **Stage 149 §38.229 redirect wrapper** — Dodo SDK GET/POST handler'lar JSON
 * `{ checkout_url: '...' }` döndürüyor, browser tarafında otomatik redirect
 * YAPMIYOR. Owner/marketing tıkladığında JSON görüyor → UX broken (user verbatim
 * raporu: "fiyatlandırma da al diyince böyle diyor" + JSON paylaştı). Custom
 * wrapper SDK'yı internal çağırır, JSON'dan `checkout_url`'i çıkarır,
 * `NextResponse.redirect(url, 302)` ile Dodo hosted page'e yönlendirir.
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
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Dodo SDK `environment` literal union ('test_mode' | 'live_mode'). Env var
// is `string | undefined`; coerce defensively — any non-'live_mode' value
// (including undefined) falls back to the safe 'test_mode' (CLAUDE.md §44.2:
// default test_mode; §44.10: avoid silent live charges from a misconfig).
const dodoEnvironment: 'test_mode' | 'live_mode' =
  process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode';

// SDK handler instances (module-level — Vercel serverless cold start'ta tek
// kere init olur). Internal call edilir; response JSON parse + 302 redirect.
const sdkStaticCheckout = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: dodoEnvironment,
  type: 'static',
});

const sdkSessionCheckout = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: dodoEnvironment,
  type: 'session',
});

/**
 * Wrap SDK handler: call internal, parse JSON `{checkout_url}`, return 302
 * redirect. SDK 4xx/5xx olarak fail ederse response'u olduğu gibi pass-through
 * yap (error body kullanıcıya görünür, debug için). PII-safe: log'larda raw
 * payload + secret değer yok; sadece status + reason.
 */
async function redirectFromSdkResponse(
  sdkResponse: Response,
  kind: 'static' | 'session',
): Promise<Response> {
  // SDK error response (401 invalid key, 4xx invalid body, 5xx Dodo outage) —
  // body'i intact bırak, kullanıcı/developer reason'ı görsün. UI tarafında
  // <a> tag click → error sayfası açılır (raw JSON), Sentry trail var.
  if (!sdkResponse.ok) {
    Sentry.captureMessage('Dodo checkout SDK non-2xx', {
      level: 'warning',
      tags: { integration: 'dodo-payments', kind, status: String(sdkResponse.status) },
    });
    return sdkResponse;
  }

  let data: { checkout_url?: unknown } | null = null;
  try {
    data = await sdkResponse.json();
  } catch {
    data = null;
  }

  const url = typeof data?.checkout_url === 'string' ? data.checkout_url : null;
  if (!url) {
    Sentry.captureMessage('Dodo checkout response missing checkout_url', {
      level: 'error',
      tags: { integration: 'dodo-payments', kind },
    });
    return NextResponse.json(
      { error: 'checkout_url_unavailable' },
      { status: 502 },
    );
  }

  // 302 — kasıtlı (303 See Other POST→GET semantic önemli olabilir ama Dodo
  // hosted page GET kabul ediyor, browser-spec uyumlu 302 yeterli).
  return NextResponse.redirect(url, 302);
}

// GET — Static checkout link. Marketing /pricing cards link to this route
// with `?productId=<dodo_product_id>` query; SDK Dodo hosted page'i çıkarır,
// wrapper 302 redirect ile gönderir.
export async function GET(req: NextRequest): Promise<Response> {
  const sdkResponse = await sdkStaticCheckout(req);
  return redirectFromSdkResponse(sdkResponse, 'static');
}

// POST — Session checkout. Owner-initiated programmatic checkout from the
// dashboard ("Upgrade" button). Body carries `productId` + optional
// `quantity` and `custom_data` (user_id, plan_id) — SDK Dodo signed checkout
// URL üretir, wrapper 302 redirect ile gönderir.
export async function POST(req: NextRequest): Promise<Response> {
  const sdkResponse = await sdkSessionCheckout(req);
  return redirectFromSdkResponse(sdkResponse, 'session');
}
