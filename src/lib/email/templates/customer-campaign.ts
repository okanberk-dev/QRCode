import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { formatIysIdForFooter } from '@/lib/legal/iys';

// §38.48 Wave 2 — Customer email campaign template (owner → customer mass mail).
// Pulse template paterni (CLAUDE.md §21). Owner subject + body free-text yazar;
// helper KVKK gate, RFC 2369/8058 List-Unsubscribe header, escapeHtml ile XSS
// guard, restaurant branding (logo + name) ile sarar.
//
// Stage 31c §38.109 — footer enrichment:
//   - ETK m.5(1)(a) gönderici kimliği (Restaurant + Buaze platform)
//   - "Bu maili neden aldım?" disclosure (ETK m.5 transparency)
//   - RFC 8058 unsubscribe link (intact)
//   - KVKK Aydınlatma Metni + ticari ileti tercihleri public link
//   - İYS Takip ID + gönderim tarihi (Stage 31b §38.108 placeholder)
//   - GDPR Art.28 processor disclaimer (EN locale)

export interface CustomerCampaignParams {
  restaurantName: string;
  /** Owner-authored subject (free text, escaped). */
  subject: string;
  /** Owner-authored body (free text, escaped + line-break preserved). */
  body: string;
  /** Public-facing unsubscribe URL (token-based). */
  unsubscribeUrl: string;
  /**
   * Stage 31c §38.109 — gönderici kimliği (ETK m.5). Restaurant.notificationEmail
   * veya null fallback ('hello@buaze.com'). Mail body içinde
   * "via {senderEmail}" satırında render edilir; from header `RESEND_FROM_EMAIL`
   * ile farklı (Buaze platform identity).
   */
  senderEmail?: string | null;
  /**
   * Stage 31c §38.109 — İYS gönderim takip UUID (Stage 31b §38.108 placeholder).
   * Null → footer'da "—" render edilir; operatör İYS API credentials
   * sağladığında reportToIys helper bu alanı doldurur.
   */
  iysId?: string | null;
  /**
   * Stage 31c §38.109 — gönderim zaman damgası. null → render anı kullanılır.
   */
  sentAt?: Date | null;
}

// CLAUDE.md §38.131 — env-aware base URL (Stage 50 + §38.105 paterni).
// Vercel preview deploy'larda mail testleri prod URL'sine değil mevcut
// deploy URL'sine link verir. Trailing slash strip + fallback intact.
const BUAZE_LEGAL_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || 'https://buaze.com';
const BUAZE_FALLBACK_SENDER = 'hello@buaze.com';

function formatSentAt(date: Date | null | undefined, locale: 'tr' | 'en'): string {
  const d = date ?? new Date();
  try {
    return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    // Edge case: locale not supported — fall back to ISO short form
    return d.toISOString().slice(0, 10);
  }
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
    unsubscribeLabel: 'Aboneliği iptal et',
    sentLine: 'Bu mesaj',
    sentSuffix: 'üzerinden iletildi.',
    // Stage 31c §38.109 — compliance footer copy (ETK m.5 + KVKK §10).
    senderTitle: 'Gönderici bilgisi',
    senderBody:
      'Bu mail, <strong>${restaurantName}</strong> tarafından <strong>${senderEmail}</strong> adresi üzerinden Buaze platformu aracılığıyla gönderilmiştir.',
    whyTitle: 'Bu maili neden aldım?',
    whyBody:
      '${restaurantName} müşteri programına kayıt olduğun veya geri bildirim formunda iletişim onayı verdiğin için.',
    privacyLinkLabel: 'KVKK Aydınlatma Metni',
    preferencesLinkLabel: 'İletişim Tercihleri',
    iysLabel: 'İYS Takip ID',
    sentAtLabel: 'Gönderim Tarihi',
  } : {
    eyebrow: 'A message from your restaurant',
    footerHi: 'Hi,',
    unsubscribeLabel: 'Unsubscribe',
    sentLine: 'Sent via',
    sentSuffix: '',
    senderTitle: 'Sender information',
    senderBody:
      'This email was sent by <strong>${restaurantName}</strong> via <strong>${senderEmail}</strong> through the Buaze platform.',
    whyTitle: 'Why did I receive this?',
    whyBody:
      'You opted in to ${restaurantName}\'s customer program or consented to marketing communications via the feedback form.',
    privacyLinkLabel: 'Privacy Notice',
    preferencesLinkLabel: 'Communication Preferences',
    iysLabel: 'IYS Tracking ID',
    sentAtLabel: 'Sent on',
  };

  const sentAtFormatted = formatSentAt(params.sentAt, locale);
  const iysIdFormatted = formatIysIdForFooter(params.iysId ?? null);
  const senderEmail = (params.senderEmail || '').trim() || BUAZE_FALLBACK_SENDER;

  const merged = await loadMailCopy('customer-campaign', locale, inlineDefault);
  const vars = {
    restaurantName: params.restaurantName,
    senderEmail,
    iysId: iysIdFormatted,
    sentAt: sentAtFormatted,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Free-text body → escape + preserve line breaks (\n → <br />).
  const safeBody = escapeHtml(params.body).replace(/\r?\n/g, '<br />');
  const safeRestaurant = escapeHtml(params.restaurantName);
  const restaurantInitial = (params.restaurantName || 'B').charAt(0).toUpperCase();

  // Locale-specific Buaze legal links (KVKK + İletişim Tercihleri).
  // CLAUDE.md §38.131 — Public legal route'ları kısa-slug pattern'i kullanır;
  // /[locale]/legal/ segment'i YOK. Doğru route mapping (src/app/[locale]/):
  //   /kvkk         → kvkk-aydinlatma doc (TR — KVKK Türkiye'ye özel)
  //   /privacy      → gizlilik-politikasi doc (EN — international Privacy Notice)
  //   /ticari-ileti → ticari-ileti doc (TR/EN aynı slug)
  // TR locale'da "KVKK Aydınlatma Metni" label ile /tr/kvkk kasıtlı parite;
  // EN locale'da "Privacy Notice" label ile /en/privacy ayrı concern.
  const privacyLink = isTr
    ? `${BUAZE_LEGAL_BASE_URL}/tr/kvkk`
    : `${BUAZE_LEGAL_BASE_URL}/en/privacy`;
  const preferencesLink = isTr
    ? `${BUAZE_LEGAL_BASE_URL}/tr/ticari-ileti`
    : `${BUAZE_LEGAL_BASE_URL}/en/ticari-ileti`;

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

    <!-- Stage 31c §38.109 — Compliance footer (ETK m.5 + KVKK §10 + GDPR
         Art.13/Art.28 + RFC 8058). Tasarım: rounded soft border + 4 stack
         row (gönderici / neden / unsubscribe + linkler / IYS + tarih). -->
    <tr>
      <td class="bz-pad" style="padding:0 40px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${PULSE.n200};padding-top:18px;">
          <!-- Gönderici (sender identity) -->
          <tr>
            <td style="padding-bottom:12px;">
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${PULSE.n500};margin-bottom:4px;">${copy.senderTitle}</div>
              <div style="font-family:${FONTS.body};font-size:11.5px;line-height:1.55;color:${PULSE.n500};">
                ${copy.senderBody}
              </div>
            </td>
          </tr>
          <!-- Neden aldım? (transparency disclosure) -->
          <tr>
            <td style="padding-bottom:12px;">
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${PULSE.n500};margin-bottom:4px;">${copy.whyTitle}</div>
              <div style="font-family:${FONTS.body};font-size:11.5px;line-height:1.55;color:${PULSE.n500};">
                ${copy.whyBody}
              </div>
            </td>
          </tr>
          <!-- Unsubscribe + KVKK + Preferences -->
          <tr>
            <td style="padding-bottom:10px;">
              <a href="${escapeHtml(params.unsubscribeUrl)}" style="font-family:${FONTS.body};font-size:11.5px;color:${PULSE.graphite};text-decoration:underline;font-weight:600;">${copy.unsubscribeLabel}</a>
              <span style="font-family:${FONTS.body};font-size:11.5px;color:${PULSE.n500};"> · </span>
              <a href="${privacyLink}" style="font-family:${FONTS.body};font-size:11.5px;color:${PULSE.graphite};text-decoration:underline;">${copy.privacyLinkLabel}</a>
              <span style="font-family:${FONTS.body};font-size:11.5px;color:${PULSE.n500};"> · </span>
              <a href="${preferencesLink}" style="font-family:${FONTS.body};font-size:11.5px;color:${PULSE.graphite};text-decoration:underline;">${copy.preferencesLinkLabel}</a>
            </td>
          </tr>
          <!-- IYS + Sent-at + Buaze attribution -->
          <tr>
            <td>
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.10em;color:${PULSE.n500};">
                ${copy.iysLabel}: ${escapeHtml(iysIdFormatted)}
                &nbsp;·&nbsp;
                ${copy.sentAtLabel}: ${escapeHtml(sentAtFormatted)}
              </div>
              <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${PULSE.n500};margin-top:6px;">
                ${copy.sentLine} <strong style="color:${PULSE.graphite};">Buaze</strong> ${copy.sentSuffix}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const html = pulseLayout({ subject, preheader, content });

  // Plain-text version with same compliance footer pattern.
  const text = `${copyText.eyebrow}
${params.restaurantName}

${params.body}

—
${copyText.senderTitle}: ${stripHtml(copyText.senderBody)}
${copyText.whyTitle}: ${stripHtml(copyText.whyBody)}

${copyText.unsubscribeLabel}: ${params.unsubscribeUrl}
${copyText.privacyLinkLabel}: ${privacyLink}
${copyText.preferencesLinkLabel}: ${preferencesLink}

${copyText.iysLabel}: ${iysIdFormatted}
${copyText.sentAtLabel}: ${sentAtFormatted}

${copyText.sentLine} Buaze ${copyText.sentSuffix}`.trim();

  return { subject, html, text };
}

/**
 * Plain-text helper: deepSubstitute mode='text' artık HTML escape etmez,
 * ama copy field'ları default'ta `<strong>` tag'leri içerebilir (HTML
 * format). Plain-text gövdede tag'leri strip edip text-only akış üret.
 */
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
