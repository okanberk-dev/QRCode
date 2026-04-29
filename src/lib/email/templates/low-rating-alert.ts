import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, renderAvatarCircle, renderStatusPill, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface LowRatingAlertParams {
  rating: number;
  restaurantName: string;
  customerName?: string | null;
  comment?: string | null;
  branch?: string | null;
  tableNumber?: string | null;
  reviewUrl: string;
  /** Optional already-generated AI reply suggestion. When omitted the AI box
   *  is hidden — alert still fires with the customer block + quick actions. */
  aiDraft?: string | null;
  aiTone?: string | null;
  aiLatencyMs?: number | null;
  /** Up to 3 short tag chips ("servis-yavaş" tarzı). Free-form, hashed in UI */
  tags?: string[];
  customerSubtitle?: string | null;
  platformLabel?: string | null;
}

export async function renderLowRatingAlert(
  params: LowRatingAlertParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr
    ? `⚠ Düşük puanlı yorum — ${params.restaurantName}${params.branch ? ' · ' + params.branch : ''} · ${params.rating}★`
    : `⚠ Low-rating review — ${params.restaurantName}${params.branch ? ' · ' + params.branch : ''} · ${params.rating}★`;
  const preheader = isTr
    ? `${params.customerName ?? 'Müşteri'} az önce ${params.rating} yıldız bıraktı. ${params.aiDraft ? 'AI yanıt taslağı hazır.' : 'Hızlı aksiyon önerileri içeride.'}`
    : `${params.customerName ?? 'A customer'} just left ${params.rating} stars. ${params.aiDraft ? 'AI reply draft inside.' : 'Quick actions inside.'}`;

  const customerName = params.customerName ? escapeHtml(params.customerName) : (isTr ? 'Anonim' : 'Anonymous');
  const customerInitial = (params.customerName || '?').charAt(0).toUpperCase();
  const customerSubtitle = params.customerSubtitle
    ? escapeHtml(params.customerSubtitle)
    : (params.platformLabel ? escapeHtml(params.platformLabel) : '');

  const safeComment = params.comment ? escapeHtml(params.comment).replace(/\n/g, '<br>') : '';
  const tags = (params.tags ?? []).slice(0, 4);

  const inlineDefault = isTr ? {
    eyebrowAlert: 'Anlık uyarı · Düşük puan',
    eyebrowAction: 'Aksiyon gerektiriyor · 1 saat içinde dön',
    title: '${rating} yıldız geldi.',
    titleSub: 'Önce dinleyelim.',
    aiEyebrow: 'Pulse AI taslağı',
    toneLabel: params.aiTone ?? 'Ton: profesyonel · empati yüksek',
    aiEdit: 'Düzenle',
    aiApprove: 'Onayla & Yanıtla →',
    quickEyebrow: 'Hızlı aksiyon',
    quickActions: [
      { l: 'Şefle paylaş', s: 'Mutfak Slack' },
      { l: 'Vardiya notu', s: 'Servis ekibi' },
      { l: 'Tüm yorumlar', s: 'Panele git' },
    ],
    noComment: 'Yorum bırakılmadı.',
  } : {
    eyebrowAlert: 'Live alert · Low rating',
    eyebrowAction: 'Action needed · reply within 1 hour',
    title: 'A ${rating}-star review just landed.',
    titleSub: 'Listen first.',
    aiEyebrow: 'Pulse AI draft',
    toneLabel: params.aiTone ?? 'Tone: professional · high empathy',
    aiEdit: 'Edit',
    aiApprove: 'Approve & Reply →',
    quickEyebrow: 'Quick actions',
    quickActions: [
      { l: 'Share with chef', s: 'Kitchen Slack' },
      { l: 'Shift note', s: 'Service team' },
      { l: 'All reviews', s: 'Open panel' },
    ],
    noComment: 'No comment left.',
  };

  // DB-merged copy. Quick action labels (`quickActions`) are structural —
  // admin UI doesn't expose them, so the inline defaults always win.
  const merged = await loadMailCopy('low-rating-alert', locale, inlineDefault);
  const vars = {
    rating: params.rating,
    restaurantName: params.restaurantName,
    customerName: params.customerName ?? (isTr ? 'Anonim' : 'Anonymous'),
    branch: params.branch ?? '',
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const timestamp = new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const subTitle = params.branch
    ? `${escapeHtml(params.restaurantName)} · ${escapeHtml(params.branch)}${params.tableNumber ? ' · Masa ' + escapeHtml(params.tableNumber) : ''}`
    : escapeHtml(params.restaurantName);

  // Star row — warning color matches jsx:55-58
  const starsHtml = `<span style="color:${PULSE.warning};font-size:18px;letter-spacing:0.05em;">${'★'.repeat(params.rating)}<span style="color:${PULSE.n300};">${'★'.repeat(5 - params.rating)}</span></span>`;

  // Tags — jsx:67-73
  const tagsHtml = tags.length
    ? `<div style="margin-top:16px;">${tags.map((t) => `<span style="display:inline-block;font-family:${FONTS.mono};font-size:11px;color:${PULSE.n600};background:${PULSE.n100};padding:4px 10px;border-radius:6px;margin:0 6px 6px 0;">#${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  // AI Draft card — jsx:80-115
  const aiBlock = params.aiDraft ? `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" style="width:32px;">
              <span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:${PULSE.lime};text-align:center;line-height:22px;color:${PULSE.graphite};font-family:${FONTS.mono};font-size:11px;font-weight:600;">AI</span>
            </td>
            <td valign="middle" style="padding-left:10px;">${renderEyebrow(`${copy.aiEyebrow}${params.aiLatencyMs ? ' · ' + (params.aiLatencyMs / 1000).toFixed(1) + 's' : ''}`)}</td>
          </tr>
        </table>
        ${spacer(14)}
        <div style="background:${PULSE.graphite};border-radius:14px;padding:24px;color:${PULSE.pure};">
          ${renderP(escapeHtml(params.aiDraft).replace(/\n/g, '<br>'), { size: 14, color: PULSE.n300 })}
          <div style="margin-top:18px;padding-top:16px;border-top:1px solid ${PULSE.n800};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
              <tr>
                <td class="stack-col" valign="middle" style="font-family:${FONTS.mono};font-size:11px;color:${PULSE.n400};">${escapeHtml(copy.toneLabel)}</td>
                <td class="stack-col" valign="middle" align="right">
                  <a href="${params.reviewUrl}" style="display:inline-block;font-size:13px;font-weight:500;color:${PULSE.n300};text-decoration:none;padding:8px 14px;border:1px solid ${PULSE.n700};border-radius:8px;margin-right:6px;">${copy.aiEdit}</a>
                  <a href="${params.reviewUrl}" style="display:inline-block;font-size:13px;font-weight:600;color:${PULSE.graphite};background:${PULSE.lime};text-decoration:none;padding:8px 14px;border-radius:8px;">${copy.aiApprove}</a>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </td>
    </tr>` : '';

  // Quick actions — 3-col grid
  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const localePath = isTr ? 'tr' : 'en';
  const quickHrefs = [params.reviewUrl, params.reviewUrl, `${baseAppUrl}/${localePath}/dashboard/feedbacks`];
  const quickCards = copy.quickActions.map((a, i) => `
    <td class="stack-col" valign="top" style="width:33.33%;padding:0 ${i === 0 ? '6px 0 0' : i === copy.quickActions.length - 1 ? '0 0 6px' : '6px'};">
      <a href="${quickHrefs[i]}" style="display:block;padding:16px;border:1px solid ${PULSE.n200};border-radius:10px;text-decoration:none;">
        <div style="font-family:${FONTS.heading};font-size:14px;font-weight:500;color:${PULSE.graphite};margin-bottom:4px;">${a.l} →</div>
        <div style="font-size:11px;color:${PULSE.n500};font-family:${FONTS.mono};letter-spacing:0.05em;">${a.s}</div>
      </a>
    </td>
  `).join('');

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="background:${PULSE.graphite};padding:14px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="middle">
                ${renderStatusPill({ text: copy.eyebrowAlert, dotColor: PULSE.warning, textColor: PULSE.pure })}
              </td>
              <td align="right" valign="middle">
                <span style="font-family:${FONTS.mono};font-size:11px;color:${PULSE.n400};">${timestamp}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:${PULSE.pure};padding:18px 40px;border-bottom:1px solid ${PULSE.n200};">
          <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;">${subTitle}</div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:36px 40px 8px;">
          ${renderEyebrow(copy.eyebrowAction, PULSE.warning)}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:36px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.title}<br/>
            <span style="color:${PULSE.n500};">${copy.titleSub}</span>
          </h1>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:28px 40px 8px;">
          <div style="border:1px solid ${PULSE.n200};border-radius:14px;overflow:hidden;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border-bottom:1px solid ${PULSE.n200};">
              <tr>
                <td valign="middle" style="padding:20px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="middle">${renderAvatarCircle({ initials: customerInitial, bg: '#FEF3C7', fg: PULSE.graphite, size: 40 })}</td>
                      <td valign="middle" style="padding-left:12px;">
                        <div style="font-family:${FONTS.body};font-size:14px;font-weight:500;color:${PULSE.graphite};">${customerName}</div>
                        ${customerSubtitle ? `<div style="font-size:12px;color:${PULSE.n500};">${customerSubtitle}</div>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="middle" align="right" style="padding:20px 24px;">
                  ${starsHtml}
                  <div style="font-size:11px;color:${PULSE.n500};font-family:${FONTS.mono};margin-top:2px;">${params.rating.toFixed(1)} / 5.0</div>
                </td>
              </tr>
            </table>
            <div style="padding:24px;">
              ${safeComment
                ? `<p style="font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n800};margin:0;">"${safeComment}"</p>`
                : `<p style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n500};margin:0;">${copy.noComment}</p>`}
              ${tagsHtml}
            </div>
          </div>
        </td>
      </tr>
      ${aiBlock}
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
    footer: { locale, unsubText: isTr ? 'Düşük puan uyarılarını ayarlamak için' : 'To adjust low-rating alerts' },
  });
  const text = `${copyText.title} ${copyText.titleSub}\n\n${customerName} · ${params.rating}★\n${safeComment ? '"' + (params.comment || '') + '"\n' : ''}\n${params.reviewUrl}`;
  return { subject, html, text };
}
