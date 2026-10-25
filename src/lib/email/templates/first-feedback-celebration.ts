// Wave B5 (CLAUDE.md §38.B) — first feedback celebration mail.
//
// Fires once-per-restaurant the moment the very first feedback row lands
// (count === 1 after insert). Different from `first-feedback-tips` (CLAUDE.md
// §21.34) which targets "QR is live but no feedback yet" via the lifecycle
// cron. This one is the activation moment counterpart — "your reputation
// loop just started." Idempotency via LifecycleEmailLog (lifetime cooldown
// per restaurantId).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface FirstFeedbackCelebrationParams {
  ownerName?: string | null;
  restaurantName: string;
  /** 1-5 star value from the first feedback row. */
  rating: number;
  /** Customer's free-text comment, max 500 char. May be empty. */
  comment?: string | null;
  /** Inbox URL — owner's feedback dashboard. */
  feedbackUrl: string;
}

export async function renderFirstFeedbackCelebration(
  params: FirstFeedbackCelebrationParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const ownerName = params.ownerName ? escapeHtml(params.ownerName) : '';
  const restaurantName = escapeHtml(params.restaurantName);
  const rating = Math.max(1, Math.min(5, Math.round(params.rating)));
  const isPositive = rating >= 4;
  const commentClean = (params.comment ?? '').trim().slice(0, 500);
  const commentEscaped = commentClean ? escapeHtml(commentClean) : '';

  const subject = isTr
    ? 'İlk yorumun geldi'
    : 'Your first review just arrived';
  const preheader = isTr
    ? `${params.restaurantName} için ilk müşteri geri bildirimi panele düştü.`
    : `${params.restaurantName} got its first customer feedback.`;

  const inlineDefault = isTr ? {
    eyebrow: 'Aktivasyon · İlk yorum',
    title: 'İlk yorumun',
    titleAccent: 'geldi',
    intro: ownerName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:600;">${ownerName}</span>, <strong>${restaurantName}</strong> için ilk müşteri yorumu panele düştü. Hemen yanıt verirsen müşterinin kalıcı bir hatırasını oluşturmuş olursun.`
      : `<strong>${restaurantName}</strong> için ilk müşteri yorumu panele düştü. Hemen yanıt verirsen müşterinin kalıcı bir hatırasını oluşturmuş olursun.`,
    quoteEyebrow: 'Müşterinin sözleri',
    noComment: 'Müşteri yorum yazmadı — sadece yıldız bıraktı.',
    cta: 'Yorumu gör →',
    tipPositive: 'Yüksek puanlı yorumlara 24 saat içinde teşekkür et — küçük bir teşekkür müşterinin geri dönmesine yardımcı olur.',
    tipLow: 'Düşük puanlarda önce dinle, sonra çöz: müşteri hatasını kabul edilen restoranı tekrar dener.',
  } : {
    eyebrow: 'Activation · First review',
    title: 'Your first review',
    titleAccent: 'is in',
    intro: ownerName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:600;">${ownerName}</span>, <strong>${restaurantName}</strong> just got its first customer review. A reply within the first hours builds lasting customer memory.`
      : `<strong>${restaurantName}</strong> just got its first customer review. A reply within the first hours builds lasting customer memory.`,
    quoteEyebrow: 'What the customer said',
    noComment: 'No written comment — only the star rating.',
    cta: 'Open the review →',
    tipPositive: 'Thank high-rated reviews within 24 hours — a quick thank-you helps bring customers back.',
    tipLow: 'For low ratings, listen first then fix: customers retry a restaurant that admits mistakes.',
  };

  const merged = await loadMailCopy('first-feedback-celebration', locale, inlineDefault);
  const vars = { ownerName: params.ownerName || '', restaurantName: params.restaurantName };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const tip = isPositive ? copy.tipPositive : copy.tipLow;
  const tipText = isPositive ? copyText.tipPositive : copyText.tipLow;

  // Filled stars in the review gold (same as the review mails), one line only.
  const starsHtml = `<span style="font-family:${FONTS.body};font-size:20px;line-height:1;letter-spacing:2px;white-space:nowrap;color:${PULSE.warning};">${'★'.repeat(rating)}<span style="color:${PULSE.n300};">${'★'.repeat(5 - rating)}</span></span>`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 44px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="width:42px;">
                <div style="width:32px;height:32px;border-radius:10px;background:${PULSE.lime};text-align:center;line-height:32px;font-family:${FONTS.heading};font-size:15px;font-weight:700;color:${PULSE.graphite};">1</div>
              </td>
              <td valign="middle">${renderEyebrow(copy.eyebrow)}</td>
            </tr>
          </table>
          ${spacer(18)}
          <h1 class="bz-h1-lg" style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.12;letter-spacing:-0.02em;font-weight:600;color:${PULSE.graphite};">
            ${copy.title} <span style="display:inline-block;background:${PULSE.lime};color:${PULSE.graphite};padding:0 8px;border-radius:8px;line-height:1.2;">${copy.titleAccent}</span>
          </h1>
          ${spacer(18)}
          <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.n600};">
            ${copy.intro}
          </p>
          ${spacer(26)}
          <div style="background:${isPositive ? PULSE.limeSoft : PULSE.n50};border:1px solid ${isPositive ? PULSE.lime : PULSE.n200};border-radius:14px;padding:24px;">
            ${renderEyebrow(copy.quoteEyebrow, PULSE.n600)}
            ${spacer(12)}
            ${starsHtml}
            ${commentEscaped ? `
            ${spacer(14)}
            <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.graphite};font-style:italic;">
              “${commentEscaped}”
            </p>
            ` : `
            ${spacer(12)}
            <p style="margin:0;font-family:${FONTS.body};font-size:13px;line-height:1.55;color:${PULSE.n500};">
              ${copy.noComment}
            </p>
            `}
          </div>
          ${spacer(26)}
          ${renderButton({ href: escapeHtml(params.feedbackUrl), label: copy.cta, variant: 'dark' })}
          ${spacer(24)}
          <div style="background:${PULSE.n50};border-left:3px solid ${PULSE.limeDeep};border-radius:8px;padding:14px 18px;font-family:${FONTS.body};font-size:13px;line-height:1.6;color:${PULSE.n700};">
            ${tip}
          </div>
        </td>
      </tr>
    </table>
  `;

  // pulseLayout interpolates subject/preheader into <title> and the hidden
  // preheader div verbatim, so they are escaped here.
  const html = pulseLayout({ subject: escapeHtml(subject), preheader: escapeHtml(preheader), content, footer: { locale } });

  const text = [
    copyText.eyebrow,
    '',
    `${copy.title} ${copy.titleAccent}`,
    '',
    copyText.intro.replace(/<[^>]*>/g, ''),
    '',
    `${copy.quoteEyebrow}:`,
    `  ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`,
    commentClean ? `  "${commentClean}"` : `  ${copyText.noComment}`,
    '',
    `${copy.cta} ${params.feedbackUrl}`,
    '',
    tipText,
  ].join('\n');

  return { subject, html, text };
}
