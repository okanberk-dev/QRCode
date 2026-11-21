// Billing — the auto-renew instruction changed (billing spec §8.3, §13.4):
//  - `on`: the durable-medium confirmation. Repeats the full consent text the
//    owner confirmed (§13.3), the first charge date, the amount, the card and
//    the off-only "not you?" link (§8.8). Its delivery sets
//    `billing_consents.confirmation_sent_at` and counts as the pre-charge
//    notice of the open renewal.
//  - `card_replaced`: the new card, the amount and the next charge date
//    (counts as the notice for that charge, D6), plus the off-only link.
//  - `off_*`: who or what turned auto-renew off, and until when the plan stays
//    active. No off link (it is already off).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderP, spacer } from '../components';
import { lcHero, lcPage, lcSection } from './lifecycle-ui';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { formatIstanbulDate, formatTry } from '../../billing/billing-format';
import { BILLING_AUTO_FOOTER, BILLING_AUTO_RENEW_CHANGED_EN, BILLING_AUTO_RENEW_CHANGED_TR } from './billing-defaults';
import {
  autoModeFooter,
  billingDetails,
  billingDetailsText,
  chargeCardPhrase,
  maskedCard,
  type BillingDetailRow,
} from './billing-mail-parts';

export type BillingAutoRenewChangedVariant =
  | 'on'
  | 'card_replaced'
  | 'off_owner'
  | 'off_card_removed'
  | 'off_provider_missing'
  | 'off_plan_changed'
  | 'off_price_increase'
  | 'off_admin'
  | 'off_account_deletion';

export interface BillingAutoRenewChangedParams {
  variant: BillingAutoRenewChangedVariant;
  planName: string;
  amountMinor: number | null;
  last4: string | null;
  /** `on`: the first charge; `card_replaced`: the next charge. */
  chargeDate?: Date | null;
  /** `card_replaced`: the remaining announced attempts (it counts as the notice, D6). */
  retryDates?: Date[];
  /** `off_*`: the end of the paid period (or the running grace). */
  accessUntil?: Date | null;
  /** `on`: the consent text exactly as stored (`billing_consents.text_rendered`). */
  consentText?: string | null;
  /** `on` / `card_replaced`: the off-only link (§8.8); null without the HMAC key. */
  offLink?: string | null;
  /** `/{locale}/dashboard/account?section=billing`. */
  accountUrl: string;
}

const RETRY = {
  tr: { one: (a: string) => `Çekim başarısız olursa ${a} tarihinde yeniden denenir.`, two: (a: string, b: string) => `Çekim başarısız olursa ${a} ve ${b} tarihlerinde yeniden denenir.`, label: 'Yeniden deneme' },
  en: { one: (a: string) => `If the charge fails, it is retried on ${a}.`, two: (a: string, b: string) => `If the charge fails, it is retried on ${a} and ${b}.`, label: 'Retries' },
} as const;

function consentBox(text: string): string {
  return `<div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:12px;padding:16px 18px;font-family:${FONTS.body};font-size:13px;line-height:1.6;color:${PULSE.n700};white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(text)}</div>`;
}

export async function renderBillingAutoRenewChanged(
  params: BillingAutoRenewChangedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const loc = isTr ? 'tr' : 'en';
  const v = params.variant;
  const on = v === 'on';
  const replaced = v === 'card_replaced';
  const off = !on && !replaced;
  const plan = params.planName || 'Buaze';
  const amount = params.amountMinor != null && params.amountMinor > 0 ? formatTry(params.amountMinor, locale) : '';
  const date = params.chargeDate ? formatIstanbulDate(params.chargeDate, locale) : '';
  const grace = params.accessUntil ? formatIstanbulDate(params.accessUntil, locale) : '';
  const masked = maskedCard(params.last4);
  const retries = on || replaced ? (params.retryDates ?? []).slice(0, 2).map((d) => formatIstanbulDate(d, locale)) : [];

  const subject = on
    ? isTr ? `Otomatik yenileme açıldı · ilk çekim ${date}` : `Auto-renew is on · first charge ${date}`
    : replaced
      ? isTr ? `Otomatik yenileme artık ${masked ? `${masked} ile` : 'yeni kartınızla'} · sonraki çekim ${date}` : `Auto-renew now uses ${masked || 'your new card'} · next charge ${date}`
      : isTr ? 'Otomatik yenileme kapatıldı' : 'Auto-renew is off';

  const loaded = await loadMailCopy('billing-auto-renew-changed', locale, isTr ? BILLING_AUTO_RENEW_CHANGED_TR : BILLING_AUTO_RENEW_CHANGED_EN);
  const vars = { planName: plan, amount: amount || (isTr ? 'abonelik ücreti' : 'the subscription fee'), date, grace, card: chargeCardPhrase(params.last4, loc) };
  const copy = deepSubstitute(loaded, vars, 'html');
  const copyText = deepSubstitute(loaded, vars, 'text');
  type Copy = typeof copyText;

  const offIntro = (c: Copy): string => {
    switch (v) {
      case 'off_card_removed': return c.introOffCardRemoved;
      case 'off_provider_missing': return c.introOffProviderMissing;
      case 'off_plan_changed': return c.introOffPlanChanged;
      case 'off_price_increase': return c.introOffPriceIncrease;
      case 'off_admin': return c.introOffAdmin;
      case 'off_account_deletion': return c.introOffAccountDeletion;
      default: return c.introOffOwner;
    }
  };
  const head = (c: Copy) =>
    on
      ? { eyebrow: c.eyebrowOn, title: c.titleOn, intro: c.introOn }
      : replaced
        ? { eyebrow: c.eyebrowReplaced, title: c.titleReplaced, intro: c.introReplaced }
        : { eyebrow: c.eyebrowOff, title: c.titleOff, intro: offIntro(c) };
  const h = head(copy);
  const t = head(copyText);
  const retryLine = retries.length >= 2 ? RETRY[loc].two(retries[0], retries[1]) : retries.length === 1 ? RETRY[loc].one(retries[0]) : '';

  const rows = (c: Copy): BillingDetailRow[] =>
    off
      ? [
          { label: c.labelPlan, value: plan },
          ...(grace && v !== 'off_account_deletion' ? [{ label: c.labelAccessUntil, value: grace }] : []),
        ]
      : [
          { label: c.labelPlan, value: plan },
          ...(amount ? [{ label: c.labelAmount, value: amount, hint: c.perMonth }] : []),
          ...(date ? [{ label: on ? c.labelFirstCharge : c.labelNextCharge, value: date }] : []),
          ...(retries.length ? [{ label: RETRY[loc].label, value: retries.join(' · ') }] : []),
          ...(masked ? [{ label: c.labelCard, value: masked }] : []),
        ];

  const footer = off ? null : autoModeFooter({ copy: BILLING_AUTO_FOOTER[loc], manageUrl: params.accountUrl, offLink: params.offLink ?? null });
  const consent = on && params.consentText ? params.consentText.normalize('NFC') : '';

  const sections = [
    lcHero({ eyebrow: h.eyebrow, title: h.title, titleSize: 28, intro: [h.intro, ...(retryLine ? [escapeHtml(retryLine)] : [])] }),
    lcSection(billingDetails(rows(copyText)), { padding: '24px 40px 8px' }),
    ...(consent
      ? [lcSection(`${renderP(copy.consentLead, { size: 14, color: PULSE.n600 })}${spacer(12)}${consentBox(consent)}`, { padding: '24px 40px 8px' })]
      : []),
    lcSection(renderButton({ href: escapeHtml(params.accountUrl), label: copy.cta }), { padding: footer ? '24px 40px 24px' : '24px 40px 40px' }),
    ...(footer ? [lcSection(footer.html, { padding: '4px 40px 40px' })] : []),
  ];
  const html = pulseLayout({
    subject,
    preheader: `${plan}${date ? ` · ${date}` : grace ? ` · ${grace}` : ''}${amount && !off ? ` · ${amount}` : ''}`,
    content: lcPage(sections),
    eyebrow: `<span style="overflow-wrap:anywhere;word-break:break-word;">${copy.headerEyebrow}</span>`,
    footer: { locale },
  });
  const text = [
    t.title,
    '',
    t.intro,
    ...(retryLine ? [retryLine] : []),
    '',
    billingDetailsText(rows(copyText)),
    ...(consent ? ['', copyText.consentLead, '', consent] : []),
    '',
    `${copyText.cta}: ${params.accountUrl}`,
    ...(footer ? ['', footer.text] : []),
  ].join('\n');
  return { subject, html, text };
}
