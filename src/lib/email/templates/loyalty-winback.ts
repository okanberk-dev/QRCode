/**
 * Win-back mail of a loyalty program (CLAUDE.md §61). Commercial message
 * sent on behalf of the business, only to members who gave an e-mail and
 * ticked the marketing consent: names the business as the sender, carries
 * a one-click opt-out (List-Unsubscribe too). Render-only; the business's
 * own text is checked by the reply risk gate when saved.
 */
import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderEyebrow, renderH1, renderP, spacer } from '../components';

export interface LoyaltyWinbackMailParams {
  businessName: string;
  programName: string;
  customerName: string | null;
  /** The business's own words, or null for the default text. */
  message: string | null;
  /** "Kartınızda 4 damga var — 5 damga sonra: Ücretsiz kahve". */
  statusLine: string | null;
  cardUrl: string;
  unsubscribeUrl: string;
  /** "Moda Kahve Evi Ltd. · Caferağa Mah. … · info@…" */
  senderLine: string;
}

export function renderLoyaltyWinbackMail(params: LoyaltyWinbackMailParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const tr = locale !== 'en';
  const business = params.businessName.trim();
  const subject = tr ? `${business}: kartınız sizi bekliyor` : `${business}: your card is waiting`;
  const hello = params.customerName ? (tr ? `Merhaba ${params.customerName},` : `Hi ${params.customerName},`) : tr ? 'Merhaba,' : 'Hi,';
  const message =
    params.message?.trim() ||
    (tr
      ? 'Bir süredir uğramadınız. Kartınız ve biriktirdikleriniz duruyor; bir sonraki ziyaretinizde kasada gösterin.'
      : 'It has been a while. Your card and what you collected are still here; show it at the counter on your next visit.');
  const sender = tr
    ? `Bu e-postayı ${params.senderLine} adına Buaze gönderdi, çünkü ${business} sadakat programına katılırken kampanya e-postası almayı kabul ettiniz.`
    : `Buaze sent this e-mail on behalf of ${params.senderLine} because you agreed to receive offers when joining the ${business} loyalty programme.`;
  const unsubLine = tr ? 'Bu e-postaları almak istemiyorsanız tek tıkla' : 'To stop these e-mails, one click';

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 44px;">
          ${renderEyebrow(escapeHtml(params.programName))}
          ${spacer(12)}
          ${renderH1(escapeHtml(tr ? 'Kartınız sizi bekliyor.' : 'Your card is waiting.'))}
          ${spacer(18)}
          ${renderP(escapeHtml(hello))}
          ${spacer(8)}
          ${renderP(escapeHtml(message))}
          ${
            params.statusLine
              ? `${spacer(18)}<div style="border:1px solid ${PULSE.n200};border-radius:12px;padding:14px 18px;">${renderP(escapeHtml(params.statusLine), { size: 14, color: PULSE.n800 })}</div>`
              : ''
          }
          ${spacer(22)}
          ${renderButton({ href: escapeHtml(params.cardUrl), label: tr ? 'Kartımı aç →' : 'Open my card →', variant: 'lime', size: 'lg' })}
          ${spacer(24)}
          ${renderP(escapeHtml(sender), { size: 12.5, color: PULSE.n500 })}
        </td>
      </tr>
    </table>`;

  const html = pulseLayout({
    subject: escapeHtml(subject),
    preheader: escapeHtml(params.statusLine ?? (tr ? `${business} kartınız` : `Your ${business} card`)),
    content,
    eyebrow: tr ? 'Sadakat kartı' : 'Loyalty card',
    footer: { locale, unsubscribeUrl: escapeHtml(params.unsubscribeUrl), unsubText: unsubLine },
  });

  const text = [
    params.programName,
    '',
    hello,
    message,
    params.statusLine ?? '',
    '',
    `${tr ? 'Kartınız' : 'Your card'}: ${params.cardUrl}`,
    '',
    sender,
    `${tr ? 'Ayrılmak için' : 'Unsubscribe'}: ${params.unsubscribeUrl}`,
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n');

  return { subject, html, text };
}
