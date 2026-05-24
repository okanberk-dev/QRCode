/**
 * Lemon Squeezy webhook + API response types (CLAUDE.md §44).
 *
 * Hand-written, no SDK dependency. CLAUDE.md §30 (`@lemonsqueezy/lemonsqueezy.js`
 * 30KB gzip ek dep — `openai.ts` §15 paterni paralel olarak direkt fetch +
 * elle types tercih edildi).
 *
 * Payload shape Lemon Squeezy resmi webhook docs'a göre — alanlar zaman
 * içinde genişleyebilir, bu yüzden interface'ler `[key: string]: unknown`
 * index signature taşır (unknown alanlar uyarısız geçer). Zorunlu alanlar
 * explicit; opsiyonel olanlar `?` ile işaretli.
 *
 * **Yapma**: Bu types'ı runtime validation gibi kullanma — sadece TS
 * type-checker yardımı. Webhook payload'ı `parseLemonSqueezyPayload`
 * (`webhook.ts`) içinde Zod ile validate edilir (defansif paterni
 * §28 ile paralel).
 */

// ── Webhook event names (LS resmi event list, 11 event) ──
export type LemonSqueezyEventName =
  // Subscription lifecycle (8)
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused'
  | 'subscription_payment_success'
  | 'subscription_payment_failed'
  | 'subscription_payment_recovered'
  | 'subscription_payment_refunded'
  // One-time order (2)
  | 'order_created'
  | 'order_refunded'
  // License key (2 — gelecek scope, foundation'da skeleton)
  | 'license_key_created'
  | 'license_key_updated';

export type LemonSqueezyResourceType =
  | 'subscriptions'
  | 'orders'
  | 'subscription-invoices'
  | 'license-keys';

// ── Subscription attributes (data.type='subscriptions') ──
export interface LemonSqueezySubscriptionAttributes {
  store_id: number;
  customer_id: number;
  order_id: number;
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  user_name: string;
  user_email: string;
  /** 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' */
  status: string;
  status_formatted: string;
  card_brand: string | null;
  card_last_four: string | null;
  pause: unknown;
  cancelled: boolean;
  trial_ends_at: string | null;
  billing_anchor: number;
  /** ISO timestamp — next renewal / period end. */
  renews_at: string;
  /** ISO timestamp — null while active, set when cancelled/expired. */
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  urls?: {
    update_payment_method?: string;
    customer_portal?: string;
  };
  [key: string]: unknown;
}

// ── Order attributes (data.type='orders') ──
export interface LemonSqueezyOrderAttributes {
  store_id: number;
  customer_id: number;
  identifier: string;
  order_number: number;
  user_name: string;
  user_email: string;
  currency: string;
  currency_rate: string;
  /** Amount in MINOR currency unit (cents for USD, kuruş for TRY). */
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  /** Same fields in USD for cross-currency reporting. */
  subtotal_usd: number;
  discount_total_usd: number;
  tax_usd: number;
  total_usd: number;
  tax_name: string | null;
  tax_rate: string;
  /** 'pending' | 'paid' | 'refunded' | 'partial_refund' | 'fraudulent' */
  status: string;
  status_formatted: string;
  refunded: boolean;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  urls?: {
    receipt?: string;
  };
  [key: string]: unknown;
}

// ── Subscription invoice attributes (data.type='subscription-invoices') ──
export interface LemonSqueezyInvoiceAttributes {
  store_id: number;
  subscription_id: number;
  customer_id: number;
  user_name: string;
  user_email: string;
  billing_reason: string;
  card_brand: string | null;
  card_last_four: string | null;
  currency: string;
  currency_rate: string;
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  subtotal_usd: number;
  discount_total_usd: number;
  tax_usd: number;
  total_usd: number;
  /** 'pending' | 'paid' | 'void' | 'refunded' */
  status: string;
  status_formatted: string;
  refunded: boolean;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  urls?: {
    invoice_url?: string;
  };
  [key: string]: unknown;
}

// ── Generic data envelope ──
export interface LemonSqueezyDataEnvelope<TAttrs> {
  type: LemonSqueezyResourceType;
  id: string;
  attributes: TAttrs;
  relationships?: Record<string, unknown>;
  links?: Record<string, string>;
}

// ── Full webhook payload ──
export interface LemonSqueezyWebhookMeta {
  event_name: LemonSqueezyEventName;
  /**
   * Custom data passed during checkout creation. Buaze convention:
   *   { user_id: string, restaurant_id?: string, plan_id?: string }
   * Webhook handler `meta.custom_data.user_id` ile BillingSubscription
   * row'unu User'a bağlar. Yoksa email lookup'a düşer.
   */
  custom_data?: {
    user_id?: string;
    restaurant_id?: string;
    plan_id?: string;
    [key: string]: unknown;
  };
  test_mode?: boolean;
  [key: string]: unknown;
}

export interface LemonSqueezyWebhookPayload {
  meta: LemonSqueezyWebhookMeta;
  data:
    | LemonSqueezyDataEnvelope<LemonSqueezySubscriptionAttributes>
    | LemonSqueezyDataEnvelope<LemonSqueezyOrderAttributes>
    | LemonSqueezyDataEnvelope<LemonSqueezyInvoiceAttributes>
    | LemonSqueezyDataEnvelope<Record<string, unknown>>;
}

// ── API response envelope (REST API for /v1/* endpoints) ──
export interface LemonSqueezyApiResponse<T> {
  data: T;
  jsonapi?: { version: string };
  links?: Record<string, string>;
}

export interface LemonSqueezyApiError {
  errors: Array<{
    status: string;
    title: string;
    detail?: string;
    code?: string;
  }>;
}
