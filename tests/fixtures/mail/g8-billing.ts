// g8 — billing mails of the saved-card release (billing spec §13.4): renewal reminders (reminder mode),
// period ended, stored-card retention notice.
import { renderBillingAutoNotice, renderBillingRenewalUpcoming } from '../../../src/lib/email/templates/billing-renewal-upcoming';
import { renderBillingRenewalFailed, renderBillingRenewalPaid } from '../../../src/lib/email/templates/billing-renewal-result';
import { renderBillingAutoRenewChanged, type BillingAutoRenewChangedVariant } from '../../../src/lib/email/templates/billing-auto-renew-changed';
import { autoRenewConsentText } from '../../../src/lib/billing/consent';
import { renderBillingPeriodEnded } from '../../../src/lib/email/templates/billing-period-ended';
import { renderBillingCardRetention } from '../../../src/lib/email/templates/billing-card-retention';
import { APP_URL, LONG_NAME, type MailFixture } from './_env';

const E = new Date('2026-12-17T09:00:00Z');
const RENEW = `${APP_URL}/billing/tr/checkout?intent=renew`;
const ACCOUNT = `${APP_URL}/tr/dashboard/account?section=billing`;
const OFF = `${APP_URL}/billing/tr/auto-renew-off?t=ol1.${'a'.repeat(40)}.${'b'.repeat(43)}`;
const DAY = 24 * 3600_000;
const CONSENT = (locale: 'tr' | 'en', planName = 'Büyüme') =>
  autoRenewConsentText({
    version: 'ar-2026-12-v1', locale, planId: 'plan_growth', planName, amountMinor: 99900, cycle: 'monthly',
    firstChargeDate: E.toISOString(), last4: '4242', noticeHours: 72, retryGapHours: 48, graceHours: 120, maxAttempts: 3,
    legalDocVersions: { 'mesafeli-hizmet-sozlesmesi': 'v3', 'iade-iptal-politikasi': 'default' },
  });
const OFF_VARIANTS: BillingAutoRenewChangedVariant[] = [
  'off_owner', 'off_card_removed', 'off_provider_missing', 'off_plan_changed', 'off_price_increase', 'off_admin', 'off_account_deletion',
];

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
  {
    id: 'billing-auto-notice',
    template: 'billing-renewal-upcoming',
    render: (locale) =>
      renderBillingAutoNotice(
        { planName: 'Büyüme', amountMinor: 99900, chargeDate: E, retryDates: [new Date(E.getTime() + 2 * DAY), new Date(E.getTime() + 4 * DAY)], last4: '4242', accountUrl: ACCOUNT, offLink: OFF },
        locale,
      ),
  },
  {
    id: 'billing-auto-notice:stress',
    template: 'billing-renewal-upcoming',
    stress: true,
    render: (locale) =>
      renderBillingAutoNotice(
        { planName: LONG_NAME, amountMinor: 123456789, chargeDate: E, retryDates: [new Date(E.getTime() + 2 * DAY)], last4: null, accountUrl: ACCOUNT, offLink: null },
        locale,
      ),
  },
  {
    id: 'billing-renewal-paid',
    template: 'billing-renewal-paid',
    render: (locale) =>
      renderBillingRenewalPaid({ variant: 'paid', planName: 'Büyüme', amountMinor: 99900, last4: '4242', newPeriodEnd: new Date(E.getTime() + 31 * DAY), accountUrl: ACCOUNT }, locale),
  },
  {
    id: 'billing-renewal-paid:refund',
    template: 'billing-renewal-paid',
    render: (locale) =>
      renderBillingRenewalPaid({ variant: 'refund_pending', planName: 'Büyüme', amountMinor: 99900, last4: '4242', newPeriodEnd: null, accountUrl: ACCOUNT }, locale),
  },
  ...(['attempt_1', 'attempt_2', 'final', 'hard', 'action_needed', 'unresolved'] as const).map(
    (variant): MailFixture => ({
      id: `billing-renewal-failed:${variant}`,
      template: 'billing-renewal-failed',
      render: (locale) =>
        renderBillingRenewalFailed(
          {
            variant,
            planName: 'Büyüme',
            amountMinor: 99900,
            last4: '4242',
            nextAttemptAt: variant.startsWith('attempt') ? new Date(E.getTime() + 2 * DAY) : null,
            accessUntil: new Date(E.getTime() + 5 * DAY),
            renewUrl: RENEW,
            accountUrl: ACCOUNT,
          },
          locale,
        ),
    }),
  ),
  {
    id: 'billing-renewal-failed:stress',
    template: 'billing-renewal-failed',
    stress: true,
    render: (locale) =>
      renderBillingRenewalFailed(
        { variant: 'attempt_1', planName: LONG_NAME, amountMinor: null, last4: null, nextAttemptAt: null, accessUntil: E, renewUrl: RENEW, accountUrl: ACCOUNT },
        locale,
      ),
  },
  {
    id: 'billing-auto-renew-changed:on',
    template: 'billing-auto-renew-changed',
    render: (locale) =>
      renderBillingAutoRenewChanged(
        { variant: 'on', planName: 'Büyüme', amountMinor: 99900, last4: '4242', chargeDate: E, consentText: CONSENT(locale), offLink: OFF, accountUrl: ACCOUNT },
        locale,
      ),
  },
  {
    id: 'billing-auto-renew-changed:on-stress',
    template: 'billing-auto-renew-changed',
    stress: true,
    render: (locale) =>
      renderBillingAutoRenewChanged(
        { variant: 'on', planName: LONG_NAME, amountMinor: 123456789, last4: null, chargeDate: E, consentText: CONSENT(locale, LONG_NAME), offLink: OFF, accountUrl: ACCOUNT },
        locale,
      ),
  },
  {
    id: 'billing-auto-renew-changed:card_replaced',
    template: 'billing-auto-renew-changed',
    render: (locale) =>
      renderBillingAutoRenewChanged(
        { variant: 'card_replaced', planName: 'Büyüme', amountMinor: 99900, last4: '1881', chargeDate: E, retryDates: [new Date(E.getTime() + 2 * DAY), new Date(E.getTime() + 4 * DAY)], offLink: OFF, accountUrl: ACCOUNT },
        locale,
      ),
  },
  ...OFF_VARIANTS.map(
    (variant): MailFixture => ({
      id: `billing-auto-renew-changed:${variant}`,
      template: 'billing-auto-renew-changed',
      render: (locale) =>
        renderBillingAutoRenewChanged({ variant, planName: 'Büyüme', amountMinor: 99900, last4: '4242', accessUntil: E, accountUrl: ACCOUNT }, locale),
    }),
  ),
];
