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

import { Webhooks } from '@dodopayments/nextjs';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { dodoProductId: productId, isActive: true },
    select: { id: true },
  });
  return plan?.id ?? null;
}

// Dodo amounts are in MINOR units (cents/kuruş). BillingInvoice.amount is
// Decimal(10,2) in MAJOR — divide by 100.
function minorToMajor(minor: number | undefined): Prisma.Decimal {
  if (typeof minor !== 'number' || !Number.isFinite(minor)) return new Prisma.Decimal(0);
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
    case 'paused':
      return 'active';
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

  // Clear past_due if parent subscription exists.
  const subscriptionId = payload.data?.subscription_id;
  if (subscriptionId) {
    await prisma.billingSubscription.updateMany({
      where: { providerRef: subscriptionId },
      data: { status: 'active' },
    });
  }
}

async function handlePaymentFailed(payload: DodoPayloadShape): Promise<void> {
  const paymentId = payload.data?.payment_id ?? payload.data?.subscription_id;
  if (!paymentId) return;
  const userId = await resolveUserId(payload);

  if (userId) {
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
  }

  const subscriptionId = payload.data?.subscription_id;
  if (subscriptionId) {
    await prisma.billingSubscription.updateMany({
      where: { providerRef: subscriptionId },
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
  await prisma.billingInvoice.updateMany({
    where: { providerRef: paymentId },
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
      plan: 'dodo_payments',
      subscriptionPlanId: planId,
    },
    update: {
      providerRef: subscriptionId,
      providerCustomerId: customerId,
      source: 'dodo_payments',
      status,
      cancelAtPeriodEnd: false,
      renewsAt: safeDate(payload.data?.next_billing_date),
      ...(planId ? { subscriptionPlanId: planId } : {}),
    },
  });
}

async function handleSubscriptionCancelled(payload: DodoPayloadShape): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  if (!subscriptionId) return;
  await prisma.billingSubscription.updateMany({
    where: { providerRef: subscriptionId },
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
    where: { providerRef: subscriptionId },
    data: { status: 'canceled', cancelAtPeriodEnd: false },
  });
}

async function handleSubscriptionOnHold(payload: DodoPayloadShape): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  if (!subscriptionId) return;
  await prisma.billingSubscription.updateMany({
    where: { providerRef: subscriptionId },
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

const sdkWebhookHandler = Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET,
  // Catch-all — fires for every event. Use for audit / Sentry breadcrumb.
  // PII discipline (§40.4): redact customer email/name from console.
  onPayload: async (payload) => {
    const safe = payload as DodoPayloadShape;
    console.log('[dodo-payments webhook]', {
      type: safe.type,
      paymentId: safe.data?.payment_id ?? null,
      subscriptionId: safe.data?.subscription_id ?? null,
      // no email / name logged
    });
  },
  onPaymentSucceeded: async (payload) => {
    try {
      await handlePaymentSucceeded(payload as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'payment.succeeded' } });
    }
  },
  onPaymentFailed: async (payload) => {
    try {
      await handlePaymentFailed(payload as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'payment.failed' } });
    }
  },
  onPaymentRefunded: async (payload) => {
    try {
      await handlePaymentRefunded(payload as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'payment.refunded' } });
    }
  },
  onSubscriptionActive: async (payload) => {
    try {
      await handleSubscriptionUpsert(payload as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.active' } });
    }
  },
  onSubscriptionRenewed: async (payload) => {
    try {
      await handleSubscriptionUpsert(payload as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.renewed' } });
    }
  },
  onSubscriptionCancelled: async (payload) => {
    try {
      await handleSubscriptionCancelled(payload as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.cancelled' } });
    }
  },
  onSubscriptionExpired: async (payload) => {
    try {
      await handleSubscriptionExpired(payload as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.expired' } });
    }
  },
  onSubscriptionOnHold: async (payload) => {
    try {
      await handleSubscriptionOnHold(payload as DodoPayloadShape);
    } catch (err) {
      Sentry.captureException(err, { tags: { integration: 'dodo-payments', handler: 'subscription.on_hold' } });
    }
  },
});

// 401 diagnostic wrapper — Standard Webhooks library secret/signature
// mismatch'lerini Sentry'ye warning olarak yansıtır. Production-safe:
// raw secret YOK, sadece length + prefix snippet (whsec_ var mı yok mu) +
// header presence + 401 body message ("Missing required headers" / "No matching
// signature found" / "Message timestamp too old" / "Secret can't be empty.").
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  // Clone body once — both SDK ve diagnostic wrapper okuyabilsin
  // (NextRequest body bir kez okunabilir). SDK kendi clone'unu kullanır
  // ama biz wrapper'da headers ile body content-length'i log'larız.
  const startTime = Date.now();
  const response = await sdkWebhookHandler(req);
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
