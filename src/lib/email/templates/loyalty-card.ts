/**
 * Loyalty card link for the customer (CLAUDE.md §60). Transactional: sent
 * only when the customer gave an e-mail while joining, or asked for the link
 * again with a phone already in the program. Render-only (no DB copy): the
 * text names the business so the customer knows who the card belongs to.
 */
import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderEyebrow, renderH1, renderP, spacer } from '../components';

export interface LoyaltyCardMailParams {
  businessName: string;
  programName: string;
  customerName: string | null;
  cardUrl: string;
  /** "9 damga → Ücretsiz kahve" lines. */
  rewardLines: string[];
  resend: boolean;
}

export function renderLoyaltyCardMail(
  params: LoyaltyCardMailParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const tr = locale !== 'en';
  const business = params.businessName.trim();
  const subject = tr ? `${business} sadakat kartınız` : `Your ${business} loyalty card`;
  const hello = params.customerName ? (tr ? `Merhaba ${params.customerName},` : `Hi ${params.customerName},`) : tr ? 'Merhaba,' : 'Hi,';
  const lead = params.resend
    ? tr
      ? `${business} kartınızın bağlantısını istediniz. Kartınızı açmak için aşağıdaki düğmeyi kullanın.`
      : `You asked for your ${business} card link. Use the button below to open your card.`
    : tr
      ? `${business} sadakat programına katıldınız. Kasada kartınızı gösterin; ziyaretlerinizde damga / puan eklenir.`
      : `You joined the ${business} loyalty programme. Show your card at the counter and every visit adds stamps / points.`;
  const keep = tr
    ? 'Bu bağlantı kartınızın anahtarıdır, başkasıyla paylaşmayın. Telefonunuzun ana ekranına ekleyebilirsiniz.'
    : "This link is the key to your card — don't share it. You can add it to your phone's home screen.";
  const rewards = params.rewardLines.slice(0, 6);

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 44px;">
          ${renderEyebrow(escapeHtml(params.programName))}
          ${spacer(12)}
          ${renderH1(escapeHtml(tr ? 'Kartınız hazır.' : 'Your card is ready.'))}
          ${spacer(18)}
          ${renderP(escapeHtml(hello))}
          ${spacer(8)}
          ${renderP(escapeHtml(lead))}
          ${spacer(22)}
          ${renderButton({ href: escapeHtml(params.cardUrl), label: tr ? 'Kartımı aç →' : 'Open my card →', variant: 'lime', size: 'lg' })}
          ${
            rewards.length
              ? `${spacer(26)}<div style="border:1px solid ${PULSE.n200};border-radius:12px;padding:18px 20px;">
                   ${renderEyebrow(tr ? 'Ödüller' : 'Rewards')}
                   ${spacer(8)}
                   ${rewards.map((l) => renderP(escapeHtml(l), { size: 14, color: PULSE.n800 })).join(spacer(4))}
                 </div>`
              : ''
          }
          ${spacer(22)}
          ${renderP(escapeHtml(keep), { size: 13, color: PULSE.n500 })}
        </td>
      </tr>
    </table>`;

  const html = pulseLayout({
    subject: escapeHtml(subject),
    preheader: escapeHtml(tr ? `${business} kartınızın bağlantısı` : `Your ${business} card link`),
    content,
    eyebrow: tr ? 'Sadakat kartı' : 'Loyalty card',
    footer: {
      locale,
      unsubscribeUrl: params.cardUrl,
      unsubText: tr ? 'Kartınızı ve bilgilerinizi silmek için kart sayfasından' : 'To delete your card and data, use your card page',
    },
  });
  const text = [
    hello,
    '',
    lead,
    '',
    `${tr ? 'Kartınız' : 'Your card'}: ${params.cardUrl}`,
    ...(rewards.length ? ['', ...rewards] : []),
    '',
    keep,
  ].join('\n');
  return { subject, html, text };
}
