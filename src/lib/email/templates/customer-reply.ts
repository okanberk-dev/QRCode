import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';

export interface CustomerReplyParams {
  customerName?: string | null;
  restaurantName: string;
  ownerName?: string | null;
  message: string;
  rating?: number;
  actionsTaken?: string[];
  couponCode?: string | null;
  couponLabel?: string | null;
  phone?: string | null;
  mapsUrl?: string | null;
  visitUrl?: string | null;
}

export function renderCustomerReply(params: CustomerReplyParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const customerFirst = params.customerName ? escapeHtml(params.customerName).split(' ')[0] : (isTr ? 'merhaba' : 'hi');
  const restaurant = escapeHtml(params.restaurantName);
  const ownerName = params.ownerName ? escapeHtml(params.ownerName) : (isTr ? 'İşletmeci' : 'Owner');

  const subject = isTr
    ? `${customerFirst}, geri bildirimin için teşekkürler`
    : `${customerFirst}, thank you for your feedback`;
  const preheader = isTr
    ? `Yaşadığın deneyim için özür dileriz. Seni tekrar ${params.restaurantName}\'de ağırlamak isteriz.`
    : `We\'re sorry about your experience. We\'d love to welcome you back to ${params.restaurantName}.`;

  const copy = isTr ? {
    eyebrow: 'Sana özel · Kişisel yanıt',
    title: 'bizi <span style="font-style:italic;">duyduğun için</span> teşekkürler<span style="color:' + PULSE.success + ';">.</span>',
    actionsLabel: 'Yaptığımız değişiklikler',
    couponEyebrow: 'Sana özel kupon',
    couponDesc: 'Bir sonraki ziyaretinde ikram olarak kullanabilirsin.',
    visitCta: 'Bizi tekrar ziyaret et →',
    callLabel: 'Doğrudan ara',
    mapsLabel: 'Harita',
    sentVia: 'Bu mesaj Buaze ile gönderildi',
  } : {
    eyebrow: 'Personal · From the owner',
    title: 'thank you for <span style="font-style:italic;">hearing us</span><span style="color:' + PULSE.success + ';">.</span>',
    actionsLabel: 'What we changed',
    couponEyebrow: 'A coupon for you',
    couponDesc: 'Use it on your next visit, on the house.',
    visitCta: 'Visit us again →',
    callLabel: 'Call us',
    mapsLabel: 'Maps',
    sentVia: 'Sent via Buaze',
  };

  const message = escapeHtml(params.message).replace(/\n/g, '<br>');

  const actionsHtml = (params.actionsTaken && params.actionsTaken.length)
    ? `
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          ${renderEyebrow(copy.actionsLabel)}
          ${spacer(10)}
          ${params.actionsTaken.map((a, i) => `
            <div style="display:block;padding:12px 16px;background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:10px;margin-bottom:8px;font-family:${FONTS.body};font-size:14px;color:${PULSE.n700};">
              <span style="display:inline-block;width:20px;color:${PULSE.success};font-weight:600;">✓</span>${escapeHtml(a)}
            </div>
          `).join('')}
        </td>
      </tr>
    ` : '';

  const couponHtml = params.couponCode ? `
    <tr>
      <td class="bz-pad" style="padding:0 40px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.graphite};border-radius:14px;">
          <tr>
            <td style="padding:24px 28px;">
              ${renderEyebrow(copy.couponEyebrow, PULSE.lime)}
              ${spacer(8)}
              <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n300};line-height:1.55;">${copy.couponDesc}</div>
              ${spacer(14)}
              <div style="background:${PULSE.lime};border-radius:10px;padding:14px 18px;display:inline-block;">
                <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n800};text-transform:uppercase;">${escapeHtml(params.couponLabel || (isTr ? 'Kuponun' : 'Your coupon'))}</div>
                <div style="font-family:${FONTS.heading};font-size:24px;font-weight:600;color:${PULSE.graphite};letter-spacing:0.1em;margin-top:4px;">${escapeHtml(params.couponCode)}</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  const ctaCellsHtml = (() => {
    const cells: string[] = [];
    if (params.visitUrl) cells.push(`<td class="stack-col" valign="middle" style="padding:0 8px 0 0;">${renderButton({ href: params.visitUrl, label: copy.visitCta, size: 'lg' })}</td>`);
    if (params.phone) cells.push(`<td class="stack-col" valign="middle" style="padding:0 8px;"><a href="tel:${params.phone.replace(/\s/g, '')}" style="display:inline-block;padding:14px 20px;border:1px solid ${PULSE.n200};border-radius:10px;color:${PULSE.graphite};text-decoration:none;font-family:${FONTS.body};font-size:14px;font-weight:500;">${copy.callLabel} · ${escapeHtml(params.phone)}</a></td>`);
    if (params.mapsUrl) cells.push(`<td class="stack-col" valign="middle" style="padding:0 0 0 8px;"><a href="${params.mapsUrl}" style="display:inline-block;padding:14px 20px;border:1px solid ${PULSE.n200};border-radius:10px;color:${PULSE.graphite};text-decoration:none;font-family:${FONTS.body};font-size:14px;font-weight:500;">${copy.mapsLabel}</a></td>`);
    return cells.length ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="stack-row"><tr>${cells.join('')}</tr></table>` : '';
  })();

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.limeSoft};padding:40px 40px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="width:48px;">
                <div style="width:40px;height:40px;border-radius:10px;background:${PULSE.graphite};color:${PULSE.lime};text-align:center;line-height:40px;font-family:${FONTS.heading};font-weight:600;font-size:18px;">${restaurant.charAt(0).toUpperCase()}</div>
              </td>
              <td valign="middle" style="padding-left:14px;">
                <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;">${restaurant}</div>
                <div style="font-family:${FONTS.mono};font-size:11px;color:${PULSE.n600};letter-spacing:0.05em;text-transform:uppercase;">${ownerName} · ${isTr ? 'İŞLETMECİ' : 'OWNER'}</div>
              </td>
            </tr>
          </table>
          ${spacer(20)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:38px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${customerFirst},<br/>
            ${copy.title}
          </h1>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:32px 40px 16px;">
          <div style="font-family:${FONTS.body};font-size:15px;color:${PULSE.n700};line-height:1.7;">${message}</div>
        </td>
      </tr>
      ${actionsHtml}
      ${couponHtml}
      ${ctaCellsHtml ? `<tr><td class="bz-pad" style="padding:0 40px 32px;">${ctaCellsHtml}</td></tr>` : ''}
      <tr>
        <td class="bz-pad" style="padding:0 40px 40px;">
          <div style="border-top:1px solid ${PULSE.n200};padding-top:14px;font-family:${FONTS.mono};font-size:11px;letter-spacing:0.1em;color:${PULSE.n400};text-transform:uppercase;">${copy.sentVia}</div>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content, eyebrow: isTr ? 'Yanıt' : 'Reply', footer: { locale } });
  const text = `${customerFirst},\n\n${params.message}\n\n— ${ownerName}, ${params.restaurantName}`;
  return { subject, html, text };
}
