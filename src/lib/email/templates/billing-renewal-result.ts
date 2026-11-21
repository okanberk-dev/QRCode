// Billing — results of an automatic charge (billing spec §10.2, §13.4):
//  - `billing-renewal-paid`: `paid` (the period was extended) and
//    `refund_pending` (the charge went through after auto-renew was turned off
//    while it was being processed; no period added, refunded).
//  - `billing-renewal-failed`: `attempt_1` / `attempt_2` (retry announced),
//    `final`, `hard`, `action_needed` and `unresolved` (D17).
// Queued by the renewal engine and sent in the next 09:00–21:00 Istanbul
// window. Links carry no token: the renewal link goes to the review page
// (login required), the account link to the panel.

import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderP, spacer } from '../components';
import { lcHero, lcPage, lcSection } from './lifecycle-ui';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { formatIstanbulDate, formatTry } from '../../billing/billing-format';
import {
  BILLING_AUTO_FOOTER,
  BILLING_RENEWAL_FAILED_EN,
  BILLING_RENEWAL_FAILED_TR,
  BILLING_RENEWAL_PAID_EN,
  BILLING_RENEWAL_PAID_TR,
} from './billing-defaults';
import { autoModeFooter, billingDetails, billingDetailsText, maskedCard, type BillingDetailRow } from './billing-mail-parts';

type Rendered = { subject: string; html: string; text: string };

function shell(subject: string, preheader: string, headerEyebrow: string, rows: string[], locale: 'tr' | 'en'): string {
  return pulseLayout({
    subject,
    preheader,
    content: lcPage(rows),
    eyebrow: `<span style="overflow-wrap:anywhere;word-break:break-word;">${headerEyebrow}</span>`,
    footer: { locale },
  });
}

// ── Paid / refund pending ──────────────────────────────────────────────────

export interface BillingRenewalPaidParams {
  variant: 'paid' | 'refund_pending';
  planName: string;
  amountMinor: number | null;
  last4: string | null;
  /** The subscription's new period end (`paid` only). */
  newPeriodEnd: Date | null;
  /** `/{locale}/dashboard/account?section=billing`. */
  accountUrl: string;
}

export async function renderBillingRenewalPaid(params: BillingRenewalPaidParams, locale: 'tr' | 'en' = 'tr'): Promise<Rendered> {
  const isTr = locale !== 'en';
  const loc = isTr ? 'tr' : 'en';
  const refund = params.variant === 'refund_pending';
  const plan = params.planName || 'Buaze';
  const amount = params.amountMinor != null && params.amountMinor > 0 ? formatTry(params.amountMinor, locale) : '';
  const date = params.newPeriodEnd ? formatIstanbulDate(params.newPeriodEnd, locale) : '';
  const subject = refund
    ? isTr ? `Çekim iade edilecek · ${plan}` : `This charge will be refunded · ${plan}`
    : isTr ? `Ödemeniz alındı · ${plan}` : `Payment received · ${plan}`;

  const loaded = await loadMailCopy('billing-renewal-paid', locale, isTr ? BILLING_RENEWAL_PAID_TR : BILLING_RENEWAL_PAID_EN);
  const vars = { planName: plan, amount, date };
  const copy = deepSubstitute(loaded, vars, 'html');
  const copyText = deepSubstitute(loaded, vars, 'text');

  const card = maskedCard(params.last4);
  const rows = (c: typeof copyText): BillingDetailRow[] => [
    { label: c.labelPlan, value: plan },
    ...(amount ? [{ label: c.labelAmount, value: amount }] : []),
    ...(card ? [{ label: c.labelCard, value: card }] : []),
    ...(!refund && date ? [{ label: c.labelPeriodEnd, value: date }] : []),
  ];
  const intro = refund ? copy.introRefund : date ? copy.introPaid : copy.introPaidNoDate;
  const introText = refund ? copyText.introRefund : date ? copyText.introPaid : copyText.introPaidNoDate;
  // A refunded charge is not an auto-mode mail of a running instruction: no "turn off" footer.
  const footer = refund ? null : autoModeFooter({ copy: BILLING_AUTO_FOOTER[loc], manageUrl: params.accountUrl });

  const html = shell(
    subject,
    `${plan}${amount ? ` · ${amount}` : ''}`,
    copy.headerEyebrow,
    [
      lcHero({
        eyebrow: refund ? copy.eyebrowRefund : copy.eyebrowPaid,
        eyebrowTone: refund ? 'warn' : 'plain',
        title: refund ? copy.titleRefund : copy.titlePaid,
        titleSize: 28,
        intro: [intro],
      }),
      lcSection(billingDetails(rows(copyText)), { padding: '24px 40px 8px' }),
      lcSection(
        `${refund ? `${renderP(copy.footnoteRefund, { size: 14, color: PULSE.n600 })}${spacer(20)}` : ''}${renderButton({ href: escapeHtml(params.accountUrl), label: copy.cta })}`,
        { padding: refund ? '24px 40px 40px' : '24px 40px 24px' },
      ),
      ...(footer ? [lcSection(footer.html, { padding: '4px 40px 40px' })] : []),
    ],
    locale,
  );
  const text = [
    refund ? copyText.titleRefund : copyText.titlePaid,
    '',
    introText,
    '',
    billingDetailsText(rows(copyText)),
    '',
    ...(refund ? [copyText.footnoteRefund] : []),
    `${copyText.cta}: ${params.accountUrl}`,
    ...(footer ? ['', footer.text] : []),
  ].join('\n');
  return { subject, html, text };
}

// ── Failed attempts and dunning ────────────────────────────────────────────

export type BillingRenewalFailedVariant = 'attempt_1' | 'attempt_2' | 'final' | 'hard' | 'action_needed' | 'unresolved';

export interface BillingRenewalFailedParams {
  variant: BillingRenewalFailedVariant;
  planName: string;
  amountMinor: number | null;
  last4: string | null;
  /** The announced retry (attempt_1 / attempt_2 only). */
  nextAttemptAt: Date | null;
  /** The real access end (the grace end of the renewal). */
  accessUntil: Date;
  /** `/billing/{locale}/checkout?intent=renew` (login required). */
  renewUrl: string;
  /** `/{locale}/dashboard/account?section=billing`. */
  accountUrl: string;
}

export async function renderBillingRenewalFailed(params: BillingRenewalFailedParams, locale: 'tr' | 'en' = 'tr'): Promise<Rendered> {
  const isTr = locale !== 'en';
  const loc = isTr ? 'tr' : 'en';
  const v = params.variant;
  const isAttempt = v === 'attempt_1' || v === 'attempt_2';
  // An attempt mail without a retry date cannot promise one: it reads as "action needed".
  const variant: BillingRenewalFailedVariant = isAttempt && !params.nextAttemptAt ? 'action_needed' : v;
  const plan = params.planName || 'Buaze';
  const amount = params.amountMinor != null && params.amountMinor > 0 ? formatTry(params.amountMinor, locale) : '';
  const date = params.nextAttemptAt ? formatIstanbulDate(params.nextAttemptAt, locale) : '';
  const grace = formatIstanbulDate(params.accessUntil, locale);

  const subject =
    variant === 'attempt_1' || variant === 'attempt_2'
      ? isTr ? `Ödemeniz alınamadı, ${date} tarihinde tekrar deneyeceğiz` : `We couldn't take your payment, we'll retry on ${date}`
      : variant === 'final'
        ? isTr ? `Son deneme başarısız: erişiminiz ${grace} tarihinde duracak` : `Final attempt failed: access stops on ${grace}`
        : variant === 'unresolved'
          ? isTr ? 'Ödemenizin sonucunu doğruluyoruz' : "We're verifying your payment"
          : isTr ? 'Aboneliğiniz için işlem gerekiyor' : 'Action needed for your subscription';

  const loaded = await loadMailCopy('billing-renewal-failed', locale, isTr ? BILLING_RENEWAL_FAILED_TR : BILLING_RENEWAL_FAILED_EN);
  const vars = { planName: plan, amount: amount || (isTr ? 'abonelik ücreti' : 'the subscription fee'), date, grace };
  const copy = deepSubstitute(loaded, vars, 'html');
  const copyText = deepSubstitute(loaded, vars, 'text');

  type Copy = typeof copyText;
  const pick = (c: Copy) => {
    switch (variant) {
      case 'attempt_1':
      case 'attempt_2':
        return { eyebrow: c.eyebrowAttempt, title: c.titleAttempt, intro: [c.introAttempt, c.hintAttempt] };
      case 'final':
        return { eyebrow: c.eyebrowFinal, title: c.titleFinal, intro: [c.introFinal] };
      case 'hard':
        return { eyebrow: c.eyebrowHard, title: c.titleHard, intro: [c.introHard] };
      case 'unresolved':
        return { eyebrow: c.eyebrowUnresolved, title: c.titleUnresolved, intro: [c.introUnresolved] };
      default:
        return { eyebrow: c.eyebrowHard, title: c.titleHard, intro: [c.introActionNeeded] };
    }
  };
  const h = pick(copy);
  const t = pick(copyText);

  const card = maskedCard(params.last4);
  const rows = (c: Copy): BillingDetailRow[] => [
    { label: c.labelPlan, value: plan },
    ...(amount ? [{ label: c.labelAmount, value: amount }] : []),
    ...(card ? [{ label: c.labelCard, value: card }] : []),
    ...(date && (variant === 'attempt_1' || variant === 'attempt_2') ? [{ label: c.labelNextAttempt, value: date }] : []),
    { label: c.labelAccessUntil, value: grace },
  ];
  const footer = autoModeFooter({ copy: BILLING_AUTO_FOOTER[loc], manageUrl: params.accountUrl });

  const html = shell(
    subject,
    `${plan} · ${grace}`,
    copy.headerEyebrow,
    [
      lcHero({ eyebrow: h.eyebrow, eyebrowTone: 'warn', title: h.title, titleSize: 28, intro: h.intro }),
      lcSection(billingDetails(rows(copyText)), { padding: '24px 40px 8px' }),
      lcSection(renderButton({ href: escapeHtml(params.renewUrl), label: copy.cta, size: 'lg' }), { padding: '24px 40px 24px' }),
      lcSection(footer.html, { padding: '4px 40px 40px' }),
    ],
    locale,
  );
  const text = [t.title, '', ...t.intro, '', billingDetailsText(rows(copyText)), '', `${copyText.cta}: ${params.renewUrl}`, '', footer.text].join('\n');
  return { subject, html, text };
}
