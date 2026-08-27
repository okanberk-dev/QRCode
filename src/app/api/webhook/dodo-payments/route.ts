/**
 * Dodo Payments webhook handler (CLAUDE.md §44, Stage 142 §38.222).
 *
 * Stage 140 paterninden tam restore (Stage 141 stub geri alındı —
 * route /api/ altında zaten doğru yerde, bu sadece SDK kodunu canlıya
 * alır; checkout + customer-portal yeni path altına taşındı).
 *
 * SDK paterni (https://docs.dodopayments.com/developer-resources/nextjs-adaptor):
 *   • `Webhooks({ webhookKey, onPayload, on<EventName> })`
 *   • SDK signature verify'i kendi yapar (HMAC, `webhookKey` ile)
 *   • `onPayload` catch-all callback (her event için fire)
 *   • Spesifik `on<EventName>` callback'leri (örn. `onPaymentSucceeded`)
 *
 * Event taxonomy → Buaze schema mapping:
 *   payment.succeeded         → BillingInvoice upsert (paid)
 *   payment.failed            → BillingInvoice (failed) + Sentry warn
 *   payment.refunded          → BillingInvoice (refunded)
 *   subscription.active       → BillingSubscription upsert (active)
 *   subscription.renewed      → BillingSubscription status='active' + renewsAt
 *   subscription.on_hold      → BillingSubscription status='past_due'
 *   subscription.cancelled    → cancelAtPeriodEnd: true (grace period)
 *   subscription.expired      → status: 'canceled' (terminal)
 *
 * User resolution (CLAUDE.md §44 paterni):
 *   1. Custom data → `payload.data.metadata.user_id` (preferred — checkout
 *      endpoint POST'ta SDK custom_data ile pass eder)
 *   2. Customer email lookup → `payload.data.customer.email` → prisma.user.findUnique
 *   3. None matched → Sentry warn + skip (admin manuel replay)
 *
 * Tier resolution: `payload.data.product_id` →
 * `SubscriptionPlan.findFirst({ where: { dodoProductId } })` → resolve.
 *
 * GET probe: ops health check (config status, no secrets — KVKK §40.4.PII).
 *
 * **Yapma**: webhook handler içinde Promise.all paralel Prisma çağrısı —
 * Supabase pooler connection_limit=1 (CLAUDE.md §40.1). Sequential await OK.
 *
 * **Yapma**: cancelled durumunda DB row silmek — Dodo cancel = scheduled,
 * owner dönem sonuna kadar erişim hakkı taşır. cancelAtPeriodEnd: true
 * flag + status: 'active' kalır; gerçek expire `subscription.expired`
 * event'iyle olur (provider internal job tetikler).
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Webhooks } from '@dodopayments/nextjs';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Per-request handler outcome.
 *
 * The SDK's `on<Event>` callbacks swallow their own errors (each one wraps the
 * work in try/catch → Sentry), so the SDK always returns 200 — even when the
 * state change never landed. Combined with the idempotency table below that
 * made a transient DB failure FINAL: the key was recorded, Dodo never retried,
 * and a paid subscription could stay unactivated forever.
 *
 * AsyncLocalStorage gives each in-flight request its own flag (a module-level
 * boolean would race across concurrent deliveries). A failed handler now skips
 * the idempotency write and answers non-2xx so Dodo redelivers; every handler
 * is an upsert, so replay is safe.
 */
const handlerOutcomeStore = new AsyncLocalStorage<{ failed: boolean }>();

function markHandlerFailed(): void {
  const ctx = handlerOutcomeStore.getStore();
  if (ctx) ctx.failed = true;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─────────────────────────────────────────────────────────────────────
// Resolver helpers
// ─────────────────────────────────────────────────────────────────────

interface DodoPayloadShape {
  type?: string;
  data?: {
    payment_id?: string;
    subscription_id?: string;
    product_id?: string;
    customer?: { email?: string; customer_id?: string; name?: string };
    metadata?: Record<string, unknown>;
    total_amount?: number; // minor currency units (cents)
    currency?: string;
    status?: string;
    next_billing_date?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

async function resolveUserId(payload: DodoPayloadShape): Promise<string | null> {
  // Strategy 1: metadata.user_id (set by checkout POST custom_data)
  const metaUserId = payload.data?.metadata?.user_id;
  if (typeof metaUserId === 'string' && metaUserId.length > 0) {
    const user = await prisma.user.findUnique({
      where: { id: metaUserId },
      select: { id: true },
    });
    if (user) return user.id;
  }

  // Strategy 2: customer email lookup
  const email = payload.data?.customer?.email?.trim().toLowerCase();
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) return user.id;
  }

  return null;
}

async function resolveTierFromProduct(productId: string | undefined): Promise<string | null> {
  if (!productId) return null;
  // Match by product id only. `isActive` governs the public /pricing listing,
  // NOT a paying customer's tier identity — filtering on it would make a
  // renewal of a since-deactivated plan resolve to null and drop the tier
  // link, leaving the subscriber amount-less (audit §38.B M7).
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { dodoProductId: productId },
    select: { id: true },
  });
  return plan?.id ?? null;
}

// Dodo amounts are in MINOR units (cents/kuruş). BillingInvoice.amount is
// Decimal(10,2) in MAJOR — divide by 100.
function minorToMajor(minor: number | undefined): Prisma.Decimal {
  // §44.10 — never trust webhook amounts. Reject non-finite AND negative so a
  // corrupted/forged payload can't write a negative invoice (billing integrity).
  if (typeof minor !== 'number' || !Number.isFinite(minor) || minor < 0) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(minor).div(100);
}

function safeDate(input: string | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

// Dodo subscription status → Buaze status mapping.
//   active / trialing → 'active'
//   on_hold           → 'past_due'
//   cancelled         → 'active' (grace period; cancelAtPeriodEnd handles UI)
//   expired           → 'canceled'
function mapStatus(dodoStatus: string | undefined): string {
  switch (dodoStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    // `paused` is a provider-side hold (typically dunning / non-payment).
    // Bucket with past_due so a paused subscriber is NOT served paid-tier
    // access (audit §38.B M6 — previously mapped to 'active').
    case 'paused':
    case 'on_hold':
    case 'past_due':
      return 'past_due';
    case 'cancelled':
    case 'canceled':
      return 'active'; // grace until period end
    case 'expired':
      return 'canceled';
    default:
      return 'active';
  }
}

// ─────────────────────────────────────────────────────────────────────
// Event handlers — invoke from Webhooks SDK callbacks
// ─────────────────────────────────────────────────────────────────────

async function handlePaymentSucceeded(payload: DodoPayloadShape): Promise<void> {
  const paymentId = payload.data?.payment_id ?? payload.data?.subscription_id;
  if (!paymentId) return;
  const userId = await resolveUserId(payload);
  if (!userId) {
    Sentry.captureMessage('Dodo payment.succeeded — user not resolved', {
      level: 'warning',
      tags: { integration: 'dodo-payments', event_name: payload.type ?? 'payment.succeeded' },
      extra: { paymentId },
    });
    return;
  }

  await prisma.billingInvoice.upsert({
    where: { providerRef: paymentId },
    create: {
      userId,
      providerRef: paymentId,
      amount: minorToMajor(payload.data?.total_amount),
      currency: payload.data?.currency ?? 'USD',
      status: 'paid',
      source: 'dodo_payments',
      description: payload.data?.subscription_id ? 'Subscription renewal' : 'One-time payment',
      issuedAt: safeDate(payload.data?.created_at) ?? new Date(),
    },
    update: {
      status: 'paid',
      amount: minorToMajor(payload.data?.total_amount),
      currency: payload.data?.currency ?? 'USD',
    },
  });

  // Clear past_due if parent subscription exists. Scope by userId too
  // (defense-in-depth, §37.2.B) — providerRef is @unique so this targets the
  // one row, but the userId guard ensures a mis-resolved event can never flip
  // another user's subscription status (no-ops instead).
  const subscriptionId = payload.data?.subscription_id;
  if (subscriptionId) {
    await prisma.billingSubscription.updateMany({
      where: { providerRef: subscriptionId, userId },
      data: { status: 'active' },
    });
  }
}

async function handlePaymentFailed(payload: DodoPayloadShape): Promise<void> {
  const paymentId = payload.data?.payment_id ?? payload.data?.subscription_id;
  if (!paymentId) return;
  const userId = await resolveUserId(payload);
  const subscriptionId = payload.data?.subscription_id;

  // No resolved user → do NOT write an unscoped invoice or flip a subscription
  // past_due (would dangle on an unknown user). Surface for manual replay.
  if (!userId) {
    Sentry.captureMessage('Dodo payment.failed — user not resolved', {
      level: 'warning',
      tags: { integration: 'dodo-payments', event_name: 'payment.failed' },
      extra: { paymentId, subscriptionId },
    });
    return;
  }

  await prisma.billingInvoice.upsert({
    where: { providerRef: paymentId },
    create: {
      userId,
      providerRef: paymentId,
      amount: minorToMajor(payload.data?.total_amount),
      currency: payload.data?.currency ?? 'USD',
      status: 'failed',
      source: 'dodo_payments',
      description: 'Subscription payment failed',
      issuedAt: safeDate(payload.data?.created_at) ?? new Date(),
    },
    update: { status: 'failed' },
  });

  if (subscriptionId) {
    await prisma.billingSubscription.updateMany({
      where: { providerRef: subscriptionId, userId },
      data: { status: 'past_due' },
    });
  }

  Sentry.captureMessage('Dodo subscription payment failed', {
    level: 'warning',
    tags: { integration: 'dodo-payments', event_name: 'payment.failed' },
    extra: { userId, paymentId, subscriptionId },
  });
}

async function handlePaymentRefunded(payload: DodoPayloadShape): Promise<void> {
  const paymentId = payload.data?.payment_id;
  if (!paymentId) return;
  // Scope to Dodo-sourced invoices so a webhook can never flip a manually
  // managed (enterprise/admin) invoice (audit §38.B H2/H3).
  await prisma.billingInvoice.updateMany({
    where: { providerRef: paymentId, source: 'dodo_payments' },
    data: { status: 'refunded' },
  });
}

async function handleSubscriptionUpsert(payload: DodoPayloadShape): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  if (!subscriptionId) return;
  const userId = await resolveUserId(payload);
  if (!userId) {
    Sentry.captureMessage('Dodo subscription event — user not resolved', {
      level: 'warning',
      tags: { integration: 'dodo-payments', event_name: payload.type ?? 'subscription.*' },
      extra: { subscriptionId },
    });
    return;
  }

  const planId = await resolveTierFromProduct(payload.data?.product_id);
  const status = mapStatus(payload.data?.status);

  const customerId = payload.data?.customer?.customer_id ?? null;

  await prisma.billingSubscription.upsert({
    where: { userId },
    create: {
      userId,
      providerRef: subscriptionId,
      providerCustomerId: customerId,
      source: 'dodo_payments',
      status,
      cancelAtPeriodEnd: false,
      renewsAt: safeDate(payload.data?.next_billing_date),
      currency: payload.data?.currency ?? 'USD',
      // Legacy lifecycle/quota bucket (CLAUDE.md §15.2): drives PLAN_QUOTA
      // lookup until billingCycle lands (phase 2). 'dodo_payments' is NOT a
      // valid bucket — PLAN_QUOTA[plan] would miss and fall to trial (500),
      // under-serving a paying subscriber. 'monthly' grants paid-tier quota
      // (2000). Canonical tier identity stays on subscriptionPlanId.
      plan: 'monthly',
      subscriptionPlanId: planId,
    },
    update: {
      providerRef: subscriptionId,
      providerCustomerId: customerId,
      source: 'dodo_payments',
      status,
      plan: 'monthly',
      cancelAtPeriodEnd: false,
      renewsAt: safeDate(payload.data?.next_billing_date),
      // Was create-only, so a renewal in a different currency left the stored
      // value stale and the owner's billing card showed the wrong symbol.
      currency: payload.data?.currency ?? 'USD',
      ...(planId ? { subscriptionPlanId: planId } : {}),
    },
  });
}

async function handleSubscriptionCancelled(payload: DodoPayloadShape): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  if (!subscriptionId) return;
  // `source: 'dodo_payments'` scope — a webhook event must never mutate a
  // manually managed (enterprise/admin override) subscription that happens to
  // share a providerRef (audit §38.B H2/H3).
  await prisma.billingSubscription.updateMany({
    where: { providerRef: subscriptionId, source: 'dodo_payments' },
    data: {
      cancelAtPeriodEnd: true,
      status: 'active', // grace period — owner keeps access until renewsAt
      renewsAt: safeDate(payload.data?.next_billing_date),
    },
  });
}

async function handleSubscriptionExpired(payload: DodoPayloadShape): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  if (!subscriptionId) return;
  await prisma.billingSubscription.updateMany({
    where: { providerRef: subscriptionId, source: 'dodo_payments' },
    data: {
      status: 'canceled',
      cancelAtPeriodEnd: false,
      // Release the paid quota bucket. `/api/billing/summary` resolves the
      // quota from `subscription.plan` WITHOUT looking at `status`, so leaving
      // it on 'monthly' kept an expired subscriber on the paid limits
      // indefinitely. 'free' has no PLAN_QUOTA entry and falls back to the
      // trial allowance, which is the correct post-expiry entitlement.
      plan: 'free',
    },
  });
}

async function handleSubscriptionOnHold(payload: DodoPayloadShape): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  if (!subscriptionId) return;
  await prisma.billingSubscription.updateMany({
    where: { providerRef: subscriptionId, source: 'dodo_payments' },
    data: { status: 'past_due' },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Webhook handler — exported as POST per Dodo SDK Next.js convention
// ─────────────────────────────────────────────────────────────────────
//
// Stage 142 §38.222 sonrası signature verify fail teşhisi için 401 path'inde
// diagnostic instrumentation wrap'i (`withVerifyDiagnostics`) eklendi.
// Production-safe — raw secret YOK, sadece length + prefix snippet + header
// presence + body message (Standard Webhooks library error mesajları).
// Sentry warning + tags `integration: 'dodo-payments', kind: 'signature_verify_fail'`.

let cachedWebhookHandler: ReturnType<typeof Webhooks> | null = null;

/**
 * Lazy-init the Dodo SDK webhook handler (audit §38.B H4).
 *
 * `Webhooks({...})` constructs the Standard Webhooks verifier eagerly and
 * THROWS "Secret can't be empty." when `webhookKey` is falsy. At module level
 * that means a missing `DODO_PAYMENTS_WEBHOOK_SECRET` throws during import →
 * every POST returns a 500 and the 401 diagnostic wrapper is dead code (the
 * old comment claiming the SDK "returns 401" was wrong — the constructor
 * throws, it never reaches verify). Constructing lazily lets POST return a
 * clean 503 "not configured" instead of crashing the route module.
 */
function getWebhookHandler(): ReturnType<typeof Webhooks> | null {
  if (cachedWebhookHandler) return cachedWebhookHandler;
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) return null;
  cachedWebhookHandler = Webhooks({
    webhookKey: secret,
  // Catch-all — fires for every event. Use for audit / Sentry breadcrumb.
  // PII discipline (§40.4): redact customer email/name from console.
  onPayload: async (payload) => {
    const safe = payload as unknown as DodoPayloadShape;
    console.log('[dodo-payments webhook]', {
      type: safe.type,
      paymentId: safe.data?.payment_id ?? null,
      subscriptionId: safe.data?.subscription_id ?? null,
      // no email / name logged
    });
  },
  onPaymentSucceeded: async (payload) => {
    try {
      await handlePaymentSucceeded(payload as unknown as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'payment.succeeded' } });
      markHandlerFailed();
    }
  },
  onPaymentFailed: async (payload) => {
    try {
      await handlePaymentFailed(payload as unknown as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'payment.failed' } });
      markHandlerFailed();
    }
  },
  // NOTE: Dodo SDK fires `onRefundSucceeded` (event `refund.succeeded`), NOT
  // `onPaymentRefunded` — the latter is not a real SDK callback, so the refund
  // handler never ran (refunds left BillingInvoice.status stale). The refund
  // payload carries `data.payment_id`, which handlePaymentRefunded resolves.
  onRefundSucceeded: async (payload) => {
    try {
      await handlePaymentRefunded(payload as unknown as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'refund.succeeded' } });
      markHandlerFailed();
    }
  },
  onSubscriptionActive: async (payload) => {
    try {
      await handleSubscriptionUpsert(payload as unknown as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.active' } });
      markHandlerFailed();
    }
  },
  onSubscriptionRenewed: async (payload) => {
    try {
      await handleSubscriptionUpsert(payload as unknown as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.renewed' } });
      markHandlerFailed();
    }
  },
  onSubscriptionCancelled: async (payload) => {
    try {
      await handleSubscriptionCancelled(payload as unknown as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.cancelled' } });
      markHandlerFailed();
    }
  },
  onSubscriptionExpired: async (payload) => {
    try {
      await handleSubscriptionExpired(payload as unknown as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.expired' } });
      markHandlerFailed();
    }
  },
  onSubscriptionOnHold: async (payload) => {
    try {
      await handleSubscriptionOnHold(payload as unknown as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.on_hold' } });
      markHandlerFailed();
    }
  },
  });
  return cachedWebhookHandler;
}

// 401 diagnostic wrapper — Standard Webhooks library secret/signature
// mismatch'lerini Sentry'ye warning olarak yansıtır. Production-safe:
// raw secret YOK, sadece length + prefix snippet (whsec_ var mı yok mu) +
// header presence + 401 body message ("Missing required headers" / "No matching
// signature found" / "Message timestamp too old" / "Secret can't be empty.").
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const handler = getWebhookHandler();
  if (!handler) {
    // Secret not configured — fail loudly but cleanly (audit §38.B H4).
    Sentry.captureMessage('Dodo webhook secret not configured', {
      level: 'error',
      tags: { integration: 'dodo-payments', kind: 'webhook_not_configured' },
    });
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  // Idempotency (audit §38.B H2). Svix `webhook-id` is stable across retries
  // and re-deliveries. We only RECORD an id after a verified+dispatched 200,
  // so an attacker (no valid signature) can never poison the dedup table; a
  // pre-existing id therefore always means a prior legitimate delivery →
  // short-circuit before re-applying state (prevents out-of-order revival /
  // double invoicing). Header read does not consume the body (SDK reads it).
  const eventId = req.headers.get('webhook-id');
  if (eventId) {
    const seen = await prisma.dodoWebhookEvent
      .findUnique({ where: { eventId }, select: { id: true } })
      .catch(() => null);
    if (seen) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
  }

  const startTime = Date.now();
  const outcome = { failed: false };
  const response = await handlerOutcomeStore.run(outcome, () => handler(req));

  // A swallowed handler error must NOT be recorded as delivered — answer 5xx
  // so Dodo redelivers the event.
  if (response.status === 200 && outcome.failed) {
    Sentry.captureMessage('Dodo webhook handler failed — requesting redelivery', {
      level: 'error',
      tags: { integration: 'dodo-payments', kind: 'handler_failed' },
      extra: { eventType: req.headers.get('webhook-type'), hasEventId: Boolean(eventId) },
    });
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }

  // Record only verified + SUCCESSFULLY dispatched events (a swallowed handler
  // error already returned 500 above and never reaches here). P2002 (concurrent
  // duplicate) is benign.
  if (response.status === 200 && eventId) {
    try {
      await prisma.dodoWebhookEvent.create({
        data: { eventId, eventType: req.headers.get('webhook-type') ?? null },
      });
    } catch (err) {
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      ) {
        Sentry.captureException(err, {
          tags: { integration: 'dodo-payments', kind: 'idempotency_write' },
        });
      }
    }
  }

  if (response.status === 401 || response.status === 500) {
    // Hata path'i — diagnostic log + Sentry warning
    const clone = response.clone();
    const bodyMessage = await clone.text().catch(() => '<body unavailable>');
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET ?? '';
    const sigHeader = req.headers.get('webhook-signature') ?? '';
    const diagnostic = {
      status: response.status,
      bodyMessage: bodyMessage.slice(0, 200),
      durationMs: Date.now() - startTime,
      headers: {
        hasId: Boolean(req.headers.get('webhook-id')),
        hasTimestamp: Boolean(req.headers.get('webhook-timestamp')),
        hasSignature: Boolean(sigHeader),
        signaturePrefix: sigHeader.slice(0, 6), // "v1," veya başka
        signatureLength: sigHeader.length,
      },
      secret: {
        present: secret.length > 0,
        length: secret.length,
        hasWhsecPrefix: secret.startsWith('whsec_'),
        // İlk 8 char (whsec_ varsa "whsec_xx" gelir, raw için ilk 8 byte)
        first8Chars: secret.slice(0, 8),
      },
      mode: process.env.DODO_PAYMENTS_ENVIRONMENT ?? 'test_mode',
    };
    console.error('[dodo-webhook] verify fail', diagnostic);
    Sentry.captureMessage('Dodo webhook signature verify failed', {
      level: 'warning',
      tags: {
        integration: 'dodo-payments',
        kind: response.status === 401 ? 'signature_verify_fail' : 'webhook_server_error',
      },
      extra: diagnostic,
    });
  }
  return response;
};

// Ops health probe — no secrets, just config status.
export function GET() {
  return NextResponse.json({
    integration: 'dodo-payments',
    enabled: Boolean(process.env.DODO_PAYMENTS_WEBHOOK_SECRET),
    mode: process.env.DODO_PAYMENTS_ENVIRONMENT ?? 'test_mode',
  });
}
