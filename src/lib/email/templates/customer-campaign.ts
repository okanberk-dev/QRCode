import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

// §38.48 Wave 2 — Customer email campaign template (owner → customer mass mail).
// Pulse template paterni (CLAUDE.md §21). Owner subject + body free-text yazar;
// helper KVKK gate, RFC 2369/8058 List-Unsubscribe header, escapeHtml ile XSS
// guard, restaurant branding (logo + name) ile sarar.

export interface CustomerCampaignParams {
  restaurantName: string;
  /** Owner-authored subject (free text, escaped). */
  subject: string;
  /** Owner-authored body (free text, escaped + line-break preserved). */
  body: string;
  /** Public-facing unsubscribe URL (token-based). */
  unsubscribeUrl: string;
}

export async function renderCustomerCampaign(
  params: CustomerCampaignParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = params.subject.trim() || (isTr ? `${params.restaurantName}'den haber` : `News from ${params.restaurantName}`);
  const preheader = isTr
    ? `${params.restaurantName} sana özel mesajı.`
    : `A message from ${params.restaurantName}.`;

  const inlineDefault = isTr ? {
    eyebrow: 'Restoranından mesaj',
    footerHi: 'Selam,',
    unsubscribeLabel: 'Bu listeden ayrıl',
    sentLine: 'Bu mesaj',
    sentSuffix: 'üzerinden iletildi.',
  } : {
    eyebrow: 'A message from your restaurant',
    footerHi: 'Hi,',
    unsubscribeLabel: 'Unsubscribe from this list',
    sentLine: 'Sent via',
    sentSuffix: '',
  };

  const merged = await loadMailCopy('customer-campaign', locale, inlineDefault);
  const vars = {
    restaurantName: params.restaurantName,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Free-text body → escape + preserve line breaks (\n → <br />).
  const safeBody = escapeHtml(params.body).replace(/\r?\n/g, '<br />');
  const safeRestaurant = escapeHtml(params.restaurantName);
  const restaurantInitial = (params.restaurantName || 'B').charAt(0).toUpperCase();

  const content = `
    <!-- Header: restaurant brand strip -->
    <tr>
      <td class="bz-pad" style="padding:32px 40px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" style="padding-right:12px;">
              <span style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;background:${PULSE.graphite};color:${PULSE.lime};font-family:${FONTS.heading};font-size:16px;font-weight:600;border-radius:10px;">${restaurantInitial}</span>
            </td>
            <td valign="middle">
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n500};">${copy.eyebrow}</div>
              <div style="font-family:${FONTS.heading};font-size:18px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;margin-top:2px;">${safeRestaurant}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body: owner-authored free-text -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 32px;">
        <div style="font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.graphite};white-space:normal;">
          ${safeBody}
        </div>
      </td>
    </tr>
    ${spacer(8)}

    <!-- Footer: unsubscribe + sent line -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 32px;">
        <div style="border-top:1px solid ${PULSE.n200};padding-top:18px;">
          <a href="${escapeHtml(params.unsubscribeUrl)}" style="font-family:${FONTS.body};font-size:11px;color:${PULSE.n500};text-decoration:underline;">${copy.unsubscribeLabel}</a>
          <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${PULSE.n500};margin-top:8px;">
            ${copy.sentLine} <strong style="color:${PULSE.graphite};">Buaze</strong> ${copy.sentSuffix}
          </div>
        </div>
      </td>
    </tr>
  `;

  const html = pulseLayout({ subject, preheader, content });

  // Plain-text version (deepSubstitute text-mode for placeholders).
  const text = `${copyText.eyebrow}
${params.restaurantName}

${params.body}

—
${copyText.unsubscribeLabel}: ${params.unsubscribeUrl}
${copyText.sentLine} Buaze ${copyText.sentSuffix}`.trim();

  return { subject, html, text };
}
