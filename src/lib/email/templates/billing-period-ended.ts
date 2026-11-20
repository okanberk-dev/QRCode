// Billing — the paid period ended without a renewal (billing spec §9.2
// phase 5, §13.4). Queued by the renewal engine when a renewal lapses and
// sent in the next 09:00–21:00 Istanbul window.

import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, spacer } from '../components';
import { lcFootnote, lcHero, lcPage, lcSection } from './lifecycle-ui';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { BILLING_PERIOD_ENDED_EN, BILLING_PERIOD_ENDED_TR } from './billing-defaults';

export interface BillingPeriodEndedParams {
  planName: string;
  /** `/{locale}/pricing` (the dashboard is locked once the period ended). */
  pricingUrl: string;
}

export async function renderBillingPeriodEnded(
  params: BillingPeriodEndedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr ? 'Planınızın süresi doldu' : 'Your plan has ended';
  const loaded = await loadMailCopy('billing-period-ended', locale, isTr ? BILLING_PERIOD_ENDED_TR : BILLING_PERIOD_ENDED_EN);
  const vars = { planName: params.planName || 'Buaze' };
  const copy = deepSubstitute(loaded, vars, 'html');
  const copyText = deepSubstitute(loaded, vars, 'text');

  const content = lcPage([
    lcHero({ eyebrow: copy.eyebrow, eyebrowTone: 'warn', title: copy.title, titleSize: 30, intro: [copy.intro] }),
    lcSection(`${spacer(4)}${renderButton({ href: escapeHtml(params.pricingUrl), label: copy.cta, size: 'lg' })}`, {
      padding: '24px 40px 28px',
    }),
    lcFootnote(copy.footnote),
  ]);
  const html = pulseLayout({
    subject,
    preheader: copyText.intro.slice(0, 110),
    content,
    eyebrow: `<span style="overflow-wrap:anywhere;word-break:break-word;">${copy.headerEyebrow}</span>`,
    footer: { locale },
  });
  const text = [copyText.title, '', copyText.intro, '', `${copyText.cta}: ${params.pricingUrl}`, '', copyText.footnote].join('\n');
  return { subject, html, text };
}
