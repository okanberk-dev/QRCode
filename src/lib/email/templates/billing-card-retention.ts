// Billing — stored-card retention notice (billing spec §4.4): 14 days
// before a card stored at PayNKolay is deleted because the subscription
// ended 166 days ago. Sent by the retention phase of the renewal engine.

import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderP, spacer } from '../components';
import { PULSE } from '../tokens';
import { lcHero, lcPage, lcSection } from './lifecycle-ui';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { formatIstanbulDate } from '../../billing/billing-format';
import { BILLING_CARD_RETENTION_EN, BILLING_CARD_RETENTION_TR } from './billing-defaults';
import { maskedCard } from './billing-mail-parts';

export interface BillingCardRetentionParams {
  last4: string | null;
  deleteOn: Date;
  /** `/billing/{locale}/card`: the saved-card page outside the dashboard gate (a lapsed owner can open it). */
  accountUrl: string;
}

/** The card as a whole noun phrase, so the last four digits never run into the date ("•••• 4242 19 Ara"). */
export function retentionCardPhrase(last4: string | null, locale: 'tr' | 'en'): string {
  const masked = maskedCard(last4);
  if (locale === 'en') return masked ? `your card ending in ${last4}` : 'your saved card';
  return masked ? `${masked} ile biten kartınız` : 'kartınız';
}

export async function renderBillingCardRetention(
  params: BillingCardRetentionParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const date = formatIstanbulDate(params.deleteOn, locale);
  const subject = isTr ? `Kayıtlı kartınız ${date} tarihinde silinecek` : `Your saved card will be deleted on ${date}`;
  const loaded = await loadMailCopy('billing-card-retention', locale, isTr ? BILLING_CARD_RETENTION_TR : BILLING_CARD_RETENTION_EN);
  const card = retentionCardPhrase(params.last4, isTr ? 'tr' : 'en');
  const vars = { date, card };
  const copy = deepSubstitute(loaded, vars, 'html');
  const copyText = deepSubstitute(loaded, vars, 'text');

  const content = lcPage([
    lcHero({ eyebrow: copy.eyebrow, title: copy.title, titleSize: 28, intro: [copy.intro] }),
    lcSection(
      `${renderP(copy.outro, { size: 14, color: PULSE.n600 })}${spacer(20)}${renderButton({ href: escapeHtml(params.accountUrl), label: copy.cta })}`,
      { padding: '20px 40px 40px' },
    ),
  ]);
  const html = pulseLayout({
    subject,
    preheader: copyText.title,
    content,
    eyebrow: `<span style="overflow-wrap:anywhere;word-break:break-word;">${copy.headerEyebrow}</span>`,
    footer: { locale },
  });
  const text = [copyText.title, '', copyText.intro, copyText.outro, '', `${copyText.cta}: ${params.accountUrl}`].join('\n');
  return { subject, html, text };
}
