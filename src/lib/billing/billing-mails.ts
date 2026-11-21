import { SITE_URL } from '@/lib/site';
import {
  sendBillingAutoNoticeEmail,
  sendBillingAutoRenewChangedEmail,
  sendBillingCardRetentionEmail,
  sendBillingPeriodEndedEmail,
  sendBillingRenewalFailedEmail,
  sendBillingRenewalPaidEmail,
  sendBillingRenewalUpcomingEmail,
} from '@/lib/email';
import type { BillingAutoRenewChangedVariant } from '@/lib/email/templates/billing-auto-renew-changed';
import { billingLog } from './redact';
import type { RenewalMailer } from './renewal-engine';
import type { MailTarget, RetentionMailer } from './retention';

/**
 * The billing mailer (billing spec §6.1 `billing-mails.ts`) on top of the
 * Pulse mail helpers (CLAUDE.md §21): `sendResendEmail` returns true only
 * when Resend accepted the message, so a reminder that was not delivered
 * keeps its slot free and is retried by the next tick. For the pre-charge
 * notice this is what gates the charge (D5): no accepted notice, no charge.
 *
 * Mails carry no token in any link except the off-only link (§8.8), which
 * can only turn auto-renew off. Other links go to the review page (login
 * required) or the panel. They show only the plan name, the amount, dates and
 * the last four digits of a saved card. Nothing is logged but the template
 * key and the outcome.
 */

async function guarded(template: string, send: () => Promise<boolean>): Promise<boolean> {
  try {
    const ok = await send();
    if (!ok) billingLog('warn', 'mail.not_accepted', { code: template });
    return ok;
  } catch (err) {
    billingLog('error', 'mail.failed', { code: template, reason: err instanceof Error ? err.name : 'unknown' });
    return false;
  }
}

/** `/{locale}/dashboard/account?section=billing` (the panel's Plan & billing section). */
export function billingAccountUrl(locale: 'tr' | 'en'): string {
  return `${SITE_URL}/${locale}/dashboard/account?section=billing`;
}

export const billingMailer: Required<RenewalMailer> & RetentionMailer = {
  upcoming(to: MailTarget, v) {
    return guarded('billing-renewal-upcoming', () =>
      sendBillingRenewalUpcomingEmail({
        to: to.email,
        locale: to.locale,
        variant: v.variant,
        planName: v.planName,
        amountMinor: v.amountMinor,
        cycle: v.cycle,
        periodEnd: v.periodEnd,
        accessUntil: v.accessUntil,
        renewUrl: v.renewUrl,
        savedCardLast4: v.savedCardLast4,
      }),
    );
  },
  periodEnded(to: MailTarget, v) {
    return guarded('billing-period-ended', () =>
      sendBillingPeriodEndedEmail({ to: to.email, locale: to.locale, planName: v.planName, pricingUrl: v.pricingUrl }),
    );
  },
  autoNotice(to: MailTarget, v) {
    return guarded('billing-renewal-upcoming', () =>
      sendBillingAutoNoticeEmail({
        to: to.email,
        locale: to.locale,
        planName: v.planName,
        amountMinor: v.amountMinor,
        chargeDate: v.chargeDate,
        retryDates: v.retryDates,
        last4: v.last4,
        offLink: v.offLink,
        accountUrl: billingAccountUrl(to.locale),
      }),
    );
  },
  chargeResult(to: MailTarget, v) {
    if (v.variant === 'paid' || v.variant === 'refund_pending') {
      return guarded('billing-renewal-paid', () =>
        sendBillingRenewalPaidEmail({
          to: to.email,
          locale: to.locale,
          variant: v.variant as 'paid' | 'refund_pending',
          planName: v.planName,
          amountMinor: v.amountMinor,
          last4: v.last4,
          newPeriodEnd: v.newPeriodEnd ?? null,
          accountUrl: billingAccountUrl(to.locale),
        }),
      );
    }
    return guarded('billing-renewal-failed', () =>
      sendBillingRenewalFailedEmail({
        to: to.email,
        locale: to.locale,
        variant: v.variant as Exclude<typeof v.variant, 'paid' | 'refund_pending'>,
        planName: v.planName,
        amountMinor: v.amountMinor,
        last4: v.last4,
        nextAttemptAt: v.nextAttemptAt,
        accessUntil: v.accessUntil,
        renewUrl: v.renewUrl,
        accountUrl: billingAccountUrl(to.locale),
      }),
    );
  },
  autoRenewChanged(to: MailTarget, v) {
    return guarded('billing-auto-renew-changed', () =>
      sendBillingAutoRenewChangedEmail({
        to: to.email,
        locale: to.locale,
        variant: v.variant,
        planName: v.planName,
        amountMinor: v.amountMinor,
        last4: null,
        accessUntil: v.accessUntil,
        accountUrl: billingAccountUrl(to.locale),
      }),
    );
  },
  cardRetention(to: MailTarget, v) {
    return guarded('billing-card-retention', () =>
      sendBillingCardRetentionEmail({
        to: to.email,
        locale: to.locale,
        last4: v.last4,
        deleteOn: v.deleteOn,
        // The saved-card page outside the dashboard gate: the owner of an ended subscription is
        // redirected away from /dashboard, but must still be able to remove the card (consent text, §13.2).
        accountUrl: `${SITE_URL}/billing/${to.locale}/card`,
      }),
    );
  },
};

/**
 * Owner- and route-driven instruction mails (§8.2, §8.3, §8.8): `on` (the
 * durable confirmation with the full consent text and the off-only link),
 * `card_replaced` (D6) and the `off_*` variants. Returns true only when
 * Resend accepted the message.
 */
export function sendAutoRenewChangedMail(
  to: MailTarget,
  v: {
    variant: BillingAutoRenewChangedVariant;
    planName: string;
    amountMinor: number | null;
    last4?: string | null;
    chargeDate?: Date | null;
    retryDates?: Date[];
    accessUntil?: Date | null;
    consentText?: string | null;
    offLink?: string | null;
  },
): Promise<boolean> {
  return guarded('billing-auto-renew-changed', () =>
    sendBillingAutoRenewChangedEmail({
      to: to.email,
      locale: to.locale,
      variant: v.variant,
      planName: v.planName,
      amountMinor: v.amountMinor,
      last4: v.last4 ?? null,
      chargeDate: v.chargeDate ?? null,
      retryDates: v.retryDates ?? [],
      accessUntil: v.accessUntil ?? null,
      consentText: v.consentText ?? null,
      offLink: v.offLink ?? null,
      accountUrl: billingAccountUrl(to.locale),
    }),
  );
}
