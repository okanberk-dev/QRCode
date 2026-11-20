import { SITE_URL } from '@/lib/site';
import { sendBillingCardRetentionEmail, sendBillingPeriodEndedEmail, sendBillingRenewalUpcomingEmail } from '@/lib/email';
import { billingLog } from './redact';
import type { RenewalMailer } from './renewal-engine';
import type { MailTarget, RetentionMailer } from './retention';

/**
 * The billing mailer (billing spec §6.1 `billing-mails.ts`) on top of the
 * Pulse mail helpers (CLAUDE.md §21): `sendResendEmail` returns true only
 * when Resend accepted the message, so a reminder that was not delivered
 * keeps its slot free and is retried by the next tick.
 *
 * Mails carry no token in any link: renewal links go to the review page
 * (login required) or the panel. They show only the plan name, the amount,
 * dates and the last four digits of a saved card. Nothing is logged but the
 * template key and the outcome.
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

export const billingMailer: RenewalMailer & RetentionMailer = {
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
