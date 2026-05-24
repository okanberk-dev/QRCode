/**
 * Lemon Squeezy REST API client (CLAUDE.md §44).
 *
 * `openai.ts` §15 paralel paterni: fetch wrapper, no SDK dep. Foundation
 * PR'da sadece skeleton — gerçek checkout/portal endpoint'leri sonraki
 * PR'da bu helper'ı tüketecek (`/v1/checkouts`, `/v1/subscriptions/[id]`,
 * `/v1/customers/[id]`).
 *
 * **Yapma**: bu helper'ı request handler içinde sync olarak çağırma —
 * Vercel serverless 10s gateway timeout var. AbortSignal ile timeout
 * (varsayılan 8s) zorunlu.
 *
 * **Yapma**: API key'i log'lama — `console.error` çıktısı Sentry `extra`
 * ile auto-capture (CLAUDE.md §40.4.PII). Error response body Lemon
 * Squeezy'den gelir, customer email içerebilir → redact before log.
 */

import * as Sentry from '@sentry/nextjs';
import { getLemonSqueezyConfig } from './config';
import type { LemonSqueezyApiError, LemonSqueezyApiResponse } from './types';

const API_BASE = 'https://api.lemonsqueezy.com/v1';
const DEFAULT_TIMEOUT_MS = 8_000;

export interface LemonSqueezyFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  timeoutMs?: number;
}

export type LemonSqueezyFetchResult<T> =
  | { ok: true; data: T; status: number }
  | {
      ok: false;
      status: number;
      reason: 'not_configured' | 'http_error' | 'network_error' | 'invalid_response';
      errors?: LemonSqueezyApiError['errors'];
      message?: string;
    };

/**
 * Authenticated fetch wrapper. Returns `not_configured` if Lemon Squeezy
 * env vars missing — caller decides whether to 503 or graceful no-op.
 */
export async function lsFetch<T = unknown>(
  path: string,
  opts: LemonSqueezyFetchOptions = {},
): Promise<LemonSqueezyFetchResult<LemonSqueezyApiResponse<T>>> {
  const config = getLemonSqueezyConfig();
  if (!config.enabled) {
    return {
      ok: false,
      status: 503,
      reason: 'not_configured',
      message: config.disabledReason ?? 'lemon_squeezy_disabled',
    };
  }

  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let parsed: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          ok: false,
          status: response.status,
          reason: 'invalid_response',
          message: `Non-JSON body (${text.slice(0, 120)})`,
        };
      }
    }

    if (!response.ok) {
      const errors = (parsed as LemonSqueezyApiError | null)?.errors;
      // Log structured — no PII (Lemon Squeezy errors don't include
      // customer email by default, but extra-safety we redact details).
      Sentry.captureMessage('Lemon Squeezy API error', {
        level: response.status >= 500 ? 'error' : 'warning',
        tags: {
          integration: 'lemon-squeezy',
          status: String(response.status),
          path: path.split('?')[0]!.slice(0, 60),
        },
        extra: {
          method,
          errorCount: errors?.length ?? 0,
          firstErrorTitle: errors?.[0]?.title?.slice(0, 80),
        },
      });
      return {
        ok: false,
        status: response.status,
        reason: 'http_error',
        errors,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsed as LemonSqueezyApiResponse<T>,
    };
  } catch (err) {
    const aborted =
      err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === '20');
    Sentry.captureMessage('Lemon Squeezy network error', {
      level: 'warning',
      tags: {
        integration: 'lemon-squeezy',
        kind: aborted ? 'timeout' : 'network',
      },
      extra: {
        path: path.split('?')[0]!.slice(0, 60),
        timeoutMs,
      },
    });
    return {
      ok: false,
      status: aborted ? 408 : 0,
      reason: 'network_error',
      message: aborted ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Typed SDK helpers (Wave 2, §44.9 — CLAUDE.md §38.218)
//
// Spec audit cross-checked against:
//   • docs.lemonsqueezy.com/api (REST reference)
//   • github.com/lmsqueezy/lemonsqueezy.js (official SDK source)
//
// JSON:API envelope:
//   POST /v1/checkouts → { data: { type, attributes, relationships } }
//   PATCH /v1/subscriptions/{id} → { data: { type, id, attributes } }
//   DELETE /v1/subscriptions/{id} → no body
//   GET /v1/subscriptions/{id} → returns subscription envelope; attributes.urls
//     carries signed customer_portal + update_payment_method URLs (24h TTL).
//
// All amounts in MINOR unit (cents/kuruş) — convert at boundaries.
// ─────────────────────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  variantId: string | number;
  /** Buaze custom data — webhook'ta `meta.custom_data` olarak gelir. */
  customData: {
    user_id: string;
    plan_id?: string;
    billing_cycle?: 'monthly' | 'yearly';
    currency?: 'USD' | 'TRY';
    [key: string]: unknown;
  };
  /** Pre-fill checkout form. Owner zaten kayıtlı, email/name biliriyor. */
  email?: string;
  name?: string;
  /** Successful checkout sonrası nereye dön. */
  redirectUrl?: string;
  /**
   * Force test mode regardless of config — used by smoke tests. Production
   * caller'lar bunu set ETMEZ; lib `LEMON_SQUEEZY_MODE='test'` env ile
   * test_mode body field'ını otomatik ayarlar.
   */
  forceTestMode?: boolean;
}

interface LsCheckoutAttributes {
  url: string;
  expires_at: string | null;
  test_mode: boolean;
  [key: string]: unknown;
}

/**
 * Create a Lemon Squeezy checkout session.
 *
 * Returns the signed checkout URL (`data.attributes.url`) that the owner
 * is redirected to. SDK reference: `src/checkouts/index.ts:createCheckout`.
 */
export async function createCheckout(
  params: CreateCheckoutParams,
): Promise<LemonSqueezyFetchResult<LemonSqueezyApiResponse<{
  id: string;
  type: 'checkouts';
  attributes: LsCheckoutAttributes;
}>>> {
  const config = getLemonSqueezyConfig();
  if (!config.enabled) {
    return {
      ok: false,
      status: 503,
      reason: 'not_configured',
      message: config.disabledReason ?? 'lemon_squeezy_disabled',
    };
  }

  const testMode = params.forceTestMode ?? config.mode === 'test';

  return lsFetch<{
    id: string;
    type: 'checkouts';
    attributes: LsCheckoutAttributes;
  }>('/v1/checkouts', {
    method: 'POST',
    body: {
      data: {
        type: 'checkouts',
        attributes: {
          test_mode: testMode,
          checkout_data: {
            email: params.email,
            name: params.name,
            custom: params.customData,
          },
          product_options: params.redirectUrl
            ? { redirect_url: params.redirectUrl }
            : undefined,
        },
        relationships: {
          store: {
            data: { type: 'stores', id: String(config.storeId) },
          },
          variant: {
            data: { type: 'variants', id: String(params.variantId) },
          },
        },
      },
    },
  });
}

interface LsSubscriptionAttributes {
  status: string;
  cancelled: boolean;
  renews_at: string | null;
  ends_at: string | null;
  /**
   * Signed customer-facing URLs (24h TTL). `customer_portal` is the one
   * owner is sent to for "Manage subscription". Fresh fetch every click.
   */
  urls?: {
    update_payment_method?: string;
    customer_portal?: string;
    customer_portal_update_subscription?: string;
  };
  [key: string]: unknown;
}

/**
 * Retrieve a Lemon Squeezy subscription. Used by `/api/billing/portal`
 * to fetch the short-lived `urls.customer_portal` signed URL.
 */
export async function getSubscription(
  subscriptionId: string | number,
): Promise<LemonSqueezyFetchResult<LemonSqueezyApiResponse<{
  id: string;
  type: 'subscriptions';
  attributes: LsSubscriptionAttributes;
}>>> {
  return lsFetch(`/v1/subscriptions/${encodeURIComponent(String(subscriptionId))}`);
}

/**
 * Soft-cancel a subscription. Lemon Squeezy semantic: owner retains access
 * until `ends_at` (current period end). DB row update (cancelAtPeriodEnd:
 * true) is handled by webhook handler (`subscription_cancelled` event).
 */
export async function cancelSubscription(
  subscriptionId: string | number,
): Promise<LemonSqueezyFetchResult<LemonSqueezyApiResponse<{
  id: string;
  type: 'subscriptions';
  attributes: LsSubscriptionAttributes;
}>>> {
  return lsFetch(`/v1/subscriptions/${encodeURIComponent(String(subscriptionId))}`, {
    method: 'DELETE',
  });
}

/**
 * Reactivate a cancelled subscription that's still in grace period
 * (i.e. `cancelled: true` but `ends_at` not yet reached). Lemon Squeezy:
 * PATCH with `cancelled: false`.
 */
export async function reactivateSubscription(
  subscriptionId: string | number,
): Promise<LemonSqueezyFetchResult<LemonSqueezyApiResponse<{
  id: string;
  type: 'subscriptions';
  attributes: LsSubscriptionAttributes;
}>>> {
  return lsFetch(`/v1/subscriptions/${encodeURIComponent(String(subscriptionId))}`, {
    method: 'PATCH',
    body: {
      data: {
        type: 'subscriptions',
        id: String(subscriptionId),
        attributes: { cancelled: false },
      },
    },
  });
}
