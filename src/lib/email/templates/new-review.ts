import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderAvatarCircle, renderStatusPill, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface NewReviewParams {
  rating: number;
  restaurantName: string;
  customerName?: string | null;
  comment?: string | null;
  branch?: string | null;
  tableNumber?: string | null;
  platform?: string | null;
  reviewUrl: string;
  /** Optional Google share link — falls back to a generic Google review URL
   *  if the restaurant has googlePlaceId, otherwise hides the secondary CTA. */
  shareUrl?: string;
}

export async function renderNewReview(
  params: NewReviewParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? `🎉 Yeni ${params.rating} yıldız geldi — ${params.customerName ?? 'Müşteri'}`
    : `🎉 New ${params.rating}-star review — ${params.customerName ?? 'a customer'}`;
  const preheader = params.comment
    ? params.comment.slice(0, 90) + (params.comment.length > 90 ? '…' : '')
    : (isTr ? 'Bu yorumu Google\'da paylaşmak için iyi bir an.' : 'Perfect moment to share this on Google.');

  const customerName = params.customerName ? escapeHtml(params.customerName) : (isTr ? 'Anonim' : 'Anonymous');
  const customerInitial = (params.customerName || '?').charAt(0).toUpperCase();
  const safeComment = params.comment ? escapeHtml(params.comment).replace(/\n/g, '<br>') : '';

  const subtitleParts = [
    params.platform ? escapeHtml(params.platform) : '',
    escapeHtml(params.restaurantName),
    params.branch ? escapeHtml(params.branch) : '',
    params.tableNumber ? `Masa ${escapeHtml(params.tableNumber)}` : '',
  ].filter(Boolean).join(' · ');

  const inlineDefault = isTr ? {
    eyebrow: 'Canlı · Az önce geldi',
    title: '${rating} yıldız.',
    titleSub: 'Hak ettin.',
    primaryCta: 'Teşekkür yaz →',
    secondaryCta: 'Google\'da paylaş',
    noComment: 'Yorum bırakılmadı.',
  } : {
    eyebrow: 'Live · Just now',
    title: '${rating} stars.',
    titleSub: 'You earned it.',
    primaryCta: 'Write a thank-you →',
    secondaryCta: 'Share on Google',
    noComment: 'No comment left.',
  };

  // DB-merged + placeholder substitution. `${rating}` `${customerName}`
  // `${restaurantName}` admin tarafından subject yerine başka field'larda
  // da kullanılabilir.
  const merged = await loadMailCopy('new-review', locale, inlineDefault);
  const vars = {
    rating: params.rating,
    restaurantName: params.restaurantName,
    customerName: params.customerName ?? (isTr ? 'Anonim' : 'Anonymous'),
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  // Star row — warning gold like jsx:31
  const starsHtml = `<span style="color:${PULSE.warning};font-size:18px;letter-spacing:0.05em;">${'★'.repeat(params.rating)}<span style="color:${PULSE.n300};">${'★'.repeat(5 - params.rating)}</span></span>`;

  const shareCta = params.shareUrl
    ? `<a href="${params.shareUrl}" style="display:inline-block;padding:12px 24px;border:1px solid ${PULSE.n300};border-radius:10px;font-size:14px;font-weight:500;color:${PULSE.graphite};text-decoration:none;margin-left:10px;">${copy.secondaryCta}</a>`
    : '';

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 8px;">
          ${renderStatusPill({ text: copy.eyebrow, dotColor: PULSE.success, textColor: PULSE.success })}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:36px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.title}<br/>
            <span style="color:${PULSE.n500};">${copy.titleSub}</span>
          </h1>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:24px 40px 8px;">
          <!--[if mso]>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.limeSoft};border:1px solid ${PULSE.n200};border-radius:14px;"><tr><td style="padding:28px;">
          <![endif]-->
          <!--[if !mso]><!-->
          <div style="background-image:linear-gradient(180deg, ${PULSE.limeSoft} 0%, ${PULSE.pure} 100%);background-color:${PULSE.limeSoft};border:1px solid ${PULSE.n200};border-radius:14px;padding:28px;">
          <!--<![endif]-->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="middle" style="width:58px;">${renderAvatarCircle({ initials: customerInitial, bg: PULSE.lime, fg: PULSE.graphite, size: 44 })}</td>
                <td valign="middle" style="padding-left:14px;">
                  <div style="font-family:${FONTS.body};font-size:15px;font-weight:500;color:${PULSE.graphite};">${customerName}</div>
                  ${subtitleParts ? `<div style="font-size:12px;color:${PULSE.n500};">${subtitleParts}</div>` : ''}
                </td>
                <td valign="middle" align="right">${starsHtml}</td>
              </tr>
            </table>
            ${spacer(18)}
            ${safeComment
              ? `<p style="font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n800};margin:0;letter-spacing:-0.005em;">"${safeComment}"</p>`
              : `<p style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n500};margin:0;">${copy.noComment}</p>`}
          <!--[if !mso]><!-->
          </div>
          <!--<![endif]-->
          <!--[if mso]>
          </td></tr></table>
          <![endif]-->
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:28px 40px 44px;">
          ${renderButton({ href: params.reviewUrl, label: copy.primaryCta, size: 'md' })}
          ${shareCta}
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: isTr ? 'Yeni yorum · Anında' : 'New review · Live',
    footer: { locale, unsubText: isTr ? 'Yeni yorum bildirimlerini kapatmak için' : 'To stop new-review alerts' },
  });
  const text = `${copyText.title} ${copyText.titleSub}\n\n${customerName} · ${params.rating}★\n${safeComment ? '"' + (params.comment || '') + '"\n' : ''}\n${copyText.primaryCta} ${params.reviewUrl}`;
  return { subject, html, text };
}
