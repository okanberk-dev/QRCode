import { prisma } from '@/lib/prisma';
import { buildOwnerOffer, nextChargeDate, type AutoRenewDeps } from './auto-renew';
import type { CardApiDeps } from './card-api';
import { RENEWAL_POLICY, TERMINAL_STATES } from './renewal-policy';
import { stepUpMethodFor } from './step-up';
import { sendAutoRenewChangedMail } from './billing-mails';
import { loadCardVaultDeps, refreshCards } from './card-vault';
import type { BillingFlags } from './flags';
import { offLinkFor } from './renewal-engine';
import { prismaRenewalStore } from './renewal-store-prisma';

/** Production wiring of the auto-renew cores (routes only; tests inject fakes). */
export async function loadAutoRenewDeps(flags: BillingFlags): Promise<AutoRenewDeps> {
  const vault = flags.cardStorage ? await loadCardVaultDeps() : null;
  return {
    db: prisma,
    flags,
    store: prismaRenewalStore,
    listCards: vault ? (userId, renewsAt) => refreshCards(vault, userId, renewsAt) : null,
    now: () => new Date(),
    offLink: (consentId, userId, locale) => offLinkFor(consentId, userId, locale),
    mail: {
      on: (to, v) =>
        sendAutoRenewChangedMail(to, {
          variant: 'on',
          planName: v.planName,
          amountMinor: v.amountMinor,
          last4: v.last4,
          chargeDate: v.chargeDate,
          retryDates: v.retryDates,
          consentText: v.consentText,
          offLink: v.offLink,
        }),
      off: (to, v) => sendAutoRenewChangedMail(to, { variant: v.variant, planName: v.planName, amountMinor: null, accessUntil: v.accessUntil }),
    },
  };
}

/**
 * The auto-renew part of `GET /api/billing/payment-method` (§8.1): the next
 * charge while on, the paused state, or the server offer and the step-up
 * method while off. The offer text is rendered in the panel's language.
 */
export function paymentMethodAutoRenewLoader(flags: BillingFlags, locale: 'tr' | 'en'): CardApiDeps['autoRenew'] {
  return async (userId, cards, now) => {
    const ctx = await prismaRenewalStore.loadRenewalContext(userId);
    const enableVia: 'panel' | 'checkout' = RENEWAL_POLICY.panelEnable ? 'panel' : 'checkout';
    const base = { offer: null, reason: null, nextCharge: null, stepUpMethod: null, paused: false, enableVia } as const;
    if (!ctx || !ctx.sub.renewsAt) return { ...base, reason: 'subscription_inactive' };
    if (ctx.sub.autoRenew) {
      const open = await prisma.billingRenewal.findFirst({
        where: { userId, periodEnd: ctx.sub.renewsAt, state: { notIn: [...TERMINAL_STATES] } },
        select: { mode: true, modeReason: true, nextAttemptAt: true },
      });
      const paused = !!open && open.mode === 'reminder' && ['flag_off', 'dry_run', 'breaker'].includes(open.modeReason ?? '');
      const date = nextChargeDate(ctx.sub.renewsAt, ctx.consent?.firstChargeDate ?? null, open);
      return {
        ...base,
        paused,
        nextCharge: date && ctx.plan?.amountMinor ? { date, amountMinor: ctx.plan.amountMinor } : null,
      };
    }
    const offer = await buildOwnerOffer({ db: prisma, store: prismaRenewalStore, flags }, userId, cards, locale, now);
    if (!offer.offer) return { ...base, reason: offer.reason ?? 'no_card' };
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, totpSecret: true, passwordHash: true } });
    const { terms } = offer.offer;
    return {
      ...base,
      offer: {
        textVersion: offer.offer.textVersion,
        text: offer.offer.text,
        textHash: offer.offer.textHash,
        cardHandle: offer.offer.cardHandle,
        terms: {
          planId: terms.planId,
          planName: terms.planName,
          amountMinor: terms.amountMinor,
          firstChargeDate: terms.firstChargeDate,
          last4: terms.last4,
          locale: terms.locale,
        },
      },
      stepUpMethod: user ? stepUpMethodFor(user) : null,
    };
  };
}

/**
 * Mails an `off_*` notice for a change the owner did not make in the panel
 * (card removed, plan changed). Returns true when Resend accepted it.
 */
export async function sendAutoRenewOffMail(
  userId: string,
  variant: 'off_card_removed' | 'off_plan_changed' | 'off_admin' | 'off_account_deletion',
): Promise<boolean> {
  const ctx = await prismaRenewalStore.loadRenewalContext(userId);
  if (!ctx || !ctx.user.email || ctx.user.email.endsWith('.invalid')) return false;
  return sendAutoRenewChangedMail(
    { email: ctx.user.email, locale: ctx.user.locale },
    { variant, planName: ctx.plan?.name ?? '', amountMinor: null, accessUntil: ctx.sub.renewsAt },
  );
}
