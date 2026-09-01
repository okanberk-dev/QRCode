/**
 * Dodo Payments checkout route handler (CLAUDE.md §44, Stage 142 §38.222,
 * Stage 149 §38.229 redirect wrapper, audit §38.B C1 auth-gate).
 *
 * GET  /api/checkout?productId=<dodo_product_id>            — static checkout URL
 * POST /api/checkout  body: { product_cart|product_id, ... } — session checkout
 *
 * SDK reference: https://docs.dodopayments.com/developer-resources/nextjs-adaptor
 *
 * **Stage 149 §38.229 redirect wrapper** — Dodo SDK GET/POST handler'lar JSON
 * `{ checkout_url: '...' }` döndürüyor, browser tarafında otomatik redirect
 * YAPMIYOR. Custom wrapper SDK'yı internal çağırır, JSON'dan `checkout_url`'i
 * çıkarır, `NextResponse.redirect(url, 302)` ile Dodo hosted page'e yönlendirir.
 *
 * **Audit C1 — entitlement spoofing fix.** Dodo webhook (`/api/webhook/
 * dodo-payments`) ödemeyi `metadata.user_id`'ye göre bir Buaze hesabına bağlar
 * (resolveUserId Strategy 1). Eskiden bu route auth'suzdu ve `metadata.user_id`
 * client'tan geliyordu → saldırgan kendi kartıyla ödeyip aboneliği istediği
 * hesaba bağlayabiliyordu. Artık:
 *   • `user_id` HER ZAMAN server tarafında authenticated actor'dan türetilir
 *     (resolveOwnerUserId → workspace owner). Client'ın gönderdiği değer
 *     (GET `metadata_user_id` query / POST `metadata.user_id`) silinir.
 *   • POST (programmatic session checkout) auth ZORUNLU — owner-initiated
 *     dashboard "Yükselt" akışı. Anonim POST 401.
 *   • GET (static checkout link) marketing /pricing'den logged-out ziyaretçi de
 *     kullanır → auth opsiyonel; actor varsa `metadata_user_id` enjekte edilir,
 *     yoksa webhook customer email lookup'a (Strategy 2) düşer.
 */

import { Checkout } from '@dodopayments/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canManageBilling, resolveOwnerUserId } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

  return NextResponse.redirect(url, 302);
}

/**
 * Resolve the authenticated workspace-owner id from the request, or null when
 * unauthenticated. Used to server-inject `user_id` into checkout metadata so
 * the webhook can never be told which account to credit by an anonymous caller.
 */
async function resolveCheckoutUserId(req: NextRequest): Promise<string | null> {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return null;
  // §38.238 — `resolveOwnerUserId` maps ANY active team member (viewer
  // included) onto the workspace owner. Injecting that id would let a
  // non-owner start a subscription billed to, and credited to, the owner's
  // account. Only ownership-level actors may bind a purchase to a workspace;
  // everyone else is treated like a logged-out visitor (no user_id → the
  // webhook falls back to matching on the checkout e-mail).
  if (!canManageBilling(actor)) return null;
  return (await resolveOwnerUserId(actor)) ?? actor.id;
}

// GET — Static checkout link. Marketing /pricing cards + owner panel modal link
// here with `?productId=<dodo_product_id>`. Any client-supplied
// `metadata_user_id` is stripped; the server injects the authenticated owner's
// id (if logged in). Logged-out visitors → no user_id → webhook email lookup.
export async function GET(req: NextRequest): Promise<Response> {
  const userId = await resolveCheckoutUserId(req);

  const url = new URL(req.url);
  // Strip any caller-supplied identity claim — never trust the client here.
  url.searchParams.delete('metadata_user_id');
  if (userId) {
    url.searchParams.set('metadata_user_id', userId);
  }

  const sdkResponse = await sdkStaticCheckout(new NextRequest(url));
  return redirectFromSdkResponse(sdkResponse, 'static');
}

// POST — Session checkout. Owner-initiated programmatic checkout from the
// dashboard ("Upgrade" button). AUTH REQUIRED. `metadata.user_id` is forced to
// the authenticated owner — any client-supplied value is overwritten.
export async function POST(req: NextRequest): Promise<Response> {
  // §38.238 — resolveCheckoutUserId now returns null for a workspace member
  // without billing authority, so this 401 also covers "logged in, but a
  // viewer/staff team member". The dashboard upgrade button is owner-only.
  const userId = await resolveCheckoutUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const clientMeta =
    body && typeof body.metadata === 'object' && body.metadata !== null
      ? (body.metadata as Record<string, unknown>)
      : {};
  // Force the identity claim to the authenticated owner (overwrite client).
  body.metadata = { ...clientMeta, user_id: userId };

  const forwarded = new NextRequest(req.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const sdkResponse = await sdkSessionCheckout(forwarded);
  return redirectFromSdkResponse(sdkResponse, 'session');
}
