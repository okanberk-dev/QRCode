// g8 — billing mails of the saved-card release (billing spec §13.4): renewal reminders (reminder mode),
// period ended, stored-card retention notice.
import { renderBillingRenewalUpcoming } from '../../../src/lib/email/templates/billing-renewal-upcoming';
import { renderBillingPeriodEnded } from '../../../src/lib/email/templates/billing-period-ended';
import { renderBillingCardRetention } from '../../../src/lib/email/templates/billing-card-retention';
import { APP_URL, LONG_NAME, type MailFixture } from './_env';

const E = new Date('2026-12-17T09:00:00Z');
const RENEW = `${APP_URL}/billing/tr/checkout?intent=renew`;

export const FIXTURES_G8: MailFixture[] = [
  {
    id: 'billing-renewal-upcoming',
    template: 'billing-renewal-upcoming',
    render: (locale) =>
      renderBillingRenewalUpcoming(
        { variant: 'reminder_7', planName: 'Büyüme', amountMinor: 99900, cycle: 'monthly', periodEnd: E, accessUntil: E, renewUrl: RENEW, savedCardLast4: '4242' },
        locale,
      ),
  },
  {
    id: 'billing-renewal-upcoming:last-call-grace',
    template: 'billing-renewal-upcoming',
    render: (locale) =>
      renderBillingRenewalUpcoming(
        { variant: 'reminder_1', planName: 'Kurumsal', amountMinor: 999000, cycle: 'yearly', periodEnd: E, accessUntil: new Date(E.getTime() + 120 * 3600_000), renewUrl: RENEW },
        locale,
      ),
  },
  {
    id: 'billing-renewal-upcoming:stress',
    template: 'billing-renewal-upcoming',
    stress: true,
    render: (locale) =>
      renderBillingRenewalUpcoming(
        { variant: 'reminder_7', planName: LONG_NAME, amountMinor: 123456789, cycle: 'monthly', periodEnd: E, accessUntil: E, renewUrl: RENEW, savedCardLast4: null },
        locale,
      ),
  },
  {
    id: 'billing-period-ended',
    template: 'billing-period-ended',
    render: (locale) => renderBillingPeriodEnded({ planName: 'Büyüme', pricingUrl: `${APP_URL}/${locale}/pricing` }, locale),
  },
  {
    id: 'billing-period-ended:stress',
    template: 'billing-period-ended',
    stress: true,
    render: (locale) => renderBillingPeriodEnded({ planName: LONG_NAME, pricingUrl: `${APP_URL}/${locale}/pricing` }, locale),
  },
  {
    id: 'billing-card-retention',
    template: 'billing-card-retention',
    render: (locale) =>
      renderBillingCardRetention({ last4: '4242', deleteOn: E, accountUrl: `${APP_URL}/${locale}/dashboard/account?section=billing` }, locale),
  },
  {
    id: 'billing-card-retention:stress',
    template: 'billing-card-retention',
    stress: true,
    render: (locale) =>
      renderBillingCardRetention({ last4: null, deleteOn: E, accountUrl: `${APP_URL}/${locale}/dashboard/account?section=billing&x=${'y'.repeat(80)}` }, locale),
  },
];
