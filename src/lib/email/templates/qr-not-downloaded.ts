import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderP, renderButton } from '../components';
import { LC_TABLE, lcPage, lcSection, lcHero, lcCard, lcFootnote } from './lifecycle-ui';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { QR_NOT_DOWNLOADED_DEFAULTS } from './lifecycle-defaults';

export interface QrNotDownloadedParams {
  firstName?: string | null;
  restaurantName: string;
  qrUrl: string;
}

// Lifecycle email — owner registered + onboarding complete + 24-48 saat
// geçti ama hâlâ ilk QR'ı indirmedi (CLAUDE.md §21.34 + §23.7 Phase 11.30).
// Idempotent: LifecycleEmailLog `type: 'qr_not_downloaded'` 1 kez gönderilir.

export async function renderQrNotDownloaded(
  params: QrNotDownloadedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? 'İlk QR kodunuzu henüz indirmediniz'
    : "You haven't downloaded your first QR yet";
  const preheader = isTr
    ? `${params.restaurantName} için QR kodunuz hazır — masaya yerleştirin, ilk yorumları toplamaya başlayın.`
    : `Your QR for ${params.restaurantName} is ready — place it on a table to start collecting reviews.`;

  const inlineDefault = QR_NOT_DOWNLOADED_DEFAULTS[isTr ? 'tr' : 'en'];

  const merged = await loadMailCopy('qr-not-downloaded', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = {
    firstName: params.firstName || fallbackName,
    restaurantName: params.restaurantName,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Decorative QR tile drawn with table cells (no image, no SVG — both get
  // stripped). Dark modules are graphite, the finder-pattern centres are lime.
  const QR = [
    '111010111',
    '1x10011x1',
    '111010111',
    '000011000',
    '101101101',
    '010010010',
    '111011010',
    '1x1001111',
    '111010101',
  ];
  const qrModule = (c: string) => {
    const bg = c === '1' ? PULSE.graphite : c === 'x' ? PULSE.lime : '';
    return `<td width="9" height="9" ${bg ? `bgcolor="${bg}" ` : ''}style="width:9px;height:9px;${bg ? `background:${bg};` : ''}font-size:0;line-height:0;">&nbsp;</td>`;
  };
  const qrTile = `
    <div style="display:inline-block;background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:14px;padding:14px;">
      <table ${LC_TABLE} style="border-collapse:collapse;">${QR.map((row) => `<tr>${[...row].map(qrModule).join('')}</tr>`).join('')}</table>
    </div>`;

  const whyCard = lcCard(`
    <table ${LC_TABLE} width="100%" class="stack-row">
      <tr>
        <td class="stack-col" valign="middle" width="124" style="width:124px;padding-right:20px;">${qrTile}</td>
        <td class="stack-col" valign="middle">${renderP(copy.why, { size: 14, color: PULSE.n700 })}</td>
      </tr>
    </table>`, { padding: '20px' });

  const content = lcPage([
    lcHero({
      eyebrow: copy.eyebrow,
      title: copy.title,
      titleSize: 34,
      intro: [copy.intro],
    }),
    lcSection(whyCard, { padding: '28px 40px 8px' }),
    lcSection(renderButton({ href: escapeHtml(params.qrUrl), label: copy.cta, variant: 'dark', size: 'lg' }), { padding: '28px 40px 36px' }),
    lcFootnote(copy.footnote),
  ]);

  const text = [
    copyText.eyebrow,
    '',
    copyText.title,
    '',
    copyText.intro,
    '',
    copyText.why,
    '',
    `→ ${copyText.cta}: ${params.qrUrl}`,
    '',
    copyText.footnote,
  ].join('\n');

  return {
    subject,
    html: pulseLayout({ subject, preheader, content, footer: { locale } }),
    text,
  };
}
