import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderStatusPill, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import { formatClock, resolveDisplayTimeZone } from '@/lib/timezone';
import { normalizeReviewSource, reviewAlertSubject, reviewSourceCopy, type ReviewSource } from '../review-source';

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
  /** Yorumun bırakıldığı an (`Feedback.createdAt`). Status pill'e saat
   *  damgası ekler — "Az önce geldi · 14:32". Verilmezse damga gizlenir. */
  submittedAt?: Date | string | null;
  /** Gösterim saat dilimi (IANA). Default `Europe/Istanbul` — sunucu TZ'si
   *  UTC olduğu için parametresiz format saati geri kaydırırdı. */
  timeZone?: string | null;
  /** Google review or Buaze QR feedback (default) — subject + source chip. */
  source?: ReviewSource | null;
}

export async function renderNewReview(
  params: NewReviewParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  // Subject deliverability §21.23: 🎉 emoji çıkarıldı.
  const source = normalizeReviewSource(params.source);
  const sourceCopy = reviewSourceCopy(source, locale);
  const subject = reviewAlertSubject({
    source,
    locale,
    rating: params.rating,
    restaurantName: params.restaurantName,
    branch: params.branch,
    low: false,
  });
  const preheader = params.comment
    ? params.comment.slice(0, 90) + (params.comment.length > 90 ? '…' : '')
    : (isTr ? 'Bu yorumu Google\'da paylaşmak için iyi bir an.' : 'Perfect moment to share this on Google.');

  const customerName = params.customerName ? escapeHtml(params.customerName) : (isTr ? 'Anonim' : 'Anonymous');
  const customerInitial = (params.customerName || '?').trim().charAt(0).toUpperCase() || '?';
  const rating = Math.max(0, Math.min(5, Math.round(params.rating)));
  const safeComment = params.comment ? escapeHtml(params.comment).replace(/\n/g, '<br>') : '';

  const subtitleParts = [
    escapeHtml(sourceCopy.name),
    escapeHtml(params.restaurantName),
    params.branch ? escapeHtml(params.branch) : '',
    params.tableNumber ? `${isTr ? 'Masa' : 'Table'} ${escapeHtml(params.tableNumber)}` : '',
  ].filter(Boolean).join(' · ');

  const inlineDefault = isTr ? {
    eyebrow: 'Az önce geldi',
    title: '${rating} yıldız.',
    titleSub: 'Hak ettin.',
    primaryCta: 'Teşekkür yaz →',
    secondaryCta: 'Google\'da paylaş',
    noComment: 'Yorum bırakılmadı.',
  } : {
    eyebrow: 'Just now',
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

  // Status pill'e yorumun bırakıldığı saat eklenir ("Az önce geldi · 14:32").
  // İşletmenin yerel saatinde — sunucu process TZ'si (UTC) değil.
  const submittedClock = params.submittedAt
    ? formatClock(params.submittedAt, locale, resolveDisplayTimeZone(params.timeZone))
    : '';
  const pillLead = `${escapeHtml(sourceCopy.name)} · ${copy.eyebrow}`;
  const pillText = submittedClock ? `${pillLead} · ${submittedClock}` : pillLead;

  // Star row — nowrap so a narrow card never splits it 3 + 2.
  const starsHtml = `<span style="font-family:${FONTS.body};font-size:18px;line-height:1;letter-spacing:2px;white-space:nowrap;color:${PULSE.warning};">${'★'.repeat(rating)}<span style="color:${PULSE.n300};">${'★'.repeat(5 - rating)}</span></span>`;

  // Secondary CTA: `bz-btn` goes full width under the primary on phones; height
  // matches renderButton('md') (13px + 1px border + 16.8px line).
  const shareCta = params.shareUrl
    ? `<a href="${escapeHtml(params.shareUrl)}" class="bz-btn" style="display:inline-block;padding:13px 24px;border:1px solid ${PULSE.n300};border-radius:10px;font-family:${FONTS.body};font-size:14px;font-weight:600;line-height:1.2;color:${PULSE.graphite};text-decoration:none;margin-left:10px;">${copy.secondaryCta}</a>`
    : '';

  // Two-tone card (lime-soft identity band + white quote area): same anatomy as
  // the low-rating alert, and no CSS gradient (stripped by Gmail / Outlook).
  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 44px;">
          ${renderStatusPill({ text: pillText, dotColor: source === 'google' ? sourceCopy.dot : PULSE.success, textColor: PULSE.success })}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:36px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${PULSE.graphite};margin:0;">
            ${copy.title}<br/>
            <span style="color:${PULSE.n500};">${copy.titleSub}</span>
          </h1>
          ${spacer(26)}
          <div style="border:1px solid ${PULSE.n200};border-radius:14px;overflow:hidden;background:${PULSE.pure};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.limeSoft};border-bottom:1px solid ${PULSE.n200};">
              <tr>
                <td style="padding:18px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
                    <tr>
                      <td class="stack-col" valign="middle" style="padding:0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="middle" style="width:44px;">
                              <div style="width:44px;height:44px;border-radius:50%;background:${PULSE.lime};text-align:center;line-height:44px;font-family:${FONTS.heading};font-weight:600;font-size:17px;color:${PULSE.graphite};">${escapeHtml(customerInitial)}</div>
                            </td>
                            <td valign="middle" style="padding-left:14px;">
                              <div style="font-family:${FONTS.body};font-size:15px;font-weight:600;line-height:1.4;color:${PULSE.graphite};">${customerName}</div>
                              ${subtitleParts ? `<div style="font-size:12px;line-height:1.45;color:${PULSE.n600};">${subtitleParts}</div>` : ''}
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td class="stack-col" valign="middle" align="right" style="padding:0;">${starsHtml}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <div style="padding:24px;">
              ${safeComment
                ? `<p style="font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.n800};margin:0;">“${safeComment}”</p>`
                : `<p style="font-family:${FONTS.body};font-size:13px;line-height:1.55;color:${PULSE.n500};margin:0;">${copy.noComment}</p>`}
            </div>
          </div>
          ${spacer(28)}
          ${renderButton({ href: escapeHtml(params.reviewUrl), label: copy.primaryCta, size: 'md' })}
          ${shareCta}
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
    eyebrow: sourceCopy.arrived,
    footer: { locale, unsubText: isTr ? 'Yeni yorum bildirimlerini kapatmak için' : 'To stop new-review alerts' },
  });
  const text = `${sourceCopy.name} · ${sourceCopy.detail}\n\n${copyText.title} ${copyText.titleSub}\n\n${customerName} · ${params.rating}★\n${safeComment ? '"' + (params.comment || '') + '"\n' : ''}\n${copyText.primaryCta} ${params.reviewUrl}`;
  return { subject, html, text };
}
