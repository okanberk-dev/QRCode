import type { PrismaClient } from '@prisma/client';
import type { PanelActor } from '@/lib/auth';
import { buildHostedCheckout, cardAliasFor, type PaynkolayConfig } from '@/lib/payment/paynkolay';
import { paynkolayCheckoutAmounts, toAdminRow } from '@/lib/subscription-plans';
import { saveCardAllowed } from './card-api';
import { getCustomerKey, getOrCreateCustomerKey, type VaultDeps } from './card-vault';
import { renderCheckoutInterstitial } from './checkout-interstitial';
import { cardSaveConsent, currentLegalDocVersions, recordConsent } from './consent';
import type { BillingFlags, HostedPaymentEnvCheck } from './flags';
import { billingLog } from './redact';
import { RENEWAL_POLICY, TERMINAL_STATES } from './renewal-policy';
import type { Sensitive } from './sensitive';
import { clientIpFingerprint } from './vault-crypto';

/**
 * `POST /api/billing/paynkolay/checkout` — the form post from the review
 * page (billing spec §8.4, §3.3). Pure core with injected dependencies; the
 * route only reads the request and writes the response.
 *
 * Every failure is a 303 back to the review page with `?error=<code>` (or to
 * the login page). Checks run before any row is written: origin, owner,
 * configuration + environment binding, rate limits and card-testing caps,
 * the reCAPTCHA sign-in score, the plan, a payment already in progress for
 * this period, the card-save rules and consent, and the amount the page
 * showed. Then ONE transaction (subscription row locked FOR UPDATE) writes
 * the payment, the card-save consent and the owner_paying lock of an open
 * renewal (D19), and the response is the hand-off page.
 *
 * The amount always comes from the plan in the database. The customer key
 * goes to the browser only on a payment that saves a card (D13).
 */

export type CheckoutIntent = 'new' | 'renew' | 'replace_card';

export interface CheckoutForm {
  planId: string | null;
  cycle: 'monthly' | 'yearly';
  locale: 'tr' | 'en';
  intent: CheckoutIntent;
  saveCard: boolean;
  autoRenew: boolean;
  cardSaveTextHash: string | null;
  expectedAmountMinor: number | null;
}

const PLAN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Form fields → a typed form; anything unexpected falls back to the safe default. */
export function parseCheckoutForm(get: (name: string) => string | null): CheckoutForm {
  const planId = (get('planId') ?? '').trim();
  const intent = get('intent');
  const expected = (get('expectedAmountMinor') ?? '').trim();
  const hash = (get('cardSaveTextHash') ?? '').trim();
  return {
    planId: PLAN_ID_RE.test(planId) ? planId : null,
    cycle: get('cycle') === 'yearly' ? 'yearly' : 'monthly',
    locale: get('locale') === 'en' ? 'en' : 'tr',
    intent: intent === 'renew' || intent === 'replace_card' ? intent : 'new',
    saveCard: get('saveCard') === 'on',
    autoRenew: get('autoRenew') === 'on',
    cardSaveTextHash: /^[a-f0-9]{64}$/.test(hash) ? hash : null,
    expectedAmountMinor: /^\d{1,9}$/.test(expected) ? Number(expected) : null,
  };
}

/** The review page for this form (relative path), optionally with an error code. */
export function reviewPath(form: Pick<CheckoutForm, 'locale' | 'intent' | 'planId' | 'cycle'>, error?: string): string {
  const qs = new URLSearchParams();
  if (form.intent !== 'new') qs.set('intent', form.intent);
  if (form.intent === 'new' && form.planId) qs.set('planId', form.planId);
  if (form.intent === 'new') qs.set('cycle', form.cycle);
  if (error) qs.set('error', error);
  const q = qs.toString();
  return `/billing/${form.locale}/checkout${q ? `?${q}` : ''}`;
}

export interface CheckoutDeps {
  db: PrismaClient;
  cfg: PaynkolayConfig | null;
  flags: BillingFlags;
  /** Present only when saved cards are on. */
  vault: VaultDeps | null;
  /** D18 for the hosted payment (`loadHostedPaymentEnvCheck`). */
  envCheck: (paymentEnv: string | null) => Promise<HostedPaymentEnvCheck>;
  rateLimit: (key: string, max: number, windowMs: number) => Promise<{ allowed: boolean }>;
  /** Instance-local block set by the return route (an extra, fast layer; the DB count below is authoritative). */
  isIpBlocked: (ip: string) => boolean;
  /** isRecaptchaServerConfigured(): the sign-in score gate applies. */
  recaptchaConfigured: boolean;
  siteUrl: string;
  now: () => Date;
  capture?: (message: string, fingerprint: string, extra?: Record<string, string>) => void;
}

export interface CheckoutRequestContext {
  actor: PanelActor | null;
  /** Origin header equals the site origin. */
  originOk: boolean;
  /** getTrustedClientIp. */
  ip: string | null;
  userAgent: string | null;
}

export type CheckoutOutcome =
  | { kind: 'redirect'; location: string; error: string | null }
  | { kind: 'interstitial'; html: string; paymentId: string };

/** Card-testing caps (§3.3). */
export const CHECKOUT_LIMITS = {
  perAccount24h: 5,
  youngAccount24h: 3,
  youngAccountDays: 7,
  failedPerAccount24h: 3,
  perIp24h: 10,
  failedPerIp24h: 5,
  minRiskScore: 0.5,
  riskMaxAgeMs: 24 * 60 * 60_000,
} as const;

const MIN_MS = 60_000;
const DAY_MS = 24 * 60 * MIN_MS;
const HOSTED_KINDS = ['checkout', 'renewal_link'];
const OWNER_PAYABLE = new Set(['scheduled', 'retry_wait', 'needs_action', 'manual_review']);

class CheckoutAbort extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'CheckoutAbort';
  }
}

/**
 * Why the sign-in score gate (§3.3) would refuse a payment now, or null when it passes:
 *  - 'stale': no assessed sign-in in the last 24 h (sessions live 7 days);
 *  - 'no_score': the last sign-in produced no score (token missing or invalid — often a blocked script —
 *    or the assessment failed); login-risk.ts records that as a null score;
 *  - 'low_score': the last sign-in scored below 0.5.
 * The review page shows it before the pay button; the POST refuses with `verification_required`.
 */
export type RiskGateState = null | 'stale' | 'no_score' | 'low_score';

export function riskGateState(
  configured: boolean,
  user: { lastLoginRiskScore: number | null; lastLoginRiskAt: Date | null },
  now: Date,
): RiskGateState {
  if (!configured) return null;
  if (!user.lastLoginRiskAt || user.lastLoginRiskAt.getTime() < now.getTime() - CHECKOUT_LIMITS.riskMaxAgeMs) return 'stale';
  if (user.lastLoginRiskScore === null) return 'no_score';
  return user.lastLoginRiskScore >= CHECKOUT_LIMITS.minRiskScore ? null : 'low_score';
}

/** The sign-in score gate (§3.3): a reCAPTCHA-assessed sign-in < 24 h old with score ≥ 0.5. */
export function riskGatePasses(
  configured: boolean,
  user: { lastLoginRiskScore: number | null; lastLoginRiskAt: Date | null },
  now: Date,
): boolean {
  return riskGateState(configured, user, now) === null;
}

export async function checkoutPostCore(
  deps: CheckoutDeps,
  ctx: CheckoutRequestContext,
  form: CheckoutForm,
): Promise<CheckoutOutcome> {
  const fail = (error: string): CheckoutOutcome => ({ kind: 'redirect', location: reviewPath(form, error), error });
  const now = deps.now();

  if (!ctx.originOk) return fail('origin_mismatch');
  const actor = ctx.actor;
  if (!actor) {
    return { kind: 'redirect', location: `/${form.locale}/auth/login?redirect=${encodeURIComponent(reviewPath(form))}`, error: null };
  }
  if (actor.source !== 'user' || actor.role !== 'restaurant_owner') return fail('owner_only');
  if (actor.realAdminId) return fail('impersonation_blocked');
  const userId = actor.id;

  const cfg = deps.cfg;
  if (!cfg) return fail('unavailable');
  const envCheck = await deps.envCheck(cfg.env);
  if (!envCheck.ok) {
    deps.capture?.('billing: checkout refused, PayNKolay environment does not match the database binding', 'billing-env-mismatch', {
      reason: envCheck.reason,
    });
    return fail('unavailable');
  }

  // ── Rate limits and card-testing caps (§3.3) ──
  const { db } = deps;
  const ip = ctx.ip ?? 'unknown';
  if (!(await deps.rateLimit(`paynkolay:checkout:${userId}`, 10, 10 * MIN_MS)).allowed) return fail('rate_limited');
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, emailVerified: true, lastLoginRiskScore: true, lastLoginRiskAt: true, isActive: true },
  });
  if (!user || !user.isActive) return fail('owner_only');
  const since = new Date(now.getTime() - DAY_MS);
  const recent = await db.billingPayment.count({ where: { userId, kind: { in: HOSTED_KINDS }, createdAt: { gte: since } } });
  const young = user.createdAt.getTime() > now.getTime() - CHECKOUT_LIMITS.youngAccountDays * DAY_MS;
  if (recent >= (young ? CHECKOUT_LIMITS.youngAccount24h : CHECKOUT_LIMITS.perAccount24h)) return fail('rate_limited');
  const failedRecent = await db.billingPayment.count({
    where: { userId, kind: { in: HOSTED_KINDS }, status: { in: ['failed', 'needs_review'] }, createdAt: { gte: since } },
  });
  if (failedRecent >= CHECKOUT_LIMITS.failedPerAccount24h) return fail('rate_limited');
  // Per trusted IP: ≤ 5 failed hosted payments per 24 h, counted in the database over an HMAC fingerprint
  // of the IP stored on each payment — the same answer on every instance, after a restart, and for
  // payments that reconciliation (not the browser return) marked failed.
  const ipFp = ctx.ip && deps.vault ? clientIpFingerprint(ctx.ip, deps.vault.hmac) : null;
  if (ipFp) {
    const failedFromIp = await db.billingPayment.count({
      where: { clientIpFp: ipFp, kind: { in: HOSTED_KINDS }, status: { in: ['failed', 'needs_review'] }, createdAt: { gte: since } },
    });
    if (failedFromIp >= CHECKOUT_LIMITS.failedPerIp24h) return fail('rate_limited');
  }
  if (deps.isIpBlocked(ip)) return fail('rate_limited');
  if (!(await deps.rateLimit(`billing:checkout:ip:${ip}`, CHECKOUT_LIMITS.perIp24h, DAY_MS)).allowed) return fail('rate_limited');

  // ── reCAPTCHA-assessed sign-in (no script on the payment pages, §18.2 #1) ──
  if (!riskGatePasses(deps.recaptchaConfigured, user, now)) return fail('verification_required');

  // ── Plan, cycle, amount ──
  const sub = await db.billingSubscription.findUnique({
    where: { userId },
    select: { source: true, status: true, subscriptionPlanId: true, billingCycle: true, renewsAt: true },
  });
  let planId = form.planId;
  let cycle = form.cycle;
  if (form.intent !== 'new') {
    const renewable = sub?.source === 'paynkolay' && (sub.status === 'active' || sub.status === 'past_due') && !!sub.subscriptionPlanId;
    if (!renewable || (sub?.billingCycle !== 'monthly' && sub?.billingCycle !== 'yearly')) return fail('unavailable');
    planId = sub.subscriptionPlanId;
    cycle = sub.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  }
  if (!planId) return fail('unavailable');
  const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) return fail('unavailable');
  const amounts = paynkolayCheckoutAmounts(toAdminRow(plan));
  const amountTry = cycle === 'yearly' ? amounts?.yearlyTry : amounts?.monthlyTry;
  if (!amountTry) return fail('unavailable');
  const amountMinor = Math.round(amountTry * 100);
  if (plan.maxBusinesses != null && plan.maxBusinesses > 0) {
    const owned = await db.restaurant.count({ where: { userId } });
    if (owned > plan.maxBusinesses) return fail('plan_too_small');
  }

  // ── A payment for this period already in flight (D19) ──
  const openRenewal = sub?.renewsAt
    ? await db.billingRenewal.findFirst({
        where: { userId, periodEnd: sub.renewsAt, state: { notIn: [...TERMINAL_STATES] } },
        select: { id: true, state: true, ownerPaymentId: true },
      })
    : null;
  // An owner_paying lock held by this owner's own pending hosted payment does NOT block: that payment
  // may have been abandoned on PayNKolay's page (back button, closed tab, "Vazgeç"), and paying again
  // creates a new payment that takes over the lock (§12.5). If both go through, settle marks the second
  // one duplicate_period and queues its refund (D19) — the period is never stacked.
  const foreignPending = (db0: Pick<PrismaClient, 'billingPayment'>, paymentId: string | null) =>
    paymentId
      ? db0.billingPayment.count({
          where: { id: paymentId, status: 'pending', NOT: { userId, kind: { in: HOSTED_KINDS } } },
        })
      : Promise.resolve(0);
  if (openRenewal && (openRenewal.state === 'charging' || openRenewal.state === 'awaiting_confirmation')) return fail('renewal_in_progress');
  if (openRenewal?.state === 'owner_paying' && (await foreignPending(db, openRenewal.ownerPaymentId)) > 0) return fail('renewal_in_progress');

  // ── Card saving and consent ──
  if (form.autoRenew) return fail('unavailable'); // auto-renew arrives with auto-charging
  if (form.saveCard && (!deps.flags.cardStorage || !deps.vault)) return fail('unavailable');
  if (form.intent === 'replace_card' && !form.saveCard) return fail(deps.flags.cardStorage ? 'consent_required' : 'unavailable');
  if (form.saveCard && !saveCardAllowed(user, now)) return fail('save_not_allowed');
  const consentText = cardSaveConsent(form.locale);
  if (form.saveCard && !form.cardSaveTextHash) return fail('consent_required');
  if (form.saveCard && form.cardSaveTextHash !== consentText.textHash) return fail('terms_changed');
  if (form.expectedAmountMinor !== amountMinor) return fail('terms_changed');

  // ── Effects ──
  let customerKey: Sensitive | null = null;
  if (form.saveCard && deps.vault) {
    try {
      customerKey = await getOrCreateCustomerKey(deps.vault, userId);
    } catch (err) {
      billingLog('error', 'checkout.customer_key_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
      return fail('unavailable');
    }
  }
  const legalDocVersions = form.saveCard ? await currentLegalDocVersions(db, form.locale) : null;
  const kind = form.intent === 'renew' ? 'renewal_link' : 'checkout';

  let created: { paymentId: string; cardAlias: string | null };
  try {
    created = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "user_id" FROM "billing_subscriptions" WHERE "user_id" = ${userId} FOR UPDATE`;
      // Re-read under the lock: the cron or another tab may have moved the renewal meanwhile.
      const renewal = sub?.renewsAt
        ? await tx.billingRenewal.findFirst({
            where: { userId, periodEnd: sub.renewsAt, state: { notIn: [...TERMINAL_STATES] } },
            select: { id: true, state: true, ownerPaymentId: true, ownerPrevState: true },
          })
        : null;
      if (renewal && (renewal.state === 'charging' || renewal.state === 'awaiting_confirmation')) throw new CheckoutAbort('renewal_in_progress');
      if (renewal?.state === 'owner_paying' && (await foreignPending(tx, renewal.ownerPaymentId)) > 0) {
        throw new CheckoutAbort('renewal_in_progress');
      }

      const payment = await tx.billingPayment.create({
        data: {
          userId,
          subscriptionPlanId: plan.id,
          billingCycle: cycle,
          amountMinor,
          locale: form.locale,
          providerEnv: cfg.env,
          kind,
          saveCard: form.saveCard,
          cardSaveResult: form.saveCard ? 'pending' : null,
          clientIpFp: ipFp,
        },
        select: { id: true },
      });
      const cardAlias = form.saveCard ? cardAliasFor(payment.id) : null;
      if (cardAlias) {
        await tx.billingPayment.update({ where: { id: payment.id }, data: { cardAlias }, select: { id: true } });
        await recordConsent(
          tx,
          {
            userId,
            kind: 'card_save',
            actor: 'owner',
            authMethod: '3ds_checkout',
            textVersion: consentText.textVersion,
            textHash: consentText.textHash,
            textRendered: consentText.text,
            legalDocVersions: legalDocVersions ?? undefined,
            locale: form.locale,
            subscriptionPlanId: plan.id,
            billingCycle: cycle,
            amountMinor,
            paymentId: payment.id,
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
          },
          now,
        );
      }

      // D19: the owner paying for an open renewal's period holds it, so nothing else charges it meanwhile.
      if (renewal && (OWNER_PAYABLE.has(renewal.state) || renewal.state === 'owner_paying')) {
        const prev = renewal.state === 'owner_paying' ? renewal.ownerPrevState ?? 'scheduled' : renewal.state;
        const locked = await tx.billingRenewal.updateMany({
          where: { id: renewal.id, state: renewal.state, ownerPaymentId: renewal.ownerPaymentId },
          data: {
            state: 'owner_paying',
            ownerPaymentId: payment.id,
            ownerPrevState: prev,
            lockedUntil: new Date(now.getTime() + RENEWAL_POLICY.ownerPayingLockMs),
          },
        });
        if (locked.count !== 1) throw new CheckoutAbort('renewal_in_progress');
        await tx.billingPayment.update({ where: { id: payment.id }, data: { renewalId: renewal.id }, select: { id: true } });
      }
      return { paymentId: payment.id, cardAlias };
    });
  } catch (err) {
    if (err instanceof CheckoutAbort) return fail(err.code);
    throw err;
  }
  const { paymentId, cardAlias } = created;

  // D13: the customer key reaches the browser only to save a card — or, once the sandbox proved PayNKolay then
  // offers the saved card (PAYNKOLAY_HOSTED_CARD_SELECT), on renewals of an owner with a verified card.
  if (!customerKey && deps.flags.hostedCardSelect && deps.vault && form.intent !== 'new') {
    const verified = await db.billingCard.count({ where: { userId, deletedAt: null, savedByPaymentId: { not: null } } });
    if (verified > 0) customerKey = await getCustomerKey(deps.vault, userId).catch(() => null);
  }

  const returnUrl = `${deps.siteUrl}/api/billing/paynkolay/return`;
  const { action, fields } = buildHostedCheckout(
    cfg,
    {
      clientRefCode: paymentId,
      amountMinor,
      successUrl: returnUrl,
      failUrl: returnUrl,
      buyerIp: ctx.ip,
      customerKey,
      saveCard: form.saveCard,
      cardAlias: cardAlias ?? undefined,
    },
    now,
  );
  billingLog('info', 'checkout.started', { userId, paymentId, code: kind });
  const html = renderCheckoutInterstitial({
    action,
    fields,
    locale: form.locale,
    summary: {
      planName: form.locale === 'en' ? plan.nameEn : plan.nameTr,
      cycle,
      amountMinor,
      saveCard: form.saveCard,
      autoRenewFrom: null,
      intent: form.intent,
    },
    backUrl: reviewPath({ ...form, planId: form.intent === 'new' ? plan.id : null, cycle }),
  });
  return { kind: 'interstitial', html, paymentId };
}
