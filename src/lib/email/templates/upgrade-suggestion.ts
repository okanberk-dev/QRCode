import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton } from '../components';
import { LC_TABLE, lcPage, lcSection, lcHero, lcChip, lcCard, lcFootnote, lcHasName, lcDropNameToken } from './lifecycle-ui';
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

  const loaded = await loadMailCopy('upgrade-suggestion', locale, inlineDefault);
  // No first name: drop the token + its greeting/punctuation (no filler word).
  const hasName = lcHasName(params.firstName);
  const merged = hasName ? loaded : lcDropNameToken(loaded, locale);
  const vars = {
    firstName: hasName ? params.firstName : '',
    restaurantName: params.restaurantName,
    feedbackCount: String(params.feedbackCount),
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Dark hero (premium plan pitch) → check-marked feature list → lime CTA.
  const features = [copy.feature1, copy.feature2, copy.feature3, copy.feature4];
  const featureRows = features.map((f, i) => `
    <tr>
      <td valign="top" width="40" style="width:40px;padding:14px 12px 14px 0;${i > 0 ? `border-top:1px solid ${PULSE.n200};` : ''}">${lcChip('✓', { size: 28, bg: PULSE.lime, fg: PULSE.graphite, fontSize: 13, radius: 8 })}</td>
      <td valign="middle" style="padding:14px 0;${i > 0 ? `border-top:1px solid ${PULSE.n200};` : ''}font-family:${FONTS.body};font-size:14px;font-weight:500;line-height:1.55;color:${PULSE.n800};">${f}</td>
    </tr>`).join('');

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrow,
      eyebrowColor: PULSE.lime,
      title: copy.title,
      titleSize: 34,
      titleColor: PULSE.pure,
      intro: [copy.intro],
      introColor: PULSE.n300,
      bg: PULSE.graphite,
      ecg: 'lime',
    }),
    lcSection(
      lcCard(`<table ${LC_TABLE} width="100%">${featureRows}</table>`, { padding: '6px 20px' }),
      { padding: '32px 40px 8px' },
    ),
    lcSection(renderButton({ href: escapeHtml(params.pricingUrl), label: copy.cta, variant: 'lime', size: 'lg' }), { padding: '28px 40px 36px' }),
    lcFootnote(copy.footnote),
  ]);

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
    html: pulseLayout({ subject, preheader, content, footer: { locale } }),
    text,
  };
}
