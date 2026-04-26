import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, renderStarRow, spacer } from '../components';

export interface LowRatingAlertParams {
  rating: number;
  restaurantName: string;
  customerName?: string | null;
  comment?: string | null;
  branch?: string | null;
  tableNumber?: string | null;
  reviewUrl: string;
  aiDraft?: string | null;
}

export function renderLowRatingAlert(params: LowRatingAlertParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const subject = isTr
    ? `Düşük puan uyarısı · ${params.restaurantName}`
    : `Low rating alert · ${params.restaurantName}`;
  const preheader = isTr
    ? `${params.rating} yıldız geldi — birkaç dakika içinde yanıt verirsen müşteri kazanılabilir.`
    : `${params.rating}-star review — replying within minutes saves the customer.`;

  const copy = isTr ? {
    eyebrow: 'Bildirim · Hızlı aksiyon',
    title: 'Hızlı yanıt zamanı.',
    intro: `${escapeHtml(params.restaurantName)} için ${params.rating} yıldız geldi. Aşağıdaki taslağı düzenleyebilir veya hemen panele geçebilirsin.`,
    quoteLabel: 'Müşteri yorumu',
    metaCustomer: 'Müşteri',
    metaBranch: 'Şube',
    metaTable: 'Masa',
    metaTime: 'Zaman',
    aiTitle: 'AI Co-Pilot taslağı',
    aiSub: 'Pulse marka diline göre üretildi. Onayla veya düzenle.',
    cta: 'Panelde aç →',
    secondary: 'AI taslağıyla yanıtla',
  } : {
    eyebrow: 'Alert · Quick action',
    title: 'Reply window is open.',
    intro: `A ${params.rating}-star review just arrived for ${escapeHtml(params.restaurantName)}. Review the AI draft below or jump straight into the panel.`,
    quoteLabel: 'Customer comment',
    metaCustomer: 'Customer',
    metaBranch: 'Branch',
    metaTable: 'Table',
    metaTime: 'Time',
    aiTitle: 'AI Co-Pilot draft',
    aiSub: 'Tuned to your Pulse voice. Approve or edit.',
    cta: 'Open in panel →',
    secondary: 'Reply with AI draft',
  };

  const safeComment = params.comment ? escapeHtml(params.comment).replace(/\n/g, '<br>') : '';
  const customer = params.customerName ? escapeHtml(params.customerName) : (isTr ? 'Anonim' : 'Anonymous');

  const metaRows = [
    [copy.metaCustomer, customer],
    params.branch ? [copy.metaBranch, escapeHtml(params.branch)] : null,
    params.tableNumber ? [copy.metaTable, escapeHtml(params.tableNumber)] : null,
    [copy.metaTime, new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US')],
  ].filter(Boolean) as Array<[string, string]>;

  const metaTable = metaRows.map(([k, v], i) => `
    <tr>
      <td style="padding:8px 0;${i < metaRows.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : ''}font-size:13px;color:${PULSE.n500};">${k}</td>
      <td align="right" style="padding:8px 0;${i < metaRows.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : ''}font-size:13px;font-weight:600;color:${PULSE.graphite};">${v}</td>
    </tr>
  `).join('');

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="background:${PULSE.danger};padding:14px 40px;">
          <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.pure};text-transform:uppercase;font-weight:600;">${isTr ? 'DÜŞÜK PUAN · ANINDA EYLEM' : 'LOW RATING · IMMEDIATE ACTION'}</div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:36px 40px 28px;">
          ${renderEyebrow(copy.eyebrow)}
          ${spacer(12)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:36px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">${copy.title}</h1>
          ${spacer(14)}
          ${renderP(copy.intro)}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          <div style="border:1px solid ${PULSE.n200};border-radius:14px;padding:22px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td valign="middle">${renderStarRow(params.rating, { size: 18, color: PULSE.danger })}</td>
              <td align="right" valign="middle"><div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.12em;color:${PULSE.n500};text-transform:uppercase;">${copy.quoteLabel}</div></td>
            </tr></table>
            ${spacer(12)}
            ${safeComment ? `<div style="font-family:${FONTS.body};font-size:15px;color:${PULSE.n700};line-height:1.6;font-style:italic;">"${safeComment}"</div>` : `<div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n500};">${isTr ? 'Yorum bırakılmadı.' : 'No comment left.'}</div>`}
          </div>
        </td>
      </tr>
      ${params.aiDraft ? `
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          <div style="background:${PULSE.graphite};border-radius:14px;padding:24px;">
            <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.lime};text-transform:uppercase;font-weight:600;">${copy.aiTitle}</div>
            ${spacer(8)}
            <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n300};">${copy.aiSub}</div>
            ${spacer(14)}
            <div style="font-family:${FONTS.body};font-size:14px;color:${PULSE.pure};line-height:1.65;">${escapeHtml(params.aiDraft).replace(/\n/g, '<br>')}</div>
          </div>
        </td>
      </tr>` : ''}
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          ${renderEyebrow(isTr ? 'Detay' : 'Details')}
          ${spacer(8)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${metaTable}</table>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 40px;">
          ${renderButton({ href: params.reviewUrl, label: copy.cta, size: 'lg' })}
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content, eyebrow: isTr ? 'Hızlı eylem' : 'Quick action', footer: { locale } });
  const text = `${copy.title}\n\n${copy.intro}\n\n${customer} · ${params.rating}★\n${safeComment ? '"' + (params.comment || '') + '"\n' : ''}${copy.cta} ${params.reviewUrl}`;
  return { subject, html, text };
}
