import { Prisma, type PrismaClient } from '@prisma/client';
import type { PublicSavedCard } from './card-types';
import {
  autoRenewConsentText,
  buildAutoRenewOffer,
  consentTextHash,
  currentLegalDocVersions,
  recordConsent,
  type AutoRenewOffer,
  type AutoRenewTerms,
} from './consent';
import type { BillingFlags } from './flags';
import type { BillingLocale } from './billing-format';
import { billingLog } from './redact';
import {
  attemptSchedule,
  evaluateRenewal,
  graceEnd,
  nextWindowSlot,
  RENEWAL_POLICY,
  type RenewalDecision,
} from './renewal-policy';
import type { RenewalContext, RenewalStore } from './renewal-store';
import { stepUpMethodFor, type StepUpMethod } from './step-up';

/**
 * Auto-renew in the owner panel (billing spec §8.1, §8.3, §8.8, D1, D4-D6,
 * D14): the server-built offer, turning the instruction on (after step-up,
 * with the exact text the owner confirmed) and off (one click, or the
 * off-only mail link), and the card-change amendment after a verified
 * replacement card (D6).
 *
 * Every write that touches the instruction runs in one transaction holding
 * the subscription row `FOR UPDATE` (the lock `disableAutoRenew`, the charge
 * claim and settle take), so an enable can never interleave with a charge or
 * an opt-out. Nothing here charges a card: the renewal engine does, and only
 * after a delivered notice (D5).
 */

const HOUR_MS = 60 * 60_000;

/** The notice of an open renewal starts over (a fresh notice naming the new terms is required before any charge). */
const NOTICE_CLEARED = {
  noticeClaimedAt: null,
  noticeDeliveredAt: null,
  quotedAmountMinor: null,
  noticeCardId: null,
  announcedAttemptTimes: Prisma.DbNull,
} as const;

export type AutoRenewUnavailableReason =
  | 'no_card'
  | 'yearly_cycle'
  | 'not_card_subscription'
  | 'subscription_inactive'
  | 'above_non3d_limit'
  | 'plan_unavailable'
  | 'flag_off'
  | 'cancel_at_period_end';

/** Maps a non-auto decision of the hypothetical evaluation to the reason the panel shows. */
export function unavailableReasonFor(decision: RenewalDecision): AutoRenewUnavailableReason | null {
  if (!decision.eligible) {
    switch (decision.reason) {
      case 'not_card_subscription':
        return 'not_card_subscription';
      case 'plan_unavailable':
        return 'plan_unavailable';
      case 'cancel_at_period_end':
        return 'cancel_at_period_end';
      default:
        return 'subscription_inactive';
    }
  }
  if (decision.mode === 'auto') return null;
  switch (decision.modeReason) {
    case 'flag_off':
      return 'flag_off';
    case 'yearly':
      return 'yearly_cycle';
    case 'above_non3d_limit':
      return 'above_non3d_limit';
    case 'no_card':
    case 'no_consent': // no card to name, so no consent could be built
      return 'no_card';
    default:
      return 'plan_unavailable';
  }
}

/**
 * Whether the subscription WOULD renew automatically if the owner consented
 * now with `card` (§8.3 step 3: ignoring the current autoRenew and consent).
 * A dry run counts as auto here: enabling works and the panel then reads
 * `paused` (§8.3).
 */
export function hypotheticalDecision(
  ctx: RenewalContext,
  flags: Pick<BillingFlags, 'autoCharge' | 'non3dLimitMinor'>,
  card: { id: string } | null,
): RenewalDecision {
  return evaluateRenewal({
    flags: { autoCharge: flags.autoCharge, dryRun: false, non3dLimitMinor: flags.non3dLimitMinor },
    sub: { ...ctx.sub, autoRenew: true },
    user: ctx.user,
    plan: ctx.plan,
    consent: card
      ? {
          id: 'offer',
          amountMinor: ctx.plan?.amountMinor ?? null,
          subscriptionPlanId: ctx.sub.subscriptionPlanId,
          billingCycle: 'monthly',
          cardId: card.id,
        }
      : null,
    boundCard: card,
  });
}

/** The card an instruction may name: the newest verified (saved through Buaze's flow), not expired. */
export function offerCard(cards: PublicSavedCard[]): PublicSavedCard | null {
  return cards.find((c) => c.verified && !c.expired) ?? null;
}

export interface OwnerOfferResult {
  offer: AutoRenewOffer | null;
  reason: AutoRenewUnavailableReason | null;
  /** billing_cards.id of the offered card. */
  cardId: string | null;
  ctx: RenewalContext | null;
}

/**
 * The server's offer for this owner (§8.1 `offer`, §8.3 step 4). Null with a
 * reason when the subscription cannot renew automatically now.
 */
export async function buildOwnerOffer(
  deps: { db: PrismaClient; store: Pick<RenewalStore, 'loadRenewalContext'>; flags: Pick<BillingFlags, 'autoCharge' | 'non3dLimitMinor'> },
  userId: string,
  cards: PublicSavedCard[],
  locale: BillingLocale,
  now: Date,
): Promise<OwnerOfferResult> {
  if (!deps.flags.autoCharge) return { offer: null, reason: 'flag_off', cardId: null, ctx: null };
  const ctx = await deps.store.loadRenewalContext(userId);
  if (!ctx || !ctx.sub.renewsAt) return { offer: null, reason: 'subscription_inactive', cardId: null, ctx };
  const card = offerCard(cards);
  const row = card
    ? await deps.db.billingCard.findFirst({ where: { userId, handle: card.handle, deletedAt: null, savedByPaymentId: { not: null } }, select: { id: true } })
    : null;
  const decision = hypotheticalDecision(ctx, deps.flags, row);
  const reason = unavailableReasonFor(decision);
  if (reason || !decision.eligible || !card || !row || !ctx.plan) {
    return { offer: null, reason: reason ?? 'no_card', cardId: null, ctx };
  }
  const legalDocVersions = await currentLegalDocVersions(deps.db, locale);
  const offer = buildAutoRenewOffer(
    {
      plan: { id: ctx.plan.id, name: ctx.plan.name },
      amountMinor: decision.amountMinor,
      renewsAt: ctx.sub.renewsAt,
      card: { handle: card.handle, last4: card.last4 },
      legalDocVersions,
    },
    locale,
    now,
  );
  return { offer, reason: null, cardId: row.id, ctx };
}

/** The first automatic charge the panel shows (≥ E, never before the consent's first charge date). */
export function nextChargeDate(renewsAt: Date, firstChargeDate: Date | null, openRenewal: { mode: string; nextAttemptAt: Date | null } | null): Date | null {
  if (openRenewal?.mode === 'auto' && openRenewal.nextAttemptAt) return openRenewal.nextAttemptAt;
  return attemptSchedule(renewsAt, { firstChargeDate })[0] ?? null;
}

// ── Enable (§8.3) ──────────────────────────────────────────────────────────

export interface EnableInput {
  consent: { textVersion: string; textHash: string };
  expected: { amountMinor: number; planId: string; cardHandle: string; firstChargeDate: string };
}

export interface AutoRenewDeps {
  db: PrismaClient;
  flags: Pick<BillingFlags, 'autoCharge' | 'dryRun' | 'non3dLimitMinor'>;
  store: Pick<RenewalStore, 'loadRenewalContext' | 'disableAutoRenew'>;
  /** Re-lists the owner's cards at PayNKolay (refreshCards); null when the vault is not configured. */
  listCards: ((userId: string, renewsAt: Date | null) => Promise<PublicSavedCard[]>) | null;
  now: () => Date;
  /** The off-only link (§8.8); null without the HMAC key. */
  offLink: (consentId: string, userId: string, locale: BillingLocale) => string | null;
  mail: {
    on(
      to: { email: string; locale: BillingLocale },
      v: { planName: string; amountMinor: number; last4: string | null; chargeDate: Date; retryDates: Date[]; consentText: string; offLink: string | null },
    ): Promise<boolean>;
    off(
      to: { email: string; locale: BillingLocale },
      v: { variant: 'off_owner'; planName: string; accessUntil: Date | null },
    ): Promise<boolean>;
  };
}

export type EnableResult =
  | { status: 200; body: { ok: true; state: 'on' | 'paused'; firstChargeDate: string; confirmationSent: boolean } }
  | { status: 403; body: { error: 'step_up_required'; method: StepUpMethod } }
  | { status: 409; body: { error: 'terms_changed'; offer: AutoRenewOffer } }
  | { status: 409; body: { error: 'not_eligible'; reason: AutoRenewUnavailableReason } }
  | { status: 503; body: { error: 'unavailable' } };

const SAME_ISTANBUL_DAY = (a: string, b: Date): boolean => {
  const d = new Date(a);
  if (Number.isNaN(d.getTime())) return false;
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(d) === fmt.format(b);
};

/**
 * Turns auto-renew on (§8.3 steps 1-6). `stepUp` is the verified step-up of
 * this session (the route clears the cookie whatever the outcome).
 */
export async function enableAutoRenew(
  deps: AutoRenewDeps,
  caller: { userId: string; stepUp: { method: StepUpMethod } | null; ip: string | null; ua: string | null },
  input: EnableInput,
): Promise<EnableResult> {
  const { db } = deps;
  const userId = caller.userId;
  if (!deps.flags.autoCharge) return { status: 503, body: { error: 'unavailable' } };

  // 1. Step-up (D14).
  if (!caller.stepUp) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, totpSecret: true, passwordHash: true } });
    return { status: 403, body: { error: 'step_up_required', method: user ? stepUpMethodFor(user) : 'password' } };
  }

  // 2. The card, verified at PayNKolay first (a refresh), else the mirror.
  const sub0 = await db.billingSubscription.findUnique({ where: { userId }, select: { renewsAt: true } });
  let cards: PublicSavedCard[] = [];
  if (deps.listCards) {
    try {
      cards = await deps.listCards(userId, sub0?.renewsAt ?? null);
    } catch (err) {
      billingLog('warn', 'billing.auto_renew_refresh_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
      return { status: 503, body: { error: 'unavailable' } };
    }
  }

  // 3-4. Eligibility and the server's offer in the locale whose text the owner confirmed.
  const now = deps.now();
  const tr = await buildOwnerOffer(deps, userId, cards, 'tr', now);
  if (!tr.offer || !tr.cardId || !tr.ctx) return { status: 409, body: { error: 'not_eligible', reason: tr.reason ?? 'no_card' } };
  // The owner confirmed the text in the panel's language; the hash says which one.
  const en = tr.offer.textHash === input.consent.textHash ? null : await buildOwnerOffer(deps, userId, cards, 'en', now);
  const offer = en?.offer && en.offer.textHash === input.consent.textHash ? en.offer : tr.offer;
  const cardId = tr.cardId;
  const ctx = tr.ctx;
  const plan = ctx.plan!;
  const termsMatch =
    input.consent.textVersion === offer.textVersion &&
    input.consent.textHash === offer.textHash &&
    input.expected.amountMinor === offer.terms.amountMinor &&
    input.expected.planId === offer.terms.planId &&
    input.expected.cardHandle === offer.cardHandle &&
    SAME_ISTANBUL_DAY(input.expected.firstChargeDate, new Date(offer.terms.firstChargeDate));
  if (!termsMatch) return { status: 409, body: { error: 'terms_changed', offer } };

  // 5. One transaction under the subscription lock.
  const firstChargeDate = new Date(offer.terms.firstChargeDate);
  const paused = deps.flags.dryRun;
  type Applied = { consentId: string; renewal: { id: string; periodEnd: Date; attempts: number } | null } | { already: true };
  let applied: Applied;
  try {
    applied = await db.$transaction(async (tx): Promise<Applied> => {
      await tx.$queryRaw`SELECT "user_id" FROM "billing_subscriptions" WHERE "user_id" = ${userId} FOR UPDATE`;
      const sub = await tx.billingSubscription.findUnique({
        where: { userId },
        select: { autoRenew: true, renewsAt: true, subscriptionPlanId: true, billingCycle: true, status: true, source: true },
      });
      if (!sub || sub.source !== 'paynkolay' || sub.subscriptionPlanId !== plan.id || sub.billingCycle !== 'monthly' || !sub.renewsAt) {
        throw new EnableAbort('subscription_inactive');
      }
      if (sub.renewsAt.getTime() !== ctx.sub.renewsAt!.getTime()) throw new EnableAbort('terms_changed');
      if (sub.autoRenew) return { already: true as const };
      const card = await tx.billingCard.findFirst({ where: { id: cardId, userId, deletedAt: null }, select: { id: true } });
      if (!card) throw new EnableAbort('no_card');

      const consent = await recordConsent(
        tx,
        {
          userId,
          kind: 'auto_renew_on',
          actor: 'owner',
          authMethod: `stepup_${caller.stepUp!.method}`,
          textVersion: offer.textVersion,
          textHash: offer.textHash,
          textRendered: offer.text,
          terms: offer.terms as unknown as object,
          legalDocVersions: offer.terms.legalDocVersions,
          locale: offer.terms.locale,
          subscriptionPlanId: plan.id,
          billingCycle: 'monthly',
          amountMinor: offer.terms.amountMinor,
          cardId: card.id,
          effectiveAt: now,
          ipAddress: caller.ip,
          userAgent: caller.ua,
        },
        now,
      );
      // D1: exactly one chargeable card — the one this consent names.
      await tx.billingCard.updateMany({ where: { userId, boundConsentId: { not: null } }, data: { boundConsentId: null } });
      await tx.billingCard.update({ where: { id: card.id }, data: { boundConsentId: consent.id }, select: { id: true } });
      await tx.billingSubscription.update({
        where: { userId },
        data: { autoRenew: true, autoRenewConsentId: consent.id, autoRenewChangedAt: now },
        select: { userId: true },
      });

      // The open renewal of this period switches to auto when a slot before graceEnd is left (D4).
      const open = await tx.billingRenewal.findFirst({
        where: { userId, periodEnd: sub.renewsAt, state: { in: ['scheduled', 'retry_wait', 'needs_action'] } },
        select: { id: true, state: true, attempts: true, maxAttempts: true, periodEnd: true },
      });
      let renewal: { id: string; periodEnd: Date; attempts: number } | null = null;
      if (open && open.attempts < open.maxAttempts) {
        const slot = attemptSchedule(open.periodEnd, { firstChargeDate })[open.attempts] ?? null;
        if (slot) {
          await tx.billingRenewal.updateMany({
            where: { id: open.id, state: open.state },
            data: {
              ...NOTICE_CLEARED,
              mode: paused ? 'reminder' : 'auto',
              modeReason: paused ? 'dry_run' : null,
              consentId: consent.id,
              chargeCardId: card.id,
              graceEndsAt: graceEnd(open.periodEnd),
              state: open.state === 'needs_action' ? 'retry_wait' : open.state,
              nextAttemptAt: paused ? null : slot,
            },
          });
          renewal = paused ? null : { id: open.id, periodEnd: open.periodEnd, attempts: open.attempts };
        }
      }
      return { consentId: consent.id, renewal };
    });
  } catch (err) {
    if (!(err instanceof EnableAbort)) throw err;
    if (err.reason === 'terms_changed') {
      const fresh = await buildOwnerOffer(deps, userId, cards, offer.terms.locale, deps.now());
      if (fresh.offer) return { status: 409, body: { error: 'terms_changed', offer: fresh.offer } };
    }
    return { status: 409, body: { error: 'not_eligible', reason: err.reason === 'no_card' ? 'no_card' : 'subscription_inactive' } };
  }
  if ('already' in applied) {
    return { status: 200, body: { ok: true, state: paused ? 'paused' : 'on', firstChargeDate: offer.terms.firstChargeDate, confirmationSent: false } };
  }

  // 6. The durable-medium confirmation; when delivered it is also the pre-charge notice of the open renewal.
  const retryDates = applied.renewal
    ? attemptSchedule(applied.renewal.periodEnd, { firstChargeDate, noticeDeliveredAt: now }).slice(applied.renewal.attempts + 1)
    : [];
  const sent = await deps.mail.on(
    { email: ctx.user.email, locale: offer.terms.locale },
    {
      planName: plan.name,
      amountMinor: offer.terms.amountMinor,
      last4: offer.terms.last4,
      chargeDate: firstChargeDate,
      retryDates,
      consentText: offer.text,
      offLink: deps.offLink(applied.consentId, userId, offer.terms.locale),
    },
  );
  if (sent) {
    const at = deps.now();
    await db.billingConsent.updateMany({ where: { id: applied.consentId, confirmationSentAt: null }, data: { confirmationSentAt: at } });
    if (applied.renewal) {
      const schedule = attemptSchedule(applied.renewal.periodEnd, { firstChargeDate, noticeDeliveredAt: at });
      const next = schedule[applied.renewal.attempts];
      if (next) {
        await db.billingRenewal.updateMany({
          where: { id: applied.renewal.id, mode: 'auto', consentId: applied.consentId, noticeDeliveredAt: null, state: { in: ['scheduled', 'retry_wait'] } },
          data: {
            noticeDeliveredAt: at,
            quotedAmountMinor: offer.terms.amountMinor,
            noticeCardId: cardId,
            announcedAttemptTimes: schedule.map((d) => d.toISOString()),
            nextAttemptAt: next,
          },
        });
      }
    }
  }
  billingLog('info', 'billing.auto_renew_on', { userId, paused, confirmationSent: sent });
  return {
    status: 200,
    body: { ok: true, state: paused ? 'paused' : 'on', firstChargeDate: offer.terms.firstChargeDate, confirmationSent: sent },
  };
}

class EnableAbort extends Error {
  constructor(readonly reason: 'subscription_inactive' | 'terms_changed' | 'no_card') {
    super(reason);
    this.name = 'EnableAbort';
  }
}

// ── Disable (§8.3 disable flow, §8.8) ──────────────────────────────────────

export async function disableAutoRenew(
  deps: Pick<AutoRenewDeps, 'db' | 'store' | 'now' | 'mail'>,
  caller: { userId: string; authMethod: 'session' | 'mail_link'; ip: string | null; ua: string | null },
): Promise<{ changed: boolean; chargeInProgress: boolean; accessUntil: Date | null }> {
  const now = deps.now();
  const res = await deps.store.disableAutoRenew(caller.userId, 'owner_off', 'owner', now, {
    authMethod: caller.authMethod,
    ip: caller.ip,
    ua: caller.ua,
  });
  const sub = await deps.db.billingSubscription.findUnique({ where: { userId: caller.userId }, select: { renewsAt: true } });
  const accessUntil = sub?.renewsAt ?? null;
  if (res.changed) {
    const ctx = await deps.store.loadRenewalContext(caller.userId);
    if (ctx && !ctx.user.email.endsWith('.invalid')) {
      await deps.mail.off({ email: ctx.user.email, locale: ctx.user.locale }, { variant: 'off_owner', planName: ctx.plan?.name ?? '', accessUntil });
    }
    billingLog('info', 'billing.auto_renew_off', { userId: caller.userId, via: caller.authMethod, chargeInProgress: res.chargeInProgress });
  }
  return { changed: res.changed, chargeInProgress: res.chargeInProgress, accessUntil };
}

// ── Card change amendment (D6) ─────────────────────────────────────────────

/**
 * After a replacement card is verified as saved: when auto-renew is on and
 * the payment kept the consented plan and cycle, an amendment consent
 * (`auto_renew_card_change`, the same text rendered with the new card and
 * the next charge date) binds the new card, the old card becomes unbound
 * (D1 clean-up then deletes it) and the open renewal's notice is reset so
 * the new card is never charged without a notice naming it. Returns what the
 * `card_replaced` mail needs, or null when nothing changed.
 */
export async function applyCardChangeAmendment(
  db: PrismaClient,
  input: { userId: string; newCardId: string; paymentId: string; now: Date },
): Promise<null | {
  consentId: string;
  locale: BillingLocale;
  planName: string;
  amountMinor: number;
  last4: string | null;
  chargeDate: Date;
  renewal: { id: string; periodEnd: Date; attempts: number } | null;
}> {
  const { userId, newCardId, paymentId, now } = input;
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "user_id" FROM "billing_subscriptions" WHERE "user_id" = ${userId} FOR UPDATE`;
    const sub = await tx.billingSubscription.findUnique({
      where: { userId },
      select: { autoRenew: true, autoRenewConsentId: true, renewsAt: true, subscriptionPlanId: true, billingCycle: true },
    });
    if (!sub?.autoRenew || !sub.autoRenewConsentId || !sub.renewsAt) return null;
    const current = await tx.billingConsent.findFirst({
      where: { id: sub.autoRenewConsentId, userId, effectiveAt: { not: null } },
      select: { id: true, terms: true, amountMinor: true, subscriptionPlanId: true, billingCycle: true, locale: true, legalDocVersions: true },
    });
    if (!current || current.subscriptionPlanId !== sub.subscriptionPlanId || (current.billingCycle ?? 'monthly') !== sub.billingCycle) return null;
    const payment = await tx.billingPayment.findUnique({ where: { id: paymentId }, select: { subscriptionPlanId: true, billingCycle: true } });
    if (!payment || payment.subscriptionPlanId !== current.subscriptionPlanId || payment.billingCycle !== current.billingCycle) return null;
    const bound = await tx.billingCard.findFirst({ where: { userId, boundConsentId: current.id, deletedAt: null }, select: { id: true } });
    if (bound?.id === newCardId) return null;
    const card = await tx.billingCard.findFirst({ where: { id: newCardId, userId, deletedAt: null }, select: { id: true, last4: true } });
    if (!card) return null;
    const prev = (current.terms ?? {}) as Partial<AutoRenewTerms>;
    if (current.amountMinor == null || !prev.planName || !prev.planId) return null;
    const locale: BillingLocale = current.locale === 'en' ? 'en' : 'tr';
    const chargeDate = nextWindowSlot(new Date(Math.max(sub.renewsAt.getTime(), now.getTime() + RENEWAL_POLICY.minNoticeHours * HOUR_MS)));
    const terms: AutoRenewTerms = {
      version: prev.version ?? 'ar-2026-12-v1',
      locale,
      planId: prev.planId,
      planName: prev.planName,
      amountMinor: current.amountMinor,
      cycle: 'monthly',
      firstChargeDate: chargeDate.toISOString(),
      last4: card.last4,
      noticeHours: 72,
      retryGapHours: 48,
      graceHours: 120,
      maxAttempts: 3,
      legalDocVersions: (current.legalDocVersions as Record<string, string> | null) ?? prev.legalDocVersions ?? {},
    };
    const text = autoRenewConsentText(terms);
    const amendment = await recordConsent(
      tx,
      {
        userId,
        kind: 'auto_renew_card_change',
        actor: 'owner',
        authMethod: '3ds_checkout',
        textVersion: terms.version,
        textHash: consentTextHash(text),
        textRendered: text,
        terms: terms as unknown as object,
        legalDocVersions: terms.legalDocVersions,
        locale,
        subscriptionPlanId: current.subscriptionPlanId,
        billingCycle: 'monthly',
        amountMinor: current.amountMinor,
        cardId: card.id,
        paymentId,
        effectiveAt: now,
      },
      now,
    );
    await tx.billingCard.updateMany({ where: { userId, boundConsentId: { not: null } }, data: { boundConsentId: null } });
    await tx.billingCard.update({ where: { id: card.id }, data: { boundConsentId: amendment.id }, select: { id: true } });
    await tx.billingSubscription.update({ where: { userId }, data: { autoRenewConsentId: amendment.id }, select: { userId: true } });
    const open = await tx.billingRenewal.findFirst({
      where: { userId, periodEnd: sub.renewsAt, state: { in: ['scheduled', 'retry_wait', 'needs_action'] }, mode: 'auto' },
      select: { id: true, state: true, attempts: true, maxAttempts: true, periodEnd: true },
    });
    let renewal: { id: string; periodEnd: Date; attempts: number } | null = null;
    if (open && open.attempts < open.maxAttempts) {
      const slot = attemptSchedule(open.periodEnd, { firstChargeDate: chargeDate })[open.attempts] ?? null;
      await tx.billingRenewal.updateMany({
        where: { id: open.id, state: open.state },
        data: slot
          ? {
              ...NOTICE_CLEARED,
              consentId: amendment.id,
              chargeCardId: card.id,
              state: open.state === 'needs_action' ? 'retry_wait' : open.state,
              nextAttemptAt: slot,
            }
          : { consentId: amendment.id, chargeCardId: card.id },
      });
      if (slot) renewal = { id: open.id, periodEnd: open.periodEnd, attempts: open.attempts };
    }
    return { consentId: amendment.id, locale, planName: prev.planName, amountMinor: current.amountMinor, last4: card.last4, chargeDate, renewal };
  });
}

/**
 * After the `card_replaced` mail was delivered: it names card, amount and
 * date, so it is the pre-charge notice of the open renewal (D6).
 */
export async function markCardReplacedNotice(
  db: PrismaClient,
  amendment: { consentId: string; amountMinor: number; chargeDate: Date; renewal: { id: string; periodEnd: Date; attempts: number } | null },
  cardId: string,
  at: Date,
): Promise<void> {
  if (!amendment.renewal) return;
  const schedule = attemptSchedule(amendment.renewal.periodEnd, { firstChargeDate: amendment.chargeDate, noticeDeliveredAt: at });
  const next = schedule[amendment.renewal.attempts];
  if (!next) return;
  await db.billingRenewal.updateMany({
    where: { id: amendment.renewal.id, mode: 'auto', consentId: amendment.consentId, noticeDeliveredAt: null, state: { in: ['scheduled', 'retry_wait'] } },
    data: {
      noticeDeliveredAt: at,
      quotedAmountMinor: amendment.amountMinor,
      noticeCardId: cardId,
      announcedAttemptTimes: schedule.map((d) => d.toISOString()),
      nextAttemptAt: next,
    },
  });
}
