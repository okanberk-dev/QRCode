import type { PrismaClient } from '@prisma/client';
import { paynkolayCheckoutAmounts, toAdminRow, toPublicPlan } from '@/lib/subscription-plans';
import type { ReviewErrorCode } from './billing-copy';
import { saveCardAllowed } from './card-api';
import { mirrorCards, type PublicSavedCard } from './card-vault';
import { riskGateState, type CheckoutIntent, type RiskGateState } from './checkout-post';
import { cardSaveConsent } from './consent';
import type { BillingFlags } from './flags';
import { addPeriod, anchorFits, istanbulDayOfMonth, RENEWAL_POLICY, TERMINAL_STATES } from './renewal-policy';

/**
 * Server-side data of the review page (`/billing/{locale}/checkout`, billing
 * spec §12.4): the plan and its DB amount for both cycles, the projected
 * period, whether the card can be saved now (and the exact consent text and
 * hash the POST will verify), the saved card, and the open renewal's state.
 * Display only — the POST recomputes and checks everything.
 */

export type ReviewBlocked = 'owner_only' | 'impersonating' | 'unavailable' | 'no_plan' | 'expired';

export interface ReviewModel {
  locale: 'tr' | 'en';
  intent: CheckoutIntent;
  blocked: ReviewBlocked | null;
  error: ReviewErrorCode | null;
  plan: { id: string; name: string; description: string; maxBusinesses: number | null; features: string[] } | null;
  cycle: 'monthly' | 'yearly';
  /** Kuruş per cycle (null = not sold in that cycle). */
  amounts: { monthly: number | null; yearly: number | null };
  amountMinor: number | null;
  /** Projected paid period (ISO). */
  period: { from: string; to: string } | null;
  /** Current period end (replace_card copy). */
  renewsAt: string | null;
  cardStorage: boolean;
  saveAllowed: boolean;
  hostedCardSelect: boolean;
  savedCard: PublicSavedCard | null;
  consent: { textVersion: string; text: string; textHash: string } | null;
  pastDue: boolean;
  manualReview: boolean;
  /** The sign-in score gate would refuse this payment (§3.3): shown before the pay button, which is disabled. */
  verification: RiskGateState;
}

export interface ReviewInput {
  db: PrismaClient;
  flags: Pick<BillingFlags, 'cardStorage' | 'hostedCardSelect'>;
  configured: boolean;
  userId: string;
  locale: 'tr' | 'en';
  intent: CheckoutIntent;
  planId: string | null;
  cycle: 'monthly' | 'yearly';
  error: ReviewErrorCode | null;
  /** isRecaptchaServerConfigured(): the sign-in score gate applies. */
  recaptchaConfigured: boolean;
  now: Date;
}

function emptyModel(input: ReviewInput, blocked: ReviewBlocked): ReviewModel {
  return {
    locale: input.locale,
    intent: input.intent,
    blocked,
    error: input.error,
    plan: null,
    cycle: input.cycle,
    amounts: { monthly: null, yearly: null },
    amountMinor: null,
    period: null,
    renewsAt: null,
    cardStorage: input.flags.cardStorage,
    saveAllowed: false,
    hostedCardSelect: false,
    savedCard: null,
    consent: null,
    pastDue: false,
    manualReview: false,
    verification: null,
  };
}

export async function loadCheckoutReview(input: ReviewInput): Promise<ReviewModel> {
  const { db, now, locale } = input;
  if (!input.configured) return emptyModel(input, 'unavailable');

  const sub = await db.billingSubscription.findUnique({
    where: { userId: input.userId },
    select: { source: true, status: true, subscriptionPlanId: true, billingCycle: true, renewsAt: true, billingAnchorDay: true },
  });
  let planId = input.planId;
  let cycle = input.cycle;
  let intent = input.intent;
  if (intent !== 'new') {
    const renewable =
      sub?.source === 'paynkolay' && (sub.status === 'active' || sub.status === 'past_due') && !!sub.subscriptionPlanId;
    if (!renewable) {
      // The renew link of a reminder mail, clicked after the period ended (the subscription is now canceled /
      // expired): the same plan and cycle as a new payment, which settlement anchors to the old period end
      // when it ended ≤ 7 days ago (§11.2 e). "Try again later" would never work.
      const lapsed = sub?.source === 'paynkolay' && sub.status === 'canceled' && !!sub.subscriptionPlanId;
      if (intent !== 'renew' || !lapsed) return emptyModel(input, sub?.status === 'canceled' ? 'expired' : 'unavailable');
      intent = 'new';
      planId = sub.subscriptionPlanId;
      cycle = sub.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    } else {
      planId = sub.subscriptionPlanId;
      cycle = sub.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    }
  }
  if (!planId) return emptyModel(input, 'no_plan');
  const row = await db.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!row || !row.isActive) return emptyModel(input, intent !== input.intent ? 'expired' : 'no_plan');
  const admin = toAdminRow(row);
  const tryAmounts = paynkolayCheckoutAmounts(admin);
  const amounts = {
    monthly: tryAmounts?.monthlyTry ? Math.round(tryAmounts.monthlyTry * 100) : null,
    yearly: tryAmounts?.yearlyTry ? Math.round(tryAmounts.yearlyTry * 100) : null,
  };
  // A cycle the plan is not sold in falls back to the other one.
  if (intent === 'new' && amounts[cycle] === null) cycle = cycle === 'monthly' ? 'yearly' : 'monthly';
  const amountMinor = amounts[cycle];
  if (amountMinor === null) return emptyModel(input, 'no_plan');
  const pub = toPublicPlan(admin, locale);

  // Projected period (display only; settlement decides).
  const samePlan = !!sub && sub.subscriptionPlanId === row.id && (sub.billingCycle ?? cycle) === cycle;
  let from = now;
  let storedAnchor: number | null = null;
  // Anchored like settlement (§11.2 c/e): past due, paid ahead, or ended ≤ 7 days ago on the same plan.
  const lapsedRecently = sub?.status === 'canceled' && !!sub.renewsAt && sub.renewsAt.getTime() >= now.getTime() - RENEWAL_POLICY.anchorAfterLapseDays * 24 * 60 * 60_000;
  if (
    sub?.renewsAt &&
    samePlan &&
    (sub.status === 'past_due' || lapsedRecently || (sub.status === 'active' && sub.renewsAt.getTime() > now.getTime()))
  ) {
    from = sub.renewsAt;
    storedAnchor = sub.billingAnchorDay;
  }
  const anchor = storedAnchor != null && anchorFits(storedAnchor, from) ? storedAnchor : istanbulDayOfMonth(from);
  const to = addPeriod(cycle, from, anchor);

  const renewal = sub?.renewsAt
    ? await db.billingRenewal.findFirst({
        where: { userId: input.userId, periodEnd: sub.renewsAt, state: { notIn: [...TERMINAL_STATES] } },
        select: { state: true },
      })
    : null;

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { emailVerified: true, createdAt: true, lastLoginRiskScore: true, lastLoginRiskAt: true },
  });
  let savedCard: PublicSavedCard | null = null;
  if (input.flags.cardStorage) {
    const cards = await mirrorCards(db, input.userId, now, sub?.renewsAt ?? null);
    savedCard = cards.find((c) => c.bound) ?? cards.find((c) => c.verified) ?? null;
  }
  const saveAllowed = input.flags.cardStorage && saveCardAllowed(user, now);

  return {
    locale,
    intent,
    blocked: null,
    error: input.error,
    plan: {
      id: row.id,
      name: locale === 'en' ? row.nameEn : row.nameTr,
      description: pub.description,
      maxBusinesses: row.maxBusinesses ?? null,
      features: pub.features.slice(0, 3),
    },
    cycle,
    amounts,
    amountMinor,
    period: { from: from.toISOString(), to: to.toISOString() },
    renewsAt: sub?.renewsAt ? sub.renewsAt.toISOString() : null,
    cardStorage: input.flags.cardStorage,
    saveAllowed,
    hostedCardSelect: input.flags.hostedCardSelect && !!savedCard,
    savedCard,
    consent: input.flags.cardStorage ? cardSaveConsent(locale) : null,
    pastDue: sub?.status === 'past_due',
    manualReview: renewal?.state === 'manual_review',
    verification: user ? riskGateState(input.recaptchaConfigured, user, now) : null,
  };
}
