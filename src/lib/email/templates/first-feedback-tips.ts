import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderH2, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { FIRST_FEEDBACK_TIPS_DEFAULTS } from './lifecycle-defaults';

export interface FirstFeedbackTipsParams {
  firstName?: string | null;
  restaurantName: string;
  dashboardUrl: string;
}

// Lifecycle email — QR indirildi (`QrGeneration.count > 0`) ama 2-3 gün
// geçti, hâlâ feedback yok (CLAUDE.md §21.34 + §23.7 Phase 11.30).
// Idempotent: 1 kez (lifetime).

export async function renderFirstFeedbackTips(
  params: FirstFeedbackTipsParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? 'İlk geri bildiriminizi almak için 3 pratik öneri'
    : '3 practical tips to collect your first feedback';
  const preheader = isTr
    ? `${params.restaurantName} için QR kartınız hazır. İlk yorumun gelmesi için küçük dokunuşlar.`
    : `Your QR for ${params.restaurantName} is ready. Small touches that bring in the first review.`;

  const inlineDefault = FIRST_FEEDBACK_TIPS_DEFAULTS[isTr ? 'tr' : 'en'];

  const merged = await loadMailCopy('first-feedback-tips', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = {
    firstName: params.firstName || fallbackName,
    restaurantName: params.restaurantName,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const content = [
    renderEyebrow(copy.eyebrow),
    renderH1(copy.title),
    spacer(8),
    renderP(copy.intro),
    spacer(20),
    renderH2(copy.tip1Title),
    renderP(copy.tip1Body),
    spacer(12),
    renderH2(copy.tip2Title),
    renderP(copy.tip2Body),
    spacer(12),
    renderH2(copy.tip3Title),
    renderP(copy.tip3Body),
    spacer(28),
    renderButton({ href: params.dashboardUrl, label: copy.cta, variant: 'dark', size: 'lg' }),
    spacer(32),
    renderP(copy.footnote, { color: '#737373', size: 12 }),
  ].join('\n');

  const text = [
    copyText.eyebrow,
    '',
    copyText.title,
    '',
    copyText.intro,
    '',
    copyText.tip1Title,
    copyText.tip1Body,
    '',
    copyText.tip2Title,
    copyText.tip2Body,
    '',
    copyText.tip3Title,
    copyText.tip3Body,
    '',
    `→ ${copyText.cta}: ${params.dashboardUrl}`,
    '',
    copyText.footnote,
  ].join('\n');

  return {
    subject,
    html: pulseLayout({ subject, preheader, content }),
    text,
  };
}
