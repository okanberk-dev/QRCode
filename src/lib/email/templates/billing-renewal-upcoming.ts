// Billing — renewal reminder (billing spec §9.2 phase 3, §13.4). Reminder
// mode: the subscription is not charged automatically; the mail leads the
// owner to a 3D Secure payment on PayNKolay's hosted page. Sent at E−7d
// (`reminder_7`) and E−1d (`reminder_1`), inside 09:00–21:00 Istanbul.

import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderP, spacer } from '../components';
import { lcFootnote, lcHero, lcPage, lcSection } from './lifecycle-ui';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { formatIstanbulDate, formatTry } from '../../billing/billing-format';
import { BILLING_AUTO_FOOTER, BILLING_RENEWAL_UPCOMING_EN, BILLING_RENEWAL_UPCOMING_TR } from './billing-defaults';
import {
  autoModeFooter,
  billingDetails,
  billingDetailsText,
  chargeCardPhrase,
  maskedCard,
  type BillingDetailRow,
} from './billing-mail-parts';

export interface BillingRenewalUpcomingParams {
  variant: 'reminder_7' | 'reminder_1';
  planName: string;
  /** DB plan price in kuruş at sending time; null hides the amount row. */
  amountMinor: number | null;
  cycle: 'monthly' | 'yearly';
  periodEnd: Date;
  /** Real access end (graceEndsAt of a consented renewal, else the period end). */
  accessUntil: Date;
  /** `/billing/{locale}/checkout?intent=renew` (login required) or the panel's plan picker. */
  renewUrl: string;
  savedCardLast4?: string | null;
}

export async function renderBillingRenewalUpcoming(
  params: BillingRenewalUpcomingParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const date = formatIstanbulDate(params.periodEnd, locale);
  const grace = formatIstanbulDate(params.accessUntil, locale);
  const hasGrace = params.accessUntil.getTime() > params.periodEnd.getTime();
  const tomorrow = params.variant === 'reminder_1';

  const subject = tomorrow
    ? isTr
      ? 'Aboneliğiniz yarın sona eriyor'
      : 'Your subscription ends tomorrow'
    : isTr
      ? `Aboneliğiniz ${date} tarihinde sona eriyor`
      : `Your subscription ends on ${date}`;

  const loaded = await loadMailCopy('billing-renewal-upcoming', locale, isTr ? BILLING_RENEWAL_UPCOMING_TR : BILLING_RENEWAL_UPCOMING_EN);
  const vars = { planName: params.planName || 'Buaze', date, grace, amount: '', card: '', retry1: '', retry2: '' };
  const copy = deepSubstitute(loaded, vars, 'html');
  const copyText = deepSubstitute(loaded, vars, 'text');

  const amount = params.amountMinor != null && params.amountMinor > 0 ? formatTry(params.amountMinor, locale) : null;
  const card = maskedCard(params.savedCardLast4);
  const rows = (c: typeof copyText): BillingDetailRow[] => [
    { label: c.labelPlan, value: params.planName || 'Buaze' },
    ...(amount ? [{ label: c.labelAmount, value: amount, hint: params.cycle === 'yearly' ? c.perYear : c.perMonth }] : []),
    { label: c.labelPeriodEnd, value: date },
    ...(card ? [{ label: c.labelCard, value: card }] : []),
  ];

  const intro = [copy.intro, ...(hasGrace ? [copy.introGrace] : [])];
  const content = lcPage([
    lcHero({
      eyebrow: tomorrow ? copy.eyebrow1 : copy.eyebrow7,
      eyebrowTone: tomorrow ? 'warn' : 'plain',
      title: tomorrow ? copy.title1 : copy.title7,
      titleSize: 30,
      intro,
    }),
    lcSection(billingDetails(rows(copyText)), { padding: '24px 40px 8px' }),
    lcSection(
      `${renderP(copy.howTo, { size: 14, color: PULSE.n600 })}${spacer(20)}${renderButton({ href: escapeHtml(params.renewUrl), label: copy.cta, size: 'lg' })}`,
      { padding: '24px 40px 28px' },
    ),
    lcFootnote(copy.footnote),
  ]);

  const html = pulseLayout({
    subject,
    preheader: `${params.planName || 'Buaze'} · ${date}${amount ? ` · ${amount}` : ''}`,
    content,
    eyebrow: `<span style="overflow-wrap:anywhere;word-break:break-word;">${copy.headerEyebrow}</span>`,
    footer: { locale },
  });
  const text = [
    tomorrow ? copyText.title1 : copyText.title7,
    '',
    copyText.intro,
    ...(hasGrace ? [copyText.introGrace] : []),
    '',
    billingDetailsText(rows(copyText)),
    '',
    copyText.howTo,
    `${copyText.cta}: ${params.renewUrl}`,
    '',
    copyText.footnote,
  ].join('\n');
  return { subject, html, text };
}

export interface BillingAutoNoticeParams {
  planName: string;
  /** The amount that will be charged, in kuruş (the DB price at notice time, D5). */
  amountMinor: number;
  /** The first attempt this notice announces. */
  chargeDate: Date;
  /** The remaining announced attempts (0-2), in order. */
  retryDates: Date[];
  last4: string | null;
  /** `/{locale}/dashboard/account?section=billing`. */
  accountUrl: string;
  /** The off-only link (§8.8); null without the HMAC key. */
  offLink: string | null;
}

/**
 * `billing-renewal-upcoming` / `auto_notice` (billing spec §9.2 phase 3,
 * §13.4): sent from 96 h before the period end, naming the amount, the card,
 * the charge date and both retry dates. Its delivery gates the charge (D5):
 * no notice, no charge.
 */
export async function renderBillingAutoNotice(
  params: BillingAutoNoticeParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const loc = isTr ? 'tr' : 'en';
  const date = formatIstanbulDate(params.chargeDate, locale);
  const amount = formatTry(params.amountMinor, locale);
  const retries = params.retryDates.slice(0, 2).map((d) => formatIstanbulDate(d, locale));
  const subject = isTr
    ? `Aboneliğiniz ${date} tarihinde otomatik yenilenecek (${amount})`
    : `Your subscription renews automatically on ${date} (${amount})`;

  const loaded = await loadMailCopy('billing-renewal-upcoming', locale, isTr ? BILLING_RENEWAL_UPCOMING_TR : BILLING_RENEWAL_UPCOMING_EN);
  const vars = {
    planName: params.planName || 'Buaze',
    date,
    grace: '',
    amount,
    card: chargeCardPhrase(params.last4, loc),
    retry1: retries[0] ?? '',
    retry2: retries[1] ?? '',
  };
  const copy = deepSubstitute(loaded, vars, 'html');
  const copyText = deepSubstitute(loaded, vars, 'text');
  const retryLine = (c: typeof copyText) => (retries.length >= 2 ? c.retryTwo : retries.length === 1 ? c.retryOne : '');

  const card = maskedCard(params.last4);
  const rows = (c: typeof copyText): BillingDetailRow[] => [
    { label: c.labelPlan, value: params.planName || 'Buaze' },
    { label: c.labelAmount, value: amount, hint: c.perMonth },
    { label: c.labelChargeDate, value: date },
    ...(retries.length ? [{ label: c.labelRetries, value: retries.join(' · ') }] : []),
    ...(card ? [{ label: c.labelCard, value: card }] : []),
  ];
  const footer = autoModeFooter({ copy: BILLING_AUTO_FOOTER[loc], manageUrl: params.accountUrl, offLink: params.offLink });

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrowAuto,
      title: copy.titleAuto,
      titleSize: 28,
      intro: [copy.introAuto, ...(retryLine(copy) ? [retryLine(copy)] : [])],
    }),
    lcSection(billingDetails(rows(copyText)), { padding: '24px 40px 8px' }),
    lcSection(
      `${renderP(copy.offBeforeAuto, { size: 14, color: PULSE.n600 })}${spacer(20)}${renderButton({ href: escapeHtml(params.accountUrl), label: copy.ctaAuto })}`,
      { padding: '24px 40px 24px' },
    ),
    lcSection(footer.html, { padding: '4px 40px 40px' }),
  ]);
  const html = pulseLayout({
    subject,
    preheader: `${params.planName || 'Buaze'} · ${date} · ${amount}`,
    content,
    eyebrow: `<span style="overflow-wrap:anywhere;word-break:break-word;">${copy.headerEyebrow}</span>`,
    footer: { locale },
  });
  const text = [
    copyText.titleAuto,
    '',
    copyText.introAuto,
    ...(retryLine(copyText) ? [retryLine(copyText)] : []),
    '',
    billingDetailsText(rows(copyText)),
    '',
    copyText.offBeforeAuto,
    `${copyText.ctaAuto}: ${params.accountUrl}`,
    '',
    footer.text,
  ].join('\n');
  return { subject, html, text };
}
