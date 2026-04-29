import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderAvatarCircle, renderStatusPill, spacer } from '../components';

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

  const subject = isTr
    ? `📥 Yeni iletişim talebi · ${businessOrName}`
    : `📥 New contact request · ${businessOrName}`;
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
  const senderInitial = (params.name || '?').charAt(0).toUpperCase();
  const timestamp = new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const copy = isTr
    ? {
        eyebrowAlert: 'Yeni talep · İletişim formu',
        eyebrowAction: '24 saat içinde dönüş yap',
        titlePrefix: `${safeFirstName}'den`,
        titleMain: 'bir mesaj var.',
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

  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const replyHref = `mailto:${params.email}?subject=${encodeURIComponent(isTr ? `Re: ${businessOrName}` : `Re: ${businessOrName}`)}`;
  const phoneHref = params.phone ? `tel:${params.phone.replace(/[^+0-9]/g, '')}` : `${baseAppUrl}/${isTr ? 'tr' : 'en'}/contact`;
  const panelHref = `${baseAppUrl}/admin/leads`;

  const quickActions = [
    { l: copy.replyLabel, s: copy.replySub, href: replyHref },
    { l: copy.callLabel, s: params.phone ? copy.callSubYes : copy.callSubNo, href: phoneHref },
    { l: copy.panelLabel, s: copy.panelSub, href: panelHref },
  ];
  const quickCards = quickActions
    .map(
      (a, i) => `
    <td class="stack-col" valign="top" style="width:33.33%;padding:0 ${i === 0 ? '6px 0 0' : i === quickActions.length - 1 ? '0 0 6px' : '6px'};">
      <a href="${a.href}" style="display:block;padding:16px;border:1px solid ${PULSE.n200};border-radius:10px;text-decoration:none;">
        <div style="font-family:${FONTS.heading};font-size:14px;font-weight:500;color:${PULSE.graphite};margin-bottom:4px;">${a.l} →</div>
        <div style="font-size:11px;color:${PULSE.n500};font-family:${FONTS.mono};letter-spacing:0.05em;">${a.s}</div>
      </a>
    </td>
  `,
    )
    .join('');

  // Sender meta grid — 3 cells (email / phone / business). Stacks on mobile via .stack-col.
  const senderCells: Array<{ label: string; value: string; href?: string }> = [
    { label: copy.senderEmailLabel, value: safeEmail, href: `mailto:${params.email}` },
    {
      label: copy.senderPhoneLabel,
      value: safePhone ?? `<span style="color:${PULSE.n400};">${copy.senderMissing}</span>`,
      href: safePhone && params.phone ? `tel:${params.phone.replace(/[^+0-9]/g, '')}` : undefined,
    },
    {
      label: copy.senderBusinessLabel,
      value: safeBusiness ?? `<span style="color:${PULSE.n400};">${copy.senderMissing}</span>`,
    },
  ];
  const senderCellsHtml = senderCells
    .map(
      (c, i) => `
      <td class="stack-col" valign="top" style="width:33.33%;padding:14px 16px;${i < 2 ? `border-right:1px solid ${PULSE.n200};` : ''}background:${PULSE.n50};${i === 0 ? 'border-radius:0 0 0 14px;' : ''}${i === 2 ? 'border-radius:0 0 14px 0;' : ''}">
        <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;">${c.label}</div>
        <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;font-weight:500;color:${PULSE.graphite};word-break:break-word;">${
          c.href ? `<a href="${c.href}" style="color:${PULSE.graphite};text-decoration:none;">${c.value}</a>` : c.value
        }</div>
      </td>
    `,
    )
    .join('');

  const consentRows = `
    <tr>
      <td class="stack-col" valign="top" style="padding:14px 16px;width:50%;border-right:1px solid ${PULSE.n200};">
        <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;">${copy.kvkkLabel}</div>
        <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.success};font-weight:500;">✓ ${copy.kvkkValue}</div>
      </td>
      <td class="stack-col" valign="top" style="padding:14px 16px;width:50%;">
        <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;">${copy.marketingLabel}</div>
        <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${params.marketingConsent ? PULSE.success : PULSE.n500};font-weight:500;">${params.marketingConsent ? '✓ ' + copy.marketingYes : '○ ' + copy.marketingNo}</div>
      </td>
    </tr>
  `;

  const subRowMeta = `${escapeHtml(businessOrName)}${params.sourcePath ? ` · ${escapeHtml(params.sourcePath)}` : ''}`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <!-- Top dark alert bar -->
      <tr>
        <td style="background:${PULSE.graphite};padding:14px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="middle">
                ${renderStatusPill({ text: copy.eyebrowAlert, dotColor: PULSE.lime, textColor: PULSE.pure })}
              </td>
              <td align="right" valign="middle">
                <span style="font-family:${FONTS.mono};font-size:11px;color:${PULSE.n400};">${timestamp}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Sub-title row -->
      <tr>
        <td style="background:${PULSE.pure};padding:18px 40px;border-bottom:1px solid ${PULSE.n200};">
          <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;">${subRowMeta}</div>
        </td>
      </tr>

      <!-- Title -->
      <tr>
        <td class="bz-pad" style="padding:36px 40px 8px;">
          ${renderEyebrow(copy.eyebrowAction, PULSE.limeDeep)}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:36px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.titlePrefix} ${copy.titleMain}<br/>
            <span style="color:${PULSE.n500};">${copy.titleSub}</span>
          </h1>
        </td>
      </tr>

      <!-- Sender card -->
      <tr>
        <td class="bz-pad" style="padding:28px 40px 8px;">
          ${renderEyebrow(copy.senderEyebrow)}
          ${spacer(12)}
          <div style="border:1px solid ${PULSE.n200};border-radius:14px;overflow:hidden;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="middle" style="padding:20px 24px;border-bottom:1px solid ${PULSE.n200};background:${PULSE.pure};">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="middle">${renderAvatarCircle({ initials: senderInitial, bg: PULSE.limeSoft, fg: PULSE.graphite, size: 44 })}</td>
                      <td valign="middle" style="padding-left:14px;">
                        <div style="font-family:${FONTS.heading};font-size:17px;font-weight:500;color:${PULSE.graphite};letter-spacing:-0.015em;">${safeName}</div>
                        ${safeBusiness ? `<div style="font-size:13px;color:${PULSE.n500};margin-top:2px;">${safeBusiness}</div>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
              <tr>${senderCellsHtml}</tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- Message -->
      <tr>
        <td class="bz-pad" style="padding:28px 40px 8px;">
          ${renderEyebrow(copy.messageEyebrow)}
          ${spacer(12)}
          <div style="background:${PULSE.graphite};border-radius:14px;padding:24px;color:${PULSE.pure};">
            <p style="font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.n300};margin:0;">${safeMessage}</p>
          </div>
        </td>
      </tr>

      <!-- Consents -->
      <tr>
        <td class="bz-pad" style="padding:28px 40px 8px;">
          ${renderEyebrow(copy.consentEyebrow)}
          ${spacer(8)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row" style="background:${PULSE.n50};border-radius:12px;border:1px solid ${PULSE.n200};">
            ${consentRows}
          </table>
        </td>
      </tr>

      <!-- Quick actions -->
      <tr>
        <td class="bz-pad" style="padding:32px 40px 44px;">
          ${renderEyebrow(copy.quickEyebrow)}
          ${spacer(12)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row"><tr>${quickCards}</tr></table>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: '',
    footer: { locale, unsubText: isTr ? 'Bu bildirim ayarlarını yönetmek için' : 'To manage notification settings' },
  });

  const consentSummary = params.marketingConsent
    ? `KVKK ✓ · ${copy.marketingLabel}: ${copy.marketingYes}`
    : `KVKK ✓ · ${copy.marketingLabel}: ${copy.marketingNo}`;

  const text = `${copy.titlePrefix} ${copy.titleMain} ${copy.titleSub}

${copy.senderEyebrow}: ${params.name}
${copy.senderEmailLabel}: ${params.email}
${copy.senderPhoneLabel}: ${params.phone || copy.senderMissing}
${copy.senderBusinessLabel}: ${params.business || copy.senderMissing}

${copy.messageEyebrow}:
${params.message}

${copy.consentEyebrow}: ${consentSummary}

${baseAppUrl}/admin/leads`;

  return { subject, html, text };
}
