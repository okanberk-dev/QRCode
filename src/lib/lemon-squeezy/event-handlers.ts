/**
 * Lemon Squeezy webhook event handlers (CLAUDE.md §44.5).
 *
 * Each handler is **idempotent** — webhook handler entry already deduped
 * via `LemonSqueezyEvent.payloadHash`, but additionally each handler uses
 * `upsert` semantic so manual replay / out-of-order delivery doesn't
 * corrupt state.
 *
 * **User resolution**:
 *   1. `meta.custom_data.user_id` (preferred — checkout endpoint passes this)
 *   2. `data.attributes.user_email` lookup via User table (fallback for
 *      manual dashboard checkouts during testing)
 *   3. If both fail → return `{ ok: false, reason: 'user_not_found' }` —
 *      event row stays unprocessed for admin manual retry.
 *
 * **Tier resolution**: `data.attributes.variant_id` → SubscriptionPlan
 * via `lsVariantId{Usd,Try}{Monthly,Yearly}` reverse lookup. If unmapped,
 * subscription still created but `subscriptionPlanId=null` (legacy plan
 * fallback path, §15.2 canonical billing).
 *
 * **Yapma**: `prisma.user.findUnique({ where: { email } })` paralel
 * (`Promise.all`) — Supabase pooler `connection_limit=1` (§40.1).
 * Sequential await OK; aynı request içinde tek tek read'ler.
 *
 * **Yapma**: subscription_cancelled gelince DB row'unu `delete` etme —
 * cancel'da owner dönem sonuna kadar erişim hakkı taşır, sadece
 * `cancelAtPeriodEnd=true` flag set edilir. Gerçek expire `subscription_expired`
 * eventi ile olur (LS internal job tetikler).
 */

import * as Sentry from '@sentry/nextjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  LemonSqueezyDataEnvelope,
  LemonSqueezyInvoiceAttributes,
  LemonSqueezyOrderAttributes,
  LemonSqueezySubscriptionAttributes,
  LemonSqueezyWebhookPayload,
} from './types';

export interface HandlerResult {
  ok: boolean;
  reason?:
    | 'user_not_found'
    | 'invalid_payload'
    | 'unknown_event'
    | 'db_error'
    | 'unsupported_yet';
  message?: string;
}

const ok: HandlerResult = { ok: true };

/**
 * Main dispatch — caller passes parsed webhook payload, returns handler
 * result. Errors caught + Sentry'ye düşer, caller her zaman 200 dönmeli
 * (Lemon Squeezy retry storm önleme).
 */
export async function dispatchLemonSqueezyEvent(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const eventName = payload.meta.event_name;

  try {
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_unpaused':
        return await handleSubscriptionUpsert(payload);

      case 'subscription_cancelled':
        return await handleSubscriptionCancelled(payload);

      case 'subscription_expired':
        return await handleSubscriptionExpired(payload);

      case 'subscription_paused':
        return await handleSubscriptionPaused(payload);

      case 'subscription_payment_success':
      case 'subscription_payment_recovered':
        return await handleSubscriptionPaymentSuccess(payload);

      case 'subscription_payment_failed':
        return await handleSubscriptionPaymentFailed(payload);

      case 'subscription_payment_refunded':
        return await handleSubscriptionPaymentRefunded(payload);

      case 'order_created':
        return await handleOrderCreated(payload);

      case 'order_refunded':
        return await handleOrderRefunded(payload);

      case 'license_key_created':
      case 'license_key_updated':
        // Buaze SaaS değil license-based product satmıyor; future-proof
        // skeleton. Sadece event row'unu işaretle, side-effect yok.
        return { ok: true, reason: 'unsupported_yet' };

      default:
        // Type system zaten union dışı eventi yakalar, runtime'da
        // bilinmeyen string gelirse exhaustive check'i Sentry'e düşür.
        Sentry.captureMessage('Lemon Squeezy unknown event', {
          level: 'warning',
          tags: { integration: 'lemon-squeezy', event_name: String(eventName).slice(0, 60) },
        });
        return { ok: false, reason: 'unknown_event' };
    }
  } catch (err) {
    // Don't let handler errors bubble to webhook caller — log + return
    // ok:false. LemonSqueezyEvent.error column captures detail for retry.
    const message = err instanceof Error ? err.message : String(err);
    Sentry.captureException(err, {
      tags: {
        integration: 'lemon-squeezy',
        event_name: eventName,
        phase: 'handler_dispatch',
      },
    });
    return { ok: false, reason: 'db_error', message: message.slice(0, 200) };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Resolver helpers
// ─────────────────────────────────────────────────────────────────────

interface ResolvedUser {
  userId: string;
  matchSource: 'custom_data' | 'email_lookup';
}

async function resolveUserId(
  payload: LemonSqueezyWebhookPayload,
): Promise<ResolvedUser | null> {
  // Strategy 1: meta.custom_data.user_id (preferred)
  const customUserId = payload.meta.custom_data?.user_id;
  if (typeof customUserId === 'string' && customUserId.length > 0) {
    const user = await prisma.user.findUnique({
      where: { id: customUserId },
      select: { id: true },
    });
    if (user) return { userId: user.id, matchSource: 'custom_data' };
  }

  // Strategy 2: email lookup (subscription/order/invoice all carry user_email)
  const attrs = payload.data.attributes as { user_email?: string };
  const email = typeof attrs.user_email === 'string' ? attrs.user_email.trim().toLowerCase() : '';
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) return { userId: user.id, matchSource: 'email_lookup' };
  }

  return null;
}

interface ResolvedTier {
  subscriptionPlanId: string;
  billingCycle: 'monthly' | 'yearly';
  currency: 'USD' | 'TRY';
}

async function resolveTierFromVariant(
  variantId: string | number | undefined,
): Promise<ResolvedTier | null> {
  if (variantId === undefined || variantId === null) return null;
  const variantStr = String(variantId);
  if (!variantStr) return null;

  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      OR: [
        { lsVariantIdUsdMonthly: variantStr },
        { lsVariantIdUsdYearly: variantStr },
        { lsVariantIdTryMonthly: variantStr },
        { lsVariantIdTryYearly: variantStr },
      ],
      isActive: true,
    },
    select: {
      id: true,
      lsVariantIdUsdMonthly: true,
      lsVariantIdUsdYearly: true,
      lsVariantIdTryMonthly: true,
      lsVariantIdTryYearly: true,
    },
  });

  if (!plan) return null;

  let billingCycle: 'monthly' | 'yearly';
  let currency: 'USD' | 'TRY';
  if (plan.lsVariantIdUsdMonthly === variantStr) {
    billingCycle = 'monthly';
    currency = 'USD';
  } else if (plan.lsVariantIdUsdYearly === variantStr) {
    billingCycle = 'yearly';
    currency = 'USD';
  } else if (plan.lsVariantIdTryMonthly === variantStr) {
    billingCycle = 'monthly';
    currency = 'TRY';
  } else if (plan.lsVariantIdTryYearly === variantStr) {
    billingCycle = 'yearly';
    currency = 'TRY';
  } else {
    return null;
  }

  return { subscriptionPlanId: plan.id, billingCycle, currency };
}

function asSubscription(
  payload: LemonSqueezyWebhookPayload,
): LemonSqueezyDataEnvelope<LemonSqueezySubscriptionAttributes> | null {
  return payload.data.type === 'subscriptions'
    ? (payload.data as LemonSqueezyDataEnvelope<LemonSqueezySubscriptionAttributes>)
    : null;
}

function asOrder(
  payload: LemonSqueezyWebhookPayload,
): LemonSqueezyDataEnvelope<LemonSqueezyOrderAttributes> | null {
  return payload.data.type === 'orders'
    ? (payload.data as LemonSqueezyDataEnvelope<LemonSqueezyOrderAttributes>)
    : null;
}

function asInvoice(
  payload: LemonSqueezyWebhookPayload,
): LemonSqueezyDataEnvelope<LemonSqueezyInvoiceAttributes> | null {
  return payload.data.type === 'subscription-invoices'
    ? (payload.data as LemonSqueezyDataEnvelope<LemonSqueezyInvoiceAttributes>)
    : null;
}

// LS sends amounts in MINOR currency unit (cents/kuruş). Buaze stores
// Decimal(10,2) in MAJOR unit. Divide by 100 with proper rounding.
function minorToMajor(minor: number): Prisma.Decimal {
  return new Prisma.Decimal(minor).div(100);
}

function safeDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

function mapLsStatusToBuazeStatus(lsStatus: string): string {
  // LS: 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired'
  // Buaze: 'active' | 'past_due' | 'canceled' (existing legacy 3-value union)
  switch (lsStatus) {
    case 'on_trial':
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'paused':
      return 'active'; // paused but still tracked; cancelAtPeriodEnd handles UI banner
    case 'cancelled':
    case 'expired':
      return 'canceled';
    default:
      return 'active';
  }
}

// ─────────────────────────────────────────────────────────────────────
// Subscription handlers
// ─────────────────────────────────────────────────────────────────────

async function handleSubscriptionUpsert(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const sub = asSubscription(payload);
  if (!sub) return { ok: false, reason: 'invalid_payload', message: 'data.type != subscriptions' };

  const resolved = await resolveUserId(payload);
  if (!resolved) return { ok: false, reason: 'user_not_found' };

  const attrs = sub.attributes;
  const tier = await resolveTierFromVariant(attrs.variant_id);

  await prisma.billingSubscription.upsert({
    where: { userId: resolved.userId },
    create: {
      userId: resolved.userId,
      providerRef: sub.id,
      source: 'lemon_squeezy',
      lemonSqueezyCustomerId: String(attrs.customer_id),
      lemonSqueezyVariantId: String(attrs.variant_id),
      status: mapLsStatusToBuazeStatus(attrs.status),
      cancelAtPeriodEnd: Boolean(attrs.cancelled),
      renewsAt: safeDate(attrs.renews_at),
      trialEndsAt: safeDate(attrs.trial_ends_at),
      paymentBrand: attrs.card_brand,
      paymentLast4: attrs.card_last_four,
      subscriptionPlanId: tier?.subscriptionPlanId ?? null,
      billingCycle: tier?.billingCycle ?? null,
      currency: tier?.currency ?? 'USD',
      plan: 'lemon_squeezy',
    },
    update: {
      providerRef: sub.id,
      source: 'lemon_squeezy',
      lemonSqueezyCustomerId: String(attrs.customer_id),
      lemonSqueezyVariantId: String(attrs.variant_id),
      status: mapLsStatusToBuazeStatus(attrs.status),
      cancelAtPeriodEnd: Boolean(attrs.cancelled),
      renewsAt: safeDate(attrs.renews_at),
      trialEndsAt: safeDate(attrs.trial_ends_at),
      paymentBrand: attrs.card_brand,
      paymentLast4: attrs.card_last_four,
      ...(tier
        ? {
            subscriptionPlanId: tier.subscriptionPlanId,
            billingCycle: tier.billingCycle,
            currency: tier.currency,
          }
        : {}),
    },
  });

  return ok;
}

async function handleSubscriptionCancelled(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const sub = asSubscription(payload);
  if (!sub) return { ok: false, reason: 'invalid_payload' };

  // LS cancel = "stop renewing at period end", subscription remains active
  // until renews_at. Do NOT delete row — set flag + update renewsAt.
  const updated = await prisma.billingSubscription.updateMany({
    where: { providerRef: sub.id },
    data: {
      cancelAtPeriodEnd: true,
      renewsAt: safeDate(sub.attributes.renews_at),
      status: 'active', // still active until period end
    },
  });

  if (updated.count === 0) {
    // Row may not exist yet if cancel arrived before created (race).
    // Fall back to upsert path.
    return handleSubscriptionUpsert(payload);
  }
  return ok;
}

async function handleSubscriptionExpired(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const sub = asSubscription(payload);
  if (!sub) return { ok: false, reason: 'invalid_payload' };

  await prisma.billingSubscription.updateMany({
    where: { providerRef: sub.id },
    data: {
      status: 'canceled',
      cancelAtPeriodEnd: false, // already expired, flag irrelevant
    },
  });
  return ok;
}

async function handleSubscriptionPaused(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const sub = asSubscription(payload);
  if (!sub) return { ok: false, reason: 'invalid_payload' };

  // LS pause is rare (admin-triggered usually). Mark past_due-ish so UI
  // can show "subscription paused" banner without changing access logic.
  await prisma.billingSubscription.updateMany({
    where: { providerRef: sub.id },
    data: { status: 'past_due' },
  });
  return ok;
}

// ─────────────────────────────────────────────────────────────────────
// Payment handlers
// ─────────────────────────────────────────────────────────────────────

async function handleSubscriptionPaymentSuccess(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const invoice = asInvoice(payload);
  if (!invoice) return { ok: false, reason: 'invalid_payload', message: 'data.type != subscription-invoices' };

  const resolved = await resolveUserId(payload);
  if (!resolved) return { ok: false, reason: 'user_not_found' };

  const attrs = invoice.attributes;

  // Upsert BillingInvoice by providerRef (LS invoice ID).
  await prisma.billingInvoice.upsert({
    where: { providerRef: invoice.id },
    create: {
      userId: resolved.userId,
      providerRef: invoice.id,
      amount: minorToMajor(attrs.total),
      currency: attrs.currency,
      status: 'paid',
      source: 'lemon_squeezy',
      description: `Subscription renewal · ${attrs.billing_reason ?? 'subscription'}`,
      receiptUrl: attrs.urls?.invoice_url ?? null,
      pdfUrl: attrs.urls?.invoice_url ?? null,
      issuedAt: safeDate(attrs.created_at) ?? new Date(),
    },
    update: {
      status: 'paid',
      amount: minorToMajor(attrs.total),
      currency: attrs.currency,
      receiptUrl: attrs.urls?.invoice_url ?? null,
      pdfUrl: attrs.urls?.invoice_url ?? null,
    },
  });

  // Update BillingSubscription.renewsAt if we can find the parent sub.
  const subscriptionId = String(attrs.subscription_id);
  if (subscriptionId) {
    await prisma.billingSubscription.updateMany({
      where: { providerRef: subscriptionId },
      data: { status: 'active' }, // payment cleared past_due, reset to active
    });
  }

  return ok;
}

async function handleSubscriptionPaymentFailed(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const invoice = asInvoice(payload);
  if (!invoice) return { ok: false, reason: 'invalid_payload' };

  const attrs = invoice.attributes;

  // Record the failed attempt + mark subscription past_due.
  const resolved = await resolveUserId(payload);
  if (resolved) {
    await prisma.billingInvoice.upsert({
      where: { providerRef: invoice.id },
      create: {
        userId: resolved.userId,
        providerRef: invoice.id,
        amount: minorToMajor(attrs.total),
        currency: attrs.currency,
        status: 'failed',
        source: 'lemon_squeezy',
        description: 'Subscription payment failed',
        issuedAt: safeDate(attrs.created_at) ?? new Date(),
      },
      update: { status: 'failed' },
    });
  }

  const subscriptionId = String(attrs.subscription_id);
  if (subscriptionId) {
    await prisma.billingSubscription.updateMany({
      where: { providerRef: subscriptionId },
      data: { status: 'past_due' },
    });
  }

  // Operator alert — failed payments may need manual outreach (dunning,
  // payment method update reminder). Sentry warning level + ops_alert
  // hookup gelecek scope (notifyOpsOfBillingFailure helper §21.33 paterni).
  Sentry.captureMessage('Lemon Squeezy subscription payment failed', {
    level: 'warning',
    tags: { integration: 'lemon-squeezy', event_name: 'subscription_payment_failed' },
    extra: {
      userId: resolved?.userId ?? null,
      subscriptionId,
      // PII redaction (§40.4) — no email, no name; numeric ID only
      lsCustomerId: attrs.customer_id,
    },
  });

  return ok;
}

async function handleSubscriptionPaymentRefunded(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const invoice = asInvoice(payload);
  if (!invoice) return { ok: false, reason: 'invalid_payload' };

  await prisma.billingInvoice.updateMany({
    where: { providerRef: invoice.id },
    data: { status: 'refunded' },
  });
  return ok;
}

// ─────────────────────────────────────────────────────────────────────
// Order handlers (one-time payment, foundation scope)
// ─────────────────────────────────────────────────────────────────────

async function handleOrderCreated(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const order = asOrder(payload);
  if (!order) return { ok: false, reason: 'invalid_payload' };

  const resolved = await resolveUserId(payload);
  if (!resolved) return { ok: false, reason: 'user_not_found' };

  const attrs = order.attributes;

  await prisma.billingInvoice.upsert({
    where: { providerRef: order.id },
    create: {
      userId: resolved.userId,
      providerRef: order.id,
      amount: minorToMajor(attrs.total),
      currency: attrs.currency,
      status: attrs.status === 'paid' ? 'paid' : 'pending',
      source: 'lemon_squeezy',
      description: `Order #${attrs.order_number}`,
      receiptUrl: attrs.urls?.receipt ?? null,
      pdfUrl: attrs.urls?.receipt ?? null,
      issuedAt: safeDate(attrs.created_at) ?? new Date(),
    },
    update: {
      status: attrs.status === 'paid' ? 'paid' : 'pending',
      amount: minorToMajor(attrs.total),
      currency: attrs.currency,
      receiptUrl: attrs.urls?.receipt ?? null,
      pdfUrl: attrs.urls?.receipt ?? null,
    },
  });

  return ok;
}

async function handleOrderRefunded(
  payload: LemonSqueezyWebhookPayload,
): Promise<HandlerResult> {
  const order = asOrder(payload);
  if (!order) return { ok: false, reason: 'invalid_payload' };

  await prisma.billingInvoice.updateMany({
    where: { providerRef: order.id },
    data: { status: 'refunded' },
  });
  return ok;
}

/** Exported for test harness — exhaustive switch coverage. */
export const __testOnlyExports = {
  resolveUserId,
  resolveTierFromVariant,
  mapLsStatusToBuazeStatus,
  minorToMajor,
};
