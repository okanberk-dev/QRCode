import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderButton, renderStarRow, spacer } from '../components';

export interface NewReviewParams {
  rating: number;
  restaurantName: string;
  customerName?: string | null;
  comment?: string | null;
  branch?: string | null;
  platform?: string | null;
  reviewUrl: string;
}

export function renderNewReview(params: NewReviewParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const subject = isTr
    ? `${params.rating}★ yorum geldi · ${params.restaurantName}`
    : `${params.rating}★ review · ${params.restaurantName}`;
  const preheader = isTr
    ? 'Müşteri memnuniyetini Google\'da paylaşmak için iyi bir an.'
    : 'A perfect moment to share this review on Google.';

  const copy = isTr ? {
    eyebrow: 'Yorum · Pozitif sinyal',
    title: 'Mükemmel bir yorum geldi.',
    intro: `${escapeHtml(params.restaurantName)} için yeni bir ${params.rating} yıldız değerlendirme aldın. Müşterinin bıraktığı kelimeler aşağıda.`,
    cta: 'Panele git →',
    quoteLabel: 'Müşteri sözleri',
    actionLabel: 'Bu yorumla ne yapabilirsin?',
    bullets: [
      'Sosyal medyada öne çıkar',
      'Müşteriye kişisel bir teşekkür yaz',
      'Ekibinle paylaş — performans rozetiyle',
    ],
  } : {
    eyebrow: 'Review · Positive signal',
    title: 'Glowing review just dropped.',
    intro: `You got a fresh ${params.rating}-star review for ${escapeHtml(params.restaurantName)}. Customer\'s words below.`,
    cta: 'Open in panel →',
    quoteLabel: 'Customer words',
    actionLabel: 'What you can do with this',
    bullets: [
      'Spotlight on social media',
      'Send a personal thank-you',
      'Share with your team as a perf badge',
    ],
  };

  const safeComment = params.comment ? escapeHtml(params.comment).replace(/\n/g, '<br>') : '';
  const customer = params.customerName ? escapeHtml(params.customerName) : (isTr ? 'Anonim' : 'Anonymous');
  const platform = params.platform ? escapeHtml(params.platform) : '';

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.lime};padding:40px 40px 36px;">
          ${renderEyebrow(copy.eyebrow, PULSE.n800)}
          ${spacer(14)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:42px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">${copy.title}</h1>
          ${spacer(14)}
          <div style="font-family:${FONTS.body};font-size:15px;color:${PULSE.n800};line-height:1.6;">${copy.intro}</div>
          ${spacer(20)}
          ${renderStarRow(params.rating, { size: 24, color: PULSE.graphite })}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:32px 40px 16px;">
          ${renderEyebrow(copy.quoteLabel)}
          ${spacer(10)}
          <div style="font-family:${FONTS.heading};font-size:22px;font-weight:500;color:${PULSE.graphite};line-height:1.4;letter-spacing:-0.015em;">
            ${safeComment ? `"${safeComment}"` : (isTr ? '— Yorum bırakılmadı —' : '— No comment —')}
          </div>
          ${spacer(12)}
          <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n500};">— ${customer}${platform ? ` · ${platform}` : ''}${params.branch ? ` · ${escapeHtml(params.branch)}` : ''}</div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:16px 40px 8px;">
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:22px 24px;">
            <div style="font-family:${FONTS.heading};font-size:16px;font-weight:600;color:${PULSE.graphite};margin-bottom:12px;">${copy.actionLabel}</div>
            ${copy.bullets.map((b) => `<div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n700};padding:6px 0;line-height:1.55;"><span style="color:${PULSE.lime};margin-right:8px;">●</span>${b}</div>`).join('')}
          </div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:24px 40px 40px;">
          ${renderButton({ href: params.reviewUrl, label: copy.cta, size: 'lg' })}
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content, eyebrow: isTr ? 'Yorum' : 'Review', footer: { locale } });
  const text = `${copy.title}\n${copy.intro}\n${safeComment ? '"' + (params.comment || '') + '"\n' : ''}— ${customer}\n\n${copy.cta} ${params.reviewUrl}`;
  return { subject, html, text };
}
