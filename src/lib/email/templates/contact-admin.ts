import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderAvatarCircle, renderStatusPill, spacer } from '../components';
import { formatCompactStampInTimeZone, resolveDisplayTimeZone } from '@/lib/timezone';

export interface ContactAdminParams {
  name: string;
  email: string;
  phone?: string | null;
  business?: string | null;
  message: string;
  /** Did the user opt-in to marketing/contact comms? */
  marketingConsent?: boolean;
  /** Optional context — e.g. "buaze.com/iletisim". Renders as eyebrow next
   *  to the business/name in the sub-title row. */
  sourcePath?: string | null;
}

/**
 * Admin notification — fires when the public contact form is submitted.
 * Mirrors `low-rating-alert` structure (dark alert bar + sub-title + big
 * heading + scoped card + dark message box + consent grid + quick actions)
 * to keep the operator inbox visually consistent across alert types.
 */
export function renderContactAdmin(
  params: ContactAdminParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const businessOrName = params.business || params.name;
  const firstName = params.name.split(' ')[0] || params.name;

  // Subject deliverability §21.23: 📥 emoji çıkarıldı.
  const subject = isTr
    ? `[İletişim] ${businessOrName}`
    : `[Contact] ${businessOrName}`;
  const messagePreview = params.message.slice(0, 80).replace(/\s+/g, ' ').trim();
  const preheader = isTr
    ? `${params.name} az önce iletişim formundan ulaştı. ${messagePreview}${params.message.length > 80 ? '…' : ''}`
    : `${params.name} just reached out via the contact form. ${messagePreview}${params.message.length > 80 ? '…' : ''}`;

  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePhone = params.phone ? escapeHtml(params.phone) : null;
  const safeBusiness = params.business ? escapeHtml(params.business) : null;
  const safeMessage = escapeHtml(params.message).replace(/\n/g, '<br>');
  const safeFirstName = escapeHtml(firstName);
  // Non-letter first char (e.g. "<", "&", digits-as-markup) would render as a stray glyph.
  const firstChar = Array.from((params.name || '').trim())[0] ?? '';
  const senderInitial = /[\p{L}\p{N}]/u.test(firstChar) ? firstChar.toUpperCase() : '•';
  // §46 — host TZ (Vercel = UTC) yerine işletme saat dilimi.
  const timestamp = formatCompactStampInTimeZone(new Date(), locale, resolveDisplayTimeZone());

  const copy = isTr
    ? {
        eyebrowAlert: 'Yeni talep · İletişim formu',
        eyebrowAction: '24 saat içinde dönüş yap',
        titlePrefix: `${safeFirstName}`,
        titleMain: 'bir mesaj gönderdi.',
        titleSub: 'Önce dinle, sonra ara.',
        senderEyebrow: 'Talep eden',
        senderEmailLabel: 'E-POSTA',
        senderPhoneLabel: 'TELEFON',
        senderBusinessLabel: 'İŞLETME',
        senderMissing: 'belirtilmedi',
        messageEyebrow: 'Mesaj',
        consentEyebrow: 'İzinler',
        kvkkLabel: 'KVKK aydınlatma',
        kvkkValue: 'Onaylandı',
        marketingLabel: 'Pazarlama izni',
        marketingYes: 'Verildi',
        marketingNo: 'Verilmedi',
        quickEyebrow: 'Hızlı aksiyon',
        replyLabel: 'Yanıt yaz',
        replySub: 'E-posta gönder',
        callLabel: 'Telefon ile ara',
        callSubYes: 'Numarayı çevir',
        callSubNo: 'Numara yok',
        panelLabel: 'Tüm talepler',
        panelSub: 'Panele git',
      }
    : {
        eyebrowAlert: 'New request · Contact form',
        eyebrowAction: 'Reply within 24 hours',
        titlePrefix: `${safeFirstName}`,
        titleMain: 'sent a message.',
        titleSub: 'Listen first, then call.',
        senderEyebrow: 'Sender',
        senderEmailLabel: 'EMAIL',
        senderPhoneLabel: 'PHONE',
        senderBusinessLabel: 'BUSINESS',
        senderMissing: 'not provided',
        messageEyebrow: 'Message',
        consentEyebrow: 'Consents',
        kvkkLabel: 'KVKK / GDPR notice',
        kvkkValue: 'Approved',
        marketingLabel: 'Marketing consent',
        marketingYes: 'Granted',
        marketingNo: 'Not granted',
        quickEyebrow: 'Quick actions',
        replyLabel: 'Write reply',
        replySub: 'Send email',
        callLabel: 'Call by phone',
        callSubYes: 'Dial number',
        callSubNo: 'No phone',
        panelLabel: 'All requests',
        panelSub: 'Open panel',
      };

  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  // mailto/tel URL'lerinde escapeHtml KULLANILMAZ — '&' → '&amp;' link'i bozar.
  // Raw email + encodeURI yeterli; encodeURI '&' ve "'" bırakır, attribute'u ve
  // query'yi bozmasın diye ikisini de elle encode ediyoruz (defense-in-depth).
  const mailtoAddr = encodeURI(params.email).replace(/&/g, '%26').replace(/'/g, '%27');
  const replyHref = `mailto:${mailtoAddr}?subject=${encodeURIComponent(`Re: ${businessOrName}`)}`;
  const phoneHref = params.phone ? `tel:${params.phone.replace(/[^+0-9]/g, '')}` : `${baseAppUrl}/${isTr ? 'tr' : 'en'}/contact`;
  const panelHref = `${baseAppUrl}/admin/customers`;

  // Tile = label over value inside its own bordered block. Because every tile
  // is a self-contained box, stacking on a phone needs no dividers; the padding
  // lives in an inner <div> (td.stack-col padding is reset to `8px 0` on mobile,
  // which would otherwise glue text to the card edge). No equal-height tricks:
  // a fixed td height can't be undone by the mobile stack rules and collapses
  // the stacked tiles on top of each other.
  const tile = (label: string, valueHtml: string, bg: string): string => `
    <div style="padding:11px 13px;background:${bg};border:1px solid ${PULSE.n200};border-radius:10px;">
      <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;font-weight:600;color:${PULSE.n500};text-transform:uppercase;">${label}</div>
      <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;line-height:1.5;font-weight:500;color:${PULSE.graphite};">${valueHtml}</div>
    </div>`;

  const missing = `<span style="color:${PULSE.n400};font-weight:400;">${copy.senderMissing}</span>`;
  const telHref = params.phone ? `tel:${params.phone.replace(/[^+0-9]/g, '')}` : '';
  // Email gets its OWN full-width tile: a realistic address must never share a
  // row with other tiles (it wrapped mid-word at 31-36% width). Long tokens may
  // still wrap (overflow-wrap:anywhere), but only when they truly don't fit, and
  // <wbr> after '@' and '.' gives the browser clean break points first.
  const emailWithBreaks = safeEmail.replace(/@/g, '@<wbr>').replace(/\./g, '.<wbr>');
  const emailTile = tile(
    copy.senderEmailLabel,
    `<a href="mailto:${mailtoAddr}" style="color:${PULSE.graphite};text-decoration:none;word-break:normal;overflow-wrap:anywhere;">${emailWithBreaks}</a>`,
    PULSE.pure,
  );
  // Phone + business sit side by side beneath it as two 50% tiles (stack on phones).
  const phoneBusinessTiles: Array<{ label: string; value: string }> = [
    {
      label: copy.senderPhoneLabel,
      value: safePhone && telHref
        ? `<a href="${telHref}" style="color:${PULSE.graphite};text-decoration:none;${params.phone && params.phone.length <= 22 ? 'white-space:nowrap;' : ''}">${safePhone}</a>`
        : missing,
    },
    { label: copy.senderBusinessLabel, value: safeBusiness ?? missing },
  ];
  const phoneBusinessHtml = phoneBusinessTiles
    .map(
      (t, i) => `
      <td class="stack-col col-half" valign="top" style="width:50%;padding:${i === 0 ? '0 4px 0 0' : '0 0 0 4px'};">${tile(t.label, t.value, PULSE.pure)}</td>`,
    )
    .join('');

  // Edge cells get no outer padding so the row lines up with the full-width
  // cards above/below it; the gap between cells is 8px.
  const gapPad = (i: number, n: number): string =>
    n === 1 ? '0' : i === 0 ? '0 4px 0 0' : i === n - 1 ? '0 0 0 4px' : '0 4px';

  const consentTiles = [
    {
      label: copy.kvkkLabel,
      value: `<span style="color:${PULSE.success};font-weight:600;">✓ ${copy.kvkkValue}</span>`,
    },
    {
      label: copy.marketingLabel,
      value: params.marketingConsent
        ? `<span style="color:${PULSE.success};font-weight:600;">✓ ${copy.marketingYes}</span>`
        : `<span style="color:${PULSE.n500};font-weight:600;">○ ${copy.marketingNo}</span>`,
    },
  ]
    .map((c, i, arr) => `<td class="stack-col" valign="top" style="width:50%;padding:${gapPad(i, arr.length)};">${tile(c.label, c.value, PULSE.n50)}</td>`)
    .join('');

  // First action is the primary one (reply) → filled graphite; the other two
  // stay quiet outlines so the eye lands on "reply" first.
  const quickActions = [
    { l: copy.replyLabel, s: copy.replySub, href: replyHref, primary: true },
    { l: copy.callLabel, s: params.phone ? copy.callSubYes : copy.callSubNo, href: phoneHref, primary: false },
    { l: copy.panelLabel, s: copy.panelSub, href: panelHref, primary: false },
  ];
  const quickCards = quickActions
    .map((a, i, arr) => {
      const bg = a.primary ? PULSE.graphite : PULSE.pure;
      const border = a.primary ? PULSE.graphite : PULSE.n200;
      const fg = a.primary ? PULSE.pure : PULSE.graphite;
      const sub = a.primary ? PULSE.n400 : PULSE.n500;
      const arrow = a.primary ? PULSE.lime : PULSE.graphite;
      return `
    <td class="stack-col" valign="top" style="width:33.33%;padding:${gapPad(i, arr.length)};">
      <a href="${a.href}" style="display:block;padding:16px;background:${bg};border:1px solid ${border};border-radius:10px;text-decoration:none;">
        <div style="font-family:${FONTS.heading};font-size:14px;font-weight:600;line-height:1.35;color:${fg};">${a.l} <span style="color:${arrow};">→</span></div>
        <div style="margin-top:3px;font-family:${FONTS.label};font-size:11px;line-height:1.4;color:${sub};">${a.s}</div>
      </a>
    </td>`;
    })
    .join('');

  const subRowMeta = `${escapeHtml(businessOrName)}${params.sourcePath ? ` · ${escapeHtml(params.sourcePath)}` : ''}`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <!-- Top dark alert bar. Pill + timestamp share ONE wrapping cell so a 320px
           phone drops the timestamp under the pill instead of colliding. -->
      <tr>
        <td class="bz-ftr" style="background:${PULSE.graphite};padding:14px 40px;font-family:${FONTS.label};font-size:11px;line-height:16px;">
          <span style="display:inline-block;margin:2px 14px 2px 0;vertical-align:middle;line-height:16px;">${renderStatusPill({ text: copy.eyebrowAlert, dotColor: PULSE.lime, textColor: PULSE.pure })}</span><span style="display:inline-block;margin:2px 0;vertical-align:middle;font-size:11px;line-height:16px;color:${PULSE.n400};">${timestamp}</span>
        </td>
      </tr>

      <!-- Sub-title row -->
      <tr>
        <td class="bz-ftr" style="background:${PULSE.pure};padding:14px 40px;border-bottom:1px solid ${PULSE.n200};">
          <div style="font-family:${FONTS.label};font-size:11px;line-height:1.5;letter-spacing:0.1em;color:${PULSE.n500};text-transform:uppercase;font-weight:600;">${subRowMeta}</div>
        </td>
      </tr>

      <!-- Title -->
      <tr>
        <td class="bz-ftr" style="padding:32px 40px 4px;">
          <span style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};font-family:${FONTS.label};font-size:11px;line-height:1.4;letter-spacing:0.12em;font-weight:600;text-transform:uppercase;padding:5px 10px;border-radius:6px;">${copy.eyebrowAction}</span>
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:34px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${PULSE.graphite};margin:0;">
            ${copy.titlePrefix} ${copy.titleMain}<br/>
            <span style="color:${PULSE.n500};">${copy.titleSub}</span>
          </h1>
        </td>
      </tr>

      <!-- Sender card -->
      <tr>
        <td class="bz-ftr" style="padding:28px 40px 0;">
          ${renderEyebrow(copy.senderEyebrow)}
          ${spacer(12)}
          <div style="border:1px solid ${PULSE.n200};border-radius:14px;overflow:hidden;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="middle" style="padding:18px 20px;background:${PULSE.pure};">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td valign="middle" width="44" style="width:44px;">${renderAvatarCircle({ initials: senderInitial, bg: PULSE.limeSoft, fg: PULSE.graphite, size: 44 })}</td>
                      <td valign="middle" style="padding-left:14px;">
                        <div style="font-family:${FONTS.heading};font-size:17px;font-weight:600;line-height:1.3;color:${PULSE.graphite};letter-spacing:-0.01em;">${safeName}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border-top:1px solid ${PULSE.n200};">
              <tr>
                <td style="padding:12px 10px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr><td style="padding:0 0 8px;">${emailTile}</td></tr>
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
                    <tr>${phoneBusinessHtml}</tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- Message -->
      <tr>
        <td class="bz-ftr" style="padding:28px 40px 0;">
          ${renderEyebrow(copy.messageEyebrow)}
          ${spacer(12)}
          <div class="bz-roi-card" style="background:${PULSE.graphite};border-radius:14px;padding:24px;color:${PULSE.pure};">
            <p style="font-family:${FONTS.body};font-size:15px;line-height:1.7;color:${PULSE.n300};margin:0;">${safeMessage}</p>
          </div>
        </td>
      </tr>

      <!-- Consents -->
      <tr>
        <td class="bz-ftr" style="padding:28px 40px 0;">
          ${renderEyebrow(copy.consentEyebrow)}
          ${spacer(12)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>${consentTiles}</tr>
          </table>
        </td>
      </tr>

      <!-- Quick actions -->
      <tr>
        <td class="bz-ftr" style="padding:28px 40px 40px;">
          ${renderEyebrow(copy.quickEyebrow)}
          ${spacer(12)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row"><tr>${quickCards}</tr></table>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject: escapeHtml(subject),
    preheader: escapeHtml(preheader),
    content,
    eyebrow: '',
    footer: { locale, unsubText: isTr ? 'Bu bildirim ayarlarını yönetmek için' : 'To manage notification settings' },
  });

  const consentSummary = params.marketingConsent
    ? `KVKK ✓ · ${copy.marketingLabel}: ${copy.marketingYes}`
    : `KVKK ✓ · ${copy.marketingLabel}: ${copy.marketingNo}`;

  // Raw (unescaped) first name for the plain-text part; HTML keeps the escaped one.
  const text = `${firstName} ${copy.titleMain} ${copy.titleSub}

${copy.senderEyebrow}: ${params.name}
${copy.senderEmailLabel}: ${params.email}
${copy.senderPhoneLabel}: ${params.phone || copy.senderMissing}
${copy.senderBusinessLabel}: ${params.business || copy.senderMissing}

${copy.messageEyebrow}:
${params.message}

${copy.consentEyebrow}: ${consentSummary}

${baseAppUrl}/admin/customers`;

  return { subject, html, text };
}
