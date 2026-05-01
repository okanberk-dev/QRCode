import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH2, renderP, spacer, renderTwoColCards } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface CustomerReplyParams {
  customerName?: string | null;
  restaurantName: string;
  ownerName?: string | null;
  message: string;
  rating?: number;
  /** Override the default 3 hardcoded actions (which match the JSX prototype's
   *  example wording). Pass an empty array to hide the actions block. */
  actions?: string[];
  actionDescriptions?: Record<string, string>;
  couponCode?: string | null;
  couponLabel?: string | null;
  couponBody?: string | null;
  couponDays?: number | null;
  phone?: string | null;
  mapsUrl?: string | null;
  mapsLabel?: string | null;
  signaturePostscript?: string | null;
}

export async function renderCustomerReply(
  params: CustomerReplyParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const customerFirst = params.customerName ? escapeHtml(params.customerName).split(' ')[0] : (isTr ? 'merhaba' : 'hi');
  const restaurant = escapeHtml(params.restaurantName);
  const restaurantInitial = (params.restaurantName || 'B').charAt(0).toUpperCase();
  const ownerName = params.ownerName ? escapeHtml(params.ownerName) : (isTr ? 'İşletmeci' : 'Owner');
  const ownerInitials = (params.ownerName || 'B').split(' ').map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join('');

  const subject = isTr
    ? `${customerFirst}, geri bildirimin için teşekkürler`
    : `${customerFirst}, thank you for your feedback`;
  const preheader = isTr
    ? `Yaşadığın deneyim için özür dileriz. Seni tekrar ${params.restaurantName}'de ağırlamak isteriz.`
    : `We\'re sorry about your experience. We\'d love to welcome you back to ${params.restaurantName}.`;

  const inlineDefault = isTr ? {
    headerEyebrow: 'Sana özel · Kişisel yanıt',
    ownerLabel: 'İŞLETMECİ',
    titleA: '${customerFirstName},',
    titleSubA: 'bizi',
    titleSubItalic: 'duyduğun için',
    titleSubB: 'teşekkürler',
    actionsEyebrow: 'Aldığımız aksiyonlar',
    couponEyebrow: 'Sana küçük bir özür',
    couponTitle: 'Bir sonraki ziyaretinde\nkahveler bizden.',
    couponDescDefault: 'Aşağıdaki kodu kasada göster — masa arkadaşınla içtiğin iki kahve ikramımız.',
    couponLabelDefault: 'Kuponun',
    daysSuffix: 'gün',
    callEyebrow: 'Direkt ara',
    mapsEyebrow: 'Yol tarifi',
    sentLine: 'Bu yanıt',
    sentSuffix: 'ile gönderildi',
  } : {
    headerEyebrow: 'For you · Personal reply',
    ownerLabel: 'OWNER',
    titleA: '${customerFirstName},',
    titleSubA: 'thank you for',
    titleSubItalic: 'hearing us',
    titleSubB: '',
    actionsEyebrow: 'What we changed',
    couponEyebrow: 'A small apology',
    couponTitle: 'Next visit,\ncoffees on us.',
    couponDescDefault: 'Show this code at the counter — two coffees on the house for you and a friend.',
    couponLabelDefault: 'Your coupon',
    daysSuffix: 'days',
    callEyebrow: 'Call us',
    mapsEyebrow: 'Directions',
    sentLine: 'Sent via',
    sentSuffix: '',
  };

  // DB-merged + placeholder substitution. `sentLine`/`sentSuffix` are the
  // Buaze-attribution disclosure — KVKK-locked server-side (locked-fields.ts).
  const merged = await loadMailCopy('customer-reply', locale, inlineDefault);
  const vars = {
    customerFirstName: customerFirst,
    restaurantName: params.restaurantName,
    ownerName: ownerName,
  };
  const copy = deepSubstitute(merged, vars, 'html');

  const message = escapeHtml(params.message).replace(/\n\s*\n/g, '</p><p style="font-family:' + FONTS.body + ';font-size:15px;line-height:1.7;color:' + PULSE.n700 + ';margin:14px 0 0;letter-spacing:-0.005em;">').replace(/\n/g, '<br>');

  // Actions card — JSX prototipinde Kadıköy Bistro hikayesine özel 3 sabit
  // örnek ("kahve / vardiya / briefing") vardı. Gerçek müşteri yanıtında
  // restoran kendi gerçek aksiyonlarını param.actions ile geçirir; aksi
  // durumda bu kart **gizlenir** — varsayılan generic 3 cümle gönderilirse
  // içerik müşteri için anlamsız kalıyordu.
  const actionItems: Array<[string, string]> = Array.isArray(params.actions)
    ? params.actions
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((title) => [title, params.actionDescriptions?.[title] ?? ''] as [string, string])
    : [];

  const actionsBlock = actionItems.length ? `
    <tr>
      <td class="bz-pad" style="padding:20px 40px 8px;">
        <div style="background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:14px;padding:24px;">
          ${renderEyebrow(copy.actionsEyebrow)}
          ${spacer(12)}
          ${actionItems.map(([title, desc], i) => `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="top" style="width:36px;padding:${i === 0 ? '0' : '14px 0 0 0'};">
                  <div style="width:22px;height:22px;border-radius:50%;background:${PULSE.lime};color:${PULSE.graphite};text-align:center;line-height:22px;font-size:12px;font-weight:600;">✓</div>
                </td>
                <td valign="top" style="padding:${i === 0 ? '0 0 14px 0' : '14px 0'};${i < actionItems.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : ''}">
                  <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;">${escapeHtml(title)}</div>
                  ${desc ? `<div style="height:4px;line-height:1px;font-size:1px;">&nbsp;</div>${renderP(escapeHtml(desc), { size: 13 })}` : ''}
                </td>
              </tr>
            </table>
          `).join('')}
        </div>
      </td>
    </tr>
  ` : '';

  // Coupon card with code + days split — JSX:94-125
  const couponBlock = params.couponCode ? `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        <div style="background:${PULSE.graphite};border-radius:14px;padding:28px;color:${PULSE.pure};">
          ${renderEyebrow(copy.couponEyebrow, PULSE.lime)}
          ${spacer(14)}
          ${renderH2(escapeHtml(params.couponLabel || copy.couponTitle).replace(/\n/g, '<br/>'), { color: PULSE.pure })}
          ${spacer(16)}
          ${renderP(params.couponBody ?? copy.couponDescDefault, { size: 14, color: PULSE.n300 })}
          ${spacer(18)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:${PULSE.pure};border-radius:10px;">
            <tr>
              <td valign="middle" style="padding:14px 20px;font-family:${FONTS.mono};font-size:18px;color:${PULSE.graphite};letter-spacing:0.15em;font-weight:500;">${escapeHtml(params.couponCode)}</td>
              <td valign="middle" style="padding:14px 0;"><span style="display:inline-block;width:1px;height:18px;background:${PULSE.n300};"></span></td>
              <td valign="middle" style="padding:14px 20px;font-family:${FONTS.mono};font-size:11px;color:${PULSE.n500};letter-spacing:0.1em;">${params.couponDays ?? 30} ${copy.daysSuffix}</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>` : '';

  // Contact 2x2 grid (jsx:144-164). Build only present rows.
  const callCard = params.phone ? `
    <a href="tel:${params.phone.replace(/[^+0-9]/g, '')}" style="display:block;padding:14px;background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:10px;text-decoration:none;">
      ${renderEyebrow(copy.callEyebrow)}
      <div style="height:4px;line-height:1px;font-size:1px;">&nbsp;</div>
      <div style="font-family:${FONTS.mono};font-size:14px;color:${PULSE.graphite};font-weight:500;">${escapeHtml(params.phone)}</div>
    </a>
  ` : '';
  const mapsCard = params.mapsUrl ? `
    <a href="${params.mapsUrl}" style="display:block;padding:14px;background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:10px;text-decoration:none;">
      ${renderEyebrow(copy.mapsEyebrow)}
      <div style="height:4px;line-height:1px;font-size:1px;">&nbsp;</div>
      <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};font-weight:500;">${escapeHtml(params.mapsLabel || params.restaurantName)}</div>
    </a>
  ` : '';
  const contactBlock = (callCard || mapsCard) ? `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 12px;">
        ${renderTwoColCards({ left: callCard || '<div></div>', right: mapsCard || '<div></div>' })}
      </td>
    </tr>` : '';

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.limeSoft};padding:40px 40px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>
              <td class="stack-col" valign="middle">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle">
                      <div style="width:36px;height:36px;border-radius:10px;background:${PULSE.graphite};color:${PULSE.lime};text-align:center;line-height:36px;font-family:${FONTS.heading};font-weight:500;font-size:16px;">${restaurantInitial}</div>
                    </td>
                    <td valign="middle" style="padding-left:12px;">
                      <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.01em;">${restaurant}</div>
                      <div style="font-family:${FONTS.mono};font-size:11px;color:${PULSE.n600};letter-spacing:0.05em;text-transform:uppercase;">${ownerName} · ${copy.ownerLabel}</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td class="stack-col" valign="middle" align="right">${renderEyebrow(copy.headerEyebrow, PULSE.n700)}</td>
            </tr>
          </table>
          ${spacer(20)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:38px;font-weight:500;letter-spacing:-0.025em;line-height:1.15;color:${PULSE.graphite};margin:0;">
            ${copy.titleA}<br/>
            ${copy.titleSubA} <span style="font-style:italic;">${copy.titleSubItalic}</span> ${copy.titleSubB}<span style="color:${PULSE.success};">.</span>
          </h1>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:36px 40px 8px;">
          <p style="font-family:${FONTS.body};font-size:15px;line-height:1.7;color:${PULSE.n700};margin:0;letter-spacing:-0.005em;">${message}</p>
        </td>
      </tr>
      ${actionsBlock}
      ${couponBlock}
      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${params.signaturePostscript ? `${renderP(escapeHtml(params.signaturePostscript), { size: 15, color: PULSE.n700 })}${spacer(22)}` : ''}
          ${renderP(isTr ? 'Tekrar teşekkürler.' : 'Thanks again.', { size: 15, color: PULSE.n700 })}
          ${spacer(4)}
          <div style="font-family:${FONTS.heading};font-size:22px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.02em;font-style:italic;">${ownerName}</div>
          <div style="font-size:12px;color:${PULSE.n500};margin-top:4px;">${isTr ? 'İşletmeci' : 'Owner'} · ${restaurant}</div>
        </td>
      </tr>
      ${contactBlock}
      <tr>
        <td class="bz-pad" style="padding:24px 40px 36px;text-align:center;">
          <div style="font-size:11px;color:${PULSE.n400};font-family:${FONTS.mono};letter-spacing:0.1em;">${copy.sentLine} <span style="color:${PULSE.n600};">buaze</span> ${copy.sentSuffix}</div>
        </td>
      </tr>
    </table>
  `;

  // ownerInitials is computed up top for a future avatar variant (JSX
  // prototype showed an owner-initials chip we haven't ported yet); keep
  // the calculation around so the data is ready when that block lands.
  // The `void` discards the value so eslint's no-unused-vars stays quiet.
  void ownerInitials;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: '',
    footer: { locale, unsubText: isTr ? 'Restoran maillerini almayı bırakmak için' : 'To stop restaurant emails' },
  });
  const text = `${customerFirst},\n\n${params.message}\n\n— ${ownerName}, ${params.restaurantName}`;
  return { subject, html, text };
}
