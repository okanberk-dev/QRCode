import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderP, renderButton, spacer } from '../components';
import { LC_TABLE, lcPage, lcSection, lcHero, lcChip, lcFootnote, lcHasName, lcDropNameToken } from './lifecycle-ui';
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

  const loaded = await loadMailCopy('first-feedback-tips', locale, inlineDefault);
  // No first name: drop the token + its greeting/punctuation (no filler word).
  const hasName = lcHasName(params.firstName);
  const merged = hasName ? loaded : lcDropNameToken(loaded, locale);
  const vars = {
    firstName: hasName ? params.firstName : '',
    restaurantName: params.restaurantName,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Tip titles are copy-owned and start with their number ("1. Görünürlük…").
  // Pull the numeral into a chip so the row reads as a designed step; falls
  // back to the row index when an admin override drops the numeral.
  const tips = [
    { title: copy.tip1Title, body: copy.tip1Body },
    { title: copy.tip2Title, body: copy.tip2Body },
    { title: copy.tip3Title, body: copy.tip3Body },
  ];
  const tipRows = tips.map((t, i) => {
    const m = /^\s*(\d+)[.)]\s*([\s\S]*)$/.exec(t.title);
    const num = m ? m[1] : String(i + 1);
    const title = m ? m[2] : t.title;
    const border = `${i === 0 ? `border-top:1px solid ${PULSE.n200};` : ''}border-bottom:1px solid ${PULSE.n200};`;
    return `
      <tr>
        <td valign="top" width="52" style="width:52px;padding:20px 16px 20px 0;${border}">${lcChip(num, { size: 36, fontSize: 14 })}</td>
        <td valign="top" style="padding:18px 0 20px;${border}">
          <div style="font-family:${FONTS.heading};font-size:16px;font-weight:600;line-height:1.35;letter-spacing:-0.01em;color:${PULSE.graphite};">${title}</div>
          ${spacer(6)}
          ${renderP(t.body, { size: 14 })}
        </td>
      </tr>`;
  }).join('');

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrow,
      title: copy.title,
      titleSize: 34,
      intro: [copy.intro],
    }),
    lcSection(`<table ${LC_TABLE} width="100%">${tipRows}</table>`, { padding: '28px 40px 8px' }),
    lcSection(renderButton({ href: escapeHtml(params.dashboardUrl), label: copy.cta, variant: 'dark', size: 'lg' }), { padding: '28px 40px 36px' }),
    lcFootnote(copy.footnote),
  ]);

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
    html: pulseLayout({ subject, preheader, content, footer: { locale } }),
    text,
  };
}
