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
  // `feedback.name` is nullable, so every name-dependent string has a nameless
  // form instead of a lowercase "merhaba," masquerading as a name.
  const customerFirstRaw = (params.customerName ?? '').trim().split(/\s+/)[0] ?? '';
  const restaurantRaw = params.restaurantName;
  const restaurant = escapeHtml(restaurantRaw);
  const restaurantInitial = escapeHtml((restaurantRaw || 'B').trim().charAt(0).toUpperCase() || 'B');
  // The production sender never passes ownerName. Without it the sign-off is the
  // team ("<Restaurant> ekibi") — never the bare role word dressed up as a name.
  const ownerRaw = (params.ownerName ?? '').trim();
  const ownerName = escapeHtml(ownerRaw);
  const signoffRaw = ownerRaw || (isTr ? `${restaurantRaw} ekibi` : `The ${restaurantRaw} team`);
  const signoff = escapeHtml(signoffRaw);

  const subject = customerFirstRaw
    ? (isTr ? `${customerFirstRaw}, geri bildirimin için teşekkürler` : `${customerFirstRaw}, thank you for your feedback`)
    : (isTr ? 'Geri bildirimin için teşekkürler' : 'Thank you for your feedback');
  const preheader = isTr
    ? `Yaşadığın deneyim için özür dileriz. Seni tekrar ${restaurantRaw}'de ağırlamak isteriz.`
    : `We're sorry about your experience. We'd love to welcome you back to ${restaurantRaw}.`;

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
  // Raw values: deepSubstitute escapes in html mode, so pre-escaped input would
  // double-escape (D&#39;Arcy → D&amp;#39;Arcy).
  const vars = {
    customerFirstName: customerFirstRaw,
    restaurantName: restaurantRaw,
    ownerName: signoffRaw,
  };
  const copy = deepSubstitute(merged, vars, 'html');

  // No customer name → drop the "${customerFirstName}," line (unless an admin
  // rewrote titleA without the placeholder) and capitalise the sentence start.
  const dropGreeting = !customerFirstRaw && String(merged.titleA ?? '').includes('${customerFirstName}');
  const titleGreeting = dropGreeting ? '' : copy.titleA;
  const titleSubA = titleGreeting
    ? copy.titleSubA
    : copy.titleSubA.charAt(0).toLocaleUpperCase(isTr ? 'tr' : 'en') + copy.titleSubA.slice(1);

  const messageP = `font-family:${FONTS.body};font-size:15px;line-height:1.7;color:${PULSE.n700};`;
  const message = escapeHtml(params.message).replace(/\n\s*\n/g, `</p><p style="${messageP}margin:14px 0 0;">`).replace(/\n/g, '<br>');

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
        ${spacer(24)}
        <div style="background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:14px;padding:24px;">
          ${renderEyebrow(copy.actionsEyebrow)}
          ${spacer(14)}
          ${actionItems.map(([title, desc], i) => `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="top" style="width:36px;padding:${i === 0 ? '0' : '14px 0 0 0'};">
                  <div style="width:24px;height:24px;border-radius:50%;background:${PULSE.lime};color:${PULSE.graphite};text-align:center;line-height:24px;font-size:12px;font-weight:600;">✓</div>
                </td>
                <td valign="top" style="padding:${i === 0 ? '0 0 14px 0' : '14px 0'};${i < actionItems.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : ''}">
                  <div style="font-family:${FONTS.heading};font-size:15px;font-weight:600;line-height:1.4;color:${PULSE.graphite};">${escapeHtml(title)}</div>
                  ${desc ? `<div style="height:4px;line-height:1px;font-size:1px;">&nbsp;</div>${renderP(escapeHtml(desc), { size: 13 })}` : ''}
                </td>
              </tr>
            </table>
          `).join('')}
        </div>
  ` : '';

  // Coupon card. The code sits on its own line (monospace, wraps via bz-break if
  // an owner types a very long one); the validity is a pill that sits right of
  // the code on desktop and drops under it on phones (stack-col).
  const couponBody = params.couponBody ? escapeHtml(params.couponBody) : copy.couponDescDefault;
  const couponBlock = params.couponCode ? `
        ${spacer(28)}
        <div style="background:${PULSE.graphite};border-radius:14px;padding:26px 24px;color:${PULSE.pure};">
          ${renderEyebrow(copy.couponEyebrow, PULSE.lime)}
          ${spacer(14)}
          ${renderH2(escapeHtml(params.couponLabel || copy.couponTitle).replace(/\n/g, '<br/>'), { color: PULSE.pure })}
          ${spacer(14)}
          ${renderP(couponBody, { size: 14, color: PULSE.n300 })}
          ${spacer(20)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.pure};border-radius:12px;">
            <tr>
              <td style="padding:12px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
                  <tr>
                    <td class="stack-col" valign="middle" style="padding:0;">
                      <div class="bz-break" style="font-family:${FONTS.code};font-size:20px;font-weight:700;line-height:1.35;letter-spacing:0.08em;color:${PULSE.graphite};">${escapeHtml(params.couponCode)}</div>
                    </td>
                    <td class="stack-col" valign="middle" align="right" style="padding:0;">
                      <span style="display:inline-block;font-family:${FONTS.label};font-size:11px;font-weight:600;line-height:1.4;letter-spacing:0.04em;color:${PULSE.graphite};background:${PULSE.limeSoft};border-radius:999px;padding:5px 12px;white-space:nowrap;">${params.couponDays ?? 30} ${copy.daysSuffix}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>` : '';

  // Contact cards (jsx:144-164). Two present → 50/50 (stacked on phones);
  // one present → full width instead of half a row with an empty half.
  const callCard = params.phone ? `
    <a href="tel:${params.phone.replace(/[^+0-9]/g, '')}" style="display:block;padding:14px 16px;background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:10px;text-decoration:none;">
      ${renderEyebrow(copy.callEyebrow)}
      <div style="height:4px;line-height:1px;font-size:1px;">&nbsp;</div>
      <div style="font-family:${FONTS.label};font-size:14px;font-weight:600;line-height:1.4;color:${PULSE.graphite};">${escapeHtml(params.phone)}</div>
    </a>
  ` : '';
  const mapsCard = params.mapsUrl && /^https?:\/\//i.test(params.mapsUrl.trim()) ? `
    <a href="${escapeHtml(params.mapsUrl.trim())}" style="display:block;padding:14px 16px;background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:10px;text-decoration:none;">
      ${renderEyebrow(copy.mapsEyebrow)}
      <div style="height:4px;line-height:1px;font-size:1px;">&nbsp;</div>
      <div style="font-family:${FONTS.body};font-size:14px;font-weight:600;line-height:1.4;color:${PULSE.graphite};">${escapeHtml(params.mapsLabel || params.restaurantName)}</div>
    </a>
  ` : '';
  const contactCards = callCard && mapsCard
    ? renderTwoColCards({ left: callCard, right: mapsCard })
    : (callCard || mapsCard);
  const contactBlock = contactCards ? `
        ${spacer(32)}
        ${contactCards}` : '';

  // Legal attribution (fixed, not admin-editable): the business writes the
  // reply and is solely responsible for it; Buaze only transmits it. Pairs
  // with the per-send responsibility checkbox and the profanity/threat gate
  // in src/lib/content-safety.ts (CLAUDE.md §45).
  const senderDisclaimer = isTr
    ? `Bu e-posta, verdiğiniz geri bildirime ${restaurantRaw} işletmesinin yanıtıdır ve Buaze platformu aracılığıyla iletilmiştir. Mesajın içeriğinden yalnızca gönderen işletme sorumludur; Buaze içeriği yazmaz ve onaylamaz. Uygunsuz bir içerik aldıysanız support@buaze.com adresine bildirebilirsiniz.`
    : `This e-mail is ${restaurantRaw}'s reply to your feedback, delivered through the Buaze platform. The sending business is solely responsible for its content; Buaze does not write or endorse it. To report inappropriate content, write to support@buaze.com.`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.limeSoft};padding:40px 40px 34px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>
              <td class="stack-col" valign="middle">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle">
                      <div style="width:36px;height:36px;border-radius:10px;background:${PULSE.graphite};color:${PULSE.lime};text-align:center;line-height:36px;font-family:${FONTS.heading};font-weight:600;font-size:16px;">${restaurantInitial}</div>
                    </td>
                    <td valign="middle" style="padding-left:12px;">
                      <div style="font-family:${FONTS.heading};font-size:15px;font-weight:600;line-height:1.35;color:${PULSE.graphite};">${restaurant}</div>
                      ${ownerName ? `<div style="font-family:${FONTS.label};font-size:11px;line-height:1.5;color:${PULSE.n600};letter-spacing:0.08em;text-transform:uppercase;font-weight:500;">${ownerName} · ${copy.ownerLabel}</div>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
              <td class="stack-col" valign="middle" align="right">${renderEyebrow(copy.headerEyebrow, PULSE.n700)}</td>
            </tr>
          </table>
          ${spacer(20)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:38px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${PULSE.graphite};margin:0;">
            ${titleGreeting ? `${titleGreeting}<br/>` : ''}
            ${titleSubA} <span style="font-style:italic;">${copy.titleSubItalic}</span>${copy.titleSubB ? ` ${copy.titleSubB}` : ''}<span style="color:${PULSE.success};">.</span>
          </h1>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:36px 40px 8px;">
          <p style="${messageP}margin:0;">${message}</p>
          ${actionsBlock}
          ${couponBlock}
          ${spacer(32)}
          ${params.signaturePostscript ? `${renderP(escapeHtml(params.signaturePostscript), { size: 15, color: PULSE.n700 })}${spacer(22)}` : ''}
          ${renderP(isTr ? 'Tekrar teşekkürler.' : 'Thanks again.', { size: 15, color: PULSE.n700 })}
          ${spacer(6)}
          <div style="font-family:${FONTS.heading};font-size:22px;font-weight:600;line-height:1.25;color:${PULSE.graphite};letter-spacing:-0.01em;font-style:italic;">${signoff}</div>
          ${ownerName ? `<div style="font-size:12px;line-height:1.5;color:${PULSE.n500};margin-top:4px;">${isTr ? 'İşletmeci' : 'Owner'} · ${restaurant}</div>` : ''}
          ${contactBlock}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:28px 40px 36px;text-align:center;">
          <div style="font-size:11px;line-height:1.5;color:${PULSE.n500};font-family:${FONTS.label};letter-spacing:0.03em;">${copy.sentLine} <span style="color:${PULSE.graphite};font-weight:600;">buaze</span> ${copy.sentSuffix}</div>
          <div style="font-size:10px;line-height:1.5;color:${PULSE.n500};margin-top:10px;">${escapeHtml(senderDisclaimer)}</div>
        </td>
      </tr>
    </table>
  `;

  // pulseLayout interpolates subject/preheader into <title> and the hidden
  // preheader div verbatim, so they are escaped here.
  const html = pulseLayout({
    subject: escapeHtml(subject),
    preheader: escapeHtml(preheader),
    content,
    eyebrow: '',
    footer: { locale, unsubText: isTr ? 'Restoran maillerini almayı bırakmak için' : 'To stop restaurant emails' },
  });
  const greeting = customerFirstRaw ? `${customerFirstRaw},` : (isTr ? 'Merhaba,' : 'Hi,');
  const text = `${greeting}\n\n${params.message}\n\n— ${ownerRaw ? `${ownerRaw}, ${restaurantRaw}` : signoffRaw}\n\n---\n${senderDisclaimer}`;
  return { subject, html, text };
}
