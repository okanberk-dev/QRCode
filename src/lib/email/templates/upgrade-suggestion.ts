import { pulseLayout } from '../layout';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { UPGRADE_SUGGESTION_DEFAULTS } from './lifecycle-defaults';

export interface UpgradeSuggestionParams {
  firstName?: string | null;
  restaurantName: string;
  feedbackCount: number;
  pricingUrl: string;
}

// Lifecycle email — yüksek feedback hacmi olan trial / starter kullanıcılarına
// upgrade önerisi (CLAUDE.md §21.34 + §23.7 Phase 11.30).
// Cooldown: 30 gün — overspam koruması.

export async function renderUpgradeSuggestion(
  params: UpgradeSuggestionParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? "Buaze'den daha fazla değer almak için planınızı yükseltin"
    : 'Upgrade your plan to get more from Buaze';
  const preheader = isTr
    ? `${params.restaurantName} için ${params.feedbackCount} yorum topladınız — Pro özellikler bekleyenlerle bağlantı kurmanıza yardım eder.`
    : `${params.feedbackCount} reviews collected for ${params.restaurantName} — Pro features help you act on every one.`;

  const inlineDefault = UPGRADE_SUGGESTION_DEFAULTS[isTr ? 'tr' : 'en'];

  const merged = await loadMailCopy('upgrade-suggestion', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = {
    firstName: params.firstName || fallbackName,
    restaurantName: params.restaurantName,
    feedbackCount: String(params.feedbackCount),
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const featureList = `
    <ul style="margin: 0; padding: 0 0 0 20px; color: #1A1A1A; font-size: 14px; line-height: 1.6;">
      <li style="margin-bottom: 8px;">${copy.feature1}</li>
      <li style="margin-bottom: 8px;">${copy.feature2}</li>
      <li style="margin-bottom: 8px;">${copy.feature3}</li>
      <li>${copy.feature4}</li>
    </ul>
  `;

  const content = [
    renderEyebrow(copy.eyebrow),
    renderH1(copy.title),
    spacer(8),
    renderP(copy.intro),
    spacer(16),
    featureList,
    spacer(28),
    renderButton({ href: params.pricingUrl, label: copy.cta, variant: 'lime', size: 'lg' }),
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
    `• ${copyText.feature1}`,
    `• ${copyText.feature2}`,
    `• ${copyText.feature3}`,
    `• ${copyText.feature4}`,
    '',
    `→ ${copyText.cta}: ${params.pricingUrl}`,
    '',
    copyText.footnote,
  ].join('\n');

  return {
    subject,
    html: pulseLayout({ subject, preheader, content }),
    text,
  };
}
